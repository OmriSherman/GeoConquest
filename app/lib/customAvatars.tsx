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

// Sprite sheet images — 2816x1536, 3 avatars side by side
const SPRITE_AR = 2816 / 1536; // ≈ 1.833

const LADIES_IMG = require('../../assets/avatars/Chill Lady. Incredible Lady. Dayum Gurl.png');
const ANGRYMEN_IMG = require('../../assets/avatars/AngryMan. OsiBoi. Beast Mark.png');
const FREEGLE_IMG = require('../../assets/avatars/Freegle. EuroBro. Triboi.png');
const DIR_HURT_NANA_IMG = require('../../assets/avatars/Dir. Hurt. Nana.png');
const SILLY_GUY_IMG = require('../../assets/avatars/Silly Guy. Shovel Man. Threek.png');
const DIVINE_KING_IMG = require('../../assets/avatars/Divine High King. The Singularity. Piga.png');
const DIVINE_QUEEN_IMG = require('../../assets/avatars/Divine High Queen. Chariot. Cheezus.png');
const MONKEY_AR = 938 / 1536; // ≈ 0.611
const LANDSCAPE_AR = 1195 / 896; // ≈ 1.333 — new landscape sprite sheets

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
  png_chill_lady:      { source: LADIES_IMG, columns: 3, index: 0, aspectRatio: SPRITE_AR },
  png_incredible_lady: { source: LADIES_IMG, columns: 3, index: 1, aspectRatio: SPRITE_AR },
  png_dayum_gurl:      { source: LADIES_IMG, columns: 3, index: 2, aspectRatio: SPRITE_AR },

  // Continent Quest Rewards
  png_angry_man:  { source: ANGRYMEN_IMG, columns: 3, index: 0, aspectRatio: SPRITE_AR },
  png_osi_boi:    { source: ANGRYMEN_IMG, columns: 3, index: 1, aspectRatio: SPRITE_AR },
  png_beast_mark: { source: ANGRYMEN_IMG, columns: 3, index: 2, aspectRatio: SPRITE_AR },

  png_freegle:  { source: FREEGLE_IMG, columns: 3, index: 0, aspectRatio: SPRITE_AR },
  png_euro_bro: { source: FREEGLE_IMG, columns: 3, index: 1, aspectRatio: SPRITE_AR },
  png_triboi:   { source: FREEGLE_IMG, columns: 3, index: 2, aspectRatio: SPRITE_AR },

  // Dir. / Hurt. / Nana.
  png_dir:  { source: DIR_HURT_NANA_IMG, columns: 3, index: 0, aspectRatio: SPRITE_AR, nudgeX: -0.1 },
  png_hurt: { source: DIR_HURT_NANA_IMG, columns: 3, index: 1, aspectRatio: SPRITE_AR, nudgeX: -0.1 },
  png_nana: { source: DIR_HURT_NANA_IMG, columns: 3, index: 2, aspectRatio: SPRITE_AR },

  // Silly Guy / Shovel Man / Threek
  png_silly_guy:  { source: SILLY_GUY_IMG, columns: 3, index: 0, aspectRatio: SPRITE_AR, nudgeX: -0.1 },
  png_shovel_man: { source: SILLY_GUY_IMG, columns: 3, index: 1, aspectRatio: SPRITE_AR, nudgeX: -0.1 },
  png_threek:     { source: SILLY_GUY_IMG, columns: 3, index: 2, aspectRatio: SPRITE_AR },

  // Vorvir (landscape PNG — zoom in to fill the circle)
  png_vorvir: { source: require('../../assets/avatars/Vorvir.png'), columns: 1, index: 0, aspectRatio: 1195 / 896, zoom: 1.5 },

  // Divine High King sheet (Quest: World Domination / The Singularity / Shop: Piga)
  png_divine_high_king: { source: DIVINE_KING_IMG, columns: 3, index: 0, aspectRatio: LANDSCAPE_AR, nudgeY: 0.5 },
  png_the_singularity:  { source: DIVINE_KING_IMG, columns: 3, index: 1, aspectRatio: LANDSCAPE_AR, nudgeY: 0.5 },
  png_piga:             { source: DIVINE_KING_IMG, columns: 3, index: 2, aspectRatio: LANDSCAPE_AR, nudgeY: 0.2 },

  // Divine High Queen sheet (Quest: Ground Invasion / True Conqueror / Shop: Cheezus)
  png_divine_high_queen: { source: DIVINE_QUEEN_IMG, columns: 3, index: 0, aspectRatio: LANDSCAPE_AR, nudgeY: 0.55 },
  png_chariot:           { source: DIVINE_QUEEN_IMG, columns: 3, index: 1, aspectRatio: LANDSCAPE_AR, nudgeY: 0.25 },
  png_cheezus:           { source: DIVINE_QUEEN_IMG, columns: 3, index: 2, aspectRatio: LANDSCAPE_AR, nudgeY: 0.4, nudgeX: -0.1 },
};


export function isCustomAvatar(value: string): boolean {
  return value.startsWith('svg_') || value.startsWith('png_');
}
