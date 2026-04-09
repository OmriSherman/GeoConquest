/**
 * TopFallConfetti — lightweight confetti that falls from the top of the screen.
 * Particles spawn at the top edge and drift downward, no shooting arc.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = ['#FFD700', '#a78bfa', '#6BCB77', '#FF6B6B', '#4D96FF', '#FF8C42', '#FF6EC7', '#fff'];
const COUNT = 45;

interface Particle {
  startX: number;
  driftX: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

export default function TopFallConfetti() {
  // Randomized once per mount via useRef
  const particles = useRef<Particle[]>(
    Array.from({ length: COUNT }, () => ({
      startX: Math.random() * W,
      driftX: (Math.random() - 0.5) * 100,
      size: 4 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 800,
      duration: 1600 + Math.random() * 1800,
    }))
  ).current;

  const animY = useRef(particles.map(() => new Animated.Value(-20))).current;
  const animX = useRef(particles.map((p) => new Animated.Value(p.startX))).current;

  useEffect(() => {
    const anims = particles.map((p, i) =>
      Animated.parallel([
        Animated.timing(animY[i], {
          toValue: H + 40,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }),
        Animated.timing(animX[i], {
          toValue: p.startX + p.driftX,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(anims).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 4,
            backgroundColor: p.color,
            opacity: 0.88,
            transform: [
              { translateX: animX[i] },
              { translateY: animY[i] },
            ],
          }}
        />
      ))}
    </View>
  );
}
