import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TicketImg = ({ size = 14 }: { size?: number }) => (
  <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: size, height: size }} resizeMode="contain" />
);
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { playVictory } from '../lib/audio';
import TopFallConfetti from './TopFallConfetti';

const REWARDS_CYCLE = [
  { day: 1, gold: 100, tickets: 1 },
  { day: 2, gold: 150, tickets: 1 },
  { day: 3, gold: 200, tickets: 2 },
  { day: 4, gold: 250, tickets: 2 },
  { day: 5, gold: 300, tickets: 3 },
  { day: 6, gold: 400, tickets: 3 },
  { day: 7, gold: 500, tickets: 5, isMilestone: true },
];

export default function DailyRewardModal() {
  const { profile, dailyRewardAvailable, claimDailyReward } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ gold: number; tickets: number } | null>(null);

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
  const rewardMultiplier = profile.is_conquerer ? 3 : 1;
  const todayRewardBase = REWARDS_CYCLE.find(r => r.day === cycleDay)!;
  const todayReward = {
    ...todayRewardBase,
    gold: todayRewardBase.gold * rewardMultiplier,
    tickets: todayRewardBase.tickets * rewardMultiplier,
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const reward = await claimDailyReward();
      if (reward.gold > 0) {
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
              <Image source={require('../../assets/avatars/flame.png')} style={{ width: 15, height: 15 }} resizeMode="contain" />
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
                  const rewardGold = reward.gold * rewardMultiplier;
                  const rewardTickets = reward.tickets * rewardMultiplier;
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
                            {rewardGold >= 1000 ? `${rewardGold / 1000}k` : rewardGold}
                          </Text>
                          <Image
                            source={reward.isMilestone
                              ? require('../../assets/avatars/trophy.png')
                              : require('../../assets/avatars/gold_coin.png')}
                            style={{ width: 14, height: 14 }}
                            resizeMode="contain"
                          />
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <TicketImg size={isToday ? 18 : 16} />
                            <Text style={[styles.dayTickets, isToday && styles.dayTicketsToday]}>{rewardTickets}</Text>
                          </View>
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
                {rewardMultiplier > 1 && (
                  <Text style={styles.multiplierLabel}>Conqueror x{rewardMultiplier}</Text>
                )}
                <View style={styles.todayHighlightRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    <Text style={styles.todayHighlightGold}>{todayReward.gold.toLocaleString()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <TicketImg size={28} />
                    <Text style={styles.todayHighlightTickets}>{todayReward.tickets}</Text>
                  </View>
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
                {claiming ? (
                  <Text style={styles.claimButtonText}>Claiming...</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.claimButtonText}>Claim</Text>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                    <Text style={styles.claimButtonText}>{todayReward.gold.toLocaleString()}</Text>
                    <TicketImg size={18} />
                    <Text style={styles.claimButtonText}>{todayReward.tickets}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── Post-claim state ──────────────────────────────────── */}
              <Animated.View
                style={[styles.rewardDisplay, { transform: [{ scale: coinScale }] }]}
              >
                <View style={styles.rewardRow}>
                  <View style={styles.rewardItem}>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
                    <Text style={[styles.rewardAmount, styles.rewardAmountGold]}>+{claimedReward.gold.toLocaleString()}</Text>
                    <Text style={styles.rewardGoldLabel}>gold</Text>
                  </View>
                  <View style={styles.rewardDivider} />
                  <View style={styles.rewardItem}>
                    <TicketImg size={72} />
                    <Text style={styles.rewardAmount}>+{claimedReward.tickets}</Text>
                    <Text style={styles.rewardGoldLabel}>tickets</Text>
                  </View>
                </View>
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

          {showConfetti && <TopFallConfetti />}
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
  multiplierLabel: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '800',
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
  // ── Day card tickets ──────────────────────────────────────────────────────
  dayTickets: {
    fontSize: 9,
    color: '#888',
  },
  dayTicketsToday: {
    color: '#FFD700',
    fontSize: 10,
  },
  // ── Today highlight tickets ───────────────────────────────────────────────
  todayHighlightTickets: {
    fontSize: 20,
    color: '#aaa',
    fontWeight: 'bold',
  },
  // ── Post-claim ─────────────────────────────────────────────────────────────
  rewardDisplay: {
    paddingVertical: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  rewardItem: {
    alignItems: 'center',
    gap: 4,
  },
  rewardDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#2a2a4e',
  },
  rewardCoin: {
    fontSize: 48,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: -1,
  },
  rewardAmountGold: {
    marginTop: 6,
  },
  rewardGoldLabel: {
    fontSize: 13,
    color: '#666',
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
