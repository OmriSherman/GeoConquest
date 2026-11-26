import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const EMBER_COLORS = ['#ff4500', '#ff8c00', '#ffb347', '#ff2a00', '#ffd27a'];

const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  x: Math.random() * W,
  size: 2 + Math.random() * 5,
  dur: 2200 + Math.random() * 3200,
  phase: Math.random(),
  sway: (Math.random() - 0.5) * 70,
  color: EMBER_COLORS[i % EMBER_COLORS.length],
}));

// Hellfire backdrop: dark red base, pulsing flame glow from below, rising embers. Native-driven, memoized.
function HellBackground({ withBase = true, opacity = 1 }: { withBase?: boolean; opacity?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const embers = useRef(EMBERS.map(e => new Animated.Value(e.phase))).current;

  useEffect(() => {
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
      ...embers.map((v, i) => Animated.loop(Animated.timing(v, { toValue: 1, duration: EMBERS[i].dur, easing: Easing.linear, useNativeDriver: true }))),
    ];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  const glow = (color: string, size: number, left: number, bottom: number, lo: number, hi: number) => (
    <Animated.View
      renderToHardwareTextureAndroid
      style={{
        position: 'absolute', left, bottom, width: size, height: size, borderRadius: size / 2, backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [lo, hi] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) }],
      }}
    />
  );

  return (
    <View style={[StyleSheet.absoluteFill, { opacity, ...(withBase ? { backgroundColor: '#140000' } : null) }]} pointerEvents="none">
      {glow('#7a0a00', W * 1.8, -W * 0.4, -W * 1.1, 0.55, 0.85)}
      {glow('#ff4500', W * 1.1, -W * 0.05, -W * 0.75, 0.25, 0.5)}
      {glow('#ff9a1f', W * 0.6, W * 0.2, -W * 0.45, 0.15, 0.4)}
      {EMBERS.map((e, i) => (
        <Animated.View
          key={e.id}
          style={{
            position: 'absolute', left: e.x, bottom: -10, width: e.size, height: e.size, borderRadius: e.size,
            backgroundColor: e.color,
            opacity: embers[i].interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.95, 0.6, 0] }),
            transform: [
              { translateY: embers[i].interpolate({ inputRange: [0, 1], outputRange: [0, -(H * 0.95)] }) },
              { translateX: embers[i].interpolate({ inputRange: [0, 1], outputRange: [0, e.sway] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

export default React.memo(HellBackground);
