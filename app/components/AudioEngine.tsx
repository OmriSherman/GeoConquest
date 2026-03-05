/**
 * AudioEngine — a 0×0 invisible WebView that synthesises game sounds
 * using the Web Audio API (works offline, no audio files needed).
 *
 * Usage: mount <AudioEngine /> once at the root of the app (App.tsx),
 * then call playDing / playWrong / playPurchase / playVictory from audio.ts.
 */

import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// Module-level singleton so audio.ts can call injectJavaScript
let _webView: WebView | null = null;

export function triggerSound(name: 'ding' | 'wrong' | 'purchase' | 'victory' | 'tick' | 'boo' | 'clap' | 'cheers' | 'ahhh' | 'wild_cheers' | 'reject') {
  _webView?.injectJavaScript(`playSound("${name}"); true;`);
}

/** Pitch-shifted ding — combo is 1-based (higher = higher pitch) */
export function triggerDingStreak(combo: number) {
  _webView?.injectJavaScript(`playDingStreak(${Math.max(1, combo)}); true;`);
}

const AUDIO_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body><script>
var ctx = null;

function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Single oscillator tone
function tone(freq, dur, type, vol, delay) {
  var c = getCtx(); if (!c) return;
  var osc = c.createOscillator(); var gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.frequency.value = freq; osc.type = type || 'sine';
  var t0 = c.currentTime + (delay || 0);
  gain.gain.setValueAtTime(vol || 0.35, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

// Realistic hand clap: sharp high-pass noise burst with fast decay
function clap(delay) {
  var c = getCtx(); if (!c) return;
  var len = Math.ceil(c.sampleRate * 0.09);
  var buf = c.createBuffer(1, len, c.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  var src = c.createBufferSource(); src.buffer = buf;
  var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
  var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.8;
  var gain = c.createGain();
  var t0 = c.currentTime + (delay || 0);
  gain.gain.setValueAtTime(0.9, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
  src.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(c.destination);
  src.start(t0); src.stop(t0 + 0.12);
}

// Sustained crowd noise using looped band-pass white noise
function crowdNoise(delay, duration, vol, loFreq, hiFreq) {
  var c = getCtx(); if (!c) return;
  var sr = c.sampleRate;
  var bufLen = Math.ceil(sr * 1.5);
  var buf = c.createBuffer(1, bufLen, sr);
  var d = buf.getChannelData(0);
  for (var i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
  var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = loFreq || 350;
  var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = hiFreq || 3500;
  var gain = c.createGain();
  var t0 = c.currentTime + (delay || 0);
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(vol || 0.3, t0 + 0.12);
  gain.gain.setValueAtTime(vol || 0.3, t0 + duration - 0.25);
  gain.gain.linearRampToValueAtTime(0.001, t0 + duration);
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(c.destination);
  src.start(t0); src.stop(t0 + duration);
}

// Triumphant ascending fanfare melody + harmony
function fanfare(delay) {
  tone(523,  0.16, 'sine', 0.32, delay);
  tone(659,  0.16, 'sine', 0.32, delay + 0.17);
  tone(784,  0.16, 'sine', 0.32, delay + 0.34);
  tone(1047, 0.16, 'sine', 0.38, delay + 0.51);
  tone(1319, 0.55, 'sine', 0.48, delay + 0.68);
  tone(330,  0.16, 'sine', 0.16, delay);
  tone(392,  0.16, 'sine', 0.16, delay + 0.17);
  tone(494,  0.16, 'sine', 0.16, delay + 0.34);
  tone(659,  0.55, 'sine', 0.22, delay + 0.51);
}

function playWildCheers() {
  // Epic 4-second crowd roar + rapid clapping + triumphant fanfare
  crowdNoise(0,   4.2, 0.50, 300, 4000);
  crowdNoise(0.1, 4.0, 0.28, 800, 6000);
  for (var i = 0; i < 28; i++) clap(i * 0.125 + Math.random() * 0.03);
  fanfare(0.3);
}

function playCheers() {
  // 2.5s crowd applause + 14 claps + fanfare
  crowdNoise(0, 2.5, 0.40, 350, 3500);
  for (var i = 0; i < 14; i++) clap(0.08 + i * 0.14 + Math.random() * 0.025);
  fanfare(0.25);
}

function playClap() {
  // 8 rhythmic claps with thin crowd murmur
  crowdNoise(0, 1.6, 0.14, 400, 2500);
  var times = [0, 0.16, 0.32, 0.48, 0.64, 0.80, 0.96, 1.12];
  times.forEach(function(t) { clap(t + Math.random() * 0.02); });
}

function playBoo() {
  // Descending crowd groan: low-pass noise + falling sawtooth
  crowdNoise(0, 1.8, 0.35, 80, 700);
  var c = getCtx(); if (!c) return;
  var osc = c.createOscillator(); var gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = 'sawtooth';
  var t0 = c.currentTime;
  osc.frequency.setValueAtTime(200, t0);
  osc.frequency.exponentialRampToValueAtTime(75, t0 + 1.4);
  gain.gain.setValueAtTime(0.22, t0 + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.7);
  osc.start(t0); osc.stop(t0 + 1.8);
}

function playAhhh() {
  // Disappointed crowd murmur with falling tones
  crowdNoise(0, 2.2, 0.28, 200, 1200);
  tone(349.23, 1.8, 'sine', 0.18, 0);
  tone(293.66, 1.4, 'sine', 0.12, 0.4);
  tone(261.63, 1.0, 'sine', 0.10, 0.8);
}

function playDingStreak(combo) {
  var c = getCtx(); if (!c) return;
  var mul = Math.pow(1.04, Math.min(combo - 1, 9));
  var base = 880 * mul;
  tone(base,        0.22, 'sine', 0.42, 0.00);
  tone(base * 1.25, 0.18, 'sine', 0.32, 0.16);
  if (combo >= 5) tone(base * 2, 0.12, 'sine', 0.18, 0.10);
  if (combo >= 10) {
    tone(base * 1.5, 0.18, 'sine', 0.20, 0.00);
    tone(base * 2,   0.25, 'sine', 0.25, 0.20);
    tone(base * 2.5, 0.20, 'sine', 0.22, 0.32);
  }
}

function playSound(name) {
  if (name === 'wild_cheers') return playWildCheers();
  if (name === 'cheers')      return playCheers();
  if (name === 'clap')        return playClap();
  if (name === 'boo')         return playBoo();
  if (name === 'ahhh')        return playAhhh();

  if (name === 'ding') {
    tone(880,  0.22, 'sine', 0.40, 0.00);
    tone(1100, 0.18, 'sine', 0.30, 0.16);
  } else if (name === 'wrong') {
    tone(220, 0.12, 'sawtooth', 0.30, 0.00);
    tone(175, 0.12, 'sawtooth', 0.30, 0.13);
    tone(140, 0.16, 'sawtooth', 0.30, 0.26);
  } else if (name === 'reject') {
    tone(120, 0.10, 'triangle', 0.40, 0.00);
    tone(80,  0.15, 'sine',     0.40, 0.05);
  } else if (name === 'purchase') {
    tone(523,  0.10, 'sine', 0.28, 0.00);
    tone(659,  0.10, 'sine', 0.28, 0.09);
    tone(784,  0.10, 'sine', 0.28, 0.18);
    tone(1047, 0.20, 'sine', 0.38, 0.27);
  } else if (name === 'tick') {
    tone(1200, 0.04, 'square', 0.20, 0.00);
  } else if (name === 'victory') {
    fanfare(0);
  }
}

document.addEventListener('touchstart', function() { getCtx(); }, { once: true });
</script></body></html>`;

export default function AudioEngine() {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    // Store reference for external callers
    _webView = ref.current;
    return () => {
      if (_webView === ref.current) _webView = null;
    };
  });

  return (
    // Invisible 1×1 container — must have a non-zero size for the WebView to load
    <View style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }} pointerEvents="none">
      <WebView
        ref={ref}
        source={{ html: AUDIO_HTML }}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        style={{ width: 1, height: 1 }}
      />
    </View>
  );
}
