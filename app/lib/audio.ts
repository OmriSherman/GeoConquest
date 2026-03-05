/**
 * Audio helpers — all sounds are synthesised by AudioEngine.tsx
 * via a hidden WebView (Web Audio API). No audio files required.
 *
 * Make sure <AudioEngine /> is mounted once near the root of the app.
 */

import * as Speech from 'expo-speech';
import { triggerSound, triggerDingStreak } from '../components/AudioEngine';

/** No-op — AudioEngine initialises itself when mounted. */
export async function initAudio() { }

/** Read text out loud using Expo Speech */
export function playTextToSpeech(text: string) {
    Speech.speak(text, { language: 'en', rate: 0.95 });
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

/** Purchase / cash-in coin jingle */
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
