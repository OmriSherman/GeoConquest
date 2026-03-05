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
    rewardItem?: AchievementRewardItem;  // optional item unlocked on claim
    // Returns [current, target]
    getProgress: (stats: { ownedCount: number; areaSqKm: number; loginStreak: number }) => [number, number];
}

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
        rewardItem: { type: 'avatar', itemId: '🥷', label: 'Ninja' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 25), 25],
    },
    {
        id: 'empire_50',
        title: 'Global Hegemon',
        description: 'Claim 50 different countries.',
        icon: '👑',
        rewardGold: 5000,
        rewardItem: { type: 'avatar', itemId: 'svg_froglord', label: 'FrogLord' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 50), 50],
    },
    {
        id: 'area_1m',
        title: 'Vast Territories',
        description: 'Control over 1M sq km.',
        icon: '📏',
        rewardGold: 500,
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
        id: 'streak_7',
        title: 'Committed Explorer',
        description: 'Log in for 7 days in a row.',
        icon: '🔥',
        rewardGold: 5000,
        rewardItem: { type: 'flag', itemId: 'flag_svg_temeria', label: 'Temeria' },
        getProgress: (stats) => [Math.min(stats.loginStreak, 7), 7],
    },
    {
        id: 'streak_30',
        title: 'GeoConquest Addict',
        description: 'Log in for 30 days in a row.',
        icon: '📅',
        rewardGold: 25000,
        rewardItem: { type: 'avatar', itemId: 'svg_witcher', label: 'Witcher' },
        getProgress: (stats) => [Math.min(stats.loginStreak, 30), 30],
    },
];
