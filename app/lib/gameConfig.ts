import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Economy numbers editable from the admin dashboard (table game_config).
// Every key has a built-in default below, so the app works offline and before the migration is run.
// Changes apply on next app open / return to foreground.

export const CONFIG_DEFAULTS: Record<string, number> = {
  'quiz.gold.flag': 10, 'quiz.gold.shape': 15, 'quiz.gold.capitals': 18, 'quiz.gold.borders': 20, 'quiz.gold.trail': 20, 'quiz.gold.compass': 50, 'compass.w.good': 0.6, 'compass.w.close': 0.3, 'level.compass': 60,
  'quiz.xp.flag': 5, 'quiz.xp.shape': 7, 'quiz.xp.capitals': 12, 'quiz.xp.borders': 15, 'quiz.xp.trail': 16, 'quiz.xp.compass': 30,
  'quiz.mult.easy': 0.75, 'quiz.mult.medium': 1, 'quiz.mult.hard': 1.25,
  'shop.ticket.price': 500, 'shop.ticket_pack.price': 2200,
  'shop.country.area_factor': 0.01, 'shop.country.min': 20,
  'shop.upgrade.capitals': 2000, 'shop.upgrade.borders': 2000, 'shop.upgrade.nightmare': 66666,
  'shop.upgrade.infinite_maps': 50000, 'shop.upgrade.millionaire_skip': 30000, 'shop.upgrade.border_draw': 50000,
  'shop.quiz_turns.20': 2000, 'shop.quiz_turns.30': 5000,
  'feature.server_quiz_rewards': 0, 'feature.server_all_modes': 0, 'feature.rc_webhook': 0, 'xp.levelup_gold_per_level': 20, 'nightmare.penalty_min_pct': 1, 'nightmare.penalty_max_pct': 10,
  'mythic.odds.gold_25000': 56, 'mythic.odds.gold_75000': 10, 'mythic.odds.gold_150000': 5, 'mythic.odds.xp': 3,
  'mythic.odds.xp_potion': 12, 'mythic.odds.gold_potion': 12, 'mythic.odds.avatar': 2,
};

const CACHE_KEY = '@geoconquest/game_config';
let values: Record<string, number> = {};
let version = 0;
const listeners = new Set<() => void>();

/** Current value for a key: dashboard value, else cached, else `fallback`, else built-in default. */
export function cfg(key: string, fallback?: number): number {
  return values[key] ?? fallback ?? CONFIG_DEFAULTS[key] ?? 0;
}

function apply(next: Record<string, number>) {
  values = next;
  version++;
  listeners.forEach(l => l());
}

export async function loadGameConfig() {
  try {
    const { data, error } = await supabase.from('game_config').select('key,value');
    if (error || !data) return;
    const next: Record<string, number> = {};
    for (const r of data as { key: string; value: number | string }[]) next[r.key] = Number(r.value);
    apply(next);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
  } catch {}
}

/** Call once at app start: loads the cache, fetches fresh values, and refreshes on foreground. */
export function startGameConfig() {
  AsyncStorage.getItem(CACHE_KEY).then(raw => { if (raw && !Object.keys(values).length) apply(JSON.parse(raw)); }).catch(() => {});
  void loadGameConfig();
  AppState.addEventListener('change', s => { if (s === 'active') void loadGameConfig(); });
}

/** Re-render when config changes (for screens that show prices). */
export function useGameConfig() {
  const [, setV] = useState(version);
  useEffect(() => { const l = () => setV(version); listeners.add(l); return () => { listeners.delete(l); }; }, []);
}

/** True when an RPC does not exist yet (its migration has not been run), so callers can fall back to the old path. */
export function isMissingRpc(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === 'PGRST202' || error.code === '42883' || /could not find the function/i.test(error.message ?? ''));
}

/** True once the 5c migration is live: the server settles Flags/Shapes/Capitals/Borders rewards. */
export function serverQuizRewards(): boolean {
  return cfg('feature.server_quiz_rewards') === 1;
}

/** Does the server pay this quiz type? (standard modes: 5c; every other mode: the all-modes migration) */
export function serverRewardsFor(quizType: string): boolean {
  if (['flag', 'shape', 'capitals', 'borders'].includes(quizType)) return serverQuizRewards();
  return serverQuizRewards() && cfg('feature.server_all_modes') === 1;
}
