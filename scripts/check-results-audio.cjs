// Deterministic playback test: no device or real audio required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function run({ stall = false, cancel = false, fail = false } = {}) {
  let now = 0, loads = 0, unloads = 0;
  const ticks = [];
  const sound = {
    replayAsync: async () => {
      ticks.push(now);
      if (fail) throw new Error('device playback failure');
    },
    unloadAsync: async () => { unloads++; },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/audio.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, console: { warn() {} }, Date: { now: () => now },
    setTimeout: (callback, ms) => {
      now += ms;
      if (stall && ticks.length === 2) now += 450;
      callback();
    },
    require: name => name === 'expo-av' ? { Audio: {
      setAudioModeAsync: async () => {},
      Sound: { createAsync: async () => { loads++; return { sound }; } },
    } } : {},
  });
  await exports.playXpGain(1700, 10, () => cancel && ticks.length >= 3);
  assert.equal(loads, 1, 'load a single native player per XP animation');
  assert.equal(unloads, 1, 'always release the player');
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(ticks[i] - ticks[i - 1] >= 100, 'no catch-up burst after a stall');
  }
  assert.ok(ticks.every(t => t < 1700), 'no ticking beyond the animation');
  if (cancel) assert.equal(ticks.length, 3);
  if (fail) assert.equal(ticks.length, 1);
  if (!stall && !cancel && !fail) assert.equal(ticks.length, 17);
}

(async () => {
  await run();
  await run({ stall: true });
  await run({ cancel: true });
  await run({ fail: true });
  console.log('PASS: XP player reuse, timing under stalls, cancellation and failure cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
