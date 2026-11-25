/**
 * ChestBurstConfetti — short radial burst that starts at the chest and
 * scatters particles outward when the reward is revealed.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const COLORS = ['#FFD700', '#A78BFA', '#6BCB77', '#FF6B6B', '#4D96FF', '#FF8C42', '#FF6EC7', '#FFF'];
const COUNT = 42;

interface Particle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

export default React.memo(function TopFallConfetti() {
  const particles = useRef<Particle[]>(Array.from({ length: COUNT }, () => ({
    angle: Math.random() * Math.PI * 2,
    distance: 90 + Math.random() * 150,
    size: 4 + Math.random() * 7,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 130,
    duration: 700 + Math.random() * 500,
    rotation: (Math.random() - 0.5) * 720,
  }))).current;
  const progress = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animation = Animated.parallel(particles.map((particle, i) => Animated.timing(progress[i], {
      toValue: 1,
      duration: particle.duration,
      delay: particle.delay,
      useNativeDriver: true,
    })));
    animation.start();
    return () => animation.stop();
  }, [particles, progress]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle, i) => {
        const x = Math.cos(particle.angle) * particle.distance;
        const y = Math.sin(particle.angle) * particle.distance;
        return <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '42%',
            width: particle.size,
            height: particle.size,
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
            borderRadius: particle.size / 4,
            backgroundColor: particle.color,
            opacity: progress[i].interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.95, 0] }),
            transform: [
              { translateX: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
              { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
              { rotate: progress[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.rotation}deg`] }) },
              { scale: progress[i].interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.35, 1.25, 0.7] }) },
            ],
          }}
        />;
      })}
    </View>
  );
});
