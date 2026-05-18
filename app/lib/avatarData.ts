// ─── Avatar Characters ────────────────────────────────────────────────────────

export interface AvatarOption {
    emoji: string;
    label: string;
    price: number;
    isPremium: boolean;
    requiresId?: string; // TIER LIST: ID (emoji or key) of the avatar you must own before buying this one
    collection?: string; // Optional collection/tier name for display
}

// The basic avatars shown during onboarding (all free)
export const ONBOARDING_AVATARS: AvatarOption[] = [
    { emoji: 'png_explorer_male',   label: 'Explorer',     price: 0, isPremium: false },
    { emoji: 'png_explorer_female', label: 'Explorer (F)', price: 0, isPremium: false },
    { emoji: 'png_explorer_dog',    label: 'Dog',          price: 0, isPremium: false },
    { emoji: 'png_explorer_cat',    label: 'Cat',          price: 0, isPremium: false },
];

export const AVATAR_CHARACTERS: AvatarOption[] = [];

// ─── SVG Custom Avatar Keys ───────────────────────────────────────────────────
// These are cultural illustrated avatars (stored as key strings like "svg_samurai")

export interface CustomAvatarOption {
    key: string;      // stored in avatar_emoji field, e.g. "svg_samurai"
    label: string;
    culture: string;
    price: number;
    isPremium: boolean;
    requiresId?: string;   // TIER LIST: ID of the avatar you must own before buying this one
    collection?: string;   // Optional collection/tier name for display
    requiresLevel?: number; // Minimum player level required to purchase
    isPremiumSubscription?: boolean; // Requires active Conqueror's Pass subscription
    questOnly?: boolean;   // Cannot be purchased — only earned via quest rewards
    cosmetic?: boolean;    // Not shown in shop — app-managed unlock only (e.g. quest rewards, internal use)
}

export const CUSTOM_AVATARS: CustomAvatarOption[] = [

    // ── Explorer Collection (free / onboarding) ───────────────────────────────
    { key: 'png_explorer_male',   label: 'Explorer',     culture: 'Explorer Collection', price: 0, isPremium: false },
    { key: 'png_explorer_female', label: 'Explorer (F)', culture: 'Explorer Collection', price: 0, isPremium: false },
    { key: 'png_explorer_dog',    label: 'Explorer Dog', culture: 'Explorer Collection', price: 0, isPremium: false },
    { key: 'png_explorer_cat',    label: 'Explorer Cat', culture: 'Explorer Collection', price: 0, isPremium: false },

    // ── Frog Collection ───────────────────────────────────────────────────────
    // TIER LIST EXAMPLE:
    // Buy Froga -> unlocks FrogLord -> unlocks Lord Frog
    { key: 'svg_froga', label: 'Froga', culture: 'Frog Collection', price: 500, isPremium: true, collection: 'Froga Tier 1' },
    { key: 'svg_froglord', label: 'FrogLord', culture: 'Frog Collection', price: 1500, isPremium: true, requiresId: 'svg_froga', collection: 'Tier 2', requiresLevel: 50 },
    { key: 'svg_lord_frog', label: 'Lord Frog', culture: 'Frog Collection', price: 3000, isPremium: true, requiresId: 'svg_froglord', collection: 'Tier 3' },

    // ── Monkey Collection ─────────────────────────────────────────────────────
    { key: 'svg_monkey', label: 'Monkey', culture: 'Monkey Collection', price: 500, isPremium: true, collection: 'Monkey Tier 1' },
    { key: 'svg_monke', label: 'Monke', culture: 'Monkey Collection', price: 1500, isPremium: true, requiresId: 'svg_monkey', collection: 'Monkey Tier 2' },
    { key: 'svg_monk', label: 'Monk', culture: 'Monkey Collection', price: 4000, isPremium: true, requiresId: 'svg_monke', collection: 'Monkey Tier 3' },

    // ── Josh Collection ───────────────────────────────────────────────────────
    { key: 'svg_josh', label: 'Josh', culture: 'Josh Collection', price: 500, isPremium: true, collection: 'Josh Tier 1' },
    { key: 'svg_joosh', label: 'Joosh', culture: 'Josh Collection', price: 2000, isPremium: true, requiresId: 'svg_josh', collection: 'Josh Tier 2' },
    { key: 'svg_oh_my_josh', label: 'Oh My Josh', culture: 'Josh Collection', price: 5000, isPremium: true, requiresId: 'svg_joosh', collection: 'Josh Tier 3' },

    // ── Lady Collection ───────────────────────────────────────────────────────
    { key: 'png_chill_lady', label: 'Chill Lady', culture: 'Lady Collection', price: 2000, isPremium: true, collection: 'Lady Tier 1' },
    { key: 'png_incredible_lady', label: 'Incredible Lady', culture: 'Lady Collection', price: 3000, isPremium: true, requiresId: 'png_chill_lady', collection: 'Lady Tier 2' },
    { key: 'png_dayum_gurl', label: 'Dayum Gurl', culture: 'Lady Collection', price: 6000, isPremium: true, requiresId: 'png_incredible_lady', collection: 'Lady Tier 3' },

    // ── Dir. / Hurt. / Nana. ─────────────────────────────────────────────────
    { key: 'png_dir', label: 'Dir', culture: '', price: 1000, isPremium: true },
    { key: 'png_hurt', label: 'Hurt', culture: '', price: 1800, isPremium: true },
    { key: 'png_nana', label: 'Nana', culture: '', price: 2500, isPremium: true, isPremiumSubscription: true },

    // ── Silly Guy / Shovel Man / Threek ───────────────────────────────────────
    { key: 'png_silly_guy', label: 'Silly Guy', culture: '', price: 1000, isPremium: true },
    { key: 'png_shovel_man', label: 'Shovel Man', culture: '', price: 1800, isPremium: true },
    { key: 'png_threek', label: 'Threek', culture: '', price: 2500, isPremium: true },

    // ── Meme Collection ───────────────────────────────────────────────────────
    { key: 'png_micro_pp', label: 'MicroPP', culture: '', price: 1500, isPremium: true },
    { key: 'png_i_heart_420', label: 'I ❤️ 420', culture: '', price: 2000, isPremium: true },

    // ── Vorvir ────────────────────────────────────────────────────────────────
    { key: 'png_vorvir', label: 'VorVir', culture: '', price: 4000, isPremium: true },

    // ── Shop-only originals ───────────────────────────────────────────────────
    { key: 'png_piga',          label: 'Piga',          culture: '', price: 3500,  isPremium: true, isPremiumSubscription: true },
    { key: 'png_cheezus',       label: 'Cheezus',       culture: '', price: 10000, isPremium: true, requiresLevel: 50 },
    { key: 'png_lich',          label: 'The Lich',      culture: '', price: 10000, isPremium: true, requiresLevel: 50 },
    { key: 'png_plague_doctor', label: 'Plague Doctor', culture: '', price: 5000,  isPremium: true, requiresLevel: 25 },

    // ── Meme / Misc ───────────────────────────────────────────────────────────
    { key: 'png_smart_bulb', label: 'Smart Bulb', culture: '', price: 3000, isPremium: true },

    // ── Icons Collection ──────────────────────────────────────────────────────
    { key: 'png_eagle',    label: 'Eagle',    culture: '', price: 2000, isPremium: true },
    { key: 'png_commando', label: 'Commando', culture: '', price: 1500, isPremium: true },
    { key: 'png_skull',    label: 'Skull',    culture: '', price: 5000, isPremium: true, requiresLevel: 10 },
    { key: 'png_demon',    label: 'Demon',    culture: '', price: 5000, isPremium: true, isPremiumSubscription: true },

    // ── Smiley Collection ─────────────────────────────────────────────────────
    { key: 'png_smiley', label: 'Smiley', culture: 'Smiley', price: 500,  isPremium: true, collection: 'Smiley Tier 1' },
    { key: 'png_lmao',   label: 'Lmao',   culture: 'Smiley', price: 1500, isPremium: true, requiresId: 'png_smiley', collection: 'Smiley Tier 2' },
    { key: 'png_lmfao',  label: 'Lmfao',  culture: 'Smiley', price: 5000, isPremium: true, requiresId: 'png_lmao', requiresLevel: 25, collection: 'Smiley Tier 3' },

    // ── Squidbob ──────────────────────────────────────────────────────────────
    { key: 'png_squidbob', label: 'Squidbob', culture: '', price: 3000, isPremium: true },

    // ── Cultural Warriors ─────────────────────────────────────────────────────
    { key: 'png_pirate',  label: 'Pirate',  culture: '', price: 1500, isPremium: true },
    { key: 'png_viking',  label: 'Viking',  culture: '', price: 1500, isPremium: true },
    { key: 'png_pharaoh', label: 'Pharaoh', culture: '', price: 2000, isPremium: true },
    { key: 'png_samurai', label: 'Samurai', culture: '', price: 2500, isPremium: true },
    { key: 'png_knight',  label: 'Knight',  culture: '', price: 2000, isPremium: true },

    // ── Sci-fi / Fantasy ──────────────────────────────────────────────────────
    { key: 'png_astronaut',   label: 'Astronaut',   culture: '', price: 2000, isPremium: true },
    { key: 'png_alien_grey',  label: 'Alien Grey',  culture: '', price: 1200, isPremium: true },
    { key: 'png_grim_reaper', label: 'Grim Reaper', culture: '', price: 3000, isPremium: true, requiresLevel: 20 },

    // ── Meme / Internet ───────────────────────────────────────────────────────
    { key: 'png_npc',             label: 'NPC',             culture: '', price: 5000,  isPremium: true, requiresLevel: 30 },
    { key: 'png_doge',            label: 'Doge',            culture: '', price: 50000, isPremium: true, requiresLevel: 30 },
    { key: 'png_shocked_hamster', label: 'Shocked Hamster', culture: '', price: 2000,  isPremium: true, requiresLevel: 10 },

    // ── Cursed ────────────────────────────────────────────────────────────────
    { key: 'png_voodoo_doll',   label: 'Voodoo Doll',   culture: '', price: 2000, isPremium: true, requiresLevel: 10 },
    { key: 'png_possessed_axe', label: 'Possessed Axe', culture: '', price: 2000, isPremium: true },
    { key: 'png_soul_jar',      label: 'Soul Jar',      culture: '', price: 1000, isPremium: true, requiresLevel: 10 },
    { key: 'png_apple_a_day',   label: 'Apple A Day',   culture: '', price: 1000, isPremium: true, isPremiumSubscription: true },
    { key: 'png_vhs_demon',           label: 'Old days',      culture: '', price: 3500, isPremium: true },
    { key: 'png_goblin_energy_drink', label: 'MonsteR',       culture: '', price: 2200, isPremium: true },
    { key: 'png_possessed_cart',      label: 'Zombie Cart',   culture: '', price: 700,  isPremium: true },
    { key: 'png_glitched_jester',     label: 'Funnynator',    culture: '', price: 1000, isPremium: true, isPremiumSubscription: true },
    { key: 'png_doomscroll_skull',    label: 'Doomscroll',    culture: '', price: 4000, isPremium: true, requiresLevel: 80 },
    { key: 'png_wifi_parasite',       label: 'WiFi Parasite', culture: '', price: 750,  isPremium: true },
    { key: 'png_cry_laugh_mask',      label: 'Twin Mask',     culture: '', price: 300,  isPremium: true },
    { key: 'png_tax_ghost',           label: 'Tax Ghost',     culture: '', price: 3000, isPremium: true },
    { key: 'png_suspicious_duck',     label: 'Sussy Ducka',   culture: '', price: 3500, isPremium: true },
    { key: 'png_sleepy_wizard',       label: 'Tired AF',      culture: '', price: 4400, isPremium: true },
    { key: 'png_cursed_usb_idol',     label: 'USBoo',         culture: '', price: 4000, isPremium: true, requiresLevel: 12 },
    { key: 'png_cat_knight',          label: 'Azazel',        culture: '', price: 6000, isPremium: true, requiresLevel: 40 },
    { key: 'png_rotten_crown',        label: 'Rotten Crown',  culture: '', price: 0,    isPremium: false, questOnly: true },
    { key: 'png_meme_relic_frog',     label: 'Chillin',       culture: '', price: 0,    isPremium: false, questOnly: true },

    // ── Continent Quest Rewards (questOnly — earned by conquering continents) ─
    { key: 'png_angry_man',  label: 'AngryMan', culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_osi_boi',    label: 'OsiBoi',   culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_freegle',    label: 'Freegle',  culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_euro_bro',   label: 'EuroBro',  culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_triboi',     label: 'Triboi',   culture: '', price: 0, isPremium: false, questOnly: true },

    // ── Endgame ───────────────────────────────────────────────────────────────
    { key: 'png_void_eye',          label: 'Void Eye',          culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_beast_mark',        label: 'Beast Mark',        culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_divine_high_king',  label: 'Divine High King',  culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_divine_high_queen', label: 'Divine High Queen', culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_cosmic_armor', label: 'Cosmic Armor', culture: '', price: 1000000, isPremium: true, requiresLevel: 100 },
    { key: 'png_world_ender',  label: 'World Ender',  culture: '', price: 0, isPremium: false, questOnly: true },

    // ── Transcendent — level 150-300 exclusive quest rewards ──────────────────
    { key: 'png_void_herald',     label: 'Void Herald',     culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_atlas_titan',     label: 'Atlas Titan',     culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_eternal_emperor', label: 'Eternal Emperor', culture: '', price: 0, isPremium: false, questOnly: true },
    { key: 'png_void_ascendant',  label: 'Void Ascendant',  culture: '', price: 0, isPremium: false, questOnly: true },

];


// ─── SVG Custom Flag Keys ─────────────────────────────────────────────────────
// These are in-game faction/world flags (stored as key strings like "flag_svg_nilfgaard")

export interface CustomFlagOption {
    key: string;      // stored in avatar_flag field, e.g. "flag_svg_nilfgaard"
    label: string;
    game: string;
    price: number;
    isPremium: boolean;
    requiresId?: string; // TIER LIST: ID of the flag/avatar you must own before buying this one
    collection?: string; // Optional collection/tier name for display
}

export const CUSTOM_FLAGS: CustomFlagOption[] = [
    // ── The Witcher ───────────────────────────────────────────────────────────
    { key: 'flag_svg_temeria', label: 'Temeria', game: 'The Witcher', price: 4000, isPremium: true, collection: 'Witcher Flags 1' },
    { key: 'flag_svg_nilfgaard', label: 'Nilfgaard', game: 'The Witcher', price: 8000, isPremium: true, requiresId: 'flag_svg_temeria', collection: 'Witcher Flags 2' },

    // ── Skyrim ────────────────────────────────────────────────────────────────
    { key: 'flag_svg_stormcloak', label: 'Stormcloaks', game: 'Skyrim', price: 4000, isPremium: true, collection: 'Skyrim Flags 1' },
    { key: 'flag_svg_imperial', label: 'Imperial Legion', game: 'Skyrim', price: 8000, isPremium: true, requiresId: 'flag_svg_stormcloak', collection: 'Skyrim Flags 2' },

    // ── Cyberpunk 2077 ────────────────────────────────────────────────────────
    { key: 'flag_svg_militech', label: 'Militech', game: 'Cyberpunk', price: 5000, isPremium: true, collection: 'Cyberpunk Flags 1' },
    { key: 'flag_svg_arasaka', label: 'Arasaka', game: 'Cyberpunk', price: 9000, isPremium: true, requiresId: 'flag_svg_militech', collection: 'Cyberpunk Flags 2' },

    // ── Red Dead Redemption 2 ─────────────────────────────────────────────────
    { key: 'flag_svg_lawman', label: 'Lawman', game: 'Red Dead', price: 4000, isPremium: true, collection: 'RDR2 Flags 1' },
    { key: 'flag_svg_vanderlinde', label: 'Van der Linde', game: 'Red Dead', price: 7500, isPremium: true, requiresId: 'flag_svg_lawman', collection: 'RDR2 Flags 2' },

    // ── Fallout ───────────────────────────────────────────────────────────────
    { key: 'flag_svg_vaulttec', label: 'Vault-Tec', game: 'Fallout', price: 5000, isPremium: true, collection: 'Fallout Flags 1' },
    { key: 'flag_svg_brotherhood', label: 'Brotherhood', game: 'Fallout', price: 8500, isPremium: true, requiresId: 'flag_svg_vaulttec', collection: 'Fallout Flags 2' },

];

// ─── Flag / Badge options ─────────────────────────────────────────────────────

export interface FlagOption {
    emoji: string;
    label: string;
    category: 'fun' | 'country' | 'symbol';
    price: number;
    isPremium: boolean;
    questOnly?: boolean; // cannot be purchased — only earned via achievements
}

export const FLAG_OPTIONS: FlagOption[] = [
    // ── All World Country Flags (all free, shown in onboarding) ──────────
    // Africa (54)
    { emoji: '🇩🇿', label: 'Algeria', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇴', label: 'Angola', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇯', label: 'Benin', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇼', label: 'Botswana', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇫', label: 'Burkina Faso', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇮', label: 'Burundi', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇻', label: 'Cabo Verde', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇲', label: 'Cameroon', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇫', label: 'Central African Rep.', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇩', label: 'Chad', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇲', label: 'Comoros', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇩', label: 'DR Congo', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇬', label: 'Congo', category: 'country', price: 0, isPremium: false },
    { emoji: '🇩🇯', label: 'Djibouti', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇬', label: 'Egypt', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇶', label: 'Equatorial Guinea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇷', label: 'Eritrea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇿', label: 'Eswatini', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇹', label: 'Ethiopia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇦', label: 'Gabon', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇲', label: 'Gambia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇭', label: 'Ghana', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇳', label: 'Guinea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇼', label: 'Guinea-Bissau', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇮', label: 'Ivory Coast', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇪', label: 'Kenya', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇸', label: 'Lesotho', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇷', label: 'Liberia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇾', label: 'Libya', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇬', label: 'Madagascar', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇼', label: 'Malawi', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇱', label: 'Mali', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇷', label: 'Mauritania', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇺', label: 'Mauritius', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇦', label: 'Morocco', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇿', label: 'Mozambique', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇦', label: 'Namibia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇪', label: 'Niger', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇬', label: 'Nigeria', category: 'country', price: 0, isPremium: false },
    { emoji: '🇷🇼', label: 'Rwanda', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇹', label: 'São Tomé & Príncipe', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇳', label: 'Senegal', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇨', label: 'Seychelles', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇱', label: 'Sierra Leone', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇴', label: 'Somalia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇿🇦', label: 'South Africa', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇸', label: 'South Sudan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇩', label: 'Sudan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇿', label: 'Tanzania', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇬', label: 'Togo', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇳', label: 'Tunisia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇺🇬', label: 'Uganda', category: 'country', price: 0, isPremium: false },
    { emoji: '🇿🇲', label: 'Zambia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇿🇼', label: 'Zimbabwe', category: 'country', price: 0, isPremium: false },

    // Asia (49)
    { emoji: '🇦🇫', label: 'Afghanistan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇲', label: 'Armenia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇿', label: 'Azerbaijan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇭', label: 'Bahrain', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇩', label: 'Bangladesh', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇹', label: 'Bhutan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇳', label: 'Brunei', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇭', label: 'Cambodia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇳', label: 'China', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇾', label: 'Cyprus', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇪', label: 'Georgia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇳', label: 'India', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇩', label: 'Indonesia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇷', label: 'Iran', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇶', label: 'Iraq', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇱', label: 'Israel', category: 'country', price: 0, isPremium: false },
    { emoji: '🇯🇵', label: 'Japan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇯🇴', label: 'Jordan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇿', label: 'Kazakhstan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇼', label: 'Kuwait', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇬', label: 'Kyrgyzstan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇦', label: 'Laos', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇧', label: 'Lebanon', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇾', label: 'Malaysia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇻', label: 'Maldives', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇳', label: 'Mongolia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇲', label: 'Myanmar', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇵', label: 'Nepal', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇵', label: 'North Korea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇴🇲', label: 'Oman', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇰', label: 'Pakistan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇸', label: 'Palestine', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇭', label: 'Philippines', category: 'country', price: 0, isPremium: false },
    { emoji: '🇶🇦', label: 'Qatar', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇦', label: 'Saudi Arabia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇬', label: 'Singapore', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇷', label: 'South Korea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇰', label: 'Sri Lanka', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇾', label: 'Syria', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇼', label: 'Taiwan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇯', label: 'Tajikistan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇭', label: 'Thailand', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇱', label: 'Timor-Leste', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇷', label: 'Turkey', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇲', label: 'Turkmenistan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇪', label: 'UAE', category: 'country', price: 0, isPremium: false },
    { emoji: '🇺🇿', label: 'Uzbekistan', category: 'country', price: 0, isPremium: false },
    { emoji: '🇻🇳', label: 'Vietnam', category: 'country', price: 0, isPremium: false },
    { emoji: '🇾🇪', label: 'Yemen', category: 'country', price: 0, isPremium: false },

    // Europe (45)
    { emoji: '🇦🇱', label: 'Albania', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇩', label: 'Andorra', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇹', label: 'Austria', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇾', label: 'Belarus', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇪', label: 'Belgium', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇦', label: 'Bosnia & Herzegovina', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇬', label: 'Bulgaria', category: 'country', price: 0, isPremium: false },
    { emoji: '🇭🇷', label: 'Croatia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇿', label: 'Czech Republic', category: 'country', price: 0, isPremium: false },
    { emoji: '🇩🇰', label: 'Denmark', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇪', label: 'Estonia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇫🇮', label: 'Finland', category: 'country', price: 0, isPremium: false },
    { emoji: '🇫🇷', label: 'France', category: 'country', price: 0, isPremium: false },
    { emoji: '🇩🇪', label: 'Germany', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇷', label: 'Greece', category: 'country', price: 0, isPremium: false },
    { emoji: '🇭🇺', label: 'Hungary', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇸', label: 'Iceland', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇪', label: 'Ireland', category: 'country', price: 0, isPremium: false },
    { emoji: '🇮🇹', label: 'Italy', category: 'country', price: 0, isPremium: false },
    { emoji: '🇽🇰', label: 'Kosovo', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇻', label: 'Latvia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇮', label: 'Liechtenstein', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇹', label: 'Lithuania', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇺', label: 'Luxembourg', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇹', label: 'Malta', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇩', label: 'Moldova', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇨', label: 'Monaco', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇪', label: 'Montenegro', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇱', label: 'Netherlands', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇰', label: 'North Macedonia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇴', label: 'Norway', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇱', label: 'Poland', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇹', label: 'Portugal', category: 'country', price: 0, isPremium: false },
    { emoji: '🇷🇴', label: 'Romania', category: 'country', price: 0, isPremium: false },
    { emoji: '🇷🇺', label: 'Russia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇲', label: 'San Marino', category: 'country', price: 0, isPremium: false },
    { emoji: '🇷🇸', label: 'Serbia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇰', label: 'Slovakia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇮', label: 'Slovenia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇸', label: 'Spain', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇪', label: 'Sweden', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇭', label: 'Switzerland', category: 'country', price: 0, isPremium: false },
    { emoji: '🇺🇦', label: 'Ukraine', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇧', label: 'United Kingdom', category: 'country', price: 0, isPremium: false },
    { emoji: '🇻🇦', label: 'Vatican City', category: 'country', price: 0, isPremium: false },

    // Americas (35)
    { emoji: '🇦🇬', label: 'Antigua & Barbuda', category: 'country', price: 0, isPremium: false },
    { emoji: '🇦🇷', label: 'Argentina', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇸', label: 'Bahamas', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇧', label: 'Barbados', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇿', label: 'Belize', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇴', label: 'Bolivia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇧🇷', label: 'Brazil', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇦', label: 'Canada', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇱', label: 'Chile', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇴', label: 'Colombia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇷', label: 'Costa Rica', category: 'country', price: 0, isPremium: false },
    { emoji: '🇨🇺', label: 'Cuba', category: 'country', price: 0, isPremium: false },
    { emoji: '🇩🇲', label: 'Dominica', category: 'country', price: 0, isPremium: false },
    { emoji: '🇩🇴', label: 'Dominican Republic', category: 'country', price: 0, isPremium: false },
    { emoji: '🇪🇨', label: 'Ecuador', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇻', label: 'El Salvador', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇩', label: 'Grenada', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇹', label: 'Guatemala', category: 'country', price: 0, isPremium: false },
    { emoji: '🇬🇾', label: 'Guyana', category: 'country', price: 0, isPremium: false },
    { emoji: '🇭🇹', label: 'Haiti', category: 'country', price: 0, isPremium: false },
    { emoji: '🇭🇳', label: 'Honduras', category: 'country', price: 0, isPremium: false },
    { emoji: '🇯🇲', label: 'Jamaica', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇽', label: 'Mexico', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇮', label: 'Nicaragua', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇦', label: 'Panama', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇾', label: 'Paraguay', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇪', label: 'Peru', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇳', label: 'St. Kitts & Nevis', category: 'country', price: 0, isPremium: false },
    { emoji: '🇱🇨', label: 'St. Lucia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇻🇨', label: 'St. Vincent', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇷', label: 'Suriname', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇹', label: 'Trinidad & Tobago', category: 'country', price: 0, isPremium: false },
    { emoji: '🇺🇸', label: 'USA', category: 'country', price: 0, isPremium: false },
    { emoji: '🇺🇾', label: 'Uruguay', category: 'country', price: 0, isPremium: false },
    { emoji: '🇻🇪', label: 'Venezuela', category: 'country', price: 0, isPremium: false },

    // Oceania (14)
    { emoji: '🇦🇺', label: 'Australia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇫🇯', label: 'Fiji', category: 'country', price: 0, isPremium: false },
    { emoji: '🇰🇮', label: 'Kiribati', category: 'country', price: 0, isPremium: false },
    { emoji: '🇲🇭', label: 'Marshall Islands', category: 'country', price: 0, isPremium: false },
    { emoji: '🇫🇲', label: 'Micronesia', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇷', label: 'Nauru', category: 'country', price: 0, isPremium: false },
    { emoji: '🇳🇿', label: 'New Zealand', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇼', label: 'Palau', category: 'country', price: 0, isPremium: false },
    { emoji: '🇵🇬', label: 'Papua New Guinea', category: 'country', price: 0, isPremium: false },
    { emoji: '🇼🇸', label: 'Samoa', category: 'country', price: 0, isPremium: false },
    { emoji: '🇸🇧', label: 'Solomon Islands', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇴', label: 'Tonga', category: 'country', price: 0, isPremium: false },
    { emoji: '🇹🇻', label: 'Tuvalu', category: 'country', price: 0, isPremium: false },
    { emoji: '🇻🇺', label: 'Vanuatu', category: 'country', price: 0, isPremium: false },
];

// ─── Profanity filter ─────────────────────────────────────────────────────────

const BAD_WORDS = [
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'cock', 'pussy', 'damn', 'cunt', 'nigger',
    'nigga', 'fag', 'faggot', 'retard', 'slut', 'whore', 'bastard', 'penis', 'vagina',
    'porn', 'nazi', 'hitler', 'rape', 'molest', 'pedo', 'sex', 'holocaust', 'kill',
    'murder', 'terrorism', 'terrorist', 'bomb', 'isis', 'anus', 'butthole',
    'testicle', 'wanker', 'twat', 'bollocks', 'arsehole',
];

export function containsProfanity(text: string): boolean {
    const lower = text.toLowerCase().replace(/[^a-z]/g, '');
    return BAD_WORDS.some(word => lower.includes(word));
}

export function isValidUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
    if (trimmed.length > 20) return { valid: false, error: 'Username must be 20 characters or fewer' };
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { valid: false, error: 'Only letters, numbers, and underscores' };
    if (containsProfanity(trimmed)) return { valid: false, error: "Username contains inappropriate language" };
    return { valid: true };
}
