import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import HeatStreakBadge from './HeatStreakBadge';

interface Props {
  goldTotal: number;
  goldDelta: number;
  animTrigger: number;
  accuracy: number | null;
  combo?: number;
}

const goldCoin = require('../../assets/avatars/gold_coin.png');

export default function EarningsStrip({ goldTotal, goldDelta, animTrigger, accuracy, combo }: Props) {
  const floatY = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animTrigger === 0) return;
    floatY.setValue(2);
    floatOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(floatY, { toValue: -52, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(floatOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [animTrigger]);

  return (
    <View style={styles.strip}>
      <View style={styles.goldSection}>
        <Image source={goldCoin} style={styles.goldIcon} resizeMode="contain" />
        <Text style={styles.goldTotal}>{goldTotal}</Text>
        <Animated.Text
          style={[styles.goldDelta, { transform: [{ translateY: floatY }], opacity: floatOpacity }]}
        >
          +{goldDelta}
        </Animated.Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.accuracySection}>
        <Text style={styles.accuracyValue}>
          {accuracy === null ? '—' : `${accuracy}%`}
        </Text>
        <Text style={styles.label}> accuracy</Text>
      </View>

      {combo !== undefined && combo >= 3 ? (
        <>
          <View style={styles.divider} />
          <HeatStreakBadge combo={combo} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#151530',
    overflow: 'visible',
    zIndex: 10,
  },
  goldSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goldIcon: { width: 20, height: 20 },
  goldTotal: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  goldDelta: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    top: -2,
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
  },
  divider: { width: 1, height: 16, backgroundColor: '#2a2a4e' },
  accuracySection: { flexDirection: 'row', alignItems: 'baseline' },
  accuracyValue: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  label: { color: '#666', fontSize: 13 },
});
