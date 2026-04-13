/**
 * Audio helpers — synthesised sounds via AudioEngine.tsx (WebView / Web Audio API)
 * plus real SFX files played via expo-av.
 *
 * Make sure <AudioEngine /> is mounted once near the root of the app.
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { triggerSound, triggerDingStreak } from '../components/AudioEngine';

// ── Real SFX files (expo-av) ────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function playSfx(source: ReturnType<typeof require>): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const { sound } = await Audio.Sound.createAsync(source);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      });
    } catch (_) {
      resolve();
    }
  });
}

/** Crowd boo — bad result (< 30% accuracy or millionaire early exit) */
export function playBoo() {
  return playSfx(require('../assets/sfx/boo.mp3'));
}

/** Failure groan — mediocre result (30–85% accuracy or millionaire mid-exit) */
export function playFail() {
  return playSfx(require('../assets/sfx/fail.mp3'));
}

/** Success cheer — great result (≥ 85% accuracy, non-millionaire) */
export function playSuccess() {
  return playSfx(require('../assets/sfx/success.mp3'));
}

/** Big win fanfare — millionaire win or nightmare win */
export function playMillionairePrize() {
  return playSfx(require('../assets/sfx/millionaire_prize.m4a'));
}

/** Quest complete sting — banner pop-up and quest claim */
export function playQuestComplete() {
  return playSfx(require('../assets/sfx/quest_complete.wav'));
}

/** Purchase sound — buying anything in the shop */
export function playPurchasedItem() {
  return playSfx(require('../assets/sfx/purchased_item.wav'));
}

/** Millionaire swap lifeline SFX */
export function playMillionaireSwap() {
  return playSfx(require('../assets/sfx/millionaire_swap.wav'));
}

/** Demonic laugh — nightmare quiz loss */
export function playDevilLaugh() {
  return playSfx(require('../assets/sfx/devil_laugh.m4a'));
}

// ── Synthesised sounds (AudioEngine WebView) ────────────────────────────────

/** No-op — AudioEngine initialises itself when mounted. */
export async function initAudio() { }

/** Read text out loud using Expo Speech */
export function playTextToSpeech(text: string) {
    if (!text) return;
    Speech.stop();
    setTimeout(() => {
        Speech.speak(text, { language: 'en', rate: 0.95 });
    }, 80);
}

/** Correct answer chime */
export function playDing() {
    triggerSound('ding');
}

/** Pitch-shifted correct answer chime — pitch rises with combo count */
export function playDingStreak(combo: number) {
    triggerDingStreak(combo);
}

/** Wrong answer buzz */
export function playWrong() {
    triggerSound('wrong');
}

/** Shop rejection (not enough gold) */
export function playReject() {
    triggerSound('reject');
}

/** Purchase / cash-in coin jingle (synthesised fallback) */
export function playPurchase() {
    triggerSound('purchase');
}

/** Victory fanfare (quiz complete, achievement claimed) */
export function playVictory() {
    triggerSound('victory');
}

/** Short tick (used in last 3s of Millionaire timer) */
export function playTick() {
    triggerSound('tick');
}

/** Gold counter gain sound in results animation */
export async function playGoldGain() {
  triggerSound('purchase');
  await delay(650);
}

/** XP bar fill ticking in results animation (no completion ding) */
export async function playXpGain(durationMs: number, ticksPerSecond: number = 10) {
  if (durationMs <= 0 || ticksPerSecond <= 0) return;

  const intervalMs = 1000 / ticksPerSecond;
  const startAt = Date.now();
  let nextTickAt = startAt;
  const endAt = startAt + durationMs;

  while (Date.now() < endAt) {
    triggerSound('tick');
    nextTickAt += intervalMs;
    await delay(Math.max(0, Math.round(nextTickAt - Date.now())));
  }
}
