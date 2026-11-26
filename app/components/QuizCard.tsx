import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { CARD_PALETTES, PaletteName } from '../lib/cardStates';
import { XpAmount, XpIcon } from './XpIcon';

interface Props {
  title: string;
  goldReward?: string;
  goldRewardParts?: { amount: string; xpAmount?: string; suffix?: string };
  xpReward?: string;
  emoji?: string;
  onPress: () => void;
  style?: ViewStyle;
  iconNode?: React.ReactNode;
  isLocked?: boolean;
  /** Card state drives border/bg color via the unified palette system */
  cardState?: PaletteName;
  /** Small cost badge shown inline with rewards */
  costBadge?: React.ReactNode;
  /** If true, play single blink animation */
  shouldBlink?: boolean;
  /** Vertical card for the 2x2 grid */
  compact?: boolean;
}

export default function QuizCard({ title, goldReward, goldRewardParts, xpReward, emoji, onPress, style, iconNode, isLocked, cardState, costBadge, shouldBlink, compact }: Props) {
  const isNightmare = !isLocked && (title === '???' || title.toLowerCase().includes('nightmare'));
  const palette = isLocked ? CARD_PALETTES.unique : cardState && cardState !== 'normal' ? CARD_PALETTES[cardState] : null;

  const glowOpacity = useRef(new Animated.Value(0)).current;
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (shouldBlink && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldBlink, glowOpacity]);

  return (
    <View style={compact ? { width: '48.5%' } : undefined}>
      {shouldBlink && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 215, 0, 0.4)',
            opacity: glowOpacity,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}
      <TouchableOpacity
        style={[
          styles.card,
          compact && styles.cardCompact,
          isLocked && { opacity: 0.6 },
          palette && { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, borderWidth: 2 },
          style,
          isLocked && { backgroundColor: CARD_PALETTES.unique.cardBg, borderColor: CARD_PALETTES.unique.cardBorder, borderWidth: 2, shadowOpacity: 0, elevation: 0 },
        ]}
        onPress={onPress}
        activeOpacity={isLocked ? 1 : 0.85}
      >
      {compact && isLocked && <Image source={require('../../assets/avatars/lock.png')} style={styles.lockCorner} resizeMode="contain" />}
      <View style={[styles.left, compact && styles.leftCompact, isNightmare && { backgroundColor: '#1a0000', borderColor: '#400', borderWidth: 1 }]}>
        {iconNode ? iconNode : <Text style={styles.emoji}>{emoji}</Text>}
      </View>
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={{ flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'flex-start' : 'center', justifyContent: 'space-between', gap: compact ? 3 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flex: compact ? 0 : 1 }}>
            <Text style={[styles.title, compact && { fontSize: 15 }, isNightmare && { color: '#ff3333', textShadowColor: '#ff0000', textShadowRadius: 8, fontSize: 20, letterSpacing: 4 }]}>
              {title}
            </Text>
          </View>
          {compact && !costBadge && <View style={styles.costBadgeSpacer} />}
          {!!costBadge && (
            <View style={styles.costBadge}>
              {typeof costBadge === 'string'
                ? <Text style={styles.costBadgeText}>{costBadge}</Text>
                : costBadge}
            </View>
          )}
        </View>
        {!isLocked && !!(goldRewardParts || goldReward || xpReward) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            {goldRewardParts ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Text style={[styles.reward, isNightmare && { color: '#cc0000' }]}>{goldRewardParts.amount}</Text>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                {!!goldRewardParts.xpAmount && (
                  <>
                    <Text style={[styles.reward, isNightmare && { color: '#cc0000' }]}>/</Text>
                    <XpAmount amount={goldRewardParts.xpAmount} iconSize={13} textStyle={[styles.reward, isNightmare && { color: '#cc0000' }]} />
                  </>
                )}
                {!!goldRewardParts.suffix && (
                  <Text style={[styles.reward, isNightmare && { color: '#cc0000' }]}>{goldRewardParts.suffix}</Text>
                )}
              </View>
            ) : (
              <Text style={[styles.reward, isNightmare && { color: '#cc0000' }]}>
                {goldReward ?? ''}
              </Text>
            )}
            {!!xpReward && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={styles.xpReward}>{xpReward}</Text>
                <XpIcon size={12} />
              </View>
            )}
          </View>
        )}
      </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 12,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 14,
  },
  cardCompact: { padding: 10, gap: 10 },
  bodyCompact: { flex: 1 },
  costBadgeSpacer: { height: 0 },
  lockCorner: { position: 'absolute', top: 6, right: 6, width: 16, height: 16 },
  leftCompact: { width: 50, height: 50, borderRadius: 12 },
  left: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0a0a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  body: { flex: 1, gap: 3, justifyContent: 'center' },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  reward: { color: '#FFD700', fontSize: 13 },
  xpReward: { color: '#888', fontSize: 12 },
  stateBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  costBadge: {
    backgroundColor: '#1e1e35',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  costBadgeText: {
    color: '#aaa',
    fontSize: 12,
  },
});
