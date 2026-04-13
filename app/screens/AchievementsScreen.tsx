import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useAlert } from '../context/AlertContext';
import { playQuestComplete } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { getLevelInfo } from '../lib/xpSystem';
import { fetchCountries } from '../lib/countryData';
import { CUSTOM_AVATARS } from '../lib/avatarData';
import { Country, QuizType } from '../types';
import AvatarDisplay from '../components/AvatarDisplay';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

// Item image map for custom items (non-avatar, non-flag)
const ITEM_IMAGES: Record<string, any> = {
  suit_up: require('../../assets/avatars/suit_up.png'),
  png_beast_mark: require('../../assets/avatars/beast_mark.png'),
  upgrade_capitals: require('../../assets/avatars/building.png'),
  upgrade_borders: require('../../assets/avatars/border.png'),
  upgrade_nightmare: require('../../assets/avatars/dark_scroll.png'),
};

// PNG achievement icon map (for icons stored as png_ keys)
const ACHIEVEMENT_ICON_IMAGES: Record<string, any> = {
  png_domination:      require('../../assets/avatars/domination.png'),
  png_evil_vanquished: require('../../assets/avatars/evil_vanquished.png'),
  png_demon:           require('../../assets/avatars/demon.png'),
  png_star:            require('../../assets/avatars/star.png'),
  png_star2:           require('../../assets/avatars/star2.png'),
  png_war_medal:       require('../../assets/avatars/war_medal.png'),
  png_diamond:         require('../../assets/avatars/diamond.png'),
  png_crown:           require('../../assets/avatars/crown.png'),
  png_sun:             require('../../assets/avatars/sun.png'),
  png_flags:           require('../../assets/avatars/flags.png'),
  png_shape:           require('../../assets/avatars/shape.png'),
  png_castle:          require('../../assets/avatars/castle.png'),
  png_globe:           require('../../assets/avatars/globe.png'),
  png_calendar:        require('../../assets/avatars/calendar.png'),
  png_galaxy:          require('../../assets/avatars/galaxy.png'),
  png_lightning:       require('../../assets/avatars/lightning.png'),
  png_crossed_swords:  require('../../assets/avatars/crossed_swords.png'),
  png_trophy:          require('../../assets/avatars/trophy.png'),
  png_commando:        require('../../assets/avatars/commando.png'),
  png_ruler:           require('../../assets/avatars/ruler.png'),
  png_mountain:        require('../../assets/avatars/mountain.png'),
  png_wave:            require('../../assets/avatars/wave.png'),
  png_eagle:           require('../../assets/avatars/eagle.png'),
  png_theater_mask:    require('../../assets/avatars/theater_mask.png'),
  png_skull:           require('../../assets/avatars/skull.png'),
  png_bullseye:        require('../../assets/avatars/bullseye.png'),
  png_open_scroll:     require('../../assets/avatars/open_scroll.png'),
  png_compass:         require('../../assets/avatars/compass.png'),
};

// Small visual preview of a trophy item reward (avatar emoji/SVG or flag)
function RewardItemPreview({ itemId, type, size = 22 }: { itemId: string; type: 'avatar' | 'flag' | 'item'; size?: number }) {
  const imgSrc = ITEM_IMAGES[itemId];
  if (imgSrc) return <Image source={imgSrc} style={{ width: size, height: size, borderRadius: 4 }} resizeMode="contain" />;
  if (type === 'item') {
    return <Text style={{ fontSize: size, lineHeight: size + 2 }}>🎁</Text>;
  }
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
    let dbAlreadySpeedDemon = false;
    let dbAlreadyCapitalsMastery = false;
    if (opts.userId) {
      try {
        const [{ data: profileData }, { data: achievementRows }] = await Promise.all([
          supabase
            .from('profiles')
            .select('completed_speed_detective, completed_ground_invasion')
            .eq('id', opts.userId)
            .single(),
          supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', opts.userId)
            .in('achievement_id', ['flag_mastery_30s', 'ground_invasion']),
        ]);

        dbAlreadySpeedDemon = Boolean(
          profileData?.completed_speed_detective ||
          (achievementRows ?? []).some((r: any) => r.achievement_id === 'flag_mastery_30s')
        );
        dbAlreadyCapitalsMastery = Boolean(
          profileData?.completed_ground_invasion ||
          (achievementRows ?? []).some((r: any) => r.achievement_id === 'ground_invasion')
        );
      } catch {
        // Best effort only; local-state checks still apply below.
      }
    }

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
    const wasAlreadySpeedDemon = fastFlagStr[1] === 'true' || dbAlreadySpeedDemon;
    const wasAlreadyCapitalsMastery = fastCapitalsStr[1] === 'true' || dbAlreadyCapitalsMastery;
    const wasAlreadyNightmare = nightmareStr[1] === 'true';
    const meetsSpeedDemon = opts.quizType === 'flag' && (opts.scorePercentage ?? 0) >= 90 && opts.durationSeconds < 30;
    const meetsCapitalsMastery = opts.quizType === 'capitals' && (opts.scorePercentage ?? 0) >= 90 && opts.durationSeconds < 30;
    const isFastFlagMastery = wasAlreadySpeedDemon || meetsSpeedDemon;
    const isFastCapitalsMastery = wasAlreadyCapitalsMastery || meetsCapitalsMastery;
    const isNightmareCompleted = wasAlreadyNightmare || (opts.quizType === 'nightmare' && opts.perfect);

    await AsyncStorage.multiSet([
      [keys.flagQuizzesCompleted, String(opts.quizType === 'flag' ? flags + 1 : flags)],
      [keys.perfectQuizzes, String(opts.perfect ? perfects + 1 : perfects)],
      [keys.speedRuns, String(opts.durationSeconds < 30 ? speeds + 1 : speeds)],
      [keys.totalGoldEarned, String(gold + opts.goldEarned)],
      [keys.fastFlagMastery, String(isFastFlagMastery)],
      [keys.fastCapitalsMastery, String(isFastCapitalsMastery)],
      [keys.nightmareCompleted, String(isNightmareCompleted)],
    ]);

    // Update database columns for quest completion tracking
    const newlyCompletedSpeedDemon = !wasAlreadySpeedDemon && meetsSpeedDemon;
    const newlyCompletedCapitalsMastery = !wasAlreadyCapitalsMastery && meetsCapitalsMastery;

    if (newlyCompletedSpeedDemon && opts.userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ completed_speed_detective: true })
        .eq('id', opts.userId);
      if (error) console.warn('[Achievements] Failed to update completed_speed_detective:', error);
    }

    if (newlyCompletedCapitalsMastery && opts.userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ completed_ground_invasion: true })
        .eq('id', opts.userId);
      if (error) console.warn('[Achievements] Failed to update completed_ground_invasion:', error);
    }

    return {
      newlyCompletedSpeedDemon,
      newlyCompletedNightmare: !wasAlreadyNightmare && opts.quizType === 'nightmare' && opts.perfect,
      newlyCompletedCapitalsMastery,
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
  fastCapitalsMastery?: boolean;
  nightmareCompleted?: boolean;
  ownedByRegion?: Record<string, number>;
  totalByRegion?: Record<string, number>;
  ownedItems?: Set<string>;
  ownedAvatarCount?: number;
  playerLevel?: number;
};

function renderAchievementCard(
  achievement: import('../lib/achievementsData').Achievement,
  stats: StatsType,
  claimedIds: Set<string>,
  claimingId: string | null,
  handleClaim: (id: string, gold: number, items?: { type: 'avatar' | 'flag' | 'item'; itemId: string }[]) => void,
  showRewards: (achievement: import('../lib/achievementsData').Achievement) => void,
  isPremiumSection = false,
  isConquerorUser = false,
  onPaywall?: () => void,
  isCosmic = false,
  isNightmareCard = false,
) {
  const [current, target] = achievement.getProgress(stats);
  const isCompleted = current >= target;
  const isClaimed = claimedIds.has(achievement.id);
  const pct = Math.min((current / target) * 100, 100);
  // Normalise: prefer rewardItems array; fall back to single rewardItem
  const rewardItems = achievement.rewardItems ?? (achievement.rewardItem ? [achievement.rewardItem] : []);
  const totalRewardCount = (achievement.rewardGold > 0 ? 1 : 0) + rewardItems.length + (achievement.rewardTickets ? 1 : 0);
  // Show rewards inline when there's only 1 reward; use popup button for 2+
  const useRewardButton = totalRewardCount > 1;

  const blockPaywall = isPremiumSection && !isConquerorUser && onPaywall;

  return (
    <TouchableOpacity
      key={achievement.id}
      activeOpacity={blockPaywall ? 0.75 : 1}
      onPress={blockPaywall ? onPaywall : undefined}
      style={[styles.card, isClaimed && styles.cardClaimed, isPremiumSection && styles.cardPremium, isCosmic && styles.cardCosmic, isNightmareCard && styles.cardNightmare]}
    >
      <View style={[styles.iconBg, isClaimed && { backgroundColor: '#FFD70022' }, isPremiumSection && styles.iconBgPremium, isCosmic && styles.iconBgCosmic, isNightmareCard && styles.iconBgNightmare]}>
        {ACHIEVEMENT_ICON_IMAGES[achievement.icon] ? (
          <Image source={ACHIEVEMENT_ICON_IMAGES[achievement.icon]} style={{ width: 28, height: 28 }} resizeMode="contain" />
        ) : (
          <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.cardTitle, isClaimed && styles.cardTitleClaimed, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>
              {achievement.title}
            </Text>
            {isPremiumSection && !isCosmic && <Image source={ACHIEVEMENT_ICON_IMAGES['png_crown']} style={{ width: 14, height: 14 }} resizeMode="contain" />}
            {isCosmic && <Image source={ACHIEVEMENT_ICON_IMAGES['png_galaxy']} style={{ width: 14, height: 14 }} resizeMode="contain" />}
            {isNightmareCard && <Image source={ACHIEVEMENT_ICON_IMAGES['png_demon']} style={{ width: 14, height: 14 }} resizeMode="contain" />}
          </View>
          <Text style={[styles.cardCount, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>
            {Math.floor(current).toLocaleString()} / {Math.floor(target).toLocaleString()}
          </Text>
        </View>

        <Text style={[styles.cardDesc, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#7c6fa0' }, isNightmareCard && { color: '#c06060' }]}>{achievement.description}</Text>

        {!isClaimed ? (
          <View style={styles.actionRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${pct}%` as any },
                  isCompleted && styles.progressBarComplete,
                  isPremiumSection && styles.progressBarPremium,
                  isCosmic && styles.progressBarCosmic,
                  isNightmareCard && styles.progressBarNightmare,
                ]}
              />
            </View>

            {isCompleted ? (
              <View style={styles.claimRow}>
                <TouchableOpacity
                  style={[styles.claimButton, isPremiumSection && styles.claimButtonPremium, isCosmic && styles.claimButtonCosmic, isNightmareCard && styles.claimButtonNightmare]}
                  onPress={() => handleClaim(achievement.id, achievement.rewardGold, rewardItems.length ? rewardItems : undefined)}
                  disabled={claimingId === achievement.id}
                >
                  {claimingId === achievement.id ? (
                    <ActivityIndicator size="small" color="#0a0a1a" />
                  ) : (
                    <View style={styles.claimButtonInner}>
                      <Text style={styles.claimButtonText}>Claim</Text>
                      {!useRewardButton && achievement.rewardGold > 0 && (
                        <Text style={styles.claimButtonText}>💰 {achievement.rewardGold.toLocaleString()}</Text>
                      )}
                      {!useRewardButton && rewardItems.length === 1 && (
                        <View style={styles.claimItemPreview}>
                          <RewardItemPreview itemId={rewardItems[0].itemId} type={rewardItems[0].type} size={16} />
                          <Text style={styles.claimButtonText}>{rewardItems[0].label}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {useRewardButton && (
                  <TouchableOpacity
                    style={[styles.rewardsBadge, isPremiumSection && styles.rewardsBadgePremium, isCosmic && styles.rewardsBadgeCosmic, isNightmareCard && styles.rewardsBadgeNightmare]}
                    onPress={() => blockPaywall ? onPaywall!() : showRewards(achievement)}
                  >
                    <Text style={[styles.rewardsBadgeText, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>🎁 Rewards</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.rewardPill}>
                {!useRewardButton && achievement.rewardGold > 0 && (
                  <Text style={[styles.rewardHint, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>💰 {achievement.rewardGold.toLocaleString()}</Text>
                )}
                {!useRewardButton && rewardItems.length === 1 && (
                  <View style={styles.rewardItemRow}>
                    <RewardItemPreview itemId={rewardItems[0].itemId} type={rewardItems[0].type} size={16} />
                    <Text style={[styles.rewardItemHint, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>{rewardItems[0].label}</Text>
                  </View>
                )}
                {useRewardButton && (
                  <TouchableOpacity
                    style={[styles.rewardsBadge, isPremiumSection && styles.rewardsBadgePremium, isCosmic && styles.rewardsBadgeCosmic, isNightmareCard && styles.rewardsBadgeNightmare]}
                    onPress={() => blockPaywall ? onPaywall!() : showRewards(achievement)}
                  >
                    <Text style={[styles.rewardsBadgeText, isPremiumSection && { color: '#9B59B6' }, isCosmic && { color: '#a78bfa' }, isNightmareCard && { color: '#ff8888' }]}>🎁 Rewards</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function AchievementsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { profile, claimAchievement } = useAuth();
  const { ownedCountries } = useGame();
  const { showAlert, showPremiumAlert } = useAlert();

  const scrollRef = useRef<ScrollView>(null);
  const layoutMapRef = useRef<Record<string, number>>({});
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const highlightLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

  const lastProcessedHighlightId = useRef<string | null>(null);

  function activateHighlight(hid: string) {
    lastProcessedHighlightId.current = hid;
    setHighlightId(hid);
    // NOTE: do NOT call navigation.setParams here — it would trigger useEffect cleanup
    // and cancel the scroll/animation timers. setParams is deferred to the 3.5s callback.
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setTimeout(() => {
      const y = layoutMapRef.current[hid];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
      }
    }, 600);
    highlightLoopRef.current?.stop();
    highlightAnim.setValue(1);
    highlightLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 0.15, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      { iterations: 1 },
    );
    highlightLoopRef.current.start();
    highlightTimerRef.current = setTimeout(() => {
      setHighlightId(null);
      highlightLoopRef.current?.stop();
      highlightAnim.setValue(0);
      lastProcessedHighlightId.current = null;
      navigation.setParams({ highlightId: undefined } as any);
    }, 1700);
  }

  // Fires when screen gains focus with a highlightId param
  useFocusEffect(React.useCallback(() => {
    const hid = route.params?.highlightId as string | undefined;
    if (!hid || hid === lastProcessedHighlightId.current) return;
    activateHighlight(hid);
  }, [route.params?.highlightId]));

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

      // Migration: cosmic_armor was renamed to png_cosmic_armor
      if (itemSet.has('cosmic_armor')) itemSet.add('png_cosmic_armor');

      setOwnedItemsSet(itemSet);

      setHasDarkScroll(itemSet.has('upgrade_nightmare'));
    } catch (err) {
      console.warn('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim(id: string, reward: number, items?: { type: 'avatar' | 'flag' | 'item'; itemId: string }[]) {
    const ach = ACHIEVEMENTS_DATA.find((a) => a.id === id);
    if (ach?.isPremium && !profile?.is_conquerer) {
      showPremiumAlert({ onUpgrade: () => navigation.getParent()?.navigate('Premium') });
      return;
    }
    if (claimingId) return;
    playQuestComplete();
    setClaimingId(id);
    try {
      await claimAchievement(id, reward, items, ach?.rewardTickets);
      setClaimedIds((prev) => new Set(prev).add(id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    if (ach.rewardTickets) lines.push(`🎟️ ${ach.rewardTickets} Ticket${ach.rewardTickets > 1 ? 's' : ''}`);
    items.forEach(item => lines.push(`+ ${item.label}`));
    showAlert({ title: `${ach.title} — Rewards`, icon, message: lines.join('\n') });
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

  const allAvatarIds = useMemo(() => new Set(CUSTOM_AVATARS.map(a => a.key)), []);

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
    playerLevel: getLevelInfo(profile?.xp ?? 0).level,
    quizCount: profile?.quiz_count ?? 0,
  };


  if (loading && allCountries.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFD700" size="large" />
      </View>
    );
  }

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>Quests</Text>
        </View>
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
        // Nightmare quest: hidden as ??? until user owns the Dark Scroll upgrade
        if (achievement.id === 'nightmare_complete' && !hasDarkScroll) {
          return (
            <View key="nightmare_hidden" style={[styles.card, styles.cardMystery]}>
              <View style={[styles.iconBg, styles.iconBgMystery]}>
                <Image source={require('../../assets/avatars/dark_scroll.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
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
        // "There is only one." — hidden until nightmare_complete is claimed
        if (achievement.id === 'true_conqueror' && !claimedIds.has('nightmare_complete')) {
          return (
            <View key="true_conqueror_hidden" style={[styles.card, styles.cardMystery]}>
              <View style={[styles.iconBg, styles.iconBgMystery]}>
                <Image source={ACHIEVEMENT_ICON_IMAGES['png_demon']} style={{ width: 28, height: 28 }} resizeMode="contain" />
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
        // Never Enough — hidden until true_conqueror is claimed (cosmic palette)
        if (achievement.id === 'never_enough' && !claimedIds.has('true_conqueror')) {
          return (
            <View key="never_enough_hidden" style={[styles.card, styles.cardCosmicMystery]}>
              <View style={[styles.iconBg, styles.iconBgCosmicMystery]}>
                <Image source={ACHIEVEMENT_ICON_IMAGES['png_galaxy']} style={{ width: 28, height: 28 }} resizeMode="contain" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitleCosmicMystery}>???</Text>
                <View style={[styles.progressBarBg, { marginTop: 8, marginRight: 0 }]}>
                  <View style={[styles.progressBarFill, { width: '100%', backgroundColor: '#150d2e' }]} />
                </View>
              </View>
            </View>
          );
        }
        const isHighlighted = highlightId === achievement.id;
        return (
          <View
            key={achievement.id}
            onLayout={(e) => { layoutMapRef.current[achievement.id] = e.nativeEvent.layout.y; }}
          >
            {renderAchievementCard(
              achievement, stats, claimedIds, claimingId, handleClaim, showQuestRewards,
              !!achievement.isPremium,
              !!profile?.is_conquerer,
              achievement.isPremium ? () => showPremiumAlert({ onUpgrade: () => navigation.getParent()?.navigate('Premium') }) : undefined,
              achievement.id === 'never_enough',
              achievement.id === 'nightmare_complete',
            )}
            {isHighlighted && (
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: '#2ae8c8',
                    shadowColor: '#2ae8c8',
                    shadowOpacity: 0.8,
                    shadowRadius: 16,
                    elevation: 8,
                    opacity: highlightAnim,
                  },
                ]}
              />
            )}
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
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardsBadge: {
    backgroundColor: '#1a1a35',
    borderWidth: 1,
    borderColor: '#4D96FF55',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  rewardsBadgePremium: {
    backgroundColor: '#2a0a3e',
    borderColor: '#7B2FBE',
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
  // ── Nightmare quest styles ────────────────────────────────────────────────
  cardNightmare: {
    borderColor: '#ff4444',
    borderWidth: 1.5,
    backgroundColor: '#1a0000',
  },
  iconBgNightmare: {
    backgroundColor: '#2a0808',
  },
  progressBarNightmare: {
    backgroundColor: '#ff4444',
  },
  claimButtonNightmare: {
    backgroundColor: '#b30000',
  },
  rewardsBadgeNightmare: {
    backgroundColor: '#200000',
    borderColor: '#ff444455',
  },
  // ── Cosmic quest styles ────────────────────────────────────────────────────
  cardCosmic: {
    borderColor: '#7c3aed',
    borderWidth: 1.5,
    backgroundColor: '#07051a',
  },
  iconBgCosmic: {
    backgroundColor: '#150d2e',
  },
  progressBarCosmic: {
    backgroundColor: '#8b5cf6',
  },
  claimButtonCosmic: {
    backgroundColor: '#7c3aed',
  },
  rewardsBadgeCosmic: {
    backgroundColor: '#0d0525',
    borderColor: '#7c3aed55',
  },
  cardCosmicMystery: {
    borderColor: '#4c1d95',
    borderWidth: 1.5,
    backgroundColor: '#04020f',
  },
  iconBgCosmicMystery: {
    backgroundColor: '#150d2e',
  },
  cardTitleCosmicMystery: {
    color: '#7c3aed',
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 3,
  },
  cardHighlighted: {
    borderColor: '#2ae8c8',
    borderWidth: 2,
    shadowColor: '#2ae8c8',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
});
