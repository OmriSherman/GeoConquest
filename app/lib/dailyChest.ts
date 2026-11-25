import type { ImageSourcePropType } from 'react-native';

export type ChestRewardKind = 'gold' | 'tickets' | 'xp_potion' | 'gold_potion' | 'avatar';
export type PotionKind = 'xp_potion' | 'gold_potion';
export interface ChestReward {
  kind: ChestRewardKind;
  quantity: number;
  tier: number;
  avatar_id?: string;
  duration?: number;
  boost_percent?: number;
  duplicate_fallback?: boolean;
}
export interface ChestState {
  tier: number;
  progress: number;
  last_claim_date: string | null;
  available: boolean;
  reward: ChestReward | null;
  server_date: string;
}
export interface Potion {
  kind: PotionKind;
  duration: number;
  quantity: number;
  remaining: number;
  boost_percent?: number;
}
export const CHEST_TIERS = [
  { name: 'Wooden', day: 1, color: '#DDA66D', gold: 250, tickets: 1, duration: 2, odds: [55, 35, 5, 5, 0], closed: require('../../assets/avatars/wooden_closed.png'), open: require('../../assets/avatars/wooden_open.png') },
  { name: 'Bronze', day: 4, color: '#F6AF63', gold: 400, tickets: 2, duration: 3, odds: [45, 40, 8, 7, 0], closed: require('../../assets/avatars/bronze_closed.png'), open: require('../../assets/avatars/bronze_open.png') },
  { name: 'Silver', day: 8, color: '#A9CDFF', gold: 500, tickets: 3, duration: 3, odds: [35, 35, 15, 12, 3], closed: require('../../assets/avatars/silver_closed.png'), open: require('../../assets/avatars/silver_open.png') },
  { name: 'Gold', day: 12, color: '#FFD86A', gold: 600, tickets: 4, duration: 4, odds: [30, 30, 18, 18, 4], closed: require('../../assets/avatars/gold_closed.png'), open: require('../../assets/avatars/gold_open.png') },
  { name: 'Royal', day: 16, color: '#D4ABFF', gold: 800, tickets: 6, duration: 5, odds: [30, 30, 18, 18, 4], closed: require('../../assets/avatars/royal_closed.png'), open: require('../../assets/avatars/royal_open.png') },
  { name: 'Legendary', day: 20, color: '#FFE69A', gold: 1000, tickets: 8, duration: 5, odds: [30, 30, 17, 17, 6], closed: require('../../assets/avatars/legendary_closed.png'), open: require('../../assets/avatars/legendary_open.png') },
] as const;

export const CHEST_AVATARS = [
  { id: 'png_map_mouse', name: 'Map Mouse', tier: 3, price: 2500, image: require('../../assets/avatars/map_mouse.png') },
  { id: 'png_compass_crow', name: 'Compass Crow', tier: 3, price: 3000, image: require('../../assets/avatars/compass_crow.png') },
  { id: 'png_coin_crab', name: 'Coin Crab', tier: 3, price: 3500, image: require('../../assets/avatars/coin_crab.png') },
  { id: 'png_treasure_gecko', name: 'Treasure Gecko', tier: 4, price: 5000, image: require('../../assets/avatars/treasure_gecko.png') },
  { id: 'png_gilded_cartographer', name: 'Gilded Cartographer', tier: 4, price: 6000, image: require('../../assets/avatars/gilded_cartographer.png') },
  { id: 'png_ruby_scarab', name: 'Ruby Scarab', tier: 4, price: 7000, image: require('../../assets/avatars/ruby_scarab.png') },
  { id: 'png_duchess', name: 'Duchess', tier: 5, price: 9000, image: require('../../assets/avatars/duchess.png') },
  { id: 'png_velvet_jackal', name: 'Velvet Jackal', tier: 5, price: 10000, image: require('../../assets/avatars/velvet_jackal.png') },
  { id: 'png_worldshell_turtle', name: 'Worldshell Turtle', tier: 6, price: 15000, image: require('../../assets/avatars/worldshell_turtle.png') },
  { id: 'png_eclipse_navigator', name: 'Eclipse Navigator', tier: 6, price: 18000, image: require('../../assets/avatars/eclipse_navigator.png') },
];
export const REWARD_KINDS: ChestRewardKind[] = ['gold', 'tickets', 'xp_potion', 'gold_potion', 'avatar'];
export const REWARD_IMAGES: Record<ChestRewardKind, ImageSourcePropType> = {
  gold: require('../../assets/avatars/gold_coin.png'),
  tickets: require('../../assets/avatars/raffle_ticket.png'),
  xp_potion: require('../../assets/avatars/xp_potion.png'),
  gold_potion: require('../../assets/avatars/gold_potion.png'),
  avatar: require('../../assets/avatars/map_mouse.png'),
};
export const REWARD_NAMES: Record<ChestRewardKind, string> = {
  gold: 'Gold', tickets: 'Tickets', xp_potion: 'XP potion', gold_potion: 'Gold potion', avatar: 'New avatar',
};
export function rewardImage(reward: ChestReward) {
  return CHEST_AVATARS.find(a => a.id === reward.avatar_id)?.image ?? REWARD_IMAGES[reward.kind];
}
export function rewardName(reward: ChestReward) {
  return CHEST_AVATARS.find(a => a.id === reward.avatar_id)?.name ?? REWARD_NAMES[reward.kind];
}
