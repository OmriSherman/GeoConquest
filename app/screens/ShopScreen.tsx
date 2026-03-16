import React, { useEffect, useState, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Country, getCountryPrice } from '../types';
import { fetchCountries } from '../lib/countryData';
import { playDing, playPurchase, playReject } from '../lib/audio';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase } from '../lib/supabase';
import { AVATAR_CHARACTERS, FLAG_OPTIONS, CUSTOM_AVATARS } from '../lib/avatarData';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { useToast } from '../context/ToastContext';
import { useAlert } from '../context/AlertContext';

import GoldDisplay from '../components/GoldDisplay';
import AvatarDisplay from '../components/AvatarDisplay';
import GoldShopScreen from './GoldShopScreen';

type ShopTab = 'countries' | 'avatars' | 'flags' | 'upgrades';
type SortMode = 'name' | 'price-asc' | 'price-desc';

// Emoji flags only — no SVG/tier flags, no quest-only items
const SHOP_FLAGS: Array<{ id: string; label: string; price: number; isPremium: boolean; isSvg: boolean }> = [
  ...FLAG_OPTIONS
    .filter(f => !f.questOnly)
    .map(f => ({
      id: f.emoji,
      label: f.label,
      price: f.category === 'country' ? 1000 : f.price,
      isPremium: f.category === 'country' ? true : f.isPremium,
      isSvg: false,
    })),
];

export default function ShopScreen() {
  const { isOwned, canAfford, purchaseCountry, goldBalance } = useGame();
  const { profile, setUsername, purchaseAvatarItem, purchaseQuizUpgrade, disabledUpgrades, toggleUpgrade } = useAuth();
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const navigation = useNavigation<any>();
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ShopTab>('countries');

  // ── Countries tab state ────────────────────────────────────────────────────
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [purchasingCca2, setPurchasingCca2] = useState<string | null>(null);

  // ── Avatar/Flag tab state ──────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<'buy' | 'owned'>('buy');
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
    // Float owned countries to the top, preserving current sort within each group
    const ownedGroup = result.filter(c => isOwned(c.cca2));
    const unownedGroup = result.filter(c => !isOwned(c.cca2));
    setFilteredCountries([...ownedGroup, ...unownedGroup]);
  }, [search, sortMode, countries, isOwned]);

  // ── Tier chain builder ─────────────────────────────────────────────────────

  const { avatarTierChains, standaloneCustomAvatars } = useMemo(() => {
    const items = CUSTOM_AVATARS;
    const inChain = new Set<string>();
    const chains: (typeof CUSTOM_AVATARS[0])[][] = [];
    for (const item of items) {
      if (inChain.has(item.key)) continue;
      if (items.some(i => i.requiresId === item.key)) {
        const chain = [item];
        inChain.add(item.key);
        let cur = item;
        while (true) {
          const next = items.find(i => i.requiresId === cur.key);
          if (!next) break;
          chain.push(next);
          inChain.add(next.key);
          cur = next;
        }
        chains.push(chain);
      }
    }
    return { avatarTierChains: chains, standaloneCustomAvatars: items.filter(i => !inChain.has(i.key)) };
  }, []);


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

      // Retroactive fix: if an achievement was claimed but its reward item was
      // never inserted (silent failure), insert it now.
      const { data: achData } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.id);
      if (achData) {
        const achIds = new Set(achData.map((a: any) => a.achievement_id));
        for (const ach of ACHIEVEMENTS_DATA) {
          if (ach.rewardItem && achIds.has(ach.id) && !set.has(ach.rewardItem.itemId)) {
            await supabase.from('user_unlocked_items').insert({
              user_id: profile.id,
              item_id: ach.rewardItem.itemId,
              item_type: ach.rewardItem.type,
            });
            set.add(ach.rewardItem.itemId);
          }
        }
      }

      setUnlockedItems(set);
    } catch (err) {
      console.warn('Failed to load unlocks:', err);
    } finally {
      setLoadingUnlocks(false);
    }
  }

  // ── Not enough gold popup ───────────────────────────────────────────────────

  function showNotEnoughGold(price: number, previewIcon?: React.ReactNode) {
    playReject();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showAlert({
      title: 'Not Enough Gold',
      icon: previewIcon ?? <Text style={{ fontSize: 40 }}>🪙</Text>,
      message: `You need ${price.toLocaleString()} gold for this.\nTop up and conquer more!`,
      buttons: [
        { text: '💰 Get Gold', onPress: () => setShowGoldShop(true), style: 'default' },
        { text: 'Maybe Later', style: 'cancel' },
      ],
    });
  }

  // ── Country purchase ───────────────────────────────────────────────────────

  async function handleBuyCountry(country: Country) {
    const price = getCountryPrice(country.area);
    if (isOwned(country.cca2)) return;
    if (purchasingCca2) return;
    if (!canAfford(price)) {
      showNotEnoughGold(price);
      return;
    }

    setPurchasingCca2(country.cca2);
    try {
      await purchaseCountry(country);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      if (price >= 5000) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message ?? 'Purchase failed' });
    } finally {
      setPurchasingCca2(null);
    }
  }

  // ── Avatar/Flag item press ─────────────────────────────────────────────────

  async function doPurchaseItem(itemType: 'avatar' | 'flag', itemId: string, price: number) {
    setActionLoading(true);
    try {
      await purchaseAvatarItem(itemType, itemId, price);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setUnlockedItems(prev => new Set(prev).add(itemId));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleItemPress(
    itemType: 'avatar' | 'flag',
    itemId: string,
    price: number,
    isPremium: boolean,
    label?: string
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
        showAlert({ title: 'Error', message: err.message });
      } finally {
        setActionLoading(false);
      }
    } else {
      // Buy flow
      if (profile.gold_balance < price) {
        const itemIcon = itemType === 'avatar'
          ? <AvatarDisplay avatarId={itemId} size={80} />
          : <Text style={{ fontSize: 64 }}>{itemId}</Text>;
        showNotEnoughGold(price, itemIcon);
        return;
      }

      // Avatar purchases show a confirmation popup with a preview
      if (itemType === 'avatar' && label) {
        showAlert({
          icon: <AvatarDisplay avatarId={itemId} size={110} />,
          title: `Buy ${label}?`,
          message: `🪙 ${price.toLocaleString()} gold`,
          buttons: [
            { text: 'Confirm Purchase', style: 'default', onPress: () => doPurchaseItem(itemType, itemId, price) },
            { text: 'Cancel', style: 'cancel' },
          ],
        });
        return;
      }

      await doPurchaseItem(itemType, itemId, price);
    }
  }

  const CAPITALS_QUIZ_COST = 2000;
  const BORDERS_QUIZ_COST = 5000;

  async function handleBuyBordersQuiz() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_borders')) return;

    // Requires owning the Chariot avatar (from Ground Invasion quest)
    if (!unlockedItems.has('png_chariot')) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert({ title: 'Locked', message: 'You need the "Chariot" avatar to unlock the Borders Quiz.\n\nEarn it by completing the Ground Invasion quest!' });
      return;
    }

    if (!canAfford(BORDERS_QUIZ_COST)) {
      showNotEnoughGold(BORDERS_QUIZ_COST);
      return;
    }

    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_borders', BORDERS_QUIZ_COST);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setUnlockedItems(prev => new Set(prev).add('upgrade_borders'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      showToast({
        title: 'Borders Quiz Unlocked!',
        message: 'You can now play the Borders Quiz.',
        icon: <Text style={{ fontSize: 20 }}>🧩</Text>
      });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyCapitalsQuiz() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_capitals')) return;

    // Requires owning the 🔍 Speed Detective flag
    if (!unlockedItems.has('🔍')) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert({ title: 'Locked', message: 'You need the "Speed Detective" flag (🔍) to unlock Capitals Quiz.\n\nEarn it by completing the Flag Quiz Speed Demon quest!' });
      return;
    }

    if (!canAfford(CAPITALS_QUIZ_COST)) {
      showNotEnoughGold(CAPITALS_QUIZ_COST);
      return;
    }

    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_capitals', CAPITALS_QUIZ_COST);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchase();
      setUnlockedItems(prev => new Set(prev).add('upgrade_capitals'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      showToast({
        title: 'Capitals Quiz Unlocked!',
        message: 'You can now play the Capitals Quiz.',
        icon: <Text style={{ fontSize: 20 }}>🏛️</Text>
      });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyUpgrade(turns: number, cost: number) {
    if (!profile) return;
    if ((profile.max_quiz_turns || 10) >= turns) return;

    if (goldBalance < cost) {
      showNotEnoughGold(cost);
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
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyNightmare() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_nightmare')) return;
    
    const cost = 250000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
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
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyMillionaireSkip() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_millionaire_skip')) return;
    
    const cost = 100000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
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
      showAlert({ title: 'Purchase Failed', message: err.message });
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
            onPress={() => { setActiveTab(tab); setSubTab('buy'); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'countries' ? '🌍 Countries' : tab === 'avatars' ? '🧑 Avatars' : tab === 'flags' ? '🏳️ Flags' : '🚀 Upgrades'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conqueror's Pass Banner */}
      <TouchableOpacity
        style={styles.commanderBanner}
        onPress={() => navigation.getParent()?.navigate('Premium')}
        activeOpacity={0.85}
      >
        <Text style={styles.commanderBannerText}>👑 Conqueror's Pass — Unlock Everything</Text>
      </TouchableOpacity>


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
              <View style={styles.searchFilterRow}>
                <TextInput
                  style={styles.searchInputInline}
                  placeholder="Search countries…"
                  placeholderTextColor="#555"
                  value={search}
                  onChangeText={setSearch}
                />
                {(['name', 'price-asc', 'price-desc'] as SortMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.sortButtonCompact, sortMode === mode && styles.sortButtonActive]}
                    onPress={() => setSortMode(mode)}
                  >
                    <Text style={[styles.sortText, sortMode === mode && styles.sortTextActive]}>
                      {mode === 'name' ? 'A–Z' : mode === 'price-asc' ? '↑$' : '↓$'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.goldBanner} onPress={() => setShowGoldShop(true)}>
                <Text style={styles.goldBannerText}>💎 Need more Gold?</Text>
                <Text style={styles.goldBannerCta}>Buy Gold →</Text>
              </TouchableOpacity>
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.cca2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const price = getCountryPrice(item.area);
                  const owned = isOwned(item.cca2);
                  const affordable = canAfford(price);
                  const isPurchasing = purchasingCca2 === item.cca2;
                  return (
                    <TouchableOpacity
                      style={[styles.countryCard, owned && styles.countryCardOwned]}
                      onPress={() => handleBuyCountry(item)}
                      activeOpacity={0.8}
                      disabled={!!purchasingCca2}
                    >
                      <Image source={{ uri: item.flagUrl }} style={styles.flag} resizeMode="contain" />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cardRegion}>{item.region}</Text>
                        <Text style={styles.cardSize}>{item.area.toLocaleString()} km²</Text>
                      </View>
                      <View style={styles.cardRight}>
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color="#FFD700" />
                        ) : owned ? (
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
          <View style={styles.subTabBar}>
            {(['buy', 'owned'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.subTab, subTab === t && styles.subTabActive]} onPress={() => setSubTab(t)}>
                <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
                  {t === 'buy' ? '🛍️ Buy' : '🎒 Owned'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loadingUnlocks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          ) : (
            <FlatList
              data={([...AVATAR_CHARACTERS, ...standaloneCustomAvatars.map(a => ({
                emoji: a.key,
                label: a.culture ? `${a.label} · ${a.culture}` : a.label,
                price: a.price,
                isPremium: a.isPremium,
              }))] as any[]).filter((a: any) => {
                const isOwned = !a.isPremium || unlockedItems.has(a.emoji);
                return subTab === 'owned' ? isOwned : !isOwned;
              })}
              ListFooterComponent={
                <View>
                  {avatarTierChains
                    .map((chain, idx) => {
                      const sectionName = chain[0].collection?.replace(/ Tier \d+$/, '') || chain[0].culture;
                      return (
                        <View key={idx} style={styles.tierSection}>
                          <Text style={styles.tierSectionTitle}>{sectionName}</Text>
                          <View style={styles.tierRow}>
                            {chain.map((a, i) => {
                              const id = a.key;
                              const isUnlocked = !a.isPremium || unlockedItems.has(id);
                              const isEquipped = profile?.avatar_emoji === id;
                              let meetsReq = true;
                              let reqName = '';
                              if (a.requiresId && !isUnlocked) {
                                meetsReq = unlockedItems.has(a.requiresId);
                                if (!meetsReq) {
                                  const req = CUSTOM_AVATARS.find(x => x.key === a.requiresId) || AVATAR_CHARACTERS.find(x => x.emoji === a.requiresId);
                                  reqName = req?.label || 'Previous Tier';
                                }
                              }
                              const tierLocked = !meetsReq;
                              return (
                                <React.Fragment key={id}>
                                  <TouchableOpacity
                                    style={[
                                      styles.tierItemCard,
                                      isEquipped && styles.itemCardEquipped,
                                      (!isUnlocked && !tierLocked) && styles.itemCardLocked,
                                      tierLocked && styles.itemCardTierLocked,
                                    ]}
                                    onPress={() => {
                                      if (tierLocked) { showAlert({ title: 'Locked', message: `You must own ${reqName} first.` }); return; }
                                      handleItemPress('avatar', id, a.price, a.isPremium, a.label);
                                    }}
                                    disabled={actionLoading}
                                  >
                                    <View style={{ opacity: tierLocked ? 0.3 : 1, alignItems: 'center' }}>
                                      <AvatarDisplay avatarId={id} size={44} />
                                    </View>
                                    <Text style={styles.itemLabel} numberOfLines={1}>{a.label}</Text>
                                    {isEquipped ? (
                                      <View style={styles.equippedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.equippedBadgeText}>Equipped</Text></View>
                                    ) : isUnlocked ? (
                                      <View style={styles.ownedItemBadge}><Text style={styles.ownedItemText}>Owned</Text></View>
                                    ) : tierLocked ? (
                                      <View style={styles.statusBadgeTierLocked}>
                                        <Text style={styles.statusTextTierLocked}>🪙 {a.price}</Text>
                                      </View>
                                    ) : (
                                      <View style={styles.itemPriceBadge}><Text style={styles.itemPriceText}>🪙 {a.price}</Text></View>
                                    )}
                                  </TouchableOpacity>
                                  {i < chain.length - 1 && (
                                    <Ionicons name="arrow-forward" size={18} color="#FFD700" style={{ alignSelf: 'center', marginHorizontal: 2 }} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                </View>
              }
              keyExtractor={(item) => item.emoji}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              renderItem={({ item }) => {
                const id = item.emoji;
                const isUnlocked = !item.isPremium || unlockedItems.has(id);
                const isEquipped = profile?.avatar_emoji === id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      isEquipped && styles.itemCardEquipped,
                      !isUnlocked && styles.itemCardLocked,
                    ]}
                    onPress={() => handleItemPress('avatar', id, item.price, item.isPremium, item.label)}
                    disabled={actionLoading}
                  >
                    <AvatarDisplay avatarId={id} size={44} />
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.equippedBadgeText}>Equipped</Text></View>
                    ) : isUnlocked ? (
                      <View style={styles.ownedItemBadge}><Text style={styles.ownedItemText}>Owned</Text></View>
                    ) : (
                      <View style={styles.itemPriceBadge}><Text style={styles.itemPriceText}>🪙 {item.price}</Text></View>
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
          <View style={styles.subTabBar}>
            {(['buy', 'owned'] as const).map(t => (
              <TouchableOpacity key={t} style={[styles.subTab, subTab === t && styles.subTabActive]} onPress={() => setSubTab(t)}>
                <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
                  {t === 'buy' ? '🛍️ Buy' : '🎒 Owned'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loadingUnlocks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          ) : (
            <FlatList
              data={SHOP_FLAGS.filter(item => {
                const isOwned = !item.isPremium || unlockedItems.has(item.id) || profile?.avatar_flag === item.id;
                return subTab === 'owned' ? isOwned : !isOwned;
              })}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              renderItem={({ item }) => {
                const isUnlocked = !item.isPremium || unlockedItems.has(item.id) || profile?.avatar_flag === item.id;
                const isEquipped = profile?.avatar_flag === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      isEquipped && styles.itemCardEquipped,
                      !isUnlocked && styles.itemCardLocked,
                    ]}
                    onPress={() => handleItemPress('flag', item.id, item.price, item.isPremium)}
                    disabled={actionLoading}
                  >
                    <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 38, textAlign: 'center', lineHeight: 44 }}>{item.id}</Text>
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.equippedBadgeText}>Equipped</Text></View>
                    ) : isUnlocked ? (
                      <View style={styles.ownedItemBadge}><Text style={styles.ownedItemText}>Owned</Text></View>
                    ) : (
                      <View style={styles.itemPriceBadge}><Text style={styles.itemPriceText}>🪙 {item.price}</Text></View>
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

          {/* Capitals Quiz Unlock (requires 🔍 flag) */}
          {(() => {
            const hasKey = unlockedItems.has('🔍');
            const isUnlocked = unlockedItems.has('upgrade_capitals');
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isUnlocked && styles.upgradeCardOwned, !hasKey && !isUnlocked && styles.upgradeCardLocked]}
                onPress={handleBuyCapitalsQuiz}
                disabled={actionLoading || isUnlocked}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeCardEmoji}>🏛️</Text>
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Unlock Capitals Quiz</Text>
                  <Text style={styles.upgradeDesc}>
                    {hasKey ? 'Speed Detective required — ready to unlock!' : 'Requires: Speed Detective flag (🔍)'}
                  </Text>
                </View>
                {isUnlocked ? (
                  <View style={styles.ownedItemBadgeRow}>
                    <Text style={styles.ownedItemText}>Owned</Text>
                  </View>
                ) : hasKey ? (
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldText}>🪙 2,000</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })()}

          {/* Borders Quiz Unlock (requires Chariot avatar) */}
          {(() => {
            const hasChariot = unlockedItems.has('png_chariot');
            const isUnlocked = unlockedItems.has('upgrade_borders');
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isUnlocked && styles.upgradeCardOwned, !hasChariot && !isUnlocked && styles.upgradeCardLocked]}
                onPress={handleBuyBordersQuiz}
                disabled={actionLoading || isUnlocked}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeCardEmoji}>🧩</Text>
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Unlock Borders Quiz</Text>
                  <Text style={styles.upgradeDesc}>
                    {hasChariot ? 'Chariot required — ready to unlock!' : 'Requires: Chariot avatar (Ground Invasion quest)'}
                  </Text>
                </View>
                {isUnlocked ? (
                  <View style={styles.ownedItemBadgeRow}>
                    <Text style={styles.ownedItemText}>Owned</Text>
                  </View>
                ) : hasChariot ? (
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldText}>🪙 5,000</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })()}
          
          {(
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

          {(
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

          {(
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
                <Text style={styles.upgradeTitle}>Dark Scroll</Text>
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

          {(
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
                <Text style={styles.upgradeTitle}>Millionaire Swap</Text>
                <Text style={styles.upgradeDesc}>Swap one question in the Millionaire Quiz</Text>
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
          <View style={styles.goldShopCloseBar}>
            <TouchableOpacity style={styles.closeGoldShop} onPress={() => setShowGoldShop(false)}>
              <Text style={styles.closeGoldShopText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
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
  // Sub-tab bar (Buy / Owned)
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  subTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  subTabActive: { backgroundColor: '#2a2a4e' },
  subTabText: { color: '#888', fontWeight: '600', fontSize: 13 },
  subTabTextActive: { color: '#FFD700', fontWeight: 'bold' },
  // Commander banner
  commanderBanner: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#1a0a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7B2FBE',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  commanderBannerText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Countries
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  searchInputInline: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  sortButtonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
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
  // Tier sections
  tierSection: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  tierSectionTitle: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tierItemCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
  },
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
  itemCardLocked: { opacity: 0.8 },
  itemCardTierLocked: { borderColor: '#3a1a1a', backgroundColor: '#1a1a2e' },
  itemEmoji: { fontSize: 44, marginBottom: 6, lineHeight: 54 },
  itemLabel: { color: '#ccc', fontSize: 11, marginBottom: 6, textAlign: 'center' },
  equippedBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  statusBadgeTierLocked: {
    backgroundColor: '#3a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  statusTextTierLocked: { color: '#ff4444', fontSize: 9, fontWeight: 'bold' },
  statusTextTierName: { color: '#ffaaaa', fontSize: 9 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,26,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldShopModal: { flex: 1, backgroundColor: '#0a0a1a' },
  goldShopCloseBar: {
    paddingTop: 56,
    paddingBottom: 8,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    backgroundColor: '#0a0a1a',
  },
  closeGoldShop: {
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
  upgradeCardLocked: {
    opacity: 0.6,
    borderColor: '#444',
  },
  upgradeCardEmoji: {
    fontSize: 28,
    marginRight: 8,
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
