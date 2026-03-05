/**
 * AvatarDisplay — renders either a standard emoji avatar or a custom SVG avatar,
 * with an optional flag (emoji or SVG) displayed as a small badge at the bottom-right.
 * Use this wherever avatar_emoji is displayed.
 */

import React from 'react';
import { Text, TextStyle, View, Image } from 'react-native';
import { CUSTOM_AVATAR_COMPONENTS, isCustomAvatar } from '../lib/customAvatars';
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

  const AvatarSource = isCustomAvatar(avatarId)
    ? CUSTOM_AVATAR_COMPONENTS[avatarId]
    : null;

  const flagSize = Math.round(size * 0.35);

  if (AvatarSource) {
    return (
      <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Image source={AvatarSource} style={{ width: size, height: size, borderRadius: size / 2 }} />
        {avatarFlag && (
          FlagComponent
            ? <View style={{ position: 'absolute', bottom: -2, right: -2 }}><FlagComponent size={flagSize} /></View>
            : <Text style={{ position: 'absolute', bottom: -2, right: -2, fontSize: flagSize }}>{avatarFlag}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: Math.round(size * 0.85), textAlign: 'center', lineHeight: size }}>
        {avatarId || '🧑'}
      </Text>
      {avatarFlag && (
        FlagComponent
          ? <View style={{ position: 'absolute', bottom: -2, right: -2 }}><FlagComponent size={flagSize} /></View>
          : <Text style={{ position: 'absolute', bottom: -2, right: -2, fontSize: flagSize }}>{avatarFlag}</Text>
      )}
    </View>
  );
}
