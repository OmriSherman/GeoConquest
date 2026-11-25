import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

const XP_ICON = require('../../assets/avatars/mythic_xp.png');

export function XpIcon({ size = 14, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const renderedSize = Math.round(size * 1.3);
  return <Image source={XP_ICON} style={[{ width: renderedSize, height: renderedSize }, style]} resizeMode="contain" />;
}

export function XpAmount({
  amount,
  prefix,
  iconSize = 14,
  style,
  textStyle,
}: {
  amount: string | number;
  prefix?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.row, style]} accessibilityLabel={`${prefix ?? ''}${amount} XP`}>
      <Text style={textStyle}>{prefix}{typeof amount === 'number' ? amount.toLocaleString() : amount}</Text>
      <XpIcon size={iconSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    direction: 'ltr',
  },
});
