/**
 * AvatarDisplay — renders either a standard emoji avatar or a custom avatar,
 * with an optional flag (emoji or SVG) displayed as a small badge at the bottom-right.
 * Supports both single-image and sprite-sheet custom avatars.
 * Use this wherever avatar_emoji is displayed.
 */

import React from 'react';
import { Image, ImageSourcePropType, Text, TextStyle, View } from 'react-native';
import { CUSTOM_AVATAR_COMPONENTS, isCustomAvatar, isSpriteSheet } from '../lib/customAvatars';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

interface AvatarDisplayProps {
  avatarId: string;
  avatarFlag?: string;
  size?: number;
  style?: TextStyle;
}

export default function AvatarDisplay({ avatarId, avatarFlag, size = 32, style }: AvatarDisplayProps) {
  const FlagComponent = avatarFlag && isCustomFlag(avatarFlag)
    ? CUSTOM_FLAG_COMPONENTS[avatarFlag]
    : null;

  const flagSize = Math.round(size * 0.35);

  const flagBadge = avatarFlag
    ? FlagComponent
      ? <View style={{ position: 'absolute', bottom: -2, right: -2 }}><FlagComponent size={flagSize} /></View>
      : <Text style={{ position: 'absolute', bottom: -2, right: -2, fontSize: flagSize }}>{avatarFlag}</Text>
    : null;

  const avatarEntry = isCustomAvatar(avatarId) ? CUSTOM_AVATAR_COMPONENTS[avatarId] : null;

  if (avatarEntry) {
    if (isSpriteSheet(avatarEntry)) {
      const { source, columns, index, aspectRatio, nudgeX, nudgeY, zoom } = avatarEntry;
      const z = zoom ?? 1;
      const imgWidth = size * columns * z;
      const imgHeight = imgWidth / aspectRatio;
      // Center the zoomed column in the clip window, then apply nudge
      const translateX = -size * z * index - size * (z - 1) / 2 + (nudgeX ?? 0) * size;
      const translateY = -(imgHeight - size) / 2 + (nudgeY ?? 0) * size;

      return (
        <View style={[{ width: size, height: size }, style]}>
          <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: size / 2 }}>
            <Image
              source={source}
              style={{
                width: imgWidth,
                height: imgHeight,
                transform: [{ translateX }, { translateY }],
              }}
            />
          </View>
          {flagBadge}
        </View>
      );
    }

    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Image source={avatarEntry as ImageSourcePropType} style={{ width: size, height: size, borderRadius: size / 2 }} />
        {flagBadge}
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: Math.round(size * 0.85), textAlign: 'center', lineHeight: size }}>
        {avatarId || '🧑'}
      </Text>
      {flagBadge}
    </View>
  );
}
