import { WONDER_COLOR_COUNT } from './wondersData';

/**
 * Picks the next color layer to reveal for a wonder, uniformly at random among
 * the layers the player has not unlocked yet. Returns null once all are unlocked.
 *
 * `unlocked` is the list of layer indexes (0..9) the player already has.
 * `rand` is injectable so tests (or a seeded server-side pick) can be deterministic.
 */
export function pickNextLayer(unlocked: number[], rand: () => number = Math.random): number | null {
  const have = new Set(unlocked);
  const locked: number[] = [];
  for (let i = 0; i < WONDER_COLOR_COUNT; i++) {
    if (!have.has(i)) locked.push(i);
  }
  if (locked.length === 0) return null;
  return locked[Math.floor(rand() * locked.length)];
}
