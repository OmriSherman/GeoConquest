import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '../context/AuthContext';
import { playVictory } from '../lib/audio';

const REWARDS_CYCLE = [
  { day: 1, gold: 100 },
  { day: 2, gold: 150 },
  { day: 3, gold: 200 },
  { day: 4, gold: 250 },
  { day: 5, gold: 300 },
  { day: 6, gold: 400 },
  { day: 7, gold: 500, isMilestone: true },
];

export default function DailyRewardModal() {
  const { profile, dailyRewardAvailable, claimDailyReward } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);

  // Card entrance
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  // Post-claim coin bounce
  const coinScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 9,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!profile || (!dailyRewardAvailable && claimedReward === null)) {
    return null;
  }

  const prevStreak = profile.login_streak ?? 0;
  const previewStreak = dailyRewardAvailable ? prevStreak + 1 : prevStreak;
  const cycleDay = ((previewStreak - 1) % 7) + 1;
  const todayReward = REWARDS_CYCLE.find(r => r.day === cycleDay)!;

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const reward = await claimDailyReward();
      if (reward > 0) {
        setClaimedReward(reward);
        playVictory();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowConfetti(true);
        Animated.sequence([
          Animated.spring(coinScale, {
            toValue: 1.15,
            useNativeDriver: true,
            tension: 200,
            friction: 5,
          }),
          Animated.spring(coinScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 7,
          }),
        ]).start();
      }
    } catch (error) {
      console.warn('Failed to claim daily reward', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setClaiming(false);
    }
  };

  const closeModal = () => {
    setClaimedReward(null);
    setShowConfetti(false);
  };

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.streakPill}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakNumber}>{previewStreak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            <Text style={styles.title}>Daily Reward</Text>
            <Text style={styles.subtitle}>
              {claimedReward === null
                ? `Day ${cycleDay} of 7`
                : 'Reward claimed!'}
            </Text>
          </View>

          <View style={styles.divider} />

          {claimedReward === null ? (
            <>
              {/* ── 7-day strip ───────────────────────────────────────── */}
              <View style={styles.daysRow}>
                {REWARDS_CYCLE.map((reward) => {
                  const isToday = reward.day === cycleDay;
                  const isPast = reward.day < cycleDay;
                  return (
                    <View
                      key={reward.day}
                      style={[
                        styles.dayCard,
                        isPast && styles.dayCardPast,
                        isToday && styles.dayCardToday,
                        reward.isMilestone && !isPast && !isToday && styles.dayCardMilestone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          isPast && styles.dayLabelPast,
                          isToday && styles.dayLabelToday,
                        ]}
                      >
                        {`D${reward.day}`}
                      </Text>

                      {isPast ? (
                        <Text style={styles.checkIcon}>✓</Text>
                      ) : (
                        <>
                          <Text style={[styles.dayGold, isToday && styles.dayGoldToday]}>
                            {reward.gold >= 1000 ? `${reward.gold / 1000}k` : reward.gold}
                          </Text>
                          <Text style={styles.dayEmoji}>
                            {reward.isMilestone ? '🏆' : '🪙'}
                          </Text>
                        </>
                      )}

                      {isToday && <View style={styles.todayDot} />}
                    </View>
                  );
                })}
              </View>

              {/* ── Today's reward highlight ──────────────────────────── */}
              <View style={styles.todayHighlight}>
                <Text style={styles.todayHighlightEyebrow}>TODAY'S REWARD</Text>
                <View style={styles.todayHighlightRow}>
                  <Text style={styles.todayHighlightGold}>
                    🪙 {todayReward.gold.toLocaleString()}
                  </Text>
                  {todayReward.isMilestone && (
                    <View style={styles.milestonePill}>
                      <Text style={styles.milestonePillText}>WEEK BONUS</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── Claim button ──────────────────────────────────────── */}
              <TouchableOpacity
                style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
                onPress={handleClaim}
                disabled={claiming}
                activeOpacity={0.82}
              >
                <Text style={styles.claimButtonText}>
                  {claiming ? 'Claiming...' : `Claim 🪙 ${todayReward.gold.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── Post-claim state ──────────────────────────────────── */}
              <Animated.View
                style={[styles.rewardDisplay, { transform: [{ scale: coinScale }] }]}
              >
                <Text style={styles.rewardCoin}>🪙</Text>
                <Text style={styles.rewardAmount}>+{claimedReward.toLocaleString()}</Text>
                <Text style={styles.rewardGoldLabel}>gold added to your treasury</Text>
              </Animated.View>

              <Text style={styles.comeBackText}>Come back tomorrow to keep your streak!</Text>

              <TouchableOpacity
                style={styles.awesomeButton}
                onPress={closeModal}
                activeOpacity={0.82}
              >
                <Text style={styles.awesomeButtonText}>Awesome!</Text>
              </TouchableOpacity>
            </>
          )}

          {showConfetti && (
            <View style={styles.confettiContainer} pointerEvents="none">
              <ConfettiCannon
                count={130}
                origin={{ x: 160, y: 0 }}
                autoStart
                fadeOut
                colors={['#FFD700', '#FFA500', '#FFFACD', '#FF8C00', '#fff']}
              />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#0e0e1f',
    borderRadius: 24,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 390,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1000',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#7a3a00',
    marginBottom: 12,
    gap: 5,
  },
  streakFlame: {
    fontSize: 15,
  },
  streakNumber: {
    color: '#FF9500',
    fontWeight: 'bold',
    fontSize: 15,
  },
  streakLabel: {
    color: '#aa6020',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 0.2,
  },
  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#1c1c3e',
    marginBottom: 18,
  },
  // ── 7-day strip ───────────────────────────────────────────────────────────
  daysRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 14,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#0d0d22',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1c1c3e',
    minHeight: 68,
    gap: 3,
  },
  dayCardPast: {
    backgroundColor: '#081408',
    borderColor: '#1a3a1a',
  },
  dayCardToday: {
    backgroundColor: '#1c1600',
    borderColor: '#FFD700',
    borderWidth: 2,
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dayCardMilestone: {
    backgroundColor: '#110820',
    borderColor: '#3a1a5e',
  },
  dayLabel: {
    fontSize: 9,
    color: '#444',
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  dayLabelPast: {
    color: '#2a502a',
  },
  dayLabelToday: {
    color: '#FFD700',
  },
  dayGold: {
    fontSize: 12,
    color: '#bbb',
    fontWeight: 'bold',
  },
  dayGoldToday: {
    fontSize: 14,
    color: '#FFD700',
  },
  dayEmoji: {
    fontSize: 11,
  },
  checkIcon: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    marginTop: 1,
  },
  // ── Today's reward highlight ───────────────────────────────────────────────
  todayHighlight: {
    backgroundColor: '#141000',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2800',
    alignItems: 'center',
  },
  todayHighlightEyebrow: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  todayHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayHighlightGold: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  milestonePill: {
    backgroundColor: '#2a0a4e',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#5a2a9e',
  },
  milestonePillText: {
    color: '#C084FC',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },
  // ── Claim button ───────────────────────────────────────────────────────────
  claimButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    color: '#0a0a1a',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  // ── Post-claim ─────────────────────────────────────────────────────────────
  rewardDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  rewardCoin: {
    fontSize: 62,
    marginBottom: 6,
  },
  rewardAmount: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: -1,
  },
  rewardGoldLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  comeBackText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  awesomeButton: {
    borderWidth: 1.5,
    borderColor: '#FFD700',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  awesomeButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── Confetti ───────────────────────────────────────────────────────────────
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
});
