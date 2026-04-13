import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { LeaderboardEntry } from '../types';
import AvatarDisplay from '../components/AvatarDisplay';
import WorldMapView from '../components/WorldMapView';
import { useFocusEffect } from '@react-navigation/native';
import { AVATAR_CHARACTERS, CUSTOM_AVATARS, CUSTOM_FLAGS, FLAG_OPTIONS } from '../lib/avatarData';
import { calcQuizXP, getLevelInfo } from '../lib/xpSystem';

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
const DAILY_WINNER_POPUP_KEY_PREFIX = '@daily_winner_reward_popup_seen:';
const DAILY_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ALLTIME_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

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
  gold: number;
  tickets: number;
  reason: string;
}

interface DailyXpRow {
  user_id: string;
  daily_xp: number;
}

export default function LeaderboardScreen() {
  const { user, profile } = useAuth();
  const [leaderboardType, setLeaderboardType] = useState<'alltime' | 'daily'>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [dailyXpEntries, setDailyXpEntries] = useState<(LeaderboardEntry & { daily_xp: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const areaMapRef = useRef<Record<string, number> | null>(null);
  const lastRefreshRef = useRef<{ daily: number; alltime: number }>({ daily: 0, alltime: 0 });

  // Profile modal state
  const [profileModal, setProfileModal] = useState<ProfileModalData | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (leaderboardType === 'alltime') {
        if (entries.length > 0 && (now - lastRefreshRef.current.alltime) < ALLTIME_REFRESH_INTERVAL_MS) {
          setLoading(false);
          return;
        }
        loadLeaderboard();
      } else {
        if (dailyXpEntries.length > 0 && (now - lastRefreshRef.current.daily) < DAILY_REFRESH_INTERVAL_MS) {
          setLoading(false);
          return;
        }
        loadDailyXpLeaderboard();
      }
    }, [leaderboardType, entries.length, dailyXpEntries.length])
  );

  async function loadLeaderboard() {
    setLoading(true);
    try {
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

      const { data: ownedData } = await supabase
        .from('owned_countries')
        .select('user_id, country_code');

      let areaMap = areaMapRef.current;
      if (!areaMap) {
        const countries = await fetchCountries();
        areaMap = {};
        for (const c of countries) (areaMap as Record<string, number>)[c.cca2] = c.area || 0;
        areaMapRef.current = areaMap;
      }

      const countMap: Record<string, number> = {};
      const areaTotal: Record<string, number> = {};
      if (ownedData) {
        for (const row of ownedData as any[]) {
          countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
          areaTotal[row.user_id] = (areaTotal[row.user_id] || 0) + ((areaMap as Record<string, number>)[row.country_code] || 0);
        }
      }

      const leaderboard: LeaderboardEntry[] = profiles
        .map((p) => {
          const ownedArea = areaTotal[p.id] || 0;
          const conquestPct = Math.min(100, Math.round((ownedArea / WORLD_LAND_AREA) * 10000) / 100);
          return {
            id: p.id,
            username: p.username,
            avatar_emoji: p.avatar_emoji || 'png_explorer_male',
            avatar_flag: p.avatar_flag || '🏳️',
            xp: p.xp ?? 0,
            owned_count: countMap[p.id] || 0,
            owned_area: ownedArea,
            conquest_pct: conquestPct,
            is_conquerer: p.is_conquerer,
          };
        })
        .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));

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

    const row = rows[0];
    const rewardDate = row.reward_date;
    if (!rewardDate || row.winner_user_id !== user.id) return;
    if (row.reason !== 'awarded' && row.reason !== 'already_awarded') return;

    const key = `${DAILY_WINNER_POPUP_KEY_PREFIX}${user.id}:${rewardDate}`;
    const alreadySeen = await AsyncStorage.getItem(key);
    if (alreadySeen) return;

    await AsyncStorage.setItem(key, '1');
    Alert.alert(
      'Daily Leaderboard Winner',
      `You finished #1 for ${rewardDate} and received ${Number(row.gold || 0).toLocaleString()} gold + ${Number(row.tickets || 0).toLocaleString()} tickets.`
    );
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

      const { data: ownedData } = await supabase
        .from('owned_countries')
        .select('user_id, country_code');

      let areaMap = areaMapRef.current;
      if (!areaMap) {
        const countries = await fetchCountries();
        areaMap = {};
        for (const c of countries) (areaMap as Record<string, number>)[c.cca2] = c.area || 0;
        areaMapRef.current = areaMap;
      }

      const countMap: Record<string, number> = {};
      const areaTotal: Record<string, number> = {};
      if (ownedData) {
        for (const row of ownedData as any[]) {
          countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
          areaTotal[row.user_id] = (areaTotal[row.user_id] || 0) + ((areaMap as Record<string, number>)[row.country_code] || 0);
        }
      }

      const dailyXpMap: Record<string, number> = {};
      const rpcDaily = await supabase.rpc('get_daily_xp_leaderboard', { p_limit: 500 });
      if (rpcDaily.error) {
        console.warn('Failed to load daily XP via RPC, falling back to client query:', rpcDaily.error.message);
        let quizResults: any[] = [];
        const primary = await supabase
          .from('quiz_results')
          .select('user_id, quiz_type, score, total_questions, xp_earned')
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
          let xp = 0;
          if (typeof result.xp_earned === 'number') {
            xp = result.xp_earned;
          } else if (result.quiz_type === 'millionaire') {
            xp = result.score >= 15 ? 1000 : 0;
          } else if (['flag', 'shape', 'capitals', 'borders', 'trail'].includes(result.quiz_type)) {
            const totalQuestions = Math.max(1, Number(result.total_questions) || 10);
            xp = calcQuizXP(result.quiz_type, Number(result.score) || 0, totalQuestions, false);
          } else if (result.quiz_type === 'nightmare') {
            xp = 0;
          }

          if (xp <= 0) continue;
          dailyXpMap[result.user_id] = (dailyXpMap[result.user_id] || 0) + xp;
        }
      } else {
        for (const row of (rpcDaily.data as DailyXpRow[] | null) ?? []) {
          const xp = Number(row.daily_xp) || 0;
          if (!row.user_id || xp <= 0) continue;
          dailyXpMap[row.user_id] = xp;
        }
      }

      // Create daily XP leaderboard entries, only including users with XP today
      const dailyLeaderboard = profiles
        .filter(p => dailyXpMap[p.id] > 0)
        .map((p) => {
          const ownedArea = areaTotal[p.id] || 0;
          const conquestPct = Math.min(100, Math.round((ownedArea / WORLD_LAND_AREA) * 10000) / 100);
          return {
            id: p.id,
            username: p.username,
            avatar_emoji: p.avatar_emoji || 'png_explorer_male',
            avatar_flag: p.avatar_flag || '🏳️',
            xp: p.xp ?? 0,
            owned_count: countMap[p.id] || 0,
            owned_area: ownedArea,
            conquest_pct: conquestPct,
            is_conquerer: p.is_conquerer,
            daily_xp: dailyXpMap[p.id] || 0,
          };
        })
        .sort((a, b) => b.daily_xp - a.daily_xp);

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

  function getDisplayEntries(source: any[]): any[] {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return source
        .map((e, i) => ({ ...e, rank: i + 1 }))
        .filter(e => e.username.toLowerCase().includes(q));
    }

    if (source.length <= 8) {
      return source.map((e, i) => ({ ...e, rank: i + 1 }));
    }

    const result: any[] = [];
    const shownRanks = new Set<number>();
    const pushByIndex = (idx: number) => {
      if (idx < 0 || idx >= source.length) return;
      const rank = idx + 1;
      if (shownRanks.has(rank)) return;
      shownRanks.add(rank);
      result.push({ ...source[idx], rank });
    };
    const pushSeparator = () => {
      result.push({
        id: `__separator__${result.length}`,
        username: '...',
        avatar_emoji: '',
        avatar_flag: '',
        xp: 0,
        owned_count: 0,
        owned_area: 0,
        conquest_pct: 0,
        rank: -1,
        isSeparator: true,
      });
    };

    const topIndices = [0, 1, 2, 3, 4].filter(i => i < source.length);
    topIndices.forEach(pushByIndex);

    const userIndex = source.findIndex(e => e.id === user?.id);
    const bottomIndices = [source.length - 2, source.length - 1].filter(i => i >= 0);
    const userInTop = userIndex >= 0 && userIndex <= 4;
    const userInBottom = bottomIndices.includes(userIndex);

    const middleIndices =
      userIndex >= 0 && !userInTop && !userInBottom
        ? [userIndex - 1, userIndex, userIndex + 1].filter(i => i >= 0 && i < source.length)
        : [];

    const bottomUnique = bottomIndices.filter(i => !topIndices.includes(i) && !middleIndices.includes(i));

    if (middleIndices.length > 0) {
      pushSeparator();
      middleIndices.forEach(pushByIndex);
    }

    if (bottomUnique.length > 0) {
      pushSeparator();
      bottomUnique.forEach(pushByIndex);
    }

    return result;
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading leaderboard…</Text>
      </View>
    );
  }

  const activeEntries = leaderboardType === 'alltime' ? entries : dailyXpEntries;
  const displayEntries = getDisplayEntries(activeEntries);

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
        <Text style={styles.subtitle}>
          {leaderboardType === 'alltime'
            ? `${entries.length} explorers · Ranked by total XP`
            : `${dailyXpEntries.length} active today · Ranked by XP earned`}
        </Text>
        {leaderboardType === 'daily' && (
          <View style={styles.dailyRewardNoteRow}>
            <Text style={styles.dailyRewardNoteLabel}>Daily #1 reward:</Text>
            <View style={styles.dailyRewardItem}>
              <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.dailyRewardIcon} resizeMode="contain" />
              <Text style={styles.dailyRewardNote}>1,000</Text>
            </View>
            <View style={styles.dailyRewardItem}>
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={styles.dailyRewardIcon} resizeMode="contain" />
              <Text style={styles.dailyRewardNote}>2</Text>
            </View>
          </View>
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
          if (item.isSeparator) {
            return (
              <View style={styles.separator}>
                <Text style={styles.separatorDots}>...</Text>
              </View>
            );
          }

          const isCurrentUser = item.id === user?.id;
          const isTop3 = item.rank <= 3;
          const rankEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '';
          const conquestPct = (item.conquest_pct ?? 0) as number;

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
                {leaderboardType === 'alltime' ? (
                  <Text style={styles.ownedCount}>
                    Level {getLevelInfo(item.xp ?? 0).level} · {(item.xp ?? 0).toLocaleString()} XP
                  </Text>
                ) : (
                  <Text style={styles.ownedCount}>
                    Level {getLevelInfo(item.xp ?? 0).level} · {(item as any).daily_xp || 0} XP today
                  </Text>
                )}
              </View>

              <View style={styles.pctContainer}>
                <Text style={[styles.pctValue, isTop3 && styles.pctValueTop3]}>
                  {conquestPct}%
                </Text>
                <View style={styles.miniBar}>
                  <View style={[styles.miniBarFill, { width: `${Math.min(conquestPct * 5, 100)}%` }]} />
                </View>
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
