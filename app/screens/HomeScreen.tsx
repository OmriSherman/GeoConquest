import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { View as _View } from 'react-native';
let ViewShot: any = _View;
let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try { const _vs = require('react-native-view-shot'); ViewShot = _vs.default; captureRef = _vs.captureRef; } catch {}
let Sharing: { isAvailableAsync: () => Promise<boolean>; shareAsync: (uri: string, opts?: any) => Promise<void> } | null = null;
try { Sharing = require('expo-sharing'); } catch {}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useGame } from '../context/GameContext';
import { fetchCountries } from '../lib/countryData';
import { supabase } from '../lib/supabase';
import { Country, LeaderboardEntry } from '../types';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { CUSTOM_AVATARS } from '../lib/avatarData';
import GoldDisplay from '../components/GoldDisplay';
import WorldMapView from '../components/WorldMapView';
import GoldShopScreen from './GoldShopScreen';
import AvatarDisplay from '../components/AvatarDisplay';
import ActivityTicker from '../components/ActivityTicker';
import XpRingDisplay from '../components/XpRingDisplay';
import { XpAmount } from '../components/XpIcon';
import { getLevelInfo } from '../lib/xpSystem';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { STORE_URL } from '../lib/storeLinks';
import { t, setLocale, getLocale, LOCALE_LABELS, SUPPORTED } from '../lib/i18n';
import { DEV_MODE } from '../lib/devMode';
let RevenueCatUI: any = null;
try { RevenueCatUI = require('react-native-purchases-ui').default; } catch {}

const APP_VERSION = '1.2.4';

const WORLD_LAND_AREA = 150_000_000; // km²
const TOTAL_QUESTS = ACHIEVEMENTS_DATA.length;
const TOTAL_AVATARS = CUSTOM_AVATARS.length;

export default function HomeScreen({ navigation }: any) {
  const { profile, signOut, user, shareReferralLink } = useAuth();
  const { ownedCountries } = useGame();
  const { showAlert } = useAlert();
  const mapCaptureRef = useRef<any>(null);

  async function handleDeleteAccount() {
    setShowUserMenu(false);
    showAlert({
      title: t('home.deleteAccount'),
      message: t('home.deleteBody'),
      buttons: [
        {
          text: t('home.deleteForever'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_account');
              if (error) throw error;
              await signOut();
            } catch (err: any) {
              showAlert({ title: t('common.error'), message: err.message ?? 'Failed to delete account.', buttons: [{ text: t('common.ok') }] });
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    });
  }

  async function handleShareMap() {
    if (!captureRef || !mapCaptureRef.current) return;
    try {
      const uri = await captureRef(mapCaptureRef, { format: 'png', quality: 0.92 });
      const isAvailable = Sharing ? await Sharing.isAvailableAsync() : false;
      if (!isAvailable) {
        await Share.share({ message: `My GeoConquest empire: ${ownedCountries.length} countries! Can you beat me?` });
        return;
      }
      await Sharing?.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Your Empire' });
    } catch (e) {
      console.warn('Map share failed:', e);
    }
  }

  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showMapNames, setShowMapNames] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [showOwnedList, setShowOwnedList] = useState(false);
  const [claimedCount, setClaimedCount] = useState(0);
  const [ownedAvatarCount, setOwnedAvatarCount] = useState(0);

  const fetchCounts = React.useCallback(async () => {
    if (!user?.id) return;
    try {
      const [{ data: questsData }, { data: avatarsData }] = await Promise.all([
        supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
        supabase.from('user_unlocked_items').select('item_id').eq('user_id', user.id).eq('item_type', 'avatar'),
      ]);
      setClaimedCount((questsData ?? []).length);
      setOwnedAvatarCount((avatarsData ?? []).length);
    } catch (error) {
      console.warn('Failed to load Home counters:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCountries()
      .then(setAllCountries)
      .catch(console.warn);
  }, []);

  useEffect(() => {
    async function maybeShowWelcome() {
      const seen = await AsyncStorage.getItem('@welcome_popup_seen');
      if (seen) return;
      await AsyncStorage.setItem('@welcome_popup_seen', '1');
      showAlert({
        icon: (
          <Image
            source={require('../../assets/avatars/globe.png')}
            style={{ width: 72, height: 72 }}
            resizeMode="contain"
          />
        ),
        title: t('home.welcomeTitle'),
        contentNode: (
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>
              {t('home.welcomeSubtitle')}
            </Text>
            {[
              { img: require('../../assets/avatars/gold_bag.png'),  text: t('home.welcomeStep1') },
              { img: require('../../assets/avatars/cart.png'),       text: t('home.welcomeStep2') },
              { img: require('../../assets/avatars/war_medal.png'), text: t('home.welcomeStep3') },
              { img: require('../../assets/avatars/trophy.png'),    text: t('home.welcomeStep4') },
            ].map(({ img, text }, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Image source={img} style={{ width: 20, height: 20, marginTop: 1 }} resizeMode="contain" />
                <Text style={{ color: '#bbb', fontSize: 13, lineHeight: 19, flex: 1 }}>{text}</Text>
              </View>
            ))}
          </View>
        ),
        buttons: [{ text: t('home.letsConquer'), style: 'cta' }],
      });
    }
    maybeShowWelcome();
  }, []);

  useEffect(() => {
    async function checkForUpdate() {
      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'latest_android_version')
          .single();
        if (!data?.value) return;
        const latest = data.value as string;
        const storageKey = `@update_popup_${latest}`;
        const alreadyShown = await AsyncStorage.getItem(storageKey);
        if (alreadyShown) return;
        const [lMaj, lMin, lPatch] = latest.split('.').map(Number);
        const [cMaj, cMin, cPatch] = APP_VERSION.split('.').map(Number);
        const isOutdated =
          lMaj > cMaj || (lMaj === cMaj && lMin > cMin) || (lMaj === cMaj && lMin === cMin && lPatch > cPatch);
        if (!isOutdated) return;
        await AsyncStorage.setItem(storageKey, '1');
        showAlert({
          icon: (
            <Image
              source={require('../../assets/avatars/globe.png')}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
          ),
          title: t('home.updateTitle', { version: latest }),
          message: t('home.updateBody', { current: APP_VERSION }),
          buttons: [
            { text: t('home.updateNow'), style: 'cta', onPress: () => Linking.openURL(STORE_URL) },
            { text: t('home.later'), style: 'cancel' },
          ],
        });
      } catch {
        // silently ignore — version check is non-critical
      }
    }
    checkForUpdate();
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  // Refresh mini-leaderboard whenever the current user's avatar changes
  useEffect(() => {
    loadTopPlayers();
  }, [profile?.id, profile?.avatar_emoji, profile?.avatar_flag]);

  async function loadTopPlayers() {
    try {
      let { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_emoji, avatar_flag, xp');

      if (profileErr) {
        const fallback = await supabase.from('profiles').select('id, username');
        profiles = (fallback.data || []).map((p: any) => ({
          ...p,
          avatar_emoji: '🧑',
          avatar_flag: '🏳️',
          xp: 0,
        }));
      }
      if (!profiles) return;

      const leaderboard: LeaderboardEntry[] = profiles
        .map((p) => {
          return {
            id: p.id,
            username: p.username,
            avatar_emoji: p.avatar_emoji || 'png_explorer_male',
            avatar_flag: p.avatar_flag || '🏴‍☠️',
            xp: p.xp ?? 0,
          };
        })
        .sort((a, b) => b.xp - a.xp)
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
            {(() => {
              const { level, xpIntoLevel, xpForNextLevel } = getLevelInfo(profile?.xp ?? 0);
              return <XpRingDisplay level={level} xpCurrent={xpIntoLevel} xpMax={xpForNextLevel} size={38} isPremium={!!profile?.is_conquerer} />;
            })()}
            <Text style={styles.username} numberOfLines={1}>
              {profile?.username ?? 'Explorer'}
            </Text>
            <AvatarDisplay
              avatarId={profile?.avatar_emoji ?? 'png_explorer_male'}
              avatarFlag={profile?.avatar_flag ?? undefined}
              size={32}
              isConqueror={profile?.is_conquerer}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGoldShop(true)}>
            <GoldDisplay />
          </TouchableOpacity>
        </View>

        {/* World Map */}
        <ViewShot ref={mapCaptureRef} style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>{t('home.empire')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={handleShareMap}>
                <Ionicons name="share-outline" size={22} color="#aaa" style={styles.mapToggleIcon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMapResetKey(k => k + 1)}>
                <Ionicons name="contract-outline" size={22} color="#aaa" style={styles.mapToggleIcon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMapNames(!showMapNames)}>
                {showMapNames ? (
                  <Ionicons name="eye-outline" size={24} color="#aaa" style={styles.mapToggleIcon} />
                ) : (
                  <Ionicons name="eye-off-outline" size={24} color="#666" style={styles.mapToggleIcon} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <WorldMapView ownedCountries={ownedCountries} height={260} showNames={showMapNames} resetKey={mapResetKey} />
        </ViewShot>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>{t('home.worldProgress')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressText}>{t('home.earthArea', { pct: progressPct })}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => setShowOwnedList(true)}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {ownedCountries.length} / {allCountries.length}
            </Text>
            <Text style={styles.statLabel}>{t('home.countries')}</Text>
          </TouchableOpacity>
          <View style={styles.statCard}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {ownedArea > 0 ? `${(ownedArea / 1e6).toFixed(1)}M` : '0'} / {totalArea > 0 ? `${(totalArea / 1e6).toFixed(1)}M` : '0'}
            </Text>
            <Text style={styles.statLabel}>km²</Text>
          </View>
        </View>

        {/* Quests + Avatars + Quizzes row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {claimedCount} / {TOTAL_QUESTS}
            </Text>
            <Text style={styles.statLabel}>{t('home.questsDone')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {ownedAvatarCount} / {TOTAL_AVATARS}
            </Text>
            <Text style={styles.statLabel}>{t('home.avatarsOwned')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValueSmall} numberOfLines={1} adjustsFontSizeToFit>
              {profile?.quiz_count ?? 0}
            </Text>
            <Text style={styles.statLabel}>{t('home.quizzesDone')}</Text>
          </View>
        </View>

        {/* Invite Friends */}
        <TouchableOpacity style={styles.inviteButton} onPress={shareReferralLink}>
          <Text style={styles.inviteText}>{t('home.invite')}</Text>
        </TouchableOpacity>

        {/* Activity Ticker */}
        <ActivityTicker />

        {/* Mini Leaderboard */}
        <View style={styles.leaderboardSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('../../assets/avatars/trophy.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
            <Text style={styles.sectionTitle}>{t('home.topExplorers')}</Text>
          </View>
          {topPlayers.length === 0 ? (
            <Text style={styles.emptyText}>{t('home.loadingRankings')}</Text>
          ) : (
            topPlayers.map((entry, index) => {
              const isMe = entry.id === user?.id;
              const rankImage = index === 0
                ? require('../../assets/avatars/gold_medal.png')
                : index === 1
                ? require('../../assets/avatars/silver_medal.png')
                : require('../../assets/avatars/bronze_medal.png');
              return (
                <View key={entry.id} style={[styles.leaderRow, isMe && styles.leaderRowMe]}>
                  <Image source={rankImage} style={[styles.leaderRank, { width: 22, height: 22 }]} resizeMode="contain" />
                  <AvatarDisplay avatarId={entry.avatar_emoji} avatarFlag={entry.avatar_flag} size={30} />
                  <Text style={[styles.leaderName, isMe && styles.leaderNameMe]} numberOfLines={1}>
                    {entry.username}{isMe ? t('home.you') : ''}
                  </Text>
                  <XpAmount amount={entry.xp.toLocaleString()} iconSize={13} textStyle={[styles.leaderPct, styles.leaderPctTop]} />
                </View>
              );
            })
          )}
        </View>

        <View style={styles.poweredByRow}>
          <Text style={styles.poweredByText}>Powered by BigBrainGlob</Text>
          <Image source={require('../../assets/bbg_logo.png')} style={styles.poweredByLogo} resizeMode="contain" />
        </View>
      </ScrollView>

      {/* User Menu Modal */}
      <Modal visible={showUserMenu} transparent animationType="fade" onRequestClose={() => setShowUserMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowUserMenu(false)}>
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <AvatarDisplay
                avatarId={profile?.avatar_emoji ?? 'png_explorer_male'}
                avatarFlag={profile?.avatar_flag ?? undefined}
                size={44}
              />
              <Text style={styles.menuUsername}>{profile?.username ?? 'Explorer'}</Text>
              <Text style={styles.menuEmail}>{user?.email ?? ''}</Text>
              {(() => {
                const { level, xpIntoLevel, xpForNextLevel } = getLevelInfo(profile?.xp ?? 0);
                const pct = Math.min((xpIntoLevel / xpForNextLevel) * 100, 100);
                return (
                  <View style={styles.menuXpSection}>
                    <Text style={styles.menuLevel}>{t('home.level', { n: level })}</Text>
                    <View style={styles.menuXpBar}>
                      <View style={[styles.menuXpFill, { width: `${pct}%` as any, backgroundColor: profile?.is_conquerer ? '#a78bfa' : '#FFD700' }]} />
                    </View>
                    <XpAmount amount={`${xpIntoLevel} / ${xpForNextLevel}`} iconSize={13} textStyle={styles.menuXpText} />
                  </View>
                );
              })()}
            </View>
            <View style={styles.menuDivider} />
            {!profile?.is_conquerer ? (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setShowUserMenu(false); navigation.getParent()?.navigate('Premium'); }}
                >
                  <View style={{ width: 72, alignItems: 'center' }}>
                    <Image source={require('../../assets/avatars/conqueror.png')} style={{ width: 72, height: 72, marginVertical: -27 }} resizeMode="contain" />
                  </View>
                  <Text style={[styles.menuItemText, { color: '#9B59B6' }]}>{t('home.becomeConqueror')}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowUserMenu(false);
                    if (DEV_MODE) navigation.getParent()?.navigate('Premium');
                    else RevenueCatUI?.presentCustomerCenter?.();
                  }}
                >
                  <View style={{ width: 72, alignItems: 'center' }}>
                    <Image source={require('../../assets/avatars/settings_wheel.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
                  </View>
                  <Text style={[styles.menuItemText, { color: '#9B59B6' }]}>{t('home.manageSubscription')}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowUserMenu(false); setShowLanguageMenu(true); }}>
              <View style={{ width: 72, alignItems: 'center' }}>
                <Image source={require('../../assets/avatars/language_translation.png')} style={{ width: 34, height: 34 }} resizeMode="contain" />
              </View>
              <Text style={styles.menuItemText}>{t('menu.language')}</Text>
              <Text style={styles.menuLanguageValue}>{LOCALE_LABELS[getLocale()]}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowUserMenu(false); signOut(); }}>
              <View style={{ width: 72, alignItems: 'center' }}>
                <Image source={require('../../assets/avatars/eyes.png')} style={{ width: 58, height: 58, marginVertical: -20 }} resizeMode="contain" />
              </View>
              <Text style={styles.menuItemText}>{t('menu.signOut')}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <View style={{ width: 72, alignItems: 'center' }}>
                <Image source={require('../../assets/avatars/skull.png')} style={{ width: 52, height: 52, marginVertical: -14 }} resizeMode="contain" />
              </View>
              <Text style={[styles.menuItemText, { color: '#ff4444' }]}>{t('menu.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Picker Modal */}
      <Modal visible={showLanguageMenu} transparent animationType="fade" onRequestClose={() => setShowLanguageMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowLanguageMenu(false)}>
          <View style={styles.menuContent}>
            <Text style={styles.languageTitle}>{t('menu.language')}</Text>
            <View style={styles.menuDivider} />
            {SUPPORTED.map((loc) => {
              const active = getLocale() === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  style={styles.languageRow}
                  onPress={() => { setShowLanguageMenu(false); if (!active) setLocale(loc); }}
                >
                  <Text style={[styles.languageRowText, active && { color: '#4da6ff', fontWeight: '700' }]}>
                    {LOCALE_LABELS[loc]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={20} color="#4da6ff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gold Shop Modal */}
      <Modal visible={showGoldShop} animationType="slide" onRequestClose={() => setShowGoldShop(false)}>
        <View style={styles.goldShopModal}>
          <TouchableOpacity style={styles.closeGoldShop} onPress={() => setShowGoldShop(false)}>
            <Text style={styles.closeGoldShopText}>{t('home.closeGoldShop')}</Text>
          </TouchableOpacity>
          <GoldShopScreen />
        </View>
      </Modal>

      {/* Owned Countries List Modal */}
      <Modal visible={showOwnedList} transparent animationType="slide" onRequestClose={() => setShowOwnedList(false)}>
        <View style={styles.ownedListOverlay}>
          <View style={styles.ownedListContent}>
            <View style={styles.ownedListHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source={require('../../assets/avatars/globe.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                <Text style={styles.ownedListTitle}>{t('home.ownedCountries', { n: ownedCountries.length })}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOwnedList(false)}>
                <Text style={styles.ownedListClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {ownedCountries.length === 0 ? (
              <Text style={styles.emptyText}>{t('home.noCountries')}</Text>
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
  content: { padding: 12, gap: 14, paddingBottom: 30 },

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
  menuXpSection: { alignItems: 'center', gap: 4, width: '100%', marginTop: 4 },
  menuLevel: { color: '#FFD700', fontSize: 13, fontWeight: '600' },
  menuXpBar: { height: 4, backgroundColor: '#2a2a4e', borderRadius: 2, overflow: 'hidden', width: '80%' },
  menuXpFill: { height: '100%', borderRadius: 2 },
  menuXpText: { color: '#888', fontSize: 11 },
  menuDivider: { height: 1, backgroundColor: '#2a2a4e' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  menuItemIcon: { fontSize: 18 },
  menuItemText: { color: '#ff6b6b', fontSize: 15, fontWeight: '500' },
  menuLanguageValue: { color: '#888', fontSize: 13, marginLeft: 'auto' },
  languageTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  languageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4 },
  languageRowText: { color: '#ddd', fontSize: 16 },

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
  inviteButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  inviteText: { color: '#FFD700', fontSize: 14, fontWeight: '600' as const },
  poweredByRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  poweredByText: {
    color: '#6a6a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  poweredByLogo: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
});
