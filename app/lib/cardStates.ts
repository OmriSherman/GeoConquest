/**
 * Unified card state system.
 * Every purchasable/lockable card in the game uses one of these states.
 *
 * States:
 *   normal  — standard gold price badge
 *   leveled — requires a minimum player level; shows "🔒 Lvl X" instead of price
 *   premium — requires Conqueror's Pass subscription; shows price but tapping triggers paywall
 *   unique  — requires a special/unique unlock condition (quest reward, specific item prerequisite, etc.)
 *
 * Cards can have multiple states simultaneously (e.g. premium + leveled).
 * Priority for card background: premium > leveled > unique > normal
 * Priority for badge content: leveled always wins (shows level instead of price, per spec)
 */

export type CardStateName = 'leveled' | 'premium' | 'unique';
export type PaletteName = 'normal' | CardStateName;

export const CARD_PALETTES: Record<PaletteName, {
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
}> = {
  /** Default — purchasable with gold */
  normal: {
    cardBg: '#1a1a2e',
    cardBorder: '#2a2a4e',
    badgeBg: '#1a1a30',
    badgeBorder: '#FFD700',
    badgeColor: '#FFD700',
  },
  /** Requires reaching a minimum player level */
  leveled: {
    cardBg: '#0d1b2a',
    cardBorder: '#1a3a5a',
    badgeBg: '#0d1b2a',
    badgeBorder: '#4a9eff',
    badgeColor: '#4a9eff',
  },
  /** Requires Conqueror's Pass subscription */
  premium: {
    cardBg: '#1a0d2e',
    cardBorder: '#5a3a8a',
    badgeBg: '#2a1a4a',
    badgeBorder: '#FFD700',
    badgeColor: '#FFD700',
  },
  /** Requires a special/unique condition (quest reward, specific item prerequisite, etc.) */
  unique: {
    cardBg: '#0a1c1a',
    cardBorder: '#1a4a44',
    badgeBg: '#0a1c1a',
    badgeBorder: '#2ae8c8',
    badgeColor: '#2ae8c8',
  },
};

export interface CardStateResult {
  /** All active states on this card */
  states: CardStateName[];
  /** Highest-priority state — drives card background/border */
  primaryState: PaletteName;
  /** State driving the badge (leveled always wins) */
  badgeState: PaletteName;
  isLevelLocked: boolean;
  isSubscriptionLocked: boolean;
  isQuestOnly: boolean;
  isUniqueUnlock: boolean;
  /** Opacity for the card's inner content (avatar image, icon, etc.) */
  contentOpacity: number;
}

export function resolveCardState(opts: {
  isUnlocked: boolean;
  isSubscriptionLocked?: boolean;
  requiredLevel?: number;
  playerLevel?: number;
  isQuestOnly?: boolean;
  /** True when this card has a special item/quest prerequisite beyond just gold + level */
  isUniqueUnlock?: boolean;
}): CardStateResult {
  const {
    isUnlocked,
    isSubscriptionLocked = false,
    requiredLevel = 0,
    playerLevel = 0,
    isQuestOnly = false,
    isUniqueUnlock = false,
  } = opts;

  if (isUnlocked) {
    return {
      states: [],
      primaryState: 'normal',
      badgeState: 'normal',
      isLevelLocked: false,
      isSubscriptionLocked: false,
      isQuestOnly: false,
      isUniqueUnlock: false,
      contentOpacity: 1,
    };
  }

  const isLevelLocked = requiredLevel > 0 && playerLevel < requiredLevel;

  const states: CardStateName[] = [];
  if (isSubscriptionLocked) states.push('premium');
  if (isLevelLocked) states.push('leveled');
  if (isQuestOnly || isUniqueUnlock) states.push('unique');

  // Card background: premium > leveled > unique > normal
  const primaryState: PaletteName =
    states.includes('premium') ? 'premium' :
    states.includes('leveled') ? 'leveled' :
    states.includes('unique') ? 'unique' : 'normal';

  // Badge: leveled always overrides (shows level requirement instead of anything else)
  const badgeState: PaletteName =
    states.includes('leveled') ? 'leveled' :
    states.includes('premium') ? 'premium' :
    states.includes('unique') ? 'unique' : 'normal';

  return {
    states,
    primaryState,
    badgeState,
    isLevelLocked,
    isSubscriptionLocked,
    isQuestOnly,
    isUniqueUnlock,
    contentOpacity: states.length > 0 ? 0.4 : 1,
  };
}
