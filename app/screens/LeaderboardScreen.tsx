import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchCountries } from '../lib/countryData';
import { useAuth } from '../context/AuthContext';
import { LeaderboardEntry } from '../types';
import AvatarDisplay from '../components/AvatarDisplay';
import WorldMapView from '../components/WorldMapView';
import { useFocusEffect } from '@react-navigation/native';
import { AVATAR_CHARACTERS, CUSTOM_AVATARS, CUSTOM_FLAGS, FLAG_OPTIONS } from '../lib/avatarData';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

const WORLD_LAND_AREA = 150_000_000; // km²

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
  login_streak: number;
  created_at: string;
}

interface ProfileModalData {
  entry: LeaderboardEntry & { rank: number };
  profile: UserProfile | null;
  ownedCountryCodes: string[];
  unlockedItemIds: string[];
  claimedAchievementIds: string[];
  conquestPct: number;
  loading: boolean;
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile modal state
  const [profileModal, setProfileModal] = useState<ProfileModalData | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [])
  );

  async function loadLeaderboard() {
    setLoading(true);
    try {
      let { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_emoji, avatar_flag');

      if (profileErr) {
        const fallback = await supabase.from('profiles').select('id, username');
        profiles = (fallback.data || []).map((p: any) => ({
          ...p,
          avatar_emoji: '🧑',
          avatar_flag: '🏳️',
        }));
      }
      if (!profiles) return;

      const { data: ownedData } = await supabase
        .from('owned_countries')
        .select('user_id, country_code');

      const allCountries = await fetchCountries();
      const areaMap: Record<string, number> = {};
      for (const c of allCountries) areaMap[c.cca2] = c.area || 0;

      const countMap: Record<string, number> = {};
      const areaTotal: Record<string, number> = {};
      if (ownedData) {
        for (const row of ownedData) {
          countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
          areaTotal[row.user_id] = (areaTotal[row.user_id] || 0) + (areaMap[row.country_code] || 0);
        }
      }

      const leaderboard: LeaderboardEntry[] = profiles
        .map((p) => {
          const area = areaTotal[p.id] || 0;
          return {
            id: p.id,
            username: p.username,
            avatar_emoji: p.avatar_emoji || '🧑',
            avatar_flag: p.avatar_flag || '🏳️',
            owned_count: countMap[p.id] || 0,
            owned_area: area,
            conquest_pct: Math.round((area / WORLD_LAND_AREA) * 10000) / 100,
          };
        })
        .sort((a, b) => b.conquest_pct - a.conquest_pct);

      setEntries(leaderboard);
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(entry: LeaderboardEntry & { rank: number }) {
    setProfileModal({ entry, profile: null, ownedCountryCodes: [], unlockedItemIds: [], claimedAchievementIds: [], conquestPct: entry.conquest_pct, loading: true });

    try {
      const [profileRes, ownedRes, itemsRes, achievementsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_emoji, avatar_flag, gold_balance, login_streak, created_at').eq('id', entry.id).single(),
        supabase.from('owned_countries').select('country_code').eq('user_id', entry.id),
        supabase.from('user_unlocked_items').select('item_id').eq('user_id', entry.id),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', entry.id),
      ]);

      setProfileModal({
        entry,
        profile: profileRes.data ?? null,
        ownedCountryCodes: (ownedRes.data ?? []).map((r: any) => r.country_code),
        unlockedItemIds: (itemsRes.data ?? []).map((r: any) => r.item_id),
        claimedAchievementIds: (achievementsRes.data ?? []).map((r: any) => r.achievement_id),
        conquestPct: entry.conquest_pct,
        loading: false,
      });
    } catch (err) {
      console.warn('Failed to load profile:', err);
      setProfileModal(prev => prev ? { ...prev, loading: false } : null);
    }
  }

  function getDisplayEntries(): (LeaderboardEntry & { rank: number; isSeparator?: boolean })[] {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return entries
        .map((e, i) => ({ ...e, rank: i + 1 }))
        .filter(e => e.username.toLowerCase().includes(q));
    }

    const result: (LeaderboardEntry & { rank: number; isSeparator?: boolean })[] = [];
    const top5 = entries.slice(0, 5);
    top5.forEach((e, i) => result.push({ ...e, rank: i + 1 }));

    const userIndex = entries.findIndex(e => e.id === user?.id);
    if (userIndex >= 5) {
      result.push({ id: '__separator__', username: '...', avatar_emoji: '', avatar_flag: '', owned_count: 0, owned_area: 0, conquest_pct: 0, rank: -1, isSeparator: true });
      const start = Math.max(5, userIndex - 1);
      const end = Math.min(entries.length, userIndex + 2);
      for (let i = start; i < end; i++) {
        result.push({ ...entries[i], rank: i + 1 });
      }
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

  const displayEntries = getDisplayEntries();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Leaderboard</Text>
        <Text style={styles.subtitle}>
          {entries.length} explorers · Ranked by land area conquered
        </Text>
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
            <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '🌐'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? `No players found for "${searchQuery}"` : 'No explorers yet. Be the first!'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.isSeparator) {
            return (
              <View style={styles.separator}>
                <Text style={styles.separatorDots}>• • •</Text>
              </View>
            );
          }

          const isCurrentUser = item.id === user?.id;
          const isTop3 = item.rank <= 3;
          const rankEmoji = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '';

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

              <AvatarDisplay avatarId={item.avatar_emoji} avatarFlag={item.avatar_flag} size={36} />

              <View style={styles.userInfo}>
                <Text style={[styles.username, isCurrentUser && styles.usernameHighlight]} numberOfLines={1}>
                  {item.username}{isCurrentUser ? ' (You)' : ''}
                </Text>
                <Text style={styles.ownedCount}>
                  {item.owned_count} countries
                  {item.owned_area > 0 ? ` · ${(item.owned_area / 1_000_000).toFixed(1)}M km²` : ''}
                </Text>
              </View>

              <View style={styles.pctContainer}>
                <Text style={[styles.pctValue, isTop3 && styles.pctValueTop3]}>
                  {item.conquest_pct}%
                </Text>
                <View style={styles.miniBar}>
                  <View style={[styles.miniBarFill, { width: `${Math.min(item.conquest_pct * 5, 100)}%` }]} />
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
  const { entry, profile, ownedCountryCodes, unlockedItemIds, claimedAchievementIds, loading } = data;
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
              <View style={[modal.conquestFill, { width: `${Math.min(entry.conquest_pct * 5, 100)}%` as any }]} />
            </View>
            <Text style={modal.conquestLabel}>
              {entry.conquest_pct}% of Earth's land · {(entry.owned_area / 1_000_000).toFixed(1)}M km²
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
                {formatNumberShort(profile?.gold_balance)}
              </Text>
              <Text style={modal.statLabel}>Gold</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{entry.owned_count}</Text>
              <Text style={modal.statLabel}>Countries</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{entry.conquest_pct}%</Text>
              <Text style={modal.statLabel}>Conquered</Text>
            </View>
            <View style={modal.statBox}>
              <Text style={modal.statValue}>{trophyCount}</Text>
              <Text style={modal.statLabel}>Trophies</Text>
            </View>
          </View>

          {/* Trophies */}
          {claimedTrophies.length > 0 && (
            <View style={modal.section}>
              <Text style={modal.sectionTitle}>Trophies ({trophyCount} / {ACHIEVEMENTS_DATA.length})</Text>
              <View style={modal.trophyGrid}>
                {claimedTrophies.map(t => (
                  <View key={t.id} style={modal.trophyChip}>
                    <Text style={modal.trophyIcon}>{t.icon}</Text>
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
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center' },
  separator: { alignItems: 'center', paddingVertical: 8 },
  separatorDots: { color: '#555', fontSize: 18, letterSpacing: 6 },
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
