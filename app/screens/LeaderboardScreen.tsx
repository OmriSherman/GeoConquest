import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { fetchCountries } from '../lib/countryData';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { LeaderboardEntry } from '../types';
import AvatarDisplay from '../components/AvatarDisplay';
import WorldMapView from '../components/WorldMapView';
import { useFocusEffect } from '@react-navigation/native';
import { AVATAR_CHARACTERS, CUSTOM_AVATARS, CUSTOM_FLAGS, FLAG_OPTIONS } from '../lib/avatarData';
import { calcQuizXP, getLevelInfo } from '../lib/xpSystem';
import { playMillionairePrize } from '../lib/audio';
import AnalogCountdownClock from '../components/AnalogCountdownClock';

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
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

const WORLD_LAND_AREA = 150_000_000; // km²

const DAILY_CHALLENGES: { label: string; key: string; metricLabel: string; format: (v: number) => string }[] = [
  { label: 'Most XP Earned',         key: 'xp',        metricLabel: 'XP',       format: v => v.toLocaleString() },
  { label: 'Most Quizzes Done',       key: 'quizzes',   metricLabel: 'Quizzes',  format: v => v.toString() },
  { label: 'Most Gold Earned',        key: 'gold',      metricLabel: 'Gold',     format: v => v.toLocaleString() },
  { label: 'Most Correct Answers',    key: 'questions', metricLabel: 'Correct',  format: v => v.toLocaleString() },
  { label: 'Highest Accuracy',        key: 'accuracy',  metricLabel: 'Accuracy', format: v => v.toFixed(1) + '%' },
];

function getTodayChallenge() {
  const start = Date.UTC(2024, 0, 1);
  const dayIndex = Math.floor((Date.now() - start) / 86_400_000);
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
}

const ALLTIME_CATEGORIES: { key: 'xp' | 'land' | 'quizzes' | 'avatars'; label: string; metricLabel: string; getValue: (e: LeaderboardEntry) => number; format: (v: number) => string }[] = [
  { key: 'xp',      label: 'XP',      metricLabel: 'XP',      getValue: e => e.xp ?? 0,              format: v => v.toLocaleString() },
  { key: 'land',    label: 'Land',    metricLabel: 'Land',    getValue: e => e.conquest_pct ?? 0,    format: v => `${v.toFixed(1)}%` },
  { key: 'quizzes', label: 'Quizzes', metricLabel: 'Quizzes', getValue: e => e.quiz_count ?? 0,      format: v => v.toLocaleString() },
  { key: 'avatars', label: 'Avatars', metricLabel: 'Avatars', getValue: e => e.avatar_count ?? 0,    format: v => v.toString() },
];
const DAILY_WINNER_POPUP_KEY_PREFIX = '@daily_winner_reward_popup_seen:';
const DAILY_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ALLTIME_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const LEADERBOARD_PAGE_SIZE = 10;

// All premium avatar item IDs (for inventory categorisation)
const ALL_AVATAR_IDS = new Set([
  ...AVATAR_CHARACTERS.filter(a => a.isPremium).map(a => a.emoji),
  ...CUSTOM_AVATARS.map(a => a.key),
]);
const ALL_FLAG_IDS = new Set([
  ...CUSTOM_FLAGS.map(f => f.key),
  ...FLAG_OPTIONS.filter(f => f.isPremium).map(f => f.emoji),
]);

interface UserProfile {
  id: string;
  username: string;
  avatar_emoji: string;
  avatar_flag: string;
  gold_balance: number;
  xp: number;
  quiz_count?: number;
  login_streak: number;
  created_at: string;
  is_conquerer?: boolean;
}

interface ProfileModalData {
  entry: LeaderboardEntry & { rank: number };
  profile: UserProfile | null;
  ownedCountryCodes: string[];
  unlockedItemIds: string[];
  claimedAchievementIds: string[];
  ownedCount: number;
  ownedArea: number;
  conquestPct: number;
  loading: boolean;
}

interface AwardDailyWinnerResult {
  success: boolean;
  reward_granted: boolean;
  reward_date: string;
  winner_user_id: string | null;
  reward_rank?: number;
  gold: number;
  tickets: number;
  bonus_day?: boolean;
  reason: string;
}

interface DailyXpRow {
  user_id: string;
  daily_xp: number;
  metric_value?: number;
  quiz_count?: number;
  gold_earned?: number;
  questions_answered?: number;
  accuracy?: number;
}

export default function LeaderboardScreen() {
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();
  const [leaderboardType, setLeaderboardType] = useState<'alltime' | 'daily'>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [dailyXpEntries, setDailyXpEntries] = useState<(LeaderboardEntry & { daily_xp: number })[]>([]);
  const [visibleCount, setVisibleCount] = useState(LEADERBOARD_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const areaMapRef = useRef<Record<string, number> | null>(null);
  const lastRefreshRef = useRef<{ daily: number; alltime: number }>({ daily: 0, alltime: 0 });
  const [leaderboardRemainingSeconds, setLeaderboardRemainingSeconds] = useState(0);
  const [alltimeCategory, setAlltimeCategory] = useState<'xp' | 'land' | 'quizzes' | 'avatars'>('xp');

  // Profile modal state
  const [profileModal, setProfileModal] = useState<ProfileModalData | null>(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCountries()
      .then((countries) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const c of countries) map[c.cca2] = c.area || 0;
        areaMapRef.current = map;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const ALLTIME_INTERVAL = 900_000; // 15 min — aligned to UTC clock marks

  useFocusEffect(
    useCallback(() => {
      if (leaderboardType === 'daily') {
        loadDailyXpLeaderboard();
        const interval = setInterval(loadDailyXpLeaderboard, 300_000);
        return () => clearInterval(interval);
      } else {
        loadLeaderboard();
        // Fire next refresh exactly at the next 15-min UTC mark, then every 15 min
        const now = Date.now();
        const nextMark = Math.ceil((now + 1) / ALLTIME_INTERVAL) * ALLTIME_INTERVAL;
        let intervalId: ReturnType<typeof setInterval>;
        const timeoutId = setTimeout(() => {
          loadLeaderboard();
          intervalId = setInterval(loadLeaderboard, ALLTIME_INTERVAL);
        }, nextMark - now);
        return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
      }
    }, [leaderboardType])
  );

  // Countdown — daily to UTC midnight, all-time to next 15-min UTC mark
  useEffect(() => {
    function compute(): number {
      if (leaderboardType === 'daily') {
        const now = new Date();
        const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return Math.max(0, Math.floor((midnight.getTime() - Date.now()) / 1000));
      } else {
        const now = Date.now();
        const nextMark = Math.ceil((now + 1) / ALLTIME_INTERVAL) * ALLTIME_INTERVAL;
        return Math.max(0, Math.floor((nextMark - now) / 1000));
      }
    }
    setLeaderboardRemainingSeconds(compute());
    const interval = setInterval(() => setLeaderboardRemainingSeconds(compute()), 1000);
    return () => clearInterval(interval);
  }, [leaderboardType]);

  useEffect(() => {
    setVisibleCount(LEADERBOARD_PAGE_SIZE);
  }, [leaderboardType, searchQuery]);

  // Supabase caps responses at ~1000 rows server-side regardless of .limit().
  // Paginate with .range() to guarantee we collect every row.
  async function fetchAllOwnedCountries(): Promise<{ user_id: string; country_code: string }[]> {
    const PAGE = 1000;
    const all: { user_id: string; country_code: string }[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('owned_countries')
        .select('user_id, country_code')
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as { user_id: string; country_code: string }[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }

  async function loadLeaderboard() {
    setLoading(true);
    try {
      // Read from the pre-computed snapshot — single fast query, no joins
      const { data: snapshot, error } = await supabase
        .from('leaderboard_snapshot')
        .select('*');

      if (error || !snapshot) return;

      const leaderboard: LeaderboardEntry[] = snapshot.map((s: any) => ({
        id: s.user_id,
        username: s.username,
        avatar_emoji: s.avatar_emoji || 'png_explorer_male',
        avatar_flag: s.avatar_flag || '🏳️',
        xp: s.xp ?? 0,
        owned_count: s.owned_count ?? 0,
        owned_area: s.owned_area ?? 0,
        conquest_pct: s.conquest_pct ?? 0,
        is_conquerer: s.is_conquerer,
        quiz_count: s.quiz_count ?? 0,
        avatar_count: s.avatar_count ?? 0,
      }));

      setEntries(leaderboard);
      lastRefreshRef.current.alltime = Date.now();
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function maybeShowDailyWinnerRewardPopup(rows: AwardDailyWinnerResult[] | null) {
    if (!user?.id || !rows?.length) return;

    const row = rows.find((candidate) => candidate.winner_user_id === user.id);
    if (!row) return;
    const rewardDate = row.reward_date;
    if (!rewardDate) return;
    if (row.reason !== 'awarded' && row.reason !== 'already_awarded') return;

    const rank = Number(row.reward_rank || 1);
    const key = `${DAILY_WINNER_POPUP_KEY_PREFIX}${user.id}:${rewardDate}:${rank}`;
    const alreadySeen = await AsyncStorage.getItem(key);
    if (alreadySeen) return;

    await AsyncStorage.setItem(key, '1');
    const medals = ['🥇', '🥈', '🥉'];
    const medal = medals[rank - 1] ?? '🏅';
    const rankMsg = rank === 1
      ? 'You topped yesterday\'s leaderboard!'
      : `You finished #${rank} on yesterday's leaderboard!`;
    const goldAmount = Number(row.gold || 0);
    const ticketAmount = Number(row.tickets || 0);
    playMillionairePrize();
    showAlert({
      icon: <Image source={require('../../assets/avatars/trophy.png')} style={{ width: 80, height: 80 }} resizeMode="contain" />,
      title: `${medal} #${rank} Place!`,
      contentNode: (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>{rankMsg}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '800' }}>+{goldAmount.toLocaleString()}</Text>
            <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#e05353', fontSize: 18, fontWeight: '800' }}>+{ticketAmount}</Text>
            <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </View>
        </View>
      ),
      buttons: [{ text: 'Awesome!', style: 'cta' }],
      confetti: true,
    });
  }

  async function loadDailyXpLeaderboard() {
    setLoading(true);
    try {
      const { data: awardData, error: awardError } = await supabase.rpc('award_daily_leaderboard_winner');
      if (awardError) {
        console.warn('Failed to award daily winner reward:', awardError.message);
      } else {
        try {
          await maybeShowDailyWinnerRewardPopup((awardData as AwardDailyWinnerResult[] | null) ?? null);
        } catch (popupError: any) {
          console.warn('Failed to show daily winner reward popup:', popupError?.message ?? popupError);
        }
      }

      // Get today's UTC date range
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
      const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();

      // Get all profiles
      let { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_emoji, avatar_flag, is_conquerer, xp');

      if (profileErr) {
        const fallback = await supabase.from('profiles').select('id, username');
        profiles = (fallback.data || []).map((p: any) => ({
          ...p,
          avatar_emoji: 'png_explorer_male',
          avatar_flag: '🏳️',
          xp: 0,
        }));
      }
      if (!profiles) return;

      const ownedData = await fetchAllOwnedCountries();

      let areaMap = areaMapRef.current;
      if (!areaMap) {
        const countries = await fetchCountries();
        areaMap = {};
        for (const c of countries) (areaMap as Record<string, number>)[c.cca2] = c.area || 0;
        areaMapRef.current = areaMap;
      }

      const countMap: Record<string, number> = {};
      const areaTotal: Record<string, number> = {};
      for (const row of ownedData) {
        countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
        areaTotal[row.user_id] = (areaTotal[row.user_id] || 0) + ((areaMap as Record<string, number>)[row.country_code] || 0);
      }

      const todayChallenge = getTodayChallenge();
      const dailyXpMap: Record<string, number> = {};
      const metricMap: Record<string, number> = {};

      const rpcDaily = await supabase.rpc('get_daily_xp_leaderboard', {
        p_limit: 500,
        p_challenge_type: todayChallenge.key,
      });

      if (rpcDaily.error) {
        console.warn('Failed to load daily XP via RPC, falling back to client query:', rpcDaily.error.message);
        let quizResults: any[] = [];
        const primary = await supabase
          .from('quiz_results')
          .select('user_id, quiz_type, score, total_questions, xp_earned, gold_earned')
          .gte('played_at', todayStart)
          .lt('played_at', todayEnd);

        if (primary.error) {
          const fallback = await supabase
            .from('quiz_results')
            .select('user_id, quiz_type, score')
            .gte('played_at', todayStart)
            .lt('played_at', todayEnd);
          if (fallback.error) throw fallback.error;
          quizResults = fallback.data ?? [];
        } else {
          quizResults = primary.data ?? [];
        }

        for (const result of quizResults) {
          const uid = result.user_id;
          let xp = 0;
          if (typeof result.xp_earned === 'number') {
            xp = result.xp_earned;
          } else if (result.quiz_type === 'millionaire') {
            xp = result.score >= 15 ? 1000 : 0;
          } else if (['flag', 'shape', 'capitals', 'borders', 'trail'].includes(result.quiz_type)) {
            const totalQuestions = Math.max(1, Number(result.total_questions) || 10);
            xp = calcQuizXP(result.quiz_type, Number(result.score) || 0, totalQuestions, false);
          }
          if (xp > 0) dailyXpMap[uid] = (dailyXpMap[uid] || 0) + xp;

          // Fallback metric computation
          const tq = Math.max(1, Number(result.total_questions) || 10);
          const score = Number(result.score) || 0;
          switch (todayChallenge.key) {
            case 'quizzes':   metricMap[uid] = (metricMap[uid] || 0) + 1; break;
            case 'gold':      metricMap[uid] = (metricMap[uid] || 0) + Math.max(0, Number(result.gold_earned) || 0); break;
            case 'questions': metricMap[uid] = (metricMap[uid] || 0) + score; break;
            case 'accuracy':
              if (!metricMap[uid]) metricMap[uid] = 0;
              metricMap[uid] = ((metricMap[uid] || 0) * (tq - tq) + score) / tq * 100;
              break;
            default: metricMap[uid] = (metricMap[uid] || 0) + xp;
          }
        }
      } else {
        for (const row of (rpcDaily.data as DailyXpRow[] | null) ?? []) {
          if (!row.user_id) continue;
          dailyXpMap[row.user_id] = Number(row.daily_xp) || 0;
          metricMap[row.user_id] = Number(row.metric_value) || 0;
        }
      }

      // Build daily leaderboard sorted by today's metric
      const dailyLeaderboard = profiles
        .filter(p => dailyXpMap[p.id] > 0 || metricMap[p.id] > 0)
        .map((p) => ({
          id: p.id,
          username: p.username,
          avatar_emoji: p.avatar_emoji || 'png_explorer_male',
          avatar_flag: p.avatar_flag || '🏳️',
          xp: p.xp ?? 0,
          owned_count: countMap[p.id] || 0,
          owned_area: 0,
          conquest_pct: 0,
          is_conquerer: p.is_conquerer,
          daily_xp: dailyXpMap[p.id] || 0,
          metric_value: metricMap[p.id] || 0,
        }))
        .sort((a, b) => b.metric_value - a.metric_value || b.daily_xp - a.daily_xp);

      setDailyXpEntries(dailyLeaderboard);
      lastRefreshRef.current.daily = Date.now();
    } catch (err) {
      console.warn('Failed to load daily XP leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(entry: LeaderboardEntry & { rank: number }) {
    setProfileModal({ entry, profile: null, ownedCountryCodes: [], unlockedItemIds: [], claimedAchievementIds: [], ownedCount: 0, ownedArea: 0, conquestPct: 0, loading: true });

    try {
      const [profileRes, ownedRes, itemsRes, achievementsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_emoji, avatar_flag, gold_balance, xp, quiz_count, login_streak, created_at, is_conquerer').eq('id', entry.id).single(),
        supabase.from('owned_countries').select('country_code').eq('user_id', entry.id),
        supabase.from('user_unlocked_items').select('item_id').eq('user_id', entry.id),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', entry.id),
      ]);

      const ownedCountryCodes = (ownedRes.data ?? []).map((r: any) => r.country_code);
      const ownedCount = ownedCountryCodes.length;
      let areaMap = areaMapRef.current;
      if (!areaMap) {
        const cs = await fetchCountries();
        areaMap = {};
        for (const c of cs) (areaMap as Record<string, number>)[c.cca2] = c.area || 0;
        areaMapRef.current = areaMap;
      }
      const ownedArea = ownedCountryCodes.reduce((sum, code) => sum + ((areaMap as Record<string, number>)[code] || 0), 0);
      const conquestPct = Math.min(100, Math.round((ownedArea / WORLD_LAND_AREA) * 10000) / 100);

      setProfileModal({
        entry,
        profile: profileRes.data ?? null,
        ownedCountryCodes,
        unlockedItemIds: (itemsRes.data ?? []).map((r: any) => r.item_id),
        claimedAchievementIds: (achievementsRes.data ?? []).map((r: any) => r.achievement_id),
        ownedCount,
        ownedArea,
        conquestPct,
        loading: false,
      });
    } catch (err) {
      console.warn('Failed to load profile:', err);
      setProfileModal(prev => prev ? { ...prev, loading: false } : null);
    }
  }

  function getRankedEntries(source: any[]): any[] {
    const ranked = source.map((entry, index) => ({ ...entry, rank: index + 1 }));
    if (!searchQuery.trim()) return ranked;

    const q = searchQuery.trim().toLowerCase();
    return ranked.filter(entry => entry.username.toLowerCase().includes(q));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading leaderboard…</Text>
      </View>
    );
  }

  const activeCat = ALLTIME_CATEGORIES.find(c => c.key === alltimeCategory)!;
  const sortedEntries = leaderboardType === 'alltime'
    ? [...entries].sort((a, b) => activeCat.getValue(b) - activeCat.getValue(a))
    : entries;
  const activeEntries = leaderboardType === 'alltime' ? sortedEntries : dailyXpEntries;
  const rankedEntries = getRankedEntries(activeEntries);
  const displayEntries = rankedEntries.slice(0, visibleCount);

  function isConquerorEntry(item: any): boolean {
    if (typeof item?.is_conquerer === 'boolean') return item.is_conquerer;
    if (typeof item?.is_conqueror === 'boolean') return item.is_conqueror;
    if (item?.id && item.id === user?.id) return !!profile?.is_conquerer;
    return false;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={styles.subtitle}>
            {leaderboardType === 'alltime'
              ? `${entries.length} explorers`
              : `${dailyXpEntries.length} competing today`}
          </Text>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, opacity: 0.7 }}>
              {leaderboardType === 'daily' ? 'resets in' : 'updates in'}
            </Text>
            <AnalogCountdownClock
              remainingSeconds={leaderboardRemainingSeconds}
              totalSeconds={leaderboardType === 'daily' ? 86400 : 900}
              format={leaderboardType === 'daily' ? 'hh:mm:ss' : 'mm:ss'}
              size={46}
              color="#FFD700"
            />
          </View>
        </View>
        {leaderboardType === 'daily' && (
          <>
            <View style={{ height: 1, backgroundColor: '#1a1a2e', marginTop: 10, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#888', fontSize: 10, fontWeight: '600' }}>Today's Challenge:</Text>
                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>{getTodayChallenge().label}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRewardsModal(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1a1a2e', borderRadius: 8, borderWidth: 1, borderColor: '#2a2a4e', paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                  <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '600' }}>Rewards</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, leaderboardType === 'daily' && styles.tabActive]}
          onPress={() => {
            setLeaderboardType('daily');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.tabText, leaderboardType === 'daily' && styles.tabTextActive]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, leaderboardType === 'alltime' && styles.tabActive]}
          onPress={() => {
            setLeaderboardType('alltime');
            setSearchQuery('');
          }}
        >
          <Text style={[styles.tabText, leaderboardType === 'alltime' && styles.tabTextActive]}>All-Time</Text>
        </TouchableOpacity>
      </View>

      {leaderboardType === 'alltime' && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2 }}>
          {ALLTIME_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setAlltimeCategory(cat.key)}
              style={{
                backgroundColor: alltimeCategory === cat.key ? '#FFD700' : '#1a1a2e',
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: alltimeCategory === cat.key ? '#FFD700' : '#2a2a4e',
                marginRight: i < ALLTIME_CATEGORIES.length - 1 ? 8 : 0,
              }}
            >
              <Text style={{ color: alltimeCategory === cat.key ? '#0a0a1a' : '#aaa', fontSize: 12, fontWeight: '700' }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search players…"
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={displayEntries}
        keyExtractor={(item) => item.id + item.rank}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (visibleCount >= rankedEntries.length) return;
          setVisibleCount(prev => Math.min(prev + LEADERBOARD_PAGE_SIZE, rankedEntries.length));
        }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery ? (
              <Text style={styles.emptyEmoji}>🔍</Text>
            ) : (
              <Image source={require('../../assets/avatars/eyes.png')} style={styles.emptyIcon} resizeMode="contain" />
            )}
            <Text style={styles.emptyText}>
              {searchQuery ? `No players found for "${searchQuery}"` : 'No explorers yet. Be the first!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrentUser = item.id === user?.id;
          const isTop3 = item.rank <= 3;
          const rankEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '';
          const conquestPct = (item.conquest_pct ?? 0) as number;
          const levelInfo = getLevelInfo(item.xp ?? 0);
          const isDailyBoard = leaderboardType === 'daily';
          const todayChallenge = getTodayChallenge();
          const metricVal = (item as any).metric_value ?? (item as any).daily_xp ?? 0;
          const primaryMetric = isDailyBoard
            ? todayChallenge.format(metricVal)
            : activeCat.format(activeCat.getValue(item));
          const primaryMetricLabel = isDailyBoard ? todayChallenge.metricLabel : activeCat.metricLabel;
          const secondaryLabel = isDailyBoard
            ? `Lv ${levelInfo.level}`
            : `Lv ${levelInfo.level} · ${(item.xp ?? 0).toLocaleString()} XP`;

          return (
            <TouchableOpacity
              style={[styles.row, isCurrentUser && styles.rowHighlight, isTop3 && styles.rowTop3]}
              onPress={() => openProfile(item)}
              activeOpacity={0.75}
            >
              <View style={styles.rankContainer}>
                {isTop3 ? (
                  <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                ) : (
                  <Text style={styles.rankNumber}>#{item.rank.toLocaleString()}</Text>
                )}
              </View>

              <AvatarDisplay
                avatarId={item.avatar_emoji}
                avatarFlag={item.avatar_flag}
                size={36}
                isConqueror={isConquerorEntry(item)}
              />

              <View style={styles.userInfo}>
                <Text style={[styles.username, isCurrentUser && styles.usernameHighlight]} numberOfLines={1}>
                  {item.username}{isCurrentUser ? ' (You)' : ''}
                </Text>
                <Text style={styles.ownedCount}>
                  {secondaryLabel}
                </Text>
              </View>

              <View style={styles.levelContainer}>
                <Text style={[
                  styles.levelValue,
                  isTop3 && styles.levelValueTop3,
                  { color: '#FFD700', fontSize: 15 },
                ]}>
                  {primaryMetric}
                </Text>
                <Text style={[styles.levelLabel, { color: '#FFD700', opacity: 0.7 }]}>
                  {primaryMetricLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Profile Modal */}
      {profileModal && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setProfileModal(null)}
        >
          <ProfileModalContent
            data={profileModal}
            isMe={profileModal.entry.id === user?.id}
            onClose={() => setProfileModal(null)}
          />
        </Modal>
      )}

      {/* Daily Rewards popup */}
      <Modal visible={showRewardsModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowRewardsModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }} activeOpacity={1} onPress={() => setShowRewardsModal(false)}>
          <View style={{ backgroundColor: '#12122a', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4e', padding: 20, width: 280 }} onStartShouldSetResponder={() => true}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>Daily Challenge Rewards</Text>
            {[
              { rank: '#1', gold: '2,500', tickets: 3 },
              { rank: '#2', gold: '1,500', tickets: 2 },
              { rank: '#3', gold: '1,000', tickets: 1 },
            ].map(({ rank, gold, tickets }) => (
              <View key={rank} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e3a' }}>
                <Text style={{ color: '#aaa', fontSize: 15, fontWeight: '700', width: 36 }}>{rank}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Text style={{ color: '#FFD700', fontSize: 15, fontWeight: '700' }}>{gold}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  <Text style={{ color: '#e05353', fontSize: 15, fontWeight: '700' }}>{tickets}</Text>
                </View>
              </View>
            ))}
            <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 14 }}>Paid out when the countdown reaches zero · Top 3 by today's challenge</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Profile Modal ─────────────────────────────────────────────────────────────

function formatNumberShort(num: number | null | undefined): string {
  if (num == null) return '—';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
}

function ProfileModalContent({
  data,
  isMe,
  onClose,
}: {
  data: ProfileModalData;
  isMe: boolean;
  onClose: () => void;
}) {
  const { entry, profile, ownedCountryCodes, unlockedItemIds, claimedAchievementIds, ownedCount, ownedArea, conquestPct, loading } = data;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // Separate inventory into avatars and flags (exclude upgrade items)
  const ownedAvatarIds = unlockedItemIds.filter(id => ALL_AVATAR_IDS.has(id));
  const ownedFlagIds = unlockedItemIds.filter(id => ALL_FLAG_IDS.has(id));

  // Count claimed trophies
  const trophyCount = claimedAchievementIds.length;

  // Get trophy details for claimed ones
  const claimedTrophies = ACHIEVEMENTS_DATA.filter(a => claimedAchievementIds.includes(a.id));

  const rankLabel = entry.rank <= 3
    ? (entry.rank === 1 ? '🥇 #1' : entry.rank === 2 ? '🥈 #2' : '🥉 #3')
    : `#${entry.rank.toLocaleString()}`;

  return (
    <View style={modal.container}>
      {/* Header bar */}
      <View style={modal.topBar}>
        <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
          <Text style={modal.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={modal.topBarTitle}>Explorer Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={modal.loadingCenter}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={modal.loadingText}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={modal.content} showsVerticalScrollIndicator={false}>

          {/* Avatar + identity */}
          <View style={modal.identityCard}>
            <AvatarDisplay
              avatarId={entry.avatar_emoji}
              avatarFlag={entry.avatar_flag}
              size={72}
              isConqueror={profile?.is_conquerer}
            />
            <View style={modal.identityInfo}>
              <Text style={modal.profileUsername}>{entry.username}{isMe ? ' (You)' : ''}</Text>
              <Text style={modal.profileRank}>{rankLabel}</Text>
              {memberSince && <Text style={modal.memberSince}>Member since {memberSince}</Text>}
            </View>
          </View>

          {/* World Domination meter */}
          <View style={modal.section}>
            <Text style={modal.sectionTitle}>World Domination</Text>
            <View style={modal.conquestBar}>
              <View style={[modal.conquestFill, { width: `${Math.max(0, Math.min(conquestPct, 100))}%` as any }]} />
            </View>
            <Text style={modal.conquestLabel}>
              {conquestPct}% of Earth's land · {(ownedArea / 1_000_000).toFixed(1)}M km²
            </Text>
          </View>

          {/* Map */}
          <View style={modal.section}>
            <Text style={modal.sectionTitle}>Empire Map</Text>
            <WorldMapView
              ownedCountries={ownedCountryCodes}
              height={200}
              interactive={false}
              showNames={false}
            />
          </View>

          {/* Stats row */}
          <View style={modal.statsRow}>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>
                {formatNumberShort(profile?.quiz_count ?? 0)}
              </Text>
              <Text style={modal.statLabel}>Quizzes</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{formatNumberShort(profile?.xp)}</Text>
              <Text style={modal.statLabel}>XP</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{ownedCount}</Text>
              <Text style={modal.statLabel}>Countries</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{trophyCount}/{ACHIEVEMENTS_DATA.length}</Text>
              <Text style={modal.statLabel}>Quests</Text>
            </View>
          </View>

          {/* Trophies */}
          {claimedTrophies.length > 0 && (
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>Quests ({trophyCount} / {ACHIEVEMENTS_DATA.length})</Text>
              <View style={modal.trophyGrid}>
                {claimedTrophies.map(t => (
                  <View key={t.id} style={modal.trophyChip}>
                    {ACHIEVEMENT_ICON_IMAGES[t.icon]
                      ? <Image source={ACHIEVEMENT_ICON_IMAGES[t.icon]} style={{ width: 18, height: 18 }} resizeMode="contain" />
                      : <Text style={modal.trophyIcon}>{t.icon}</Text>
                    }
                    <Text style={modal.trophyName} numberOfLines={1}>{t.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Inventory */}
          {(ownedAvatarIds.length > 0 || ownedFlagIds.length > 0) && (
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>Inventory</Text>

              {ownedAvatarIds.length > 0 && (
                <>
                  <Text style={modal.inventorySubtitle}>Avatars ({ownedAvatarIds.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.inventoryScroll}>
                    {ownedAvatarIds.map(id => (
                      <View key={id} style={[modal.inventoryItem, entry.avatar_emoji === id && modal.inventoryItemEquipped]}>
                        <AvatarDisplay avatarId={id} size={36} />
                        {entry.avatar_emoji === id && (
                          <View style={modal.equippedDot} />
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              {ownedFlagIds.length > 0 && (
                <>
                  <Text style={modal.inventorySubtitle}>Flags ({ownedFlagIds.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.inventoryScroll}>
                    {ownedFlagIds.map(id => {
                      const FlagComp = isCustomFlag(id) ? CUSTOM_FLAG_COMPONENTS[id] : null;
                      return (
                        <View key={id} style={[modal.inventoryItem, entry.avatar_flag === id && modal.inventoryItemEquipped]}>
                          {FlagComp
                            ? <FlagComp size={36} />
                            : <Text style={{ fontSize: 30, textAlign: 'center' }}>{id}</Text>
                          }
                          {entry.avatar_flag === id && (
                            <View style={modal.equippedDot} />
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          )}

        </ScrollView>
      )}

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  centered: {
    flex: 1, backgroundColor: '#0a0a1a',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: '#aaa', fontSize: 16 },
  header: { padding: 20, paddingTop: 56 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 4 },
  dailyRewardNoteRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dailyRewardNoteLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  dailyRewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyRewardIcon: {
    width: 14,
    height: 14,
  },
  dailyRewardNote: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  dailyRewardBonusNote: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  tabText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#0a0a1a' },
  searchRow: { paddingHorizontal: 20, marginBottom: 12 },
  searchInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyIcon: { width: 58, height: 58, opacity: 0.9 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center' },
  separator: { alignItems: 'center', paddingVertical: 8 },
  separatorDots: { color: '#555', fontSize: 18, letterSpacing: 3 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#2a2a4e', gap: 10,
  },
  rowHighlight: { borderColor: '#FFD700', backgroundColor: '#1a1a20' },
  rowTop3: { backgroundColor: '#1a1a30' },
  rankContainer: { width: 36, alignItems: 'center' },
  rankEmoji: { fontSize: 22 },
  rankNumber: { color: '#666', fontSize: 13, fontWeight: 'bold' },
  userInfo: { flex: 1, gap: 2 },
  username: { color: '#fff', fontSize: 14, fontWeight: '600' },
  usernameHighlight: { color: '#FFD700' },
  ownedCount: { color: '#888', fontSize: 11 },
  pctContainer: { alignItems: 'flex-end', width: 60, gap: 4 },
  pctValue: { color: '#aaa', fontSize: 15, fontWeight: 'bold' },
  pctValueTop3: { color: '#FFD700' },
  levelContainer: { alignItems: 'flex-end', width: 64, gap: 1 },
  levelValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  levelValueTop3: { color: '#FFD700' },
  levelLabel: { color: '#666', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  miniBar: {
    width: '100%', height: 3,
    backgroundColor: '#2a2a4e', borderRadius: 2, overflow: 'hidden',
  },
  miniBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#aaa', fontSize: 16 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#aaa', fontSize: 15 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  // Identity
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2a2a4e',
  },
  identityInfo: { flex: 1, gap: 4 },
  profileUsername: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  profileRank: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
  memberSince: { color: '#666', fontSize: 11, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12,
    padding: 10, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2a2a4e',
  },
  statValue: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 10, textAlign: 'center' },

  // Section
  section: { gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Conquest bar
  conquestBar: {
    height: 8, backgroundColor: '#2a2a4e', borderRadius: 4, overflow: 'hidden',
  },
  conquestFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 4 },
  conquestLabel: { color: '#888', fontSize: 11 },

  // Trophies
  trophyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trophyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a2e', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FFD70055',
  },
  trophyIcon: { fontSize: 16 },
  trophyName: { color: '#ccc', fontSize: 11, fontWeight: '600', maxWidth: 100 },

  // Inventory
  inventorySubtitle: { color: '#888', fontSize: 12, marginBottom: 4 },
  inventoryScroll: { marginBottom: 8 },
  inventoryItem: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
    marginRight: 8, borderWidth: 1, borderColor: '#2a2a4e',
  },
  inventoryItemEquipped: { borderColor: '#FFD700', backgroundColor: '#1a1a20' },
  equippedDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD700',
  },
});
