import type { ImageSourcePropType } from 'react-native';
import { cfg } from './gameConfig';

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
  { name: 'Wooden', day: 1, color: '#DDA66D', get gold() { return cfg('chest.t1.gold', 250); }, get tickets() { return cfg('chest.t1.tickets', 1); }, get duration() { return cfg('chest.t1.duration', 2); }, get odds() { return [cfg('chest.t1.odds_gold', 55), cfg('chest.t1.odds_tickets', 35), cfg('chest.t1.odds_xp_potion', 5), cfg('chest.t1.odds_gold_potion', 5), cfg('chest.t1.odds_avatar', 0)]; }, closed: require('../../assets/avatars/wooden_closed.png'), open: require('../../assets/avatars/wooden_open.png') },
  { name: 'Bronze', day: 4, color: '#F6AF63', get gold() { return cfg('chest.t2.gold', 400); }, get tickets() { return cfg('chest.t2.tickets', 2); }, get duration() { return cfg('chest.t2.duration', 3); }, get odds() { return [cfg('chest.t2.odds_gold', 45), cfg('chest.t2.odds_tickets', 40), cfg('chest.t2.odds_xp_potion', 8), cfg('chest.t2.odds_gold_potion', 7), cfg('chest.t2.odds_avatar', 0)]; }, closed: require('../../assets/avatars/bronze_closed.png'), open: require('../../assets/avatars/bronze_open.png') },
  { name: 'Silver', day: 8, color: '#A9CDFF', get gold() { return cfg('chest.t3.gold', 500); }, get tickets() { return cfg('chest.t3.tickets', 3); }, get duration() { return cfg('chest.t3.duration', 3); }, get odds() { return [cfg('chest.t3.odds_gold', 35), cfg('chest.t3.odds_tickets', 35), cfg('chest.t3.odds_xp_potion', 15), cfg('chest.t3.odds_gold_potion', 12), cfg('chest.t3.odds_avatar', 3)]; }, closed: require('../../assets/avatars/silver_closed.png'), open: require('../../assets/avatars/silver_open.png') },
  { name: 'Gold', day: 12, color: '#FFD86A', get gold() { return cfg('chest.t4.gold', 600); }, get tickets() { return cfg('chest.t4.tickets', 4); }, get duration() { return cfg('chest.t4.duration', 4); }, get odds() { return [cfg('chest.t4.odds_gold', 30), cfg('chest.t4.odds_tickets', 30), cfg('chest.t4.odds_xp_potion', 18), cfg('chest.t4.odds_gold_potion', 18), cfg('chest.t4.odds_avatar', 4)]; }, closed: require('../../assets/avatars/gold_closed.png'), open: require('../../assets/avatars/gold_open.png') },
  { name: 'Royal', day: 16, color: '#D4ABFF', get gold() { return cfg('chest.t5.gold', 800); }, get tickets() { return cfg('chest.t5.tickets', 6); }, get duration() { return cfg('chest.t5.duration', 5); }, get odds() { return [cfg('chest.t5.odds_gold', 30), cfg('chest.t5.odds_tickets', 30), cfg('chest.t5.odds_xp_potion', 18), cfg('chest.t5.odds_gold_potion', 18), cfg('chest.t5.odds_avatar', 4)]; }, closed: require('../../assets/avatars/royal_closed.png'), open: require('../../assets/avatars/royal_open.png') },
  { name: 'Legendary', day: 20, color: '#FFE69A', get gold() { return cfg('chest.t6.gold', 1000); }, get tickets() { return cfg('chest.t6.tickets', 8); }, get duration() { return cfg('chest.t6.duration', 5); }, get odds() { return [cfg('chest.t6.odds_gold', 30), cfg('chest.t6.odds_tickets', 30), cfg('chest.t6.odds_xp_potion', 17), cfg('chest.t6.odds_gold_potion', 17), cfg('chest.t6.odds_avatar', 6)]; }, closed: require('../../assets/avatars/legendary_closed.png'), open: require('../../assets/avatars/legendary_open.png') },
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
