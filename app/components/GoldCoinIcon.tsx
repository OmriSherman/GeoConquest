import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export default function GoldCoinIcon({
  size = 14,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={require('../../assets/avatars/gold_coin.png')}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

