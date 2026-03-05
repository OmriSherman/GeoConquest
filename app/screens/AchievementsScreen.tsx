import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { playDing } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { fetchCountries } from '../lib/countryData';
import { Country, QuizType } from '../types';
import AvatarDisplay from '../components/AvatarDisplay';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

// Small visual preview of a trophy item reward (avatar emoji/SVG or flag)
function RewardItemPreview({ itemId, type, size = 22 }: { itemId: string; type: 'avatar' | 'flag'; size?: number }) {
  if (type === 'flag') {
    const FlagComp = isCustomFlag(itemId) ? CUSTOM_FLAG_COMPONENTS[itemId] : null;
    if (FlagComp) return <FlagComp size={size} />;
    return <Text style={{ fontSize: size, lineHeight: size + 2 }}>{itemId}</Text>;
  }
  return <AvatarDisplay avatarId={itemId} size={size} />;
}

export const ACHIEVEMENT_KEYS = {
  flagQuizzesCompleted: '@achievements/flag_quizzes',
  perfectQuizzes: '@achievements/perfect_quizzes',
  speedRuns: '@achievements/speed_runs',
  totalGoldEarned: '@achievements/total_gold',
};

export async function recordQuizCompletion(opts: {
  quizType: QuizType;
  perfect: boolean;
  durationSeconds: number;
  goldEarned: number;
}) {
  try {
    const [flagStr, perfectStr, speedStr, goldStr] = await AsyncStorage.multiGet([
      ACHIEVEMENT_KEYS.flagQuizzesCompleted,
      ACHIEVEMENT_KEYS.perfectQuizzes,
      ACHIEVEMENT_KEYS.speedRuns,
      ACHIEVEMENT_KEYS.totalGoldEarned,
    ]);

    const flags = parseInt(flagStr[1] ?? '0', 10);
    const perfects = parseInt(perfectStr[1] ?? '0', 10);
    const speeds = parseInt(speedStr[1] ?? '0', 10);
    const gold = parseInt(goldStr[1] ?? '0', 10);

    await AsyncStorage.multiSet([
      [ACHIEVEMENT_KEYS.flagQuizzesCompleted, String(opts.quizType === 'flag' ? flags + 1 : flags)],
      [ACHIEVEMENT_KEYS.perfectQuizzes, String(opts.perfect ? perfects + 1 : perfects)],
      [ACHIEVEMENT_KEYS.speedRuns, String(opts.durationSeconds < 30 ? speeds + 1 : speeds)],
      [ACHIEVEMENT_KEYS.totalGoldEarned, String(gold + opts.goldEarned)],
    ]);
  } catch (err) {
    console.warn('[Achievements] Failed to record quiz:', err);
  }
}

export default function AchievementsScreen() {
  const { profile, claimAchievement } = useAuth();
  const { ownedCountries } = useGame();
  
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchCountries().then(setAllCountries).catch(console.warn);
    loadClaimedAchievements();
  }, [profile?.id]);

  async function loadClaimedAchievements() {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.id);

      if (error) throw error;
      
      const setIds = new Set<string>();
      if (data) {
        data.forEach((row) => setIds.add(row.achievement_id));
      }
      setClaimedIds(setIds);
    } catch (err) {
      console.warn('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(id: string, reward: number, rewardItem?: { type: 'avatar' | 'flag'; itemId: string }) {
    if (claimingId) return;
    setClaimingId(id);
    try {
      await claimAchievement(id, reward, rewardItem);
      setClaimedIds((prev) => new Set(prev).add(id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playDing();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setClaimingId(null);
    }
  }

  // Calculate user stats for checking progress
  const areaSqKm = allCountries
    .filter((c) => ownedCountries.includes(c.cca2))
    .reduce((sum, c) => sum + (c.area || 0), 0);
    
  const stats = {
    ownedCount: ownedCountries.length,
    areaSqKm,
    loginStreak: profile?.login_streak || 0,
  };

  if (loading && allCountries.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFD700" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🏅 Trophies</Text>
        <View style={styles.progressSummary}>
          <Text style={styles.progressSummaryText}>
            {claimedIds.size} / {ACHIEVEMENTS_DATA.length} Claimed
          </Text>
        </View>
      </View>

      <View style={styles.overallBar}>
        <View
          style={[
            styles.overallFill,
            { width: `${(claimedIds.size / ACHIEVEMENTS_DATA.length) * 100}%` as any },
          ]}
        />
      </View>

      {ACHIEVEMENTS_DATA.map((achievement) => {
        const [current, target] = achievement.getProgress(stats);
        const isCompleted = current >= target;
        const isClaimed = claimedIds.has(achievement.id);
        const pct = Math.min((current / target) * 100, 100);

        return (
          <View
            key={achievement.id}
            style={[styles.card, isClaimed && styles.cardClaimed]}
          >
            <View style={[styles.iconBg, isClaimed && { backgroundColor: '#FFD70022' }]}>
              <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
              {isClaimed && (
                <View style={styles.checkOverlay}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, isClaimed && styles.cardTitleClaimed]}>
                  {achievement.title}
                </Text>
                <Text style={styles.cardCount}>
                  {Math.floor(current).toLocaleString()} / {Math.floor(target).toLocaleString()}
                </Text>
              </View>
              
              <Text style={styles.cardDesc}>{achievement.description}</Text>

              {!isClaimed ? (
                <View style={styles.actionRow}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${pct}%` as any },
                        isCompleted && styles.progressBarComplete,
                      ]}
                    />
                  </View>

                  {isCompleted ? (
                    <TouchableOpacity
                      style={styles.claimButton}
                      onPress={() => handleClaim(achievement.id, achievement.rewardGold, achievement.rewardItem)}
                      disabled={claimingId === achievement.id}
                    >
                      {claimingId === achievement.id ? (
                        <ActivityIndicator size="small" color="#0a0a1a" />
                      ) : (
                        <View style={styles.claimButtonInner}>
                          <Text style={styles.claimButtonText}>Claim</Text>
                          {achievement.rewardGold > 0 && (
                            <Text style={styles.claimButtonText}>💰 {achievement.rewardGold}</Text>
                          )}
                          {achievement.rewardGold > 0 && achievement.rewardItem && (
                            <Text style={styles.claimButtonText}>+</Text>
                          )}
                          {achievement.rewardItem && (
                            <View style={styles.claimItemPreview}>
                              <RewardItemPreview itemId={achievement.rewardItem.itemId} type={achievement.rewardItem.type} size={18} />
                              <Text style={styles.claimButtonText}>{achievement.rewardItem.label}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.rewardPill}>
                      {achievement.rewardGold > 0 && (
                        <Text style={styles.rewardHint}>💰 {achievement.rewardGold}</Text>
                      )}
                      {achievement.rewardGold > 0 && achievement.rewardItem && (
                        <Text style={styles.rewardHint}>+</Text>
                      )}
                      {achievement.rewardItem && (
                        <View style={styles.rewardItemRow}>
                          <RewardItemPreview itemId={achievement.rewardItem.itemId} type={achievement.rewardItem.type} size={18} />
                          <Text style={styles.rewardItemHint}>{achievement.rewardItem.label}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.rewardPill}>
                  {achievement.rewardGold > 0 && (
                    <Text style={styles.claimedHint}>✓ 💰 {achievement.rewardGold}</Text>
                  )}
                  {achievement.rewardGold > 0 && achievement.rewardItem && (
                    <Text style={styles.claimedHint}>+</Text>
                  )}
                  {achievement.rewardItem && (
                    <View style={styles.rewardItemRow}>
                      <RewardItemPreview itemId={achievement.rewardItem.itemId} type={achievement.rewardItem.type} size={18} />
                      <Text style={styles.claimedItemHint}>✓ {achievement.rewardItem.label}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon 
            count={100} 
            origin={{ x: 200, y: 0 }} 
            colors={['#FFD700', '#FFA500', '#FFF8DC']} 
            fallSpeed={2500} 
            fadeOut 
            autoStart
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  center: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  progressSummary: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  progressSummaryText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  overallBar: {
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 12,
  },
  cardClaimed: {
    borderColor: '#FFD700',
    backgroundColor: '#141420',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2a2a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementEmoji: { fontSize: 22 },
  checkOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6BCB77',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  cardBody: { flex: 1, gap: 4 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  cardTitleClaimed: { color: '#fff' },
  cardCount: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  cardDesc: { color: '#666', fontSize: 11 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#2a2a4e',
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4D96FF',
    borderRadius: 2,
  },
  progressBarComplete: {
    backgroundColor: '#FFD700',
  },
  rewardPill: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  rewardHint: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  rewardItemHint: { color: '#4D96FF', fontSize: 11, fontWeight: 'bold' },
  claimedHint: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  claimedItemHint: { color: '#4D96FF', fontSize: 11, fontWeight: 'bold' },
  claimButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  claimItemPreview: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rewardItemRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  claimButtonText: { color: '#0a0a1a', fontSize: 11, fontWeight: 'bold' },
});
