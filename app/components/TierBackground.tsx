import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

export type TierLabel = 'DANGER' | 'PERIL' | 'ABYSS' | 'VOID' | 'HELL' | 'INFERNO' | 'OBLIVION' | 'ETERNITY';

const BG_STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 0.7 + Math.random() * 1.6,
  opacity: 0.08 + Math.random() * 0.38,
}));

const NEBULAE = [
  { left: -80, top: -60,  size: 320, color: '#2e1065', opacity: 0.13 },
  { left: 210, top: 100,  size: 230, color: '#0f1b5c', opacity: 0.11 },
  { left: 40,  top: 360,  size: 300, color: '#1a0a46', opacity: 0.10 },
  { left: 240, top: 560,  size: 200, color: '#3b1070', opacity: 0.09 },
  { left: -30, top: 680,  size: 180, color: '#0c1445', opacity: 0.08 },
];

interface LayerCfg {
  count: number;
  colors: string[];
  minSize: number;
  maxSize: number;
  minDur: number;
  maxDur: number;
  type: 'up' | 'streak';
}

interface TierCfg {
  layers: LayerCfg[];
  heavenlyGlow?: boolean;
}

const TIER_CONFIG: Record<TierLabel, TierCfg> = {
  DANGER: { layers: [
    { count: 20, colors: ['#4D96FF', '#7db8ff', '#ffffffaa'], minSize: 1.5, maxSize: 3,   minDur: 6000, maxDur: 10000, type: 'up' },
  ]},
  PERIL: { layers: [
    { count: 26, colors: ['#22c55e', '#4ade80', '#86efac'],   minSize: 3,   maxSize: 7,   minDur: 2800, maxDur: 5000,  type: 'up' },
    { count: 8,  colors: ['#86efac', '#ffffffaa'],             minSize: 1,   maxSize: 2,   minDur: 4500, maxDur: 7000,  type: 'up' },
  ]},
  ABYSS: { layers: [
    { count: 28, colors: ['#818cf8', '#a5b4fc', '#6366f1'],   minSize: 1.5, maxSize: 4,   minDur: 2000, maxDur: 4500,  type: 'up' },
    { count: 10, colors: ['#818cf8', '#6366f1'],               minSize: 1,   maxSize: 2,   minDur: 2000, maxDur: 4000,  type: 'streak' },
  ]},
  VOID: { layers: [
    { count: 28, colors: ['#9b5cf6', '#c084fc', '#7c3aed'],   minSize: 1,   maxSize: 3,   minDur: 500,  maxDur: 1800,  type: 'streak' },
    { count: 14, colors: ['#c084fc', '#a855f7'],               minSize: 1,   maxSize: 2.5, minDur: 1500, maxDur: 3500,  type: 'up' },
  ]},
  HELL: { layers: [
    { count: 30, colors: ['#ff8c00', '#ffd700', '#ff6b35'],   minSize: 2,   maxSize: 5,   minDur: 1500, maxDur: 3500,  type: 'up' },
    { count: 10, colors: ['#ff8c00', '#ff6b35'],               minSize: 1,   maxSize: 2,   minDur: 2000, maxDur: 4000,  type: 'streak' },
  ]},
  INFERNO: { layers: [
    { count: 38, colors: ['#ef4444', '#ff4500', '#dc143c', '#ff8c00'], minSize: 1.5, maxSize: 4, minDur: 800,  maxDur: 2500, type: 'up' },
    { count: 15, colors: ['#ff4500', '#ef4444'],                        minSize: 1,   maxSize: 2, minDur: 600,  maxDur: 1800, type: 'streak' },
  ]},
  OBLIVION: { layers: [
    { count: 45, colors: ['#f43f5e', '#fb7185', '#e11d48'],   minSize: 1,   maxSize: 3.5, minDur: 600,  maxDur: 1800,  type: 'up' },
    { count: 18, colors: ['#f43f5e', '#e11d48', '#ff8888'],   minSize: 1,   maxSize: 2,   minDur: 500,  maxDur: 1500,  type: 'streak' },
  ]},
  ETERNITY: { layers: [
    { count: 35, colors: ['#fbbf24', '#fcd34d', '#f59e0b', '#ffffff'], minSize: 1,   maxSize: 2.5, minDur: 400,  maxDur: 1500, type: 'streak' },
    { count: 28, colors: ['#fbbf24', '#ffffff', '#fde68a'],            minSize: 1,   maxSize: 3,   minDur: 600,  maxDur: 2000, type: 'up' },
  ], heavenlyGlow: true },
};

interface Particle {
  id: string;
  x: number;
  startY: number;
  size: number;
  color: string;
  duration: number;
  startOffset: number;
  side: boolean;
}

function makeLayer(cfg: LayerCfg, layerIdx: number): Particle[] {
  return Array.from({ length: cfg.count }, (_, i) => ({
    id: `${layerIdx}-${i}`,
    x: Math.random() * 100,
    startY: 20 + Math.random() * SCREEN_H * 0.4,
    size: cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
    color: cfg.colors[i % cfg.colors.length],
    duration: cfg.minDur + Math.random() * (cfg.maxDur - cfg.minDur),
    startOffset: Math.random(),
    side: Math.random() > 0.5,
  }));
}

export default function TierBackground({ tierLabel }: { tierLabel: TierLabel }) {
  const cfg = TIER_CONFIG[tierLabel];

  const layersRef = useRef<Particle[][]>(cfg.layers.map((l, li) => makeLayer(l, li)));
  const animsRef = useRef<Animated.Value[][]>(
    layersRef.current.map(particles => particles.map(p => new Animated.Value(p.startOffset)))
  );
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];

    layersRef.current.forEach((particles, li) => {
      particles.forEach((p, i) => {
        loops.push(
          Animated.loop(
            Animated.timing(animsRef.current[li][i], {
              toValue: 1,
              duration: p.duration,
              useNativeDriver: true,
            })
          )
        );
      });
    });

    if (cfg.heavenlyGlow) {
      loops.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
          ])
        )
      );
    }

    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {NEBULAE.map((n, i) => (
        <View
          key={`nb-${i}`}
          style={{
            position: 'absolute',
            left: n.left, top: n.top,
            width: n.size, height: n.size,
            borderRadius: n.size / 2,
            backgroundColor: n.color,
            opacity: n.opacity,
          }}
        />
      ))}

      {BG_STARS.map(s => (
        <View
          key={`star-${s.id}`}
          style={{
            position: 'absolute',
            left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#ffffff',
            opacity: s.opacity,
          }}
        />
      ))}

      {cfg.heavenlyGlow && (
        <>
          {/* Full-screen ambient wash */}
          <Animated.View style={{
            position: 'absolute',
            left: -SCREEN_W * 0.1, top: -SCREEN_H * 0.1,
            width: SCREEN_W * 1.2, height: SCREEN_H * 1.2,
            borderRadius: SCREEN_W * 0.6,
            backgroundColor: '#fbbf24',
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.10] }),
          }} />
          {/* Central golden orb */}
          <Animated.View style={{
            position: 'absolute',
            left: SCREEN_W / 2 - 220, top: SCREEN_H * 0.25 - 220,
            width: 440, height: 440, borderRadius: 220,
            backgroundColor: '#fbbf24',
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.30] }),
          }} />
          {/* White crown flare */}
          <Animated.View style={{
            position: 'absolute',
            left: SCREEN_W / 2 - 140, top: -100,
            width: 280, height: 280, borderRadius: 140,
            backgroundColor: '#ffffff',
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.20] }),
          }} />
          {/* Warm amber base pool */}
          <Animated.View style={{
            position: 'absolute',
            left: SCREEN_W / 2 - 300, top: SCREEN_H * 0.45,
            width: 600, height: 600, borderRadius: 300,
            backgroundColor: '#fde68a',
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.13] }),
          }} />
        </>
      )}

      {layersRef.current.map((particles, li) =>
        particles.map((p, i) => {
          const anim = animsRef.current[li][i];
          if (cfg.layers[li].type === 'streak') {
            const startX = p.side ? -120 : SCREEN_W + 120;
            const endX   = p.side ? SCREEN_W + 120 : -120;
            return (
              <Animated.View
                key={`p-${p.id}`}
                style={{
                  position: 'absolute',
                  top: `${p.x}%`, left: 0,
                  width: 60 + p.size * 20,
                  height: Math.max(1, p.size * 0.5),
                  borderRadius: 2,
                  backgroundColor: p.color,
                  opacity: anim.interpolate({ inputRange: [0, 0.06, 0.88, 1], outputRange: [0, 0.65, 0.65, 0] }),
                  transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [startX, endX] }) }],
                }}
              />
            );
          }
          return (
            <Animated.View
              key={`p-${p.id}`}
              style={{
                position: 'absolute',
                bottom: p.startY, left: `${p.x}%`,
                width: p.size, height: p.size,
                borderRadius: p.size,
                backgroundColor: p.color,
                opacity: anim.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 0.85, 0.6, 0] }),
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(SCREEN_H * 1.3 + p.startY)] }) }],
              }}
            />
          );
        })
      )}
    </View>
  );
}
