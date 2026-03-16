import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useAlert } from '../context/AlertContext';
import { playDing } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { fetchCountries } from '../lib/countryData';
import { AVATAR_CHARACTERS, CUSTOM_AVATARS } from '../lib/avatarData';
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
  fastFlagMastery: '@achievements/fast_flag_mastery',
  fastCapitalsMastery: '@achievements/fast_capitals_mastery',
  nightmareCompleted: '@achievements/nightmare_completed',
};

// Returns keys scoped to a specific user ID to prevent cross-account bleed
export function getUserAchievementKeys(userId: string) {
  return {
    flagQuizzesCompleted: `@achievements/${userId}/flag_quizzes`,
    perfectQuizzes: `@achievements/${userId}/perfect_quizzes`,
    speedRuns: `@achievements/${userId}/speed_runs`,
    totalGoldEarned: `@achievements/${userId}/total_gold`,
    fastFlagMastery: `@achievements/${userId}/fast_flag_mastery`,
    fastCapitalsMastery: `@achievements/${userId}/fast_capitals_mastery`,
    nightmareCompleted: `@achievements/${userId}/nightmare_completed`,
  };
}

export async function recordQuizCompletion(opts: {
  quizType: QuizType;
  perfect: boolean;
  scorePercentage?: number;
  durationSeconds: number;
  goldEarned: number;
  userId?: string;
}): Promise<{ newlyCompletedSpeedDemon: boolean; newlyCompletedNightmare: boolean; newlyCompletedCapitalsMastery: boolean }> {
  try {
    const keys = opts.userId ? getUserAchievementKeys(opts.userId) : ACHIEVEMENT_KEYS;
    const [flagStr, perfectStr, speedStr, goldStr, fastFlagStr, fastCapitalsStr, nightmareStr] = await AsyncStorage.multiGet([
      keys.flagQuizzesCompleted,
      keys.perfectQuizzes,
      keys.speedRuns,
      keys.totalGoldEarned,
      keys.fastFlagMastery,
      keys.fastCapitalsMastery,
      keys.nightmareCompleted,
    ]);

    const flags = parseInt(flagStr[1] ?? '0', 10);
    const perfects = parseInt(perfectStr[1] ?? '0', 10);
    const speeds = parseInt(speedStr[1] ?? '0', 10);
    const gold = parseInt(goldStr[1] ?? '0', 10);
    const wasAlreadySpeedDemon = fastFlagStr[1] === 'true';
    const wasAlreadyCapitalsMastery = fastCapitalsStr[1] === 'true';
    const wasAlreadyNightmare = nightmareStr[1] === 'true';
    const meetsSpeedDemon = opts.quizType === 'flag' && (opts.scorePercentage ?? 0) >= 90 && opts.durationSeconds < 30;
    const meetsCapitalsMastery = opts.quizType === 'capitals' && (opts.scorePercentage ?? 0) >= 90 && opts.durationSeconds < 30;
    const isFastFlagMastery = wasAlreadySpeedDemon || meetsSpeedDemon;
    const isFastCapitalsMastery = wasAlreadyCapitalsMastery || meetsCapitalsMastery;
    const isNightmareCompleted = wasAlreadyNightmare || opts.quizType === 'nightmare';

    await AsyncStorage.multiSet([
      [keys.flagQuizzesCompleted, String(opts.quizType === 'flag' ? flags + 1 : flags)],
      [keys.perfectQuizzes, String(opts.perfect ? perfects + 1 : perfects)],
      [keys.speedRuns, String(opts.durationSeconds < 30 ? speeds + 1 : speeds)],
      [keys.totalGoldEarned, String(gold + opts.goldEarned)],
      [keys.fastFlagMastery, String(isFastFlagMastery)],
      [keys.fastCapitalsMastery, String(isFastCapitalsMastery)],
      [keys.nightmareCompleted, String(isNightmareCompleted)],
    ]);

    return {
      newlyCompletedSpeedDemon: !wasAlreadySpeedDemon && meetsSpeedDemon,
      newlyCompletedNightmare: !wasAlreadyNightmare && opts.quizType === 'nightmare',
      newlyCompletedCapitalsMastery: !wasAlreadyCapitalsMastery && meetsCapitalsMastery,
    };
  } catch (err) {
    console.warn('[Achievements] Failed to record quiz:', err);
    return { newlyCompletedSpeedDemon: false, newlyCompletedNightmare: false, newlyCompletedCapitalsMastery: false };
  }
}

type StatsType = {
  ownedCount: number;
  areaSqKm: number;
  loginStreak: number;
  fastFlagMastery?: boolean;
  nightmareCompleted?: boolean;
  ownedByRegion?: Record<string, number>;
  totalByRegion?: Record<string, number>;
  ownedItems?: Set<string>;
  ownedAvatarCount?: number;
};

function renderAchievementCard(
  achievement: import('../lib/achievementsData').Achievement,
  stats: StatsType,
  claimedIds: Set<string>,
  claimingId: string | null,
  handleClaim: (id: string, gold: number, items?: { type: 'avatar' | 'flag'; itemId: string }[]) => void,
  showRewards: (achievement: import('../lib/achievementsData').Achievement) => void,
  isPremiumSection = false,
) {
  const [current, target] = achievement.getProgress(stats);
  const isCompleted = current >= target;
  const isClaimed = claimedIds.has(achievement.id);
  const pct = Math.min((current / target) * 100, 100);
  // Normalise: prefer rewardItems array; fall back to single rewardItem
  const rewardItems = achievement.rewardItems ?? (achievement.rewardItem ? [achievement.rewardItem] : []);
  const hasItemRewards = rewardItems.length > 0;

  return (
    <View
      key={achievement.id}
      style={[styles.card, isClaimed && styles.cardClaimed, isPremiumSection && styles.cardPremium]}
    >
      <View style={[styles.iconBg, isClaimed && { backgroundColor: '#FFD70022' }, isPremiumSection && styles.iconBgPremium]}>
        <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
        {isClaimed && (
          <View style={styles.checkOverlay}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.cardTitle, isClaimed && styles.cardTitleClaimed]}>
              {achievement.title}
            </Text>
            {isPremiumSection && <Text style={styles.premiumBadge}>👑</Text>}
          </View>
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
                  isPremiumSection && styles.progressBarPremium,
                ]}
              />
            </View>

            {isCompleted ? (
              <View style={styles.claimRow}>
                <TouchableOpacity
                  style={[styles.claimButton, isPremiumSection && styles.claimButtonPremium]}
                  onPress={() => handleClaim(achievement.id, achievement.rewardGold, rewardItems.length ? rewardItems : undefined)}
                  disabled={claimingId === achievement.id}
                >
                  {claimingId === achievement.id ? (
                    <ActivityIndicator size="small" color="#0a0a1a" />
                  ) : (
                    <View style={styles.claimButtonInner}>
                      <Text style={styles.claimButtonText}>Claim</Text>
                      {achievement.rewardGold > 0 && (
                        <Text style={styles.claimButtonText}>💰 {achievement.rewardGold.toLocaleString()}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {hasItemRewards && (
                  <TouchableOpacity style={styles.rewardsBadge} onPress={() => showRewards(achievement)}>
                    <Text style={styles.rewardsBadgeText}>🎁 Rewards</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.rewardPill}>
                {achievement.rewardGold > 0 && (
                  <Text style={styles.rewardHint}>💰 {achievement.rewardGold.toLocaleString()}</Text>
                )}
                {hasItemRewards && (
                  <TouchableOpacity style={styles.rewardsBadge} onPress={() => showRewards(achievement)}>
                    <Text style={styles.rewardsBadgeText}>🎁 Rewards</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.rewardPill}>
            {achievement.rewardGold > 0 && (
              <Text style={styles.claimedHint}>✓ 💰 {achievement.rewardGold.toLocaleString()}</Text>
            )}
            {hasItemRewards && (
              <TouchableOpacity style={styles.rewardsBadge} onPress={() => showRewards(achievement)}>
                <Text style={styles.rewardsBadgeText}>🎁 Rewards</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const { profile, claimAchievement } = useAuth();
  const { ownedCountries } = useGame();
  const { showAlert } = useAlert();
  
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [fastFlagMastery, setFastFlagMastery] = useState(false);
  const [fastCapitalsMastery, setFastCapitalsMastery] = useState(false);
  const [nightmareCompleted, setNightmareCompleted] = useState(false);
  const [hasDarkScroll, setHasDarkScroll] = useState(false);
  const [ownedItemsSet, setOwnedItemsSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCountries().then(setAllCountries).catch(console.warn);
    loadClaimedAchievements();
    loadLocalStats();
  }, [profile?.id]);

  useFocusEffect(React.useCallback(() => {
    loadLocalStats();
    loadClaimedAchievements();
  }, [profile?.id]));

  async function loadLocalStats() {
    if (!profile?.id) return;
    try {
      const keys = getUserAchievementKeys(profile.id);
      const [fastFlagVal, fastCapitalsVal, nightmareVal] = await AsyncStorage.multiGet([
        keys.fastFlagMastery,
        keys.fastCapitalsMastery,
        keys.nightmareCompleted,
      ]);
      if (fastFlagVal[1] === 'true') setFastFlagMastery(true);
      if (fastCapitalsVal[1] === 'true') setFastCapitalsMastery(true);
      if (nightmareVal[1] === 'true') setNightmareCompleted(true);
    } catch (e) {
      console.warn('Failed to load local stats', e);
    }
  }

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

      // Load all unlocked items
      const { data: itemsData } = await supabase
        .from('user_unlocked_items')
        .select('item_id')
        .eq('user_id', profile.id);
      const itemSet = new Set<string>();
      if (itemsData) itemsData.forEach((r: any) => itemSet.add(r.item_id));
      setOwnedItemsSet(itemSet);

      setHasDarkScroll(itemSet.has('upgrade_nightmare'));
    } catch (err) {
      console.warn('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(id: string, reward: number, items?: { type: 'avatar' | 'flag'; itemId: string }[]) {
    if (claimingId) return;
    setClaimingId(id);
    try {
      await claimAchievement(id, reward, items);
      setClaimedIds((prev) => new Set(prev).add(id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playDing();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setClaimingId(null);
    }
  }

  function showQuestRewards(ach: import('../lib/achievementsData').Achievement) {
    const items = ach.rewardItems ?? (ach.rewardItem ? [ach.rewardItem] : []);
    const icon = items.length > 0 ? (
      <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {items.map(item => <RewardItemPreview key={item.itemId} itemId={item.itemId} type={item.type} size={64} />)}
      </View>
    ) : undefined;
    const lines: string[] = [];
    if (ach.rewardGold > 0) lines.push(`💰 ${ach.rewardGold.toLocaleString()} gold`);
    items.forEach(item => lines.push(`+ ${item.label}`));
    showAlert({ title: 'Quest Rewards', icon, message: lines.join('\n') });
  }

  // Calculate user stats for checking progress
  const areaSqKm = useMemo(
    () => allCountries.filter((c) => ownedCountries.includes(c.cca2)).reduce((sum, c) => sum + (c.area || 0), 0),
    [allCountries, ownedCountries],
  );

  const totalByRegion = useMemo(() => {
    const map: Record<string, number> = {};
    allCountries.forEach((c) => { map[c.region] = (map[c.region] ?? 0) + 1; });
    return map;
  }, [allCountries]);

  const ownedByRegion = useMemo(() => {
    const ownedSet = new Set(ownedCountries);
    const map: Record<string, number> = {};
    allCountries.forEach((c) => { if (ownedSet.has(c.cca2)) map[c.region] = (map[c.region] ?? 0) + 1; });
    return map;
  }, [allCountries, ownedCountries]);

  const allAvatarIds = useMemo(() => new Set([
    ...AVATAR_CHARACTERS.filter(a => a.isPremium).map(a => a.emoji),
    ...CUSTOM_AVATARS.map(a => a.key),
  ]), []);

  const ownedAvatarCount = useMemo(
    () => [...ownedItemsSet].filter(id => allAvatarIds.has(id)).length,
    [ownedItemsSet, allAvatarIds],
  );

  const stats = {
    ownedCount: ownedCountries.length,
    areaSqKm,
    loginStreak: profile?.login_streak || 0,
    fastFlagMastery,
    fastCapitalsMastery,
    nightmareCompleted,
    ownedByRegion,
    totalByRegion,
    ownedItems: ownedItemsSet,
    ownedAvatarCount,
  };

  const regularAchievements = ACHIEVEMENTS_DATA.filter((a) => !a.isPremium);
  const continentAchievements = ACHIEVEMENTS_DATA.filter((a) => a.isPremium);

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

      {regularAchievements.map((achievement) => {
        // Nightmare quest: hidden as ??? until user owns the Dark Scroll upgrade
        if (achievement.id === 'nightmare_complete' && !hasDarkScroll) {
          return (
            <View key="nightmare_hidden" style={[styles.card, styles.cardMystery]}>
              <View style={[styles.iconBg, styles.iconBgMystery]}>
                <Text style={styles.achievementEmoji}>📜</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitleMystery}>???</Text>
                <View style={[styles.progressBarBg, { marginTop: 8, marginRight: 0 }]}>
                  <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#2a0808' }]} />
                </View>
              </View>
            </View>
          );
        }
        // True Conqueror: hidden until nightmare_complete is claimed (Beast Mark obtained)
        if (achievement.id === 'true_conqueror' && !claimedIds.has('nightmare_complete')) {
          return (
            <View key="true_conqueror_hidden" style={[styles.card, styles.cardMystery]}>
              <View style={[styles.iconBg, styles.iconBgMystery]}>
                <Text style={styles.achievementEmoji}>☠️</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitleMystery}>???</Text>
                <View style={[styles.progressBarBg, { marginTop: 8, marginRight: 0 }]}>
                  <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#2a0808' }]} />
                </View>
              </View>
            </View>
          );
        }
        return renderAchievementCard(achievement, stats, claimedIds, claimingId, handleClaim, showQuestRewards);
      })}

      {/* ── Continent Quests ─────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLine} />
        <Text style={styles.sectionHeaderText}>👑 Continent Quests</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
      <Text style={styles.sectionSubtext}>Conquer an entire continent to claim a massive gold reward.</Text>

      {continentAchievements.map((achievement) => renderAchievementCard(achievement, stats, claimedIds, claimingId, handleClaim, showQuestRewards, true))}

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
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardsBadge: {
    backgroundColor: '#1a1a35',
    borderWidth: 1,
    borderColor: '#4D96FF55',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rewardsBadgeText: { color: '#4D96FF', fontSize: 11, fontWeight: 'bold' },
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
  // ── Premium / continent styles ─────────────────────────────────────────────
  cardPremium: {
    borderColor: '#7B2FBE',
    borderWidth: 1.5,
  },
  iconBgPremium: {
    backgroundColor: '#2a0a3e',
  },
  premiumBadge: {
    fontSize: 13,
  },
  progressBarPremium: {
    backgroundColor: '#9B59B6',
  },
  claimButtonPremium: {
    backgroundColor: '#9B59B6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 6,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#7B2FBE44',
  },
  sectionHeaderText: {
    color: '#C084FC',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionSubtext: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  // ── Mystery quest (Dark Scroll locked) ────────────────────────────────────
  cardMystery: {
    borderColor: '#7a0000',
    borderWidth: 1.5,
    backgroundColor: '#120808',
  },
  iconBgMystery: {
    backgroundColor: '#2a0808',
  },
  cardTitleMystery: {
    color: '#cc3333',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 3,
  },
  cardDescMystery: {
    color: '#5a2020',
    fontSize: 11,
    marginTop: 2,
  },
});
