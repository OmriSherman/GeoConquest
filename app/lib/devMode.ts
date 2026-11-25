import { ACHIEVEMENTS_DATA } from './achievementsData';
import { CUSTOM_AVATARS, CUSTOM_FLAGS, FLAG_OPTIONS } from './avatarData';

export const DEV_MODE = typeof __DEV__ !== 'undefined' && __DEV__;

export const DEV_UNLOCKED_ITEM_IDS = new Set([
  ...CUSTOM_AVATARS.map((item) => item.key),
  ...CUSTOM_FLAGS.map((item) => item.key),
  ...FLAG_OPTIONS.map((item) => item.emoji),
  ...ACHIEVEMENTS_DATA.flatMap((achievement) =>
    (achievement.rewardItems ?? (achievement.rewardItem ? [achievement.rewardItem] : [])).map((item) => item.itemId),
  ),
  'upgrade_capitals',
  'upgrade_borders',
  'upgrade_border_draw',
  'upgrade_level_2',
  'upgrade_level_3',
  'upgrade_millionaire_skip',
  'upgrade_nightmare',
  'upgrade_infinite_maps',
]);
