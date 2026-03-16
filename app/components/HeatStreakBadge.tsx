/**
 * HeatStreakBadge — animated combo badge that visually "heats up"
 * as the streak grows.
 *
 * Thresholds:
 *   3–4  : mild orange glow, slow pulse
 *   5–9  : hot orange/red glow, faster pulse
 *   10+  : intense red/white glow, fastest pulse + scale pop
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  combo: number;
}

export default function HeatStreakBadge({ combo }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const loopRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (combo < 3) {
      loopRef.current?.stop();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }

    const speed = combo >= 10 ? 180 : combo >= 5 ? 280 : 420;
    const scale = combo >= 10 ? 1.18 : combo >= 5 ? 1.12 : 1.07;

    loopRef.current?.stop();
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: scale,  duration: speed, useNativeDriver: false }),
          Animated.timing(glowAnim,  { toValue: 1,      duration: speed, useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1,      duration: speed, useNativeDriver: false }),
          Animated.timing(glowAnim,  { toValue: 0.4,    duration: speed, useNativeDriver: false }),
        ]),
      ]),
    );
    loopRef.current.start();

    return () => { loopRef.current?.stop(); };
  }, [combo]);

  if (combo < 3) return null;

  const borderColor = combo >= 10
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ff2222', '#ffffff'] })
    : combo >= 5
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ff4400', '#ffaa00'] })
    : glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#ff6600', '#ffcc00'] });

  const bgColor = combo >= 10
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#3a0000', '#550000'] })
    : combo >= 5
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#3a0000', '#4a0a00'] })
    : '#3a0000';

  const multiplier = (1 + (combo - 1) * 0.1).toFixed(1);
  const label = combo >= 10 ? `🔥🔥 ${multiplier}x` : `🔥 ${multiplier}x`;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          transform: [{ scale: pulseAnim }],
          borderColor,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.text, combo >= 10 && styles.textMax]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  text: {
    color: '#ff8888',
    fontWeight: 'bold',
    fontSize: 13,
  },
  textMax: {
    color: '#ffdddd',
    fontSize: 14,
  },
});
