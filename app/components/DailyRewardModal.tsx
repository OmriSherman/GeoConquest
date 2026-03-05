import React, { useState } from 'react';
import {
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
  { day: 1, gold: 500 },
  { day: 2, gold: 1000 },
  { day: 3, gold: 1500 },
  { day: 4, gold: 2000 },
  { day: 5, gold: 3000 },
  { day: 6, gold: 4000 },
  { day: 7, gold: 5000, isMilestone: true },
];

export default function DailyRewardModal() {
  const { profile, dailyRewardAvailable, claimDailyReward } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);

  if (!profile || (!dailyRewardAvailable && claimedReward === null)) {
    return null;
  }

  // Calculate which day of the 7-day cycle they are on right now
  const prevStreak = profile.login_streak ?? 0;
  // If dailyRewardAvailable is true, their *next* claim will be (prevStreak + 1)
  const previewStreak = dailyRewardAvailable ? prevStreak + 1 : prevStreak;
  const cycleDay = ((previewStreak - 1) % 7) + 1; // 1 to 7

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
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Daily Reward</Text>
          <Text style={styles.subtitle}>
            {claimedReward === null 
              ? `Day ${cycleDay} of your streak!` 
              : `You claimed 🪙 ${claimedReward} gold!`}
          </Text>

          <View style={styles.daysGrid}>
            {REWARDS_CYCLE.map((reward, index) => {
              const isToday = reward.day === cycleDay;
              const isPast = reward.day < cycleDay;
              
              return (
                <View 
                  key={reward.day} 
                  style={[
                    styles.dayContainer,
                    isPast && styles.dayPast,
                    isToday && styles.dayToday
                  ]}
                >
                  <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                    Day {reward.day}
                  </Text>
                  <View style={styles.rewardBox}>
                    {isPast ? (
                      <Text style={styles.checkMark}>✅</Text>
                    ) : (
                      <>
                        <Text style={styles.goldVal}>
                          {reward.gold >= 1000 ? `${reward.gold / 1000}k` : reward.gold}
                        </Text>
                        <Text style={styles.goldIcon}>🪙</Text>
                        {reward.isMilestone && <Text style={styles.trophyIcon}>🏆</Text>}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {claimedReward === null ? (
            <TouchableOpacity 
              style={[styles.claimButton, claiming && styles.claimButtonDisabled]}
              onPress={handleClaim}
              disabled={claiming}
            >
              <Text style={styles.claimButtonText}>
                {claiming ? 'Claiming...' : 'Claim Reward'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Awesome!</Text>
            </TouchableOpacity>
          )}

          {showConfetti && (
            <View style={styles.confettiContainer} pointerEvents="none">
              <ConfettiCannon
                count={100}
                origin={{ x: 150, y: 0 }}
                autoStart={true}
                fadeOut={true}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 24,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dayContainer: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    width: 70,
    height: 85,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayPast: {
    opacity: 0.5,
    borderColor: '#4CAF50',
  },
  dayToday: {
    borderColor: '#FFD700',
    backgroundColor: '#2a2000',
    transform: [{ scale: 1.05 }],
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dayTextToday: {
    color: '#FFD700',
  },
  rewardBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  goldIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 24,
  },
  trophyIcon: {
    fontSize: 14,
    position: 'absolute',
    top: -4,
    right: -12,
  },
  claimButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.7,
  },
  claimButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
});
