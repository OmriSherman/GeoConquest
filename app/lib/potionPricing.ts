import { getLevelInfo } from './xpSystem';
import type { PotionKind } from './dailyChest';

export function getRegularPotionPrice(kind: PotionKind, totalXp: number): number {
  const level = getLevelInfo(totalXp).level;
  return kind === 'gold_potion' ? 500 + level * 10 : 1000 + level * 20;
}
