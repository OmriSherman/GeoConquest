import { CUSTOM_AVATARS } from './avatarData';

export interface AchievementRewardItem {
    type: 'avatar' | 'flag';
    itemId: string;
    label: string;   // display name shown in UI
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    rewardGold: number;
    rewardItem?: AchievementRewardItem;   // single item (legacy / most quests)
    rewardItems?: AchievementRewardItem[]; // multiple items (e.g. World Domination)
    isPremium?: boolean;                 // continent/premium quests
    hidden?: boolean;                    // shown as ??? until condition met
    // Returns [current, target]
    getProgress: (stats: {
        ownedCount: number;
        areaSqKm: number;
        loginStreak: number;
        fastFlagMastery?: boolean;
        fastCapitalsMastery?: boolean;
        nightmareCompleted?: boolean;
        ownedByRegion?: Record<string, number>;
        totalByRegion?: Record<string, number>;
        ownedItems?: Set<string>;
        ownedAvatarCount?: number;
    }) => [number, number];
}

// Max-tier avatar keys (no other avatar requires them as prerequisite)
const _maxTierAvatarKeys = CUSTOM_AVATARS
    .filter(a => !CUSTOM_AVATARS.some(b => b.requiresId === a.key))
    .map(a => a.key);

export const ACHIEVEMENTS_DATA: Achievement[] = [
    {
        id: 'first_blood',
        title: 'First Conquest',
        description: 'Claim your very first country on the map.',
        icon: '🚩',
        rewardGold: 100,
        getProgress: (stats) => [Math.min(stats.ownedCount, 1), 1],
    },
    {
        id: 'empire_5',
        title: 'Growing Empire',
        description: 'Claim 5 different countries.',
        icon: '🗺️',
        rewardGold: 500,
        getProgress: (stats) => [Math.min(stats.ownedCount, 5), 5],
    },
    {
        id: 'empire_10',
        title: 'Imperial Ambitions',
        description: 'Claim 10 different countries.',
        icon: '🏰',
        rewardGold: 1000,
        rewardItem: { type: 'avatar', itemId: '🧙‍♂️', label: 'Wizard' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 10), 10],
    },
    {
        id: 'empire_25',
        title: 'World Power',
        description: 'Claim 25 different countries.',
        icon: '🌍',
        rewardGold: 2500,
        getProgress: (stats) => [Math.min(stats.ownedCount, 25), 25],
    },
    {
        id: 'empire_50',
        title: 'Global Hegemon',
        description: 'Claim 50 different countries.',
        icon: '👑',
        rewardGold: 1000,
        rewardItem: { type: 'avatar', itemId: '🥷', label: 'Ninja' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 50), 50],
    },
    {
        id: 'area_1m',
        title: 'Vast Territories',
        description: 'Control over 1M sq km.',
        icon: '📏',
        rewardGold: 1500,
        getProgress: (stats) => [Math.min(stats.areaSqKm, 1_000_000), 1_000_000],
    },
    {
        id: 'area_10m',
        title: 'Continental Span',
        description: 'Control over 10M sq km.',
        icon: '⛰️',
        rewardGold: 2000,
        rewardItem: { type: 'avatar', itemId: '🐉', label: 'Dragon' },
        getProgress: (stats) => [Math.min(stats.areaSqKm, 10_000_000), 10_000_000],
    },
    {
        id: 'area_100m',
        title: 'Master of Earth',
        description: 'Control over 100M sq km.',
        icon: '🌌',
        rewardGold: 10000,
        rewardItem: { type: 'avatar', itemId: '👑', label: 'Monarch' },
        getProgress: (stats) => [Math.min(stats.areaSqKm, 100_000_000), 100_000_000],
    },
    {
        id: 'streak_20',
        title: 'GeoConquest Addict',
        description: 'Log in for 20 days in a row.',
        icon: '📅',
        rewardGold: 25000,
        rewardItem: { type: 'avatar', itemId: 'svg_witcher', label: 'Witcher' },
        getProgress: (stats) => [Math.min(stats.loginStreak, 20), 20],
    },
    {
        id: 'flag_mastery_30s',
        title: 'Flag Quiz Speed Demon',
        description: 'Finish the Flag Quiz with >90% accuracy in under 30s.',
        icon: '⚡',
        rewardGold: 2500,
        rewardItem: { type: 'flag', itemId: '🔍', label: 'Speed Detective' },
        getProgress: (stats) => [stats.fastFlagMastery ? 1 : 0, 1],
    },
    {
        id: 'avatar_collector_10',
        title: 'Avatar Hunter',
        description: 'Collect 10 different avatars.',
        icon: '🎭',
        rewardGold: 3000,
        getProgress: (stats) => [Math.min(stats.ownedAvatarCount ?? 0, 10), 10],
    },
    {
        id: 'max_tier_avatar',
        title: 'Pinnacle Collector',
        description: 'Obtain the highest tier avatar in any collection.',
        icon: '🏆',
        rewardGold: 5000,
        getProgress: (stats) => {
            if (!stats.ownedItems) return [0, 1];
            const hasMaxTier = _maxTierAvatarKeys.some(k => stats.ownedItems!.has(k));
            return [hasMaxTier ? 1 : 0, 1];
        },
    },
    {
        // Hidden as ??? until the user owns the Dark Scroll upgrade
        id: 'nightmare_complete',
        title: 'Nightmare Survived',
        description: 'Complete the Nightmare Quiz.',
        icon: '💀',
        rewardGold: 25000,
        rewardItem: { type: 'avatar', itemId: 'png_beast_mark', label: 'Beast Mark' },
        getProgress: (stats) => [stats.nightmareCompleted ? 1 : 0, 1],
    },
    {
        id: 'complete_the_world',
        title: 'World Domination',
        description: 'Own all 250 countries in the world.',
        icon: '🌐',
        rewardGold: 100000,
        rewardItems: [
            { type: 'avatar', itemId: 'png_divine_high_king', label: 'Divine High King' },
            { type: 'avatar', itemId: 'png_divine_high_queen', label: 'Divine High Queen' },
        ],
        getProgress: (stats) => [Math.min(stats.ownedCount, 250), 250],
    },
    {
        // Hidden as ??? until nightmare_complete is claimed (Beast Mark obtained)
        id: 'true_conqueror',
        title: 'True Conqueror',
        description: 'Wield the Divine High King, Divine High Queen, and Beast Mark.',
        icon: '☠️',
        rewardGold: 500000,
        rewardItem: { type: 'avatar', itemId: 'png_the_singularity', label: 'The Singularity' },
        getProgress: (stats) => {
            const hasDHK = stats.ownedItems?.has('png_divine_high_king') ? 1 : 0;
            const hasDHQ = stats.ownedItems?.has('png_divine_high_queen') ? 1 : 0;
            const hasBeastMark = stats.ownedItems?.has('png_beast_mark') ? 1 : 0;
            return [hasDHK + hasDHQ + hasBeastMark, 3];
        },
    },

    {
        id: 'ground_invasion',
        title: 'Ground Invasion',
        description: 'Finish the Capitals Quiz with >90% accuracy in under 30s.',
        icon: '⚔️',
        rewardGold: 1000,
        rewardItem: { type: 'avatar', itemId: 'png_chariot', label: 'Chariot' },
        getProgress: (stats) => [stats.fastCapitalsMastery ? 1 : 0, 1],
    },

    // ─── Continent Quests (Premium) ───────────────────────────────────────────

    {
        id: 'conquer_africa',
        title: 'Sovereign of Africa',
        description: 'Own every country on the African continent.',
        icon: '🌍',
        isPremium: true,
        rewardGold: 8000,
        rewardItem: { type: 'avatar', itemId: 'png_triboi', label: 'Triboi' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Africa'] ?? 0,
            stats.totalByRegion?.['Africa'] ?? 54,
        ],
    },
    {
        id: 'conquer_europe',
        title: 'Emperor of Europe',
        description: 'Own every country in Europe.',
        icon: '🏰',
        isPremium: true,
        rewardGold: 6000,
        rewardItem: { type: 'avatar', itemId: 'png_euro_bro', label: 'EuroBro' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Europe'] ?? 0,
            stats.totalByRegion?.['Europe'] ?? 44,
        ],
    },
    {
        id: 'conquer_asia',
        title: 'Sultan of Asia',
        description: 'Own every country in Asia.',
        icon: '🏯',
        isPremium: true,
        rewardGold: 8000,
        rewardItem: { type: 'avatar', itemId: 'png_angry_man', label: 'AngryMan' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Asia'] ?? 0,
            stats.totalByRegion?.['Asia'] ?? 48,
        ],
    },
    {
        id: 'conquer_oceania',
        title: 'Pacific Overlord',
        description: 'Own every country in Oceania.',
        icon: '🌊',
        isPremium: true,
        rewardGold: 4000,
        rewardItem: { type: 'avatar', itemId: 'png_osi_boi', label: 'OsiBoi' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Oceania'] ?? 0,
            stats.totalByRegion?.['Oceania'] ?? 14,
        ],
    },
    {
        id: 'conquer_americas',
        title: 'Commander of the Americas',
        description: 'Own every country in the Americas.',
        icon: '🦅',
        isPremium: true,
        rewardGold: 8000,
        rewardItem: { type: 'avatar', itemId: 'png_freegle', label: 'Freegle' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Americas'] ?? 0,
            stats.totalByRegion?.['Americas'] ?? 35,
        ],
    },
];
