import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { fetchCountries } from '../lib/countryData';
import { supabase } from '../lib/supabase';
import { Country, LeaderboardEntry } from '../types';
import GoldDisplay from '../components/GoldDisplay';
import WorldMapView from '../components/WorldMapView';
import GoldShopScreen from './GoldShopScreen';
import AvatarDisplay from '../components/AvatarDisplay';
import ActivityTicker from '../components/ActivityTicker';
import { Ionicons } from '@expo/vector-icons';

const WORLD_LAND_AREA = 150_000_000; // km²

export default function HomeScreen({ navigation }: any) {
  const { profile, signOut, user } = useAuth();
  const { ownedCountries } = useGame();
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showMapNames, setShowMapNames] = useState(true);
  const [showOwnedList, setShowOwnedList] = useState(false);

  useEffect(() => {
    fetchCountries()
      .then(setAllCountries)
      .catch(console.warn);
  }, []);

  // Refresh mini-leaderboard whenever the current user's avatar changes
  useEffect(() => {
    loadTopPlayers();
  }, [profile?.id, profile?.avatar_emoji, profile?.avatar_flag]);

  async function loadTopPlayers() {
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

      const countries = await fetchCountries();
      const areaMap: Record<string, number> = {};
      for (const c of countries) areaMap[c.cca2] = c.area || 0;

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
            avatar_flag: p.avatar_flag || '🏴‍☠️',
            owned_count: countMap[p.id] || 0,
            owned_area: area,
            conquest_pct: Math.round((area / WORLD_LAND_AREA) * 10000) / 100,
          };
        })
        .sort((a, b) => b.conquest_pct - a.conquest_pct)
        .slice(0, 3);

      setTopPlayers(leaderboard);
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
    }
  }

  const totalArea = allCountries.reduce((sum, c) => sum + (c.area || 0), 0);
  const ownedArea = allCountries
    .filter((c) => ownedCountries.includes(c.cca2))
    .reduce((sum, c) => sum + (c.area || 0), 0);

  const progressPct = Math.min((ownedArea / WORLD_LAND_AREA) * 100, 100).toFixed(1);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Compact Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowUserMenu(true)} style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>
              {profile?.username ?? 'Explorer'}
            </Text>
            <AvatarDisplay
              avatarId={profile?.avatar_emoji ?? '🧑'}
              avatarFlag={profile?.avatar_flag ?? undefined}
              size={32}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGoldShop(true)}>
            <GoldDisplay />
          </TouchableOpacity>
        </View>

        {/* World Map */}
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>Your Empire</Text>
            <TouchableOpacity onPress={() => setShowMapNames(!showMapNames)}>
              {showMapNames ? (
                <Ionicons name="eye-outline" size={24} color="#aaa" style={styles.mapToggleIcon} />
              ) : (
                <Ionicons name="eye-off-outline" size={24} color="#666" style={styles.mapToggleIcon} />
              )}
            </TouchableOpacity>
          </View>
          <WorldMapView ownedCountries={ownedCountries} height={260} showNames={showMapNames} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => setShowOwnedList(true)}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {ownedCountries.length} / {allCountries.length}
            </Text>
            <Text style={styles.statLabel}>Countries ▸</Text>
          </TouchableOpacity>
          <View style={styles.statCard}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {ownedArea > 0 ? `${(ownedArea / 1e6).toFixed(1)}M` : '0'} / {totalArea > 0 ? `${(totalArea / 1e6).toFixed(1)}M` : '0'}
            </Text>
            <Text style={styles.statLabel}>km²</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>World Domination Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{progressPct}% of Earth's land area</Text>
        </View>

        {/* Activity Ticker */}
        <ActivityTicker />

        {/* Mini Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={styles.sectionTitle}>🏆 Top Explorers</Text>
          {topPlayers.length === 0 ? (
            <Text style={styles.emptyText}>Loading rankings...</Text>
          ) : (
            topPlayers.map((entry, index) => {
              const isMe = entry.id === user?.id;
              const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
              return (
                <View key={entry.id} style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                  <Text style={styles.leaderRank}>{rankEmoji}</Text>
                  <AvatarDisplay avatarId={entry.avatar_emoji} avatarFlag={entry.avatar_flag} size={30} />
                  <Text style={[styles.leaderName, isMe && styles.leaderNameMe]} numberOfLines={1}>
                    {entry.username}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={[styles.leaderPct, styles.leaderPctTop]}>
                    {entry.conquest_pct}%
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* User Menu Modal */}
      <Modal visible={showUserMenu} transparent animationType="fade" onRequestClose={() => setShowUserMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowUserMenu(false)}>
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <AvatarDisplay
                avatarId={profile?.avatar_emoji ?? '🧑'}
                avatarFlag={profile?.avatar_flag ?? undefined}
                size={44}
              />
              <Text style={styles.menuUsername}>{profile?.username ?? 'Explorer'}</Text>
              <Text style={styles.menuEmail}>{user?.email ?? ''}</Text>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowUserMenu(false); signOut(); }}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={styles.menuItemText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gold Shop Modal */}
      <Modal visible={showGoldShop} animationType="slide" onRequestClose={() => setShowGoldShop(false)}>
        <View style={styles.goldShopModal}>
          <TouchableOpacity style={styles.closeGoldShop} onPress={() => setShowGoldShop(false)}>
            <Text style={styles.closeGoldShopText}>✕ Close</Text>
          </TouchableOpacity>
          <GoldShopScreen />
        </View>
      </Modal>

      {/* Owned Countries List Modal */}
      <Modal visible={showOwnedList} transparent animationType="slide" onRequestClose={() => setShowOwnedList(false)}>
        <View style={styles.ownedListOverlay}>
          <View style={styles.ownedListContent}>
            <View style={styles.ownedListHeader}>
              <Text style={styles.ownedListTitle}>🌍 Owned Countries ({ownedCountries.length})</Text>
              <TouchableOpacity onPress={() => setShowOwnedList(false)}>
                <Text style={styles.ownedListClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {ownedCountries.length === 0 ? (
              <Text style={styles.emptyText}>No countries owned yet. Earn gold and visit the Shop!</Text>
            ) : (
              <FlatList
                data={allCountries.filter(c => ownedCountries.includes(c.cca2)).sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={item => item.cca2}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.ownedRow}>
                    <Image source={{ uri: item.flagUrl }} style={styles.ownedFlag} resizeMode="cover" />
                    <Text style={styles.ownedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.ownedRegion}>{item.region}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  content: { padding: 20, gap: 14, paddingBottom: 30 },

  // Compact header: avatar + name + country on left, gold on right
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 48,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  username: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  countryBadge: {
    color: '#FFD700',
    fontSize: 12,
    flexShrink: 0,
  },

  mapSection: {
    backgroundColor: '#0d0d20',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1a1a3e',
    gap: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', paddingHorizontal: 4 },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapToggleIcon: {
    paddingHorizontal: 4,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  statValueSmall: { color: '#FFD700', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#aaa', fontSize: 11, marginTop: 2, textAlign: 'center' },
  progressSection: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#2a2a4e' },
  progressLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
  progressBar: { height: 8, backgroundColor: '#2a2a4e', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 4 },
  progressText: { color: '#aaa', fontSize: 11, textAlign: 'right' },
  leaderboardSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  emptyText: { color: '#666', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3e',
  },
  leaderRowMe: { backgroundColor: '#1a1a30', borderRadius: 8, paddingHorizontal: 8 },
  leaderRank: { width: 28, fontSize: 16, textAlign: 'center' },
  leaderName: { flex: 1, color: '#ccc', fontSize: 14 },
  leaderNameMe: { color: '#FFD700', fontWeight: '600' },
  leaderPct: { color: '#888', fontSize: 14, fontWeight: 'bold' },
  leaderPctTop: { color: '#FFD700' },

  // User menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  menuContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 12,
  },
  menuHeader: { alignItems: 'center', gap: 6 },
  menuUsername: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  menuEmail: { color: '#888', fontSize: 12 },
  menuCountry: { color: '#FFD700', fontSize: 12 },
  menuDivider: { height: 1, backgroundColor: '#2a2a4e' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { color: '#ff6b6b', fontSize: 15, fontWeight: '500' },

  // Gold shop modal
  goldShopModal: { flex: 1, backgroundColor: '#0a0a1a' },
  closeGoldShop: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  closeGoldShopText: { color: '#aaa', fontSize: 14 },

  // Owned countries list modal
  ownedListOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  ownedListContent: {
    backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20,
    maxHeight: '80%', borderWidth: 1, borderColor: '#2a2a4e',
  },
  ownedListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ownedListTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  ownedListClose: { color: '#aaa', fontSize: 20, padding: 4 },
  ownedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a3e' },
  ownedFlag: { width: 36, height: 24, borderRadius: 4 },
  ownedName: { flex: 1, color: '#fff', fontSize: 14 },
  ownedRegion: { color: '#888', fontSize: 11 },
});
