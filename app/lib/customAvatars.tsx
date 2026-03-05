/**
 * Custom cultural SVG avatars.
 * Each avatar is a 60×60 SVG illustration.
 * Keys are stored in the avatar_emoji profile field (prefixed with "svg_").
 */

import { ImageSourcePropType } from 'react-native';

export const CUSTOM_AVATAR_COMPONENTS: Record<string, ImageSourcePropType> = {
  // Frog Collection
  svg_froga: require('../../assets/avatars/avatar_1.png'),
  svg_froglord: require('../../assets/avatars/avatar_2.png'),
  svg_lord_frog: require('../../assets/avatars/avatar_3.png'),
};


export function isCustomAvatar(value: string): boolean {
  return value.startsWith('svg_');
}
