import { CUSTOM_AVATARS } from './avatarData';

export interface AchievementRewardItem {
    type: 'avatar' | 'flag' | 'item';
    itemId: string;
    label: string;   // display name shown in UI
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    rewardGold: number;
    rewardTickets?: number;              // millionaire tickets awarded on claim
    rewardItem?: AchievementRewardItem;   // single item (legacy / most quests)
    rewardItems?: AchievementRewardItem[]; // multiple items (e.g. World Domination)
    isPremium?: boolean;                 // continent/premium quests
    hidden?: boolean;                    // shown as ??? until condition met
    prerequisite?: string;               // quest id that must be claimed first
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
        playerLevel?: number;
        quizCount?: number;
        excellentScoreCount?: number;
        trailBestScore?: number;
        gauntletBestScore?: number;
        dailyFirstPlaceWins?: number;
        perfectAccuracyCount?: number;
    }) => [number, number];
}

// Max-tier avatar keys: avatars whose collection name contains "Tier 3"
const _maxTierAvatarKeys = CUSTOM_AVATARS
    .filter(a => a.collection?.toLowerCase().includes('tier 3'))
    .map(a => a.key);

export const ACHIEVEMENTS_DATA: Achievement[] = [

    // ─── Level Quests ─────────────────────────────────────────────────────────

    {
        id: 'level_10',
        title: 'First Ascension',
        description: 'Reach Level 10.',
        icon: 'png_star',
        rewardGold: 1000,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 10), 10],
    },
    {
        id: 'level_25',
        title: 'Seasoned Explorer',
        description: 'Reach Level 25.',
        icon: 'png_star2',
        rewardGold: 2500,
        rewardTickets: 1,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 25), 25],
    },
    {
        id: 'level_30',
        title: 'Veteran Tactician',
        description: 'Reach Level 30.',
        icon: 'png_war_medal',
        isPremium: true,
        rewardGold: 5000,
        rewardTickets: 5,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 30), 30],
    },
    {
        id: 'level_50',
        title: 'Elite Conqueror',
        description: 'Reach Level 50.',
        icon: 'png_diamond',
        rewardGold: 5000,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 50), 50],
    },
    {
        id: 'level_80',
        title: 'Legendary Commander',
        description: 'Reach Level 80.',
        icon: 'png_commando',
        rewardGold: 8000,
        rewardTickets: 5,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 80), 80],
    },
    {
        id: 'level_100',
        title: 'God of Geography',
        description: 'Reach Level 100.',
        icon: 'png_sun',
        rewardGold: 10000,
        rewardTickets: 10,
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 100), 100],
    },
    // ─── Countries ────────────────────────────────────────────────────────────

    {
        id: 'first_blood',
        title: 'First Conquest',
        description: 'Claim your very first country on the map.',
        icon: 'png_flags',
        rewardGold: 100,
        getProgress: (stats) => [Math.min(stats.ownedCount, 1), 1],
    },
    {
        id: 'empire_5',
        title: 'Growing Empire',
        description: 'Claim 5 different countries.',
        icon: 'png_shape',
        rewardGold: 500,
        getProgress: (stats) => [Math.min(stats.ownedCount, 5), 5],
    },
    {
        id: 'empire_10',
        title: 'Imperial Ambitions',
        description: 'Claim 10 different countries.',
        icon: 'png_castle',
        rewardGold: 1000,
        rewardItem: { type: 'avatar', itemId: 'png_rotten_crown', label: 'Rotten Crown' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 10), 10],
    },
    {
        id: 'empire_25',
        title: 'World Power',
        description: 'Claim 25 different countries.',
        icon: 'png_globe',
        rewardGold: 2500,
        rewardTickets: 1,
        getProgress: (stats) => [Math.min(stats.ownedCount, 25), 25],
    },
    {
        id: 'empire_50',
        title: 'Global Hegemon',
        description: 'Claim 50 different countries.',
        icon: 'png_crown',
        rewardGold: 1000,
        rewardTickets: 1,
        rewardItem: { type: 'avatar', itemId: 'png_meme_relic_frog', label: 'Chillin' },
        getProgress: (stats) => [Math.min(stats.ownedCount, 50), 50],
    },

    // ─── Login Streak ─────────────────────────────────────────────────────────

    {
        id: 'streak_20',
        title: 'GeoConquest Addict',
        description: 'Log in for 20 days in a row.',
        icon: 'png_calendar',
        rewardGold: 25000,
        rewardTickets: 2,
        getProgress: (stats) => [Math.min(stats.loginStreak, 20), 20],
    },

    // ─── Territory ────────────────────────────────────────────────────────────

    {
        id: 'area_1m',
        title: 'Vast Territories',
        description: 'Control over 1M sq km.',
        icon: 'png_ruler',
        rewardGold: 1500,
        getProgress: (stats) => [Math.min(stats.areaSqKm, 1_000_000), 1_000_000],
    },
    {
        id: 'area_10m',
        title: 'Continental Span',
        description: 'Control over 10M sq km.',
        icon: 'png_mountain',
        rewardGold: 2000,
        rewardTickets: 2,
        getProgress: (stats) => [Math.min(stats.areaSqKm, 10_000_000), 10_000_000],
    },
    {
        id: 'area_100m',
        title: 'Master of Earth',
        description: 'Control over 100M sq km.',
        icon: 'png_galaxy',
        rewardGold: 10000,
        rewardTickets: 3,
        getProgress: (stats) => [Math.min(stats.areaSqKm, 100_000_000), 100_000_000],
    },

    // ─── Continent Quests (Premium) ───────────────────────────────────────────

    {
        id: 'conquer_africa',
        title: 'Sovereign of Africa',
        description: 'Own every country on the African continent.',
        icon: 'png_globe',
        isPremium: true,
        rewardGold: 8000,
        rewardTickets: 7,
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
        icon: 'png_castle',
        isPremium: true,
        rewardGold: 6000,
        rewardTickets: 7,
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
        icon: 'png_castle',
        isPremium: true,
        rewardGold: 8000,
        rewardTickets: 7,
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
        icon: 'png_wave',
        isPremium: true,
        rewardGold: 4000,
        rewardTickets: 7,
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
        icon: 'png_eagle',
        isPremium: true,
        rewardGold: 8000,
        rewardTickets: 7,
        rewardItem: { type: 'avatar', itemId: 'png_freegle', label: 'Freegle' },
        getProgress: (stats) => [
            stats.ownedByRegion?.['Americas'] ?? 0,
            stats.totalByRegion?.['Americas'] ?? 35,
        ],
    },

    // ─── Quiz Mastery ─────────────────────────────────────────────────────────

    {
        id: 'flag_mastery_30s',
        title: 'Speed Detective',
        description: 'Finish the Flag Quiz with >90% accuracy in under 30s.',
        icon: 'png_lightning',
        rewardGold: 2500,
        getProgress: (stats) => [stats.fastFlagMastery ? 1 : 0, 1],
    },
    {
        id: 'ground_invasion',
        title: 'Ground Invasion',
        description: 'Finish the Capitals Quiz with >90% accuracy in under 30s.',
        icon: 'png_crossed_swords',
        rewardGold: 1000,
        getProgress: (stats) => [stats.fastCapitalsMastery ? 1 : 0, 1],
    },

    // ─── Quiz Milestones ──────────────────────────────────────────────────────

    {
        id: 'quiz_10',
        title: 'Quiz Rookie',
        description: 'Complete 10 quizzes of any type.',
        icon: 'png_open_scroll',
        rewardGold: 1000,
        rewardTickets: 1,
        getProgress: (stats) => [Math.min(stats.quizCount ?? 0, 10), 10],
    },
    {
        id: 'quiz_50',
        title: 'Quiz Veteran',
        description: 'Complete 50 quizzes of any type.',
        icon: 'png_compass',
        rewardGold: 2500,
        rewardTickets: 3,
        getProgress: (stats) => [Math.min(stats.quizCount ?? 0, 50), 50],
    },
    {
        id: 'excellence_20',
        title: 'Scholar of the World',
        description: 'Score 85% or higher in 20 different quizzes.',
        icon: 'png_hourglass',
        rewardGold: 5000,
        rewardTickets: 2,
        getProgress: (stats) => [Math.min(stats.excellentScoreCount ?? 0, 20), 20],
    },
    {
        id: 'trail_blazer_50',
        title: 'Trail Blazer',
        description: 'Answer 50 questions correctly in a single Trail Quiz run.',
        icon: 'png_caravel',
        rewardGold: 3000,
        rewardTickets: 1,
        getProgress: (stats) => [Math.min(stats.trailBestScore ?? 0, 50), 50],
    },
    {
        id: 'gauntlet_ascendant',
        title: 'Ascendant',
        description: 'Reach level 100 in the Gauntlet.',
        icon: 'png_crucible',
        rewardGold: 10000,
        rewardTickets: 5,
        rewardItem: { type: 'avatar', itemId: 'png_doom_paladin', label: 'Doom Paladin' },
        getProgress: (stats) => [Math.min(stats.gauntletBestScore ?? 0, 100), 100],
    },
    {
        id: 'perfect_accuracy_15',
        title: 'Precision',
        description: 'Achieve 100% accuracy in 15 different quizzes.',
        icon: 'png_sextant',
        rewardGold: 7000,
        rewardTickets: 3,
        getProgress: (stats) => [Math.min(stats.perfectAccuracyCount ?? 0, 15), 15],
    },
    {
        id: 'daily_champion_5',
        title: 'Champion of the Day',
        description: 'Finish in 1st place in the daily challenge 5 times.',
        icon: 'png_trophy',
        rewardGold: 10000,
        rewardTickets: 3,
        rewardItem: { type: 'avatar', itemId: 'png_void_eye', label: 'Void Eye' },
        getProgress: (stats) => [Math.min(stats.dailyFirstPlaceWins ?? 0, 5), 5],
    },

    // ─── Collection ───────────────────────────────────────────────────────────

    {
        id: 'avatar_collector_10',
        title: 'Avatar Hunter',
        description: 'Collect 10 different avatars.',
        icon: 'png_theater_mask',
        rewardGold: 3000,
        rewardTickets: 1,
        getProgress: (stats) => [Math.min(stats.ownedAvatarCount ?? 0, 10), 10],
    },
    {
        id: 'max_tier_avatar',
        title: 'Pinnacle Collector',
        description: 'Obtain the highest tier avatar in any collection.',
        icon: 'png_trophy',
        rewardGold: 5000,
        rewardTickets: 1,
        getProgress: (stats) => {
            if (!stats.ownedItems) return [0, 1];
            const hasMaxTier = _maxTierAvatarKeys.some(k => stats.ownedItems!.has(k));
            return [hasMaxTier ? 1 : 0, 1];
        },
    },

    // ─── Endgame ──────────────────────────────────────────────────────────────

    {
        id: 'complete_the_world',
        title: 'World Domination',
        description: 'Own all 250 countries in the world.',
        icon: 'png_domination',
        rewardGold: 100000,
        rewardTickets: 10,
        rewardItems: [
            { type: 'avatar', itemId: 'png_divine_high_king', label: 'Divine High King' },
            { type: 'avatar', itemId: 'png_divine_high_queen', label: 'Divine High Queen' },
        ],
        getProgress: (stats) => [Math.min(stats.ownedCount, 250), 250],
    },
    {
        // Hidden as ??? until the user owns the Dark Scroll upgrade
        id: 'nightmare_complete',
        title: 'Nightmare Survived',
        description: 'Well played, conqueror of the underworld.',
        icon: 'png_evil_vanquished',
        rewardGold: 25000,
        rewardItem: { type: 'avatar', itemId: 'png_beast_mark', label: 'Beast Mark' },
        getProgress: (stats) => [stats.nightmareCompleted ? 1 : 0, 1],
    },
    {
        // Hidden as ??? until nightmare_complete is claimed (Beast Mark obtained)
        id: 'true_conqueror',
        title: 'There is only one.',
        description: 'Wield the Divine High King, Divine High Queen, and Beast Mark.',
        icon: 'png_demon',
        rewardGold: 500000,
        getProgress: (stats) => {
            const hasDHK = stats.ownedItems?.has('png_divine_high_king') ? 1 : 0;
            const hasDHQ = stats.ownedItems?.has('png_divine_high_queen') ? 1 : 0;
            const hasBeastMark = stats.ownedItems?.has('png_beast_mark') ? 1 : 0;
            return [hasDHK + hasDHQ + hasBeastMark, 3];
        },
    },
    {
        // Hidden as ??? until true_conqueror is claimed
        id: 'never_enough',
        title: 'Never Enough',
        description: 'Wield the Divine High King and the Cosmic Armor.',
        icon: 'png_galaxy',
        rewardGold: 1000000,
        rewardItem: { type: 'avatar', itemId: 'png_world_ender', label: 'World Ender' },
        getProgress: (stats) => {
            const hasDivineHighKing = stats.ownedItems?.has('png_divine_high_king') ? 1 : 0;
            const hasCosmicArmor = stats.ownedItems?.has('png_cosmic_armor') ? 1 : 0;
            return [hasDivineHighKing + hasCosmicArmor, 2];
        },
    },

    // ─── Transcendent Level Quests (locked until World Domination claimed) ────

    {
        id: 'level_150',
        title: 'Ascended Mind',
        description: 'Reach Level 150.',
        icon: 'png_ascended_sigil',
        prerequisite: 'complete_the_world',
        rewardGold: 25000,
        rewardTickets: 15,
        rewardItem: { type: 'avatar', itemId: 'png_void_herald', label: 'Void Herald' },
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 150), 150],
    },
    {
        id: 'level_200',
        title: 'Myth of the Atlas',
        description: 'Reach Level 200.',
        icon: 'png_atlas_rune',
        prerequisite: 'complete_the_world',
        rewardGold: 50000,
        rewardTickets: 20,
        rewardItem: { type: 'avatar', itemId: 'png_atlas_titan', label: 'Atlas Titan' },
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 200), 200],
    },
    {
        id: 'level_250',
        title: 'Eternal Sovereign',
        description: 'Reach Level 250.',
        icon: 'png_eternal_seal',
        prerequisite: 'complete_the_world',
        rewardGold: 100000,
        rewardTickets: 25,
        rewardItem: { type: 'avatar', itemId: 'png_eternal_emperor', label: 'Eternal Emperor' },
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 250), 250],
    },
    {
        id: 'level_300',
        title: 'Beyond the Veil',
        description: 'Reach Level 300.',
        icon: 'png_the_singularity',
        prerequisite: 'complete_the_world',
        rewardGold: 250000,
        rewardTickets: 30,
        rewardItem: { type: 'avatar', itemId: 'png_void_ascendant', label: 'Void Ascendant' },
        getProgress: (stats) => [Math.min(stats.playerLevel ?? 1, 300), 300],
    },
];
