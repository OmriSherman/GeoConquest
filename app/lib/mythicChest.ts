import type { ImageSourcePropType } from 'react-native';
import { cfg } from './gameConfig';

export type MythicRewardKind = 'gold' | 'xp' | 'xp_potion' | 'gold_potion' | 'avatar';
export interface MythicReward {
  kind: MythicRewardKind;
  quantity: number;
  avatar_id?: string;
  duration?: number;
  boost_percent?: number;
  no_level_up_gold?: boolean;
  duplicate_fallback?: boolean;
}
export interface MythicChestState {
  mythic_chests: number;
  mythic_monthly_chests: number;
  mythic_bonus_chests: number;
  mythic_monthly_opened: number;
  mythic_dust: number;
}
export const MYTHIC_DROP_RATES = [
  { key: 'gold_25000', label: '25,000 Gold', get rate() { return cfg('mythic.odds.gold_25000'); } },
  { key: 'gold_75000', label: '75,000 Gold', get rate() { return cfg('mythic.odds.gold_75000'); } },
  { key: 'gold_150000', label: '150,000 Gold', get rate() { return cfg('mythic.odds.gold_150000'); } },
  { key: 'xp', label: '20,000 XP', get rate() { return cfg('mythic.odds.xp'); } },
  { key: 'xp_potion', label: 'Mythic XP Potion · 10 quizzes', get rate() { return cfg('mythic.odds.xp_potion'); } },
  { key: 'gold_potion', label: 'Mythic Gold Potion · 10 quizzes', get rate() { return cfg('mythic.odds.gold_potion'); } },
  { key: 'avatar', label: 'Unique Mythic Avatar', get rate() { return cfg('mythic.odds.avatar'); } },
] as const;
export const MYTHIC_AVATARS = [
  { id: 'png_worldbreaker_empress', name: 'Worldbreaker Empress', image: require('../../assets/avatars/worldbreaker_empress.png') },
  { id: 'png_storm_navigator', name: 'Storm Navigator', image: require('../../assets/avatars/storm_navigator.png') },
  { id: 'png_mapless_heroine', name: 'Mapless Heroine', image: require('../../assets/avatars/mapless_heroine.png') },
  { id: 'png_mapless_hero', name: 'Mapless Hero', image: require('../../assets/avatars/mapless_hero.png') },
  { id: 'png_longitude_ronin', name: 'Longitude Ronin', image: require('../../assets/avatars/longitude_ronin.png') },
  { id: 'png_meridian_oracle', name: 'Meridian Oracle', image: require('../../assets/avatars/meridian_oracle.png') },
  { id: 'png_border_phantom', name: 'Border Phantom', image: require('../../assets/avatars/border_phantom.png') },
  { id: 'png_cosmic_pigeon', name: 'Cosmic Pigeon', image: require('../../assets/avatars/cosmic_pigeon.png') },
  { id: 'png_globe_eater', name: 'Globe Eater', image: require('../../assets/avatars/globe_eater.png') },
  { id: 'png_conquest_frog', name: 'Conquest Frog', image: require('../../assets/avatars/conquest_frog.png') },
] as const;
export const CHOICE_REWARDS = [
  { key: 'gold_25000', label: '25,000 Gold' }, { key: 'gold_75000', label: '75,000 Gold' },
  { key: 'gold_150000', label: '150,000 Gold' }, { key: 'xp', label: '20,000 XP' },
  { key: 'xp_potion', label: 'Mythic XP Potion' }, { key: 'gold_potion', label: 'Mythic Gold Potion' },
] as const;
export const MYTHIC_REWARD_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  avatar: MYTHIC_AVATARS[0].image,
  gold_25000: require('../../assets/avatars/gold_coin.png'),
  gold_75000: require('../../assets/avatars/gold_bag.png'),
  gold_150000: require('../../assets/avatars/treasure_chest.png'),
  xp: require('../../assets/avatars/mythic_xp_crystal.png'),
  xp_potion: require('../../assets/avatars/mythic_xp_potion.png'),
  gold_potion: require('../../assets/avatars/mythic_gold_potion.png'),
};
export const MYTHIC_DUST_IMAGE = require('../../assets/avatars/mythic_dust_crystal.png');
export function rewardLabel(reward: MythicReward) {
  if (reward.avatar_id) return MYTHIC_AVATARS.find(a => a.id === reward.avatar_id)?.name ?? 'Mythic Avatar';
  if (reward.kind === 'gold') return `${reward.quantity.toLocaleString()} Gold`;
  if (reward.kind === 'xp') return `${reward.quantity.toLocaleString()} XP`;
  return reward.kind === 'xp_potion' ? 'Mythic XP Potion' : 'Mythic Gold Potion';
}
export function rewardImage(reward: MythicReward): ImageSourcePropType {
  if (reward.avatar_id) return MYTHIC_AVATARS.find(a => a.id === reward.avatar_id)?.image ?? MYTHIC_AVATARS[0].image;
  if (reward.kind === 'gold') return reward.quantity >= 150000 ? MYTHIC_REWARD_IMAGES.gold_150000! : reward.quantity >= 75000 ? MYTHIC_REWARD_IMAGES.gold_75000! : MYTHIC_REWARD_IMAGES.gold_25000!;
  return MYTHIC_REWARD_IMAGES[reward.kind] ?? MYTHIC_REWARD_IMAGES.xp!;
}
