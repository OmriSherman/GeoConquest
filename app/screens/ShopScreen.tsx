import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Country, getCountryPrice } from '../types';
import { fetchCountries } from '../lib/countryData';
import { playDing, playPurchase, playReject } from '../lib/audio';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AVATAR_CHARACTERS, FLAG_OPTIONS, CUSTOM_AVATARS, CUSTOM_FLAGS } from '../lib/avatarData';
import { CUSTOM_FLAG_COMPONENTS, isCustomFlag } from '../lib/customFlags';

import GoldDisplay from '../components/GoldDisplay';
import AvatarDisplay from '../components/AvatarDisplay';
import GoldShopScreen from './GoldShopScreen';

type ShopTab = 'countries' | 'avatars' | 'flags' | 'upgrades';
type SortMode = 'name' | 'price-asc' | 'price-desc';

// All flags: SVG faction flags + emoji fun/symbol + all country emoji flags
const SHOP_FLAGS: Array<{ id: string; label: string; price: number; isPremium: boolean; isSvg: boolean }> = [
  ...CUSTOM_FLAGS.map(f => ({ id: f.key, label: f.label, price: f.price, isPremium: f.isPremium, isSvg: true })),
  ...FLAG_OPTIONS.map(f => ({ 
    id: f.emoji, 
    label: f.label, 
    price: f.category === 'country' ? 1000 : f.price, 
    isPremium: f.category === 'country' ? true : f.isPremium, 
    isSvg: false 
  })),
];

export default function ShopScreen() {
  const { isOwned, canAfford, purchaseCountry, goldBalance } = useGame();
  const { profile, setUsername, purchaseAvatarItem, purchaseQuizUpgrade, disabledUpgrades, toggleUpgrade } = useAuth();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ShopTab>('countries');
  const [subTab, setSubTab] = useState<'buy' | 'owned'>('buy');

  // ── Countries tab state ────────────────────────────────────────────────────
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [showGoldShop, setShowGoldShop] = useState(false);

  // ── Avatar/Flag tab state ──────────────────────────────────────────────────
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [loadingUnlocks, setLoadingUnlocks] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchCountries()
      .then((c) => {
        setCountries(c);
        setFilteredCountries(c);
      })
      .catch((e) => setCountryError(e.message))
      .finally(() => setLoadingCountries(false));

    loadUnlocks();
  }, []);

  useEffect(() => {
    let result = countries.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
    switch (sortMode) {
      case 'price-asc':
        result = [...result].sort((a, b) => getCountryPrice(a.area) - getCountryPrice(b.area));
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => getCountryPrice(b.area) - getCountryPrice(a.area));
        break;
      default:
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    setFilteredCountries(result);
  }, [search, sortMode, countries]);

  async function loadUnlocks() {
    if (!profile) return;
    setLoadingUnlocks(true);
    try {
      const { data } = await supabase
        .from('user_unlocked_items')
        .select('item_id')
        .eq('user_id', profile.id);
      const set = new Set<string>();
      if (data) data.forEach((r: any) => set.add(r.item_id));
      setUnlockedItems(set);
    } catch (err) {
      console.warn('Failed to load unlocks:', err);
    } finally {
      setLoadingUnlocks(false);
    }
  }

  // ── Country purchase ───────────────────────────────────────────────────────

  async function handleBuyCountry(country: Country) {
    const price = getCountryPrice(country.area);
    if (isOwned(country.cca2)) return;
    if (!canAfford(price)) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      await purchaseCountry(country);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Purchase failed');
    }
  }

  // ── Avatar/Flag item press ─────────────────────────────────────────────────

  async function handleItemPress(
    itemType: 'avatar' | 'flag',
    itemId: string,
    price: number,
    isPremium: boolean
  ) {
    if (!profile) return;
    const isUnlocked = !isPremium || unlockedItems.has(itemId);
    const isEquipped =
      itemType === 'avatar'
        ? profile.avatar_emoji === itemId
        : profile.avatar_flag === itemId;

    if (isEquipped) return;

    if (isUnlocked) {
      // Equip flow - no alerts, just equip
      setActionLoading(true);
      try {
        if (itemType === 'avatar') {
          await setUsername(profile.username, itemId, profile.avatar_flag, profile.country);
        } else {
          await setUsername(profile.username, profile.avatar_emoji, itemId, profile.country);
        }
        playDing();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setActionLoading(false);
      }
    } else {
      // Buy flow - no auto-equip, no alerts unless error
      if (profile.gold_balance < price) {
        playReject();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      setActionLoading(true);
      try {
        await purchaseAvatarItem(itemType, itemId, price);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playPurchase();
        setUnlockedItems(prev => new Set(prev).add(itemId));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } catch (err: any) {
        Alert.alert('Purchase Failed', err.message);
      } finally {
        setActionLoading(false);
      }
    }
  }

  async function handleBuyUpgrade(turns: number, cost: number) {
    if (!profile) return;
    if ((profile.max_quiz_turns || 10) >= turns) return;
    
    if (goldBalance < cost) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setActionLoading(true);
    try {
      await purchaseQuizUpgrade(turns, cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyNightmare() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_nightmare')) return;
    
    const cost = 250000;
    if (goldBalance < cost) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setActionLoading(true);
    try {
      // We store the unlock in user_unlocked_items using item_type='flag' as a workaround
      await purchaseAvatarItem('flag', 'upgrade_nightmare', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setUnlockedItems(prev => new Set(prev).add('upgrade_nightmare'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyMillionaireSkip() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_millionaire_skip')) return;
    
    const cost = 100000;
    if (goldBalance < cost) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_millionaire_skip', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setUnlockedItems(prev => new Set(prev).add('upgrade_millionaire_skip'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🛒 Shop</Text>
        </View>
        <TouchableOpacity onPress={() => setShowGoldShop(true)}>
          <GoldDisplay />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['countries', 'avatars', 'flags', 'upgrades'] as ShopTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'countries' ? '🌍 Countries' : tab === 'avatars' ? '🧑 Avatars' : tab === 'flags' ? '🏳️ Flags' : '🚀 Upgrades'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sub-Tab Bar (Buy / Owned) */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'buy' && styles.subTabActive]}
          onPress={() => setSubTab('buy')}
        >
          <Text style={[styles.subTabText, subTab === 'buy' && styles.subTabTextActive]}>
            🛍️ Buy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'owned' && styles.subTabActive]}
          onPress={() => setSubTab('owned')}
        >
          <Text style={[styles.subTabText, subTab === 'owned' && styles.subTabTextActive]}>
            🎒 Owned
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Countries Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'countries' && (
        <>
          {loadingCountries ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Loading countries…</Text>
            </View>
          ) : countryError ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{countryError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search countries…"
                  placeholderTextColor="#555"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={styles.sortRow}>
                {(['name', 'price-asc', 'price-desc'] as SortMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
                    onPress={() => setSortMode(mode)}
                  >
                    <Text style={[styles.sortText, sortMode === mode && styles.sortTextActive]}>
                      {mode === 'name' ? 'A–Z' : mode === 'price-asc' ? '$ Low' : '$ High'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.goldBanner} onPress={() => setShowGoldShop(true)}>
                <Text style={styles.goldBannerText}>💎 Need more Gold?</Text>
                <Text style={styles.goldBannerCta}>Buy Gold →</Text>
              </TouchableOpacity>
              <FlatList
                data={filteredCountries.filter(item => subTab === 'owned' ? isOwned(item.cca2) : !isOwned(item.cca2))}
                keyExtractor={(item) => item.cca2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const price = getCountryPrice(item.area);
                  const owned = isOwned(item.cca2);
                  const affordable = canAfford(price);
                  return (
                    <TouchableOpacity
                      style={[styles.countryCard, owned && styles.countryCardOwned]}
                      onPress={() => handleBuyCountry(item)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: item.flagUrl }} style={styles.flag} resizeMode="contain" />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cardRegion}>{item.region}</Text>
                        <Text style={styles.cardSize}>{item.area.toLocaleString()} km²</Text>
                      </View>
                      <View style={styles.cardRight}>
                        {owned ? (
                          <View style={styles.ownedBadge}>
                            <Text style={styles.ownedBadgeText}>Owned ✓</Text>
                          </View>
                        ) : (
                          <View style={[styles.priceBadge, !affordable && styles.priceBadgeDim]}>
                            <Text style={[styles.priceText, !affordable && styles.priceTextDim]}>
                              🪙 {price}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
        </>
      )}

      {/* ── Avatars Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'avatars' && (
        <>
          {loadingUnlocks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          ) : (
            <FlatList
              data={[...AVATAR_CHARACTERS, ...CUSTOM_AVATARS.map(a => ({
                emoji: a.key,
                label: `${a.label} · ${a.culture}`,
                price: a.price,
                isPremium: a.isPremium,
              }))].filter(item => {
                const id = item.emoji;
                const isUnlocked = !(item as any).isPremium || unlockedItems.has(id);
                return subTab === 'owned' ? isUnlocked : !isUnlocked;
              }) as any[]}
              keyExtractor={(item) => item.emoji}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              renderItem={({ item }) => {
                const id = item.emoji || item.key;
                const isUnlocked = !item.isPremium || unlockedItems.has(id);
                const isEquipped = profile?.avatar_emoji === id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      isEquipped && styles.itemCardEquipped,
                    ]}
                    onPress={() => handleItemPress('avatar', id, item.price, item.isPremium)}
                    disabled={actionLoading}
                  >
                    <AvatarDisplay avatarId={id} size={44} />
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedBadgeText}>Equipped</Text>
                      </View>
                    ) : isUnlocked ? (
                      <View style={styles.ownedItemBadge}>
                        <Text style={styles.ownedItemText}>Owned</Text>
                      </View>
                    ) : (
                      <View style={styles.itemPriceBadge}>
                        <Text style={styles.itemPriceText}>🪙 {item.price}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}

      {/* ── Flags Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <>
          {loadingUnlocks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          ) : (
            <FlatList
              data={SHOP_FLAGS.filter(item => {
                const isUnlocked = !item.isPremium || unlockedItems.has(item.id) || profile?.avatar_flag === item.id;
                return subTab === 'owned' ? isUnlocked : !isUnlocked;
              })}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              renderItem={({ item }) => {
                const isUnlocked = !item.isPremium || unlockedItems.has(item.id) || profile?.avatar_flag === item.id;
                const isEquipped = profile?.avatar_flag === item.id;
                const isCustom = isCustomFlag(item.id);
                const FlagComponent = isCustom ? CUSTOM_FLAG_COMPONENTS[item.id] : null;
                
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      isEquipped && styles.itemCardEquipped,
                    ]}
                    onPress={() => handleItemPress('flag', item.id, item.price, item.isPremium)}
                    disabled={actionLoading}
                  >
                    <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                      {FlagComponent ? (
                        <FlagComponent size={44} />
                      ) : (
                        <Text style={{ fontSize: 38, textAlign: 'center', lineHeight: 44 }}>{item.id}</Text>
                      )}
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedBadgeText}>Equipped</Text>
                      </View>
                    ) : isUnlocked ? (
                      <View style={styles.ownedItemBadge}>
                        <Text style={styles.ownedItemText}>Owned</Text>
                      </View>
                    ) : (
                      <View style={styles.itemPriceBadge}>
                        <Text style={styles.itemPriceText}>🪙 {item.price}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}

      {/* ── Upgrades Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'upgrades' && (
        <ScrollView contentContainerStyle={styles.upgradesContainer}>
          <Text style={styles.upgradesSubtitle}>Extend your map expeditions to earn massive streak multipliers.</Text>
          
          {(subTab === 'owned' ? (profile?.max_quiz_turns || 10) >= 20 : (profile?.max_quiz_turns || 10) < 20) && (
            <TouchableOpacity 
              style={[styles.upgradeCard, (profile?.max_quiz_turns || 10) >= 20 && styles.upgradeCardOwned]}
              onPress={() => {
                if ((profile?.max_quiz_turns || 10) >= 20) return; // do not trigger buy if owned
                handleBuyUpgrade(20, 2000);
              }}
              disabled={actionLoading || (profile?.max_quiz_turns || 10) >= 20}
              activeOpacity={0.8}
            >
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Level 2 Expedition</Text>
                <Text style={styles.upgradeDesc}>Play up to 20 turns per quiz</Text>
              </View>
              {(profile?.max_quiz_turns || 10) >= 20 ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Text style={styles.ownedItemText}>Owned</Text>
                  <Switch 
                    value={!disabledUpgrades.has('upgrade_level_2')} 
                    onValueChange={() => toggleUpgrade('upgrade_level_2')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_level_2') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}><Text style={styles.goldText}>🪙 2000</Text></View>
              )}
            </TouchableOpacity>
          )}

          {(subTab === 'owned' ? (profile?.max_quiz_turns || 10) >= 30 : (profile?.max_quiz_turns || 10) < 30) && (
            <TouchableOpacity 
              style={[styles.upgradeCard, (profile?.max_quiz_turns || 10) >= 30 && styles.upgradeCardOwned]}
              onPress={() => {
                if ((profile?.max_quiz_turns || 10) >= 30) return;
                handleBuyUpgrade(30, 5000);
              }}
              disabled={actionLoading || (profile?.max_quiz_turns || 10) >= 30}
              activeOpacity={0.8}
            >
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Level 3 Expedition</Text>
                <Text style={styles.upgradeDesc}>Play up to 30 turns per quiz</Text>
              </View>
              {(profile?.max_quiz_turns || 10) >= 30 ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Text style={styles.ownedItemText}>Owned</Text>
                  <Switch 
                    value={!disabledUpgrades.has('upgrade_level_3')} 
                    onValueChange={() => toggleUpgrade('upgrade_level_3')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_level_3') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}><Text style={styles.goldText}>🪙 5000</Text></View>
              )}
            </TouchableOpacity>
          )}

          {(subTab === 'owned' ? unlockedItems.has('upgrade_nightmare') : !unlockedItems.has('upgrade_nightmare')) && (
            <TouchableOpacity 
              style={[styles.upgradeCard, unlockedItems.has('upgrade_nightmare') && styles.upgradeCardOwned]}
              onPress={() => {
                if (unlockedItems.has('upgrade_nightmare')) return;
                handleBuyNightmare();
              }}
              disabled={actionLoading || unlockedItems.has('upgrade_nightmare')}
              activeOpacity={0.8}
            >
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>???</Text>
                <Text style={styles.upgradeDesc}>???</Text>
              </View>
              {unlockedItems.has('upgrade_nightmare') ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Text style={styles.ownedItemText}>Owned</Text>
                  <Switch 
                    value={!disabledUpgrades.has('upgrade_nightmare')} 
                    onValueChange={() => toggleUpgrade('upgrade_nightmare')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_nightmare') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}><Text style={styles.goldText}>🪙 250,000</Text></View>
              )}
            </TouchableOpacity>
          )}

          {(subTab === 'owned' ? unlockedItems.has('upgrade_millionaire_skip') : !unlockedItems.has('upgrade_millionaire_skip')) && (
            <TouchableOpacity 
              style={[styles.upgradeCard, unlockedItems.has('upgrade_millionaire_skip') && styles.upgradeCardOwned]}
              onPress={() => {
                if (unlockedItems.has('upgrade_millionaire_skip')) return;
                // Add a handleBuyMillionaireSkip function or just call purchaseQuizUpgrade equivalent
                handleBuyMillionaireSkip();
              }}
              disabled={actionLoading || unlockedItems.has('upgrade_millionaire_skip')}
              activeOpacity={0.8}
            >
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Millionaire Skip</Text>
                <Text style={styles.upgradeDesc}>Skip one question in the Millionaire Quiz</Text>
              </View>
              {unlockedItems.has('upgrade_millionaire_skip') ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Text style={styles.ownedItemText}>Owned</Text>
                  <Switch 
                    value={!disabledUpgrades.has('upgrade_millionaire_skip')} 
                    onValueChange={() => toggleUpgrade('upgrade_millionaire_skip')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_millionaire_skip') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}><Text style={styles.goldText}>🪙 100,000</Text></View>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}

      {/* Gold Shop Modal */}
      <Modal
        visible={showGoldShop}
        animationType="slide"
        onRequestClose={() => setShowGoldShop(false)}
      >
        <View style={styles.goldShopModal}>
          <TouchableOpacity style={styles.closeGoldShop} onPress={() => setShowGoldShop(false)}>
            <Text style={styles.closeGoldShopText}>✕ Close</Text>
          </TouchableOpacity>
          <GoldShopScreen />
        </View>
      </Modal>

      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon 
            count={100} 
            origin={{ x: -10, y: 0 }} 
            colors={['#FFD700', '#FFA500', '#FFF8DC']} 
            fallSpeed={2500} 
            fadeOut 
            autoStart
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#0a0a1a', fontWeight: 'bold' },
  // Sub-Tab bar
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#0d0d20',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a1a3e',
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subTabActive: { backgroundColor: '#2a2a4e' },
  subTabText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  subTabTextActive: { color: '#FFD700' },
  // Countries
  searchRow: { paddingHorizontal: 20, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  sortButtonActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  sortText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  sortTextActive: { color: '#0a0a1a' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 12,
  },
  countryCardOwned: { borderColor: '#FFD700', backgroundColor: '#1a1a20' },
  flag: { width: 56, height: 38, borderRadius: 6 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardRegion: { color: '#888', fontSize: 12 },
  cardSize: { color: '#666', fontSize: 11 },
  cardRight: { alignItems: 'flex-end' },
  ownedBadge: {
    backgroundColor: '#1a3a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ownedBadgeText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  priceBadge: {
    backgroundColor: '#2a2a1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceBadgeDim: { backgroundColor: '#1a1a1a' },
  priceText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  priceTextDim: { color: '#555' },
  goldBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goldBannerText: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
  goldBannerCta: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  // Avatar / Flag items
  itemListContent: { paddingHorizontal: 12, paddingBottom: 20 },
  itemRow: { justifyContent: 'flex-start' },
  itemCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    maxWidth: '31%',
    minWidth: '30%',
  },
  itemCardEquipped: { borderColor: '#FFD700', backgroundColor: '#1a1a20' },
  itemEmoji: { fontSize: 44, marginBottom: 6, lineHeight: 54 },
  itemLabel: { color: '#ccc', fontSize: 11, marginBottom: 6, textAlign: 'center' },
  equippedBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  equippedBadgeText: { color: '#0a0a1a', fontSize: 10, fontWeight: 'bold' },
  ownedItemBadge: {
    backgroundColor: '#3a3a5e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ownedItemText: { color: '#aaa', fontSize: 10, fontWeight: '600' },
  itemPriceBadge: {
    backgroundColor: '#1a1a30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  itemPriceText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,26,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldShopModal: { flex: 1, backgroundColor: '#0a0a1a' },
  closeGoldShop: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeGoldShopText: { color: '#aaa', fontSize: 14 },
  // Upgrades
  upgradesContainer: {
    padding: 20,
    gap: 16,
  },
  upgradesSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeCardOwned: {
    borderColor: '#FFD700',
    backgroundColor: '#302a10',
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  upgradeDesc: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  goldBadge: {
    backgroundColor: '#302a10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goldText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  ownedItemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
