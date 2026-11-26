/**
 * Audio helpers — game sounds played via expo-av.
 */

import * as Speech from 'expo-speech';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { getLocale } from './i18n';

// ── Real SFX files (expo-av) ────────────────────────────────────────────────

let audioModePromise: Promise<void> | null = null;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function playSfx(source: ReturnType<typeof require>): Promise<void> {
  try {
    await initAudio();
    const { sound } = await Audio.Sound.createAsync(source);
    await new Promise<void>((resolve) => {
      let done = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (done) return;
        done = true;
        if (timeout) clearTimeout(timeout);
        sound.unloadAsync().catch(() => {});
        resolve();
      };
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          finish();
        }
      });
      sound.playAsync().catch(finish);
      timeout = setTimeout(finish, 5000);
    });
  } catch (error) {
    console.warn('[audio] SFX playback failed', error);
  }
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

/** Cursed dice roll — nightmare curse reveal */
export function playDiceRoll() {
  return playSfx(require('../assets/sfx/dice.mp3'));
}

// ── Generated SFX files (expo-av) ───────────────────────────────────────────

/** Configure iOS audio so effects are audible even when the silent switch is on. */
export async function initAudio() {
  if (!audioModePromise) {
    audioModePromise = Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      // Let the player's own music/podcast keep playing under our effects
      // (the default iOS mode pauses other apps' audio).
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // ponytail: expo-av has no true mix on Android, ducking only lasts as long as an effect
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }
  await audioModePromise;
}

/** Read text out loud using Expo Speech */
export function playTextToSpeech(text: string) {
    if (!text) return;
    Speech.stop();
    setTimeout(() => {
        Speech.speak(text, { language: getLocale(), rate: 0.95 });
    }, 80);
}

/** Correct answer chime */
export function playDing() {
  return playSfx(require('../assets/sfx/ding.wav'));
}

/** Pitch-shifted correct answer chime — pitch rises with combo count */
export function playDingStreak(combo: number) {
  const safeCombo = Math.max(1, Math.min(10, Math.round(combo)));
  const sources = [
    require('../assets/sfx/ding_streak_1.wav'),
    require('../assets/sfx/ding_streak_2.wav'),
    require('../assets/sfx/ding_streak_3.wav'),
    require('../assets/sfx/ding_streak_4.wav'),
    require('../assets/sfx/ding_streak_5.wav'),
    require('../assets/sfx/ding_streak_6.wav'),
    require('../assets/sfx/ding_streak_7.wav'),
    require('../assets/sfx/ding_streak_8.wav'),
    require('../assets/sfx/ding_streak_9.wav'),
    require('../assets/sfx/ding_streak_10.wav'),
  ];
  return playSfx(sources[safeCombo - 1]);
}

/** Wrong answer buzz */
export function playWrong() {
  return playSfx(require('../assets/sfx/wrong.wav'));
}

/** Shop rejection (not enough gold) */
export function playReject() {
  return playSfx(require('../assets/sfx/reject.wav'));
}

/** Purchase / cash-in coin jingle (synthesised fallback) */
export function playPurchase() {
  return playSfx(require('../assets/sfx/purchase.wav'));
}

/** Gold leaving the player: the purchase jingle played backwards */
export function playGoldLoss() {
  return playSfx(require('../assets/sfx/gold_loss.wav'));
}

/** Victory fanfare (quiz complete, achievement claimed) */
export function playVictory() {
  return playSfx(require('../assets/sfx/victory.wav'));
}

/** Short tick (used in last 3s of Millionaire timer) */
export function playTick() {
  return playSfx(require('../assets/sfx/tick.wav'));
}

/** Gauntlet: heavy crash on wrong answer */
export function playGauntletFail() {
  return playSfx(require('../assets/sfx/gauntlet_fail.wav'));
}
/** Gauntlet: metallic clang when shield absorbs a hit */
export function playGauntletShield() {
  return playSfx(require('../assets/sfx/gauntlet_shield.wav'));
}
/** Gauntlet: ascending power arpeggio on tier escalation */
export function playGauntletTier() {
  return playSfx(require('../assets/sfx/gauntlet_tier.wav'));
}
/** Gauntlet: alarm siren + fanfare sting on boss round */
export function playGauntletBoss() {
  return playSfx(require('../assets/sfx/gauntlet_boss.wav'));
}

/** Gold counter gain sound in results animation */
export async function playGoldGain() {
  playPurchase();
  await delay(650);
}

/** XP bar fill ticking in results animation (no completion ding) */
export async function playXpGain(durationMs: number, ticksPerSecond: number = 10, shouldStop: () => boolean = () => false) {
  if (durationMs <= 0 || ticksPerSecond <= 0) return;

  const intervalMs = 1000 / ticksPerSecond;
  const endAt = Date.now() + durationMs;
  let sound: Audio.Sound | undefined;
  try {
    await initAudio();
    if (shouldStop()) return;
    ({ sound } = await Audio.Sound.createAsync(require('../assets/sfx/tick.wav')));
    while (!shouldStop() && Date.now() < endAt) {
      const tickAt = Date.now();
      // Reuse one loaded player; never queue missed ticks after a JS stall.
      await sound.replayAsync();
      await delay(Math.max(0, Math.min(endAt - Date.now(), intervalMs - (Date.now() - tickAt))));
    }
  } catch (error) {
    console.warn('[audio] XP playback failed', error);
  } finally {
    if (sound) await sound.unloadAsync().catch(() => {});
  }
}
