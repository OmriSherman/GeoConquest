// Synthesises the two Compass Quiz sounds (app/assets/sfx/compass_bullseye.wav, compass_close.wav).
// Run from the repo root: node scripts/gen-compass-sfx.cjs
const fs = require('fs');
const RATE = 22050;
function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  return buf;
}
// bell-like note: fundamental + inharmonic partials, fast attack, exponential decay
function note(out, start, freq, dur, vol, decay) {
  const n = Math.floor(dur * RATE), o = Math.floor(start * RATE);
  for (let i = 0; i < n; i++) {
    const t = i / RATE, env = Math.min(1, t / 0.004) * Math.exp(-t * decay);
    const s = Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t * decay) + 0.2 * Math.sin(2 * Math.PI * freq * 5.4 * t) * Math.exp(-t * decay * 2);
    if (o + i < out.length) out[o + i] += s * env * vol;
  }
}
// Bullseye: bright rising arpeggio + sparkle (C6 E6 G6 C7)
const a = new Array(Math.floor(1.1 * RATE)).fill(0);
[[0, 1046.5], [0.07, 1318.5], [0.14, 1568], [0.21, 2093]].forEach(([t, f], i) => note(a, t, f, 0.9, 0.28, 4 + i));
fs.writeFileSync('app/assets/sfx/compass_bullseye.wav', wav(a));
// Close: one soft, lower, short note (A4), the "almost" sound
const b = new Array(Math.floor(0.55 * RATE)).fill(0);
note(b, 0, 440, 0.5, 0.45, 7);
fs.writeFileSync('app/assets/sfx/compass_close.wav', wav(b));
