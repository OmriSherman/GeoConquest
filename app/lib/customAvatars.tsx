/**
 * Custom cultural SVG avatars.
 * Each avatar is either a single image or a sprite sheet entry.
 * Keys are stored in the avatar_emoji profile field (prefixed with "svg_" or "png_").
 */

import { ImageSourcePropType } from 'react-native';

export interface SpriteSheet {
  source: ImageSourcePropType;
  columns: number;
  index: number;
  aspectRatio: number; // fullImage.width / fullImage.height
  nudgeX?: number;     // fraction of size, negative = shift left (e.g. -0.1 = left 10%)
  nudgeY?: number;     // fraction of size, positive = shift down (shows top), negative = shift up
  zoom?: number;       // scale factor > 1 zooms in, centering the crop (default 1)
}

export type CustomAvatarEntry = ImageSourcePropType | SpriteSheet;

export function isSpriteSheet(entry: CustomAvatarEntry): entry is SpriteSheet {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    !Array.isArray(entry) &&
    'source' in (entry as object) &&
    'columns' in (entry as object)
  );
}

const MONKEY_AR = 938 / 1536; // ≈ 0.611

export const CUSTOM_AVATAR_COMPONENTS: Record<string, CustomAvatarEntry> = {
  // Frog Collection
  svg_froga: require('../../assets/avatars/avatar_1.png'),
  svg_froglord: require('../../assets/avatars/avatar_2.png'),
  svg_lord_frog: require('../../assets/avatars/avatar_3.png'),

  // Monkey Collection (1-col sprite sheets so nudgeX works)
  svg_monkey: { source: require('../../assets/avatars/monkey_1.png'), columns: 1, index: 0, aspectRatio: MONKEY_AR, nudgeX: -0.1 },
  svg_monke:  { source: require('../../assets/avatars/monkey_2.png'), columns: 1, index: 0, aspectRatio: MONKEY_AR },
  svg_monk:   { source: require('../../assets/avatars/monkey_3.png'), columns: 1, index: 0, aspectRatio: MONKEY_AR },

  // Josh Collection
  svg_josh: require('../../assets/avatars/josh_1.png'),
  svg_joosh: require('../../assets/avatars/josh_2.png'),
  svg_oh_my_josh: require('../../assets/avatars/josh_3.png'),

  // Lady Collection (shop tier chain)
  png_chill_lady:      require('../../assets/avatars/chill_lady.png'),
  png_incredible_lady: require('../../assets/avatars/incredible_lady.png'),
  png_dayum_gurl:      require('../../assets/avatars/dayum_gurl.png'),

  // Continent Quest Rewards
  png_angry_man:  require('../../assets/avatars/angry_man.png'),
  png_osi_boi:    require('../../assets/avatars/osi_boi.png'),
  png_beast_mark: require('../../assets/avatars/beast_mark.png'),

  png_freegle:  require('../../assets/avatars/freegle.png'),
  png_euro_bro: require('../../assets/avatars/euro_bro.png'),
  png_triboi:   require('../../assets/avatars/triboi.png'),

  // Dir. / Hurt. / Nana.
  png_dir:  require('../../assets/avatars/dir.png'),
  png_hurt: require('../../assets/avatars/hurt.png'),
  png_nana: require('../../assets/avatars/nana.png'),

  // Silly Guy / Shovel Man / Threek
  png_silly_guy:  require('../../assets/avatars/silly_guy.png'),
  png_shovel_man: require('../../assets/avatars/shovel_man.png'),
  png_threek:     require('../../assets/avatars/threek.png'),

  // Vorvir (landscape PNG — zoom in to fill the circle)
  png_vorvir: { source: require('../../assets/avatars/Vorvir.png'), columns: 1, index: 0, aspectRatio: 1195 / 896, zoom: 1.5 },

  // Divine Collection (portrait images — nudgeY shifts crop toward head)
  png_divine_high_king:  { source: require('../../assets/avatars/divine_high_king.png'),  columns: 1, index: 0, aspectRatio: 398 / 896, nudgeY: 0.26 },
  png_piga:              { source: require('../../assets/avatars/piga.png'),              columns: 1, index: 0, aspectRatio: 398 / 896, nudgeY: 0.36 },
  png_divine_high_queen: { source: require('../../assets/avatars/divine_high_queen.png'), columns: 1, index: 0, aspectRatio: 398 / 896, nudgeY: 0.29 },
  png_cheezus:           { source: require('../../assets/avatars/cheezus.png'),           columns: 1, index: 0, aspectRatio: 398 / 896, nudgeY: 0.28 },

  // Meme Collection
  png_micro_pp:    require('../../assets/avatars/micro_pp.png'),
  png_i_heart_420: require('../../assets/avatars/i_heart_420.png'),

  // Premium page hero — not purchasable
  png_conqueror: require('../../assets/avatars/conqueror.png'),

  // Smart Bulb (avatar shop)
  png_smart_bulb:    require('../../assets/avatars/smart_bulb.png'),
  png_lich:          require('../../assets/avatars/lich.png'),
  png_plague_doctor: require('../../assets/avatars/plague_doctor.png'),

  // Explorer Collection (default onboarding avatars)
  png_explorer_male:   require('../../assets/avatars/explorer_male.png'),
  png_explorer_female: require('../../assets/avatars/explorer_female.png'),
  png_explorer_dog:    require('../../assets/avatars/explorer_dog.png'),
  png_explorer_cat:    require('../../assets/avatars/explorer_cat.png'),

  // Icons Collection
  png_skull:         require('../../assets/avatars/skull.png'),
  png_bullseye:      require('../../assets/avatars/bullseye.png'),
  png_eyes:          require('../../assets/avatars/eyes.png'),
  png_flame:         require('../../assets/avatars/flame.png'),
  png_eagle:         require('../../assets/avatars/eagle.png'),
  png_wave:          require('../../assets/avatars/wave.png'),
  png_mountain:      require('../../assets/avatars/mountain.png'),
  png_ruler:         require('../../assets/avatars/ruler.png'),
  png_theater_mask:  require('../../assets/avatars/theater_mask.png'),
  png_trident:       require('../../assets/avatars/trident.png'),
  png_compass:       require('../../assets/avatars/compass.png'),
  png_treasure_chest: require('../../assets/avatars/treasure_chest.png'),
  png_shield:        require('../../assets/avatars/shield.png'),
  png_ancient_map:   require('../../assets/avatars/ancient_map.png'),

  // Avatar shop
  png_demon:    require('../../assets/avatars/demon.png'),
  png_lmao:     require('../../assets/avatars/lmao.png'),
  png_commando: require('../../assets/avatars/commando.png'),

  // Smiley Collection
  png_smiley: require('../../assets/avatars/smiley.png'),
  png_lmfao:  require('../../assets/avatars/lmfao.png'),

  // Characters
  png_squidbob: require('../../assets/avatars/squidbob.png'),

  // Cultural Warriors
  png_pirate:  require('../../assets/avatars/pirate.png'),
  png_viking:  require('../../assets/avatars/viking.png'),
  png_pharaoh: require('../../assets/avatars/pharaoh.png'),
  png_samurai: require('../../assets/avatars/samurai.png'),
  png_knight:  require('../../assets/avatars/knight.png'),

  // Sci-fi / Fantasy
  png_astronaut:   require('../../assets/avatars/astronaut.png'),
  png_alien_grey:  require('../../assets/avatars/alien_grey.png'),
  png_grim_reaper: require('../../assets/avatars/grim_reaper.png'),

  // Meme / Internet
  png_npc:             require('../../assets/avatars/npc.png'),
  png_doge:            require('../../assets/avatars/doge.png'),
  png_shocked_hamster: require('../../assets/avatars/shocked_hamster.png'),

  // Cursed
  png_voodoo_doll:   require('../../assets/avatars/voodoo_doll.png'),
  png_possessed_axe: require('../../assets/avatars/possessed_axe.png'),
  png_soul_jar:      require('../../assets/avatars/soul_jar.png'),
  png_apple_a_day:   require('../../assets/avatars/apple_a_day.png'),
  png_vhs_demon:            require('../../assets/avatars/vhs_demon.png'),
  png_goblin_energy_drink:  require('../../assets/avatars/goblin_energy_drink.png'),
  png_possessed_cart:       require('../../assets/avatars/possessed_cart.png'),
  png_glitched_jester:      require('../../assets/avatars/glitched_jester.png'),
  png_doomscroll_skull:     require('../../assets/avatars/doomscroll_skull.png'),
  png_wifi_parasite:        require('../../assets/avatars/wifi_parasite.png'),
  png_cry_laugh_mask:       require('../../assets/avatars/cry_laugh_mask.png'),
  png_tax_ghost:            require('../../assets/avatars/tax_ghost.png'),
  png_rotten_crown:         require('../../assets/avatars/rotten_crown.png'),
  png_suspicious_duck:      require('../../assets/avatars/suspicious_duck.png'),
  png_sleepy_wizard:        require('../../assets/avatars/sleepy_wizard.png'),
  png_meme_relic_frog:      require('../../assets/avatars/meme_relic_frog.png'),
  png_cursed_usb_idol:      require('../../assets/avatars/cursed_usb_idol.png'),
  png_cat_knight:           require('../../assets/avatars/cat_knight.png'),

  // Endgame
  png_void_eye:     require('../../assets/avatars/void_eye.png'),
  png_cosmic_armor: require('../../assets/avatars/cosmic_armor.png'),
  png_world_ender:  require('../../assets/avatars/world_ender.png'),

  // Transcendent — level 150-300 quest rewards
  png_void_herald:      require('../../assets/avatars/void_herald.png'),
  png_atlas_titan:      require('../../assets/avatars/atlas_titan.png'),
  png_eternal_emperor:  require('../../assets/avatars/eternal_emperor.png'),
  png_void_ascendant:   require('../../assets/avatars/void_ascendant.png'),

  // Conflict Quiz / Gauntlet batch
  png_crucible:       require('../../assets/avatars/crucible.png'),
  png_penguin_admiral: require('../../assets/avatars/penguin_admiral.png'),
  png_bear_berserker: require('../../assets/avatars/bear_berserker.png'),
  png_doom_paladin:   require('../../assets/avatars/doom_paladin.png'),
  png_siege_lord:     require('../../assets/avatars/siege_lord.png'),
  png_sorceress:      require('../../assets/avatars/sorceress.png'),
  png_farewell:       require('../../assets/avatars/farewell.png'),
  png_cold_judgment:  require('../../assets/avatars/cold_judgment.png'),

  // Internal use — Nightmare Quiz screens
  png_demon_hand:      require('../../assets/avatars/demon_hand.png'),
  png_evil_vanquished: require('../../assets/avatars/evil_vanquished.png'),
};


export function isCustomAvatar(value: string): boolean {
  return value.startsWith('svg_') || value.startsWith('png_');
}

export function getAllCustomAvatarImageSources(): ImageSourcePropType[] {
  return Object.values(CUSTOM_AVATAR_COMPONENTS).map((entry) =>
    isSpriteSheet(entry) ? entry.source : entry
  );
}
