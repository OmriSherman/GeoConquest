import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';
import { CUSTOM_AVATAR_COMPONENTS, isSpriteSheet } from '../lib/customAvatars';

// A mythic avatar shape filled with a single purple tint: stands in for "?" on undiscovered mythic avatars.
export default function MythicSilhouette({ size = 48 }: { size?: number }) {
  const entry: any = CUSTOM_AVATAR_COMPONENTS['png_worldbreaker_empress'];
  if (!entry || isSpriteSheet(entry)) return null;
  return (
    <Image
      source={entry as ImageSourcePropType}
      style={{ width: size, height: size, tintColor: '#3b2a5c', opacity: 0.95 }}
      resizeMode="contain"
    />
  );
}
