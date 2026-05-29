import React, { useCallback, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  ImageSourcePropType,
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
import TopFallConfetti from '../components/TopFallConfetti';
import { showRewardedAd } from '../lib/rewardedAds';
import { Country, getCountryPrice } from '../types';
import { fetchCountries } from '../lib/countryData';
import { playDing, playPurchasedItem, playReject } from '../lib/audio';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { supabase } from '../lib/supabase';
import { AVATAR_CHARACTERS, FLAG_OPTIONS, CUSTOM_AVATARS } from '../lib/avatarData';
import { getLevelInfo } from '../lib/xpSystem';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { CARD_PALETTES, resolveCardState } from '../lib/cardStates';
import { useToast } from '../context/ToastContext';
import { useAlert } from '../context/AlertContext';

import GoldDisplay from '../components/GoldDisplay';
import AvatarDisplay from '../components/AvatarDisplay';
import GoldShopScreen from './GoldShopScreen';

type ShopTab = 'countries' | 'avatars' | 'flags' | 'upgrades';
type SortMode = 'name' | 'price-asc' | 'price-desc';

const REWARD_AVATAR_TO_ACHIEVEMENT_IDS = ACHIEVEMENTS_DATA.reduce((map, achievement) => {
  const rewardItems = achievement.rewardItems ?? (achievement.rewardItem ? [achievement.rewardItem] : []);
  for (const rewardItem of rewardItems) {
    if (rewardItem.type !== 'avatar') continue;
    const existing = map.get(rewardItem.itemId) ?? [];
    map.set(rewardItem.itemId, [...existing, achievement.id]);
  }
  return map;
}, new Map<string, string[]>());

// ── Conqueror (premium) styling constants ─────────────────────────────────────

// Emoji flags only — no SVG/tier flags, no quest-only items
const SHOP_FLAGS: Array<{ id: string; label: string; price: number; isPremium: boolean; isSvg: boolean; questOnly?: boolean }> = [
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

// Quest-only flags — shown in owned tab only when unlocked
const QUEST_FLAGS: Array<{ id: string; label: string; price: number; isPremium: boolean; isSvg: boolean; questOnly: boolean }> = FLAG_OPTIONS
  .filter(f => f.questOnly)
  .map(f => ({ id: f.emoji, label: f.label, price: 0, isPremium: true, isSvg: false, questOnly: true }));

const SHOP_LOCAL_FLAG_SOURCES: Record<string, ImageSourcePropType> = {
  AF: require('../../assets/flags/afghanistan.png'),
};

export default function ShopScreen() {
  const { isOwned, canAfford, purchaseCountry, bulkPurchaseCountries, goldBalance, ownedCountries } = useGame();
  const { profile, setUsername, purchaseAvatarItem, purchaseQuizUpgrade, disabledUpgrades, toggleUpgrade, purchaseTicket, purchaseTickets, refreshQuestStatus, pendingAvatarNotification, clearAvatarNotification } = useAuth();
  const { showToast } = useToast();
  const { showAlert, showNotEnoughGoldAlert, showPremiumAlert, showLevelAlert, showUniqueAlert } = useAlert();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ShopTab>('countries');

  useFocusEffect(useCallback(() => {
    const tab = route.params?.initialTab as ShopTab | undefined;
    if (tab) {
      setActiveTab(tab);
      setSubTab('buy');
      navigation.setParams({ initialTab: undefined });
    }

    // Refresh profile to get latest quest completion status
    refreshQuestStatus();
    if (profile?.id) {
      loadUnlocks();
    }
  }, [route.params?.initialTab, profile?.id]));

  // ── Countries tab state ────────────────────────────────────────────────────
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [purchasingCca2, setPurchasingCca2] = useState<string | null>(null);

  // ── Avatar/Flag tab state ──────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<'buy' | 'owned'>('buy');
  const [newItemBadge, setNewItemBadge] = useState<'avatar' | 'flag' | null>(null);
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [loadingUnlocks, setLoadingUnlocks] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hideOwned, setHideOwned] = useState(true);
  const [bulkBuying, setBulkBuying] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<{ id: string; label: string } | null>(null);
  const [easterEggClaimed, setEasterEggClaimed] = useState(false);
  const [claimedAchievementIds, setClaimedAchievementIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCountries()
      .then((c) => {
        setCountries(c);
        setFilteredCountries(c);
      })
      .catch((e) => setCountryError(e.message))
      .finally(() => setLoadingCountries(false));

    AsyncStorage.getItem('easter_egg_claimed').then(val => { if (val) setEasterEggClaimed(true); });
  }, []);

  useEffect(() => {
    if (!loadingCountries && countries.length > 0 && ownedCountries.length >= countries.length && activeTab === 'countries') {
      setActiveTab('avatars');
    }
  }, [ownedCountries.length, countries.length, loadingCountries]);

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
    if (hideOwned) {
      result = result.filter(c => !isOwned(c.cca2));
      setFilteredCountries(result);
    } else {
      // Float owned countries to the top, preserving current sort within each group
      const ownedGroup = result.filter(c => isOwned(c.cca2));
      const unownedGroup = result.filter(c => !isOwned(c.cca2));
      setFilteredCountries([...ownedGroup, ...unownedGroup]);
    }
  }, [search, sortMode, countries, isOwned, hideOwned]);

  // ── Bulk buy preview ──────────────────────────────────────────────────────
  const bulkBuyPreview = useMemo(() => {
    const gold = profile?.gold_balance ?? 0;
    if (gold < 100_000) return null;
    let remaining = gold;
    const toBuy: Country[] = [];
    const sorted = [...countries]
      .filter(c => !isOwned(c.cca2))
      .sort((a, b) => getCountryPrice(a.area) - getCountryPrice(b.area));
    for (const c of sorted) {
      const price = getCountryPrice(c.area);
      if (remaining < price) break;
      toBuy.push(c);
      remaining -= price;
    }
    if (toBuy.length === 0) return null;
    const totalCost = toBuy.reduce((sum, c) => sum + getCountryPrice(c.area), 0);
    return { count: toBuy.length, totalCost, goldLeft: gold - totalCost };
  }, [countries, isOwned, profile?.gold_balance]);

  const handleBulkBuy = useCallback(async () => {
    if (!bulkBuyPreview) return;
    showAlert({
      title: 'Bulk Buy Countries',
      message: `Purchase ${bulkBuyPreview.count} countries for ${bulkBuyPreview.totalCost.toLocaleString()} gold?\n\nYou'll have ${bulkBuyPreview.goldLeft.toLocaleString()} gold remaining.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy All',
          onPress: async () => {
            setBulkBuying(true);
            try {
              const { count } = await bulkPurchaseCountries(countries);
              playPurchasedItem();
              setShowConfetti(true);
              showToast(`Conquered ${count} countries!`);
            } catch (e: any) {
              playReject();
              showToast(e?.message ?? 'Purchase failed');
            } finally {
              setBulkBuying(false);
            }
          },
        },
      ],
    });
  }, [bulkBuyPreview, bulkPurchaseCountries, countries, showAlert, showToast]);

  // ── Avatar of the Day ──────────────────────────────────────────────────────

  const featuredAvatar = useMemo(() => {
    const candidates = AVATAR_CHARACTERS.filter(a =>
      a.isPremium &&
      !(a as any).questOnly &&
      !(a as any).isPremiumSubscription &&
      (a.price ?? 0) > 0,
    );
    if (candidates.length === 0) return null;
    const dayIndex = Math.floor(Date.now() / 86400000) % candidates.length;
    const avatar = candidates[dayIndex];
    const discountedPrice = Math.floor((avatar.price ?? 0) * 0.8);
    return { ...avatar, discountedPrice };
  }, []);

  // ── Tier chain builder ─────────────────────────────────────────────────────

  const affordableAvatarCount = useMemo(() => {
    if (subTab !== 'buy') return 0;
    const allBuyable = [
      ...AVATAR_CHARACTERS,
      ...CUSTOM_AVATARS.map(a => ({ emoji: a.key, price: a.price, isPremium: a.isPremium, questOnly: a.questOnly, isPremiumSubscription: a.isPremiumSubscription })),
    ];
    return allBuyable.filter(a => {
      if (unlockedItems.has(a.emoji)) return false;
      if ((a as any).questOnly) return false;
      if ((a as any).isPremiumSubscription && !profile?.is_conquerer) return false;
      if (!a.isPremium) return false; // free avatars don't need to be "bought"
      return (a.price ?? 0) > 0 && goldBalance >= (a.price ?? 0);
    }).length;
  }, [subTab, unlockedItems, goldBalance, profile?.is_conquerer]);

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
    return { avatarTierChains: chains, standaloneCustomAvatars: items.filter(i => !inChain.has(i.key) && !i.cosmetic) };
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

      // Migration: cosmic_armor was renamed to png_cosmic_armor (now lives in avatar shop)
      if (set.has('cosmic_armor') && !set.has('png_cosmic_armor')) {
        await supabase.from('user_unlocked_items').insert({
          user_id: profile.id,
          item_id: 'png_cosmic_armor',
          item_type: 'avatar',
        });
        set.add('png_cosmic_armor');
      }

      // Load claimed achievements for quest-gated upgrade states.
      const { data: achData } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.id);
      const claimedAchievementIds = new Set((achData ?? []).map((a: any) => a.achievement_id));
      setClaimedAchievementIds(claimedAchievementIds);

      const invalidRewardAvatars = Array.from(set).filter((itemId) => {
        const requiredAchievements = REWARD_AVATAR_TO_ACHIEVEMENT_IDS.get(itemId);
        if (!requiredAchievements) return false;
        return !requiredAchievements.some((achievementId) => claimedAchievementIds.has(achievementId));
      });
      if (invalidRewardAvatars.length > 0) {
        await supabase
          .from('user_unlocked_items')
          .delete()
          .eq('user_id', profile.id)
          .in('item_id', invalidRewardAvatars);
        invalidRewardAvatars.forEach((itemId) => set.delete(itemId));
      }

      setUnlockedItems(set);
    } catch (err) {
      console.warn('Failed to load unlocks:', err);
    } finally {
      setLoadingUnlocks(false);
    }
  }

  // ── Not enough gold popup ───────────────────────────────────────────────────

  function showNotEnoughGold(price: number, previewIcon?: React.ReactNode, itemName?: string) {
    playReject();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showNotEnoughGoldAlert({
      itemNode: previewIcon ?? <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />,
      itemName,
      onBuyGold: () => setShowGoldShop(true),
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
      playPurchasedItem();
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
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add(itemId));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setNewItemBadge(itemType);
      showAlert({
        title: itemType === 'avatar' ? 'Avatar Unlocked!' : 'Flag Unlocked!',
        message: 'Switch to the Owned tab to equip it.',
      });
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
    label?: string,
    isQuestOnly = false
  ) {
    if (!profile) return;
    const isUnlocked = (!isPremium && !isQuestOnly) || unlockedItems.has(itemId);
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
        if (itemType === 'avatar') {
          showToast({ title: 'Avatar Equipped!', message: 'Your avatar is visible to everyone on the leaderboard.', icon: <AvatarDisplay avatarId={itemId} size={28} /> });
        }
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
        showNotEnoughGold(price, itemIcon, label);
        return;
      }

      // Avatar purchases show a confirmation popup with a preview
      if (itemType === 'avatar' && label) {
        showAlert({
          icon: <AvatarDisplay avatarId={itemId} size={110} />,
          title: `Buy ${label}?`,
          message: `${price.toLocaleString()} gold`,
          buttons: [
            { text: 'Buy', style: 'default', onPress: () => doPurchaseItem(itemType, itemId, price) },
            { text: 'Cancel', style: 'cancel' },
          ],
        });
        return;
      }

      await doPurchaseItem(itemType, itemId, price);
    }
  }

  const playerLevel = getLevelInfo(profile?.xp ?? 0).level;

  async function handleBuyCapitalsQuiz() {
    if (!profile || unlockedItems.has('upgrade_capitals')) return;
    const turnedIn = claimedAchievementIds.has('flag_mastery_30s');

    if (!turnedIn) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert({
        variant: 'unique',
        title: 'Unlock Capitals Quiz',
        message: 'Complete and claim the Speed Detective quest in Quests to unlock purchase.',
        buttons: [
          { text: 'View Quest', style: 'cta', onPress: () => navigation.navigate('Achievements', { highlightId: 'flag_mastery_30s' }) },
          { text: 'Got it', style: 'cancel' },
        ],
      });
      return;
    }

    const cost = 2000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
      return;
    }

    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_capitals', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add('upgrade_capitals'));
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyBordersQuiz() {
    if (!profile || unlockedItems.has('upgrade_borders')) return;
    const turnedIn = claimedAchievementIds.has('ground_invasion');

    if (!turnedIn) {
      playReject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert({
        variant: 'unique',
        title: 'Unlock Borders Quiz',
        message: 'Complete and claim the Ground Invasion quest in Quests to unlock purchase.',
        buttons: [
          { text: 'View Quest', style: 'cta', onPress: () => navigation.navigate('Achievements', { highlightId: 'ground_invasion' }) },
          { text: 'Got it', style: 'cancel' },
        ],
      });
      return;
    }

    const cost = 2000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
      return;
    }

    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_borders', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add('upgrade_borders'));
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
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
      playPurchasedItem();
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

    const cost = 66666;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
      return;
    }

    setActionLoading(true);
    try {
      // We store the unlock in user_unlocked_items using item_type='flag' as a workaround
      await purchaseAvatarItem('flag', 'upgrade_nightmare', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add('upgrade_nightmare'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyInfiniteMaps() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_infinite_maps')) return;

    const cost = 50000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost, <Image source={require('../../assets/avatars/ancient_map.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />, 'Infinite Maps');
      return;
    }

    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_infinite_maps', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add('upgrade_infinite_maps'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  const TICKET_COST = 2000;

  async function handleBuyTicketPack() {
    if (!profile) return;
    const PACK_COST = 8500;
    if (goldBalance < PACK_COST) {
      showNotEnoughGold(PACK_COST, undefined, 'Ticket Pack (×5)');
      return;
    }
    setActionLoading(true);
    try {
      await purchaseTickets(5, PACK_COST);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      showToast({ title: 'Ticket Pack Added', message: '5 tickets added to your inventory.' });
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyTicket() {
    if (!profile) return;
    if (goldBalance < TICKET_COST) {
      showNotEnoughGold(TICKET_COST, undefined, '1 Ticket');
      return;
    }
    setActionLoading(true);
    try {
      await purchaseTicket(TICKET_COST);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      showToast({ title: 'Ticket Added', message: 'Added to your inventory.' });
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWatchAdForTicket() {
    if (!profile) return;
    setActionLoading(true);
    try {
      const adResult = await showRewardedAd();
      if (!adResult.rewarded) {
        showAlert({ title: 'Ad Unavailable', message: `Could not load a rewarded ad right now. Please try again.\n\n[${adResult.reason ?? 'unknown'}${adResult.errorCode ? ` · ${adResult.errorCode}` : ''}${adResult.errorMessage ? `\n${adResult.errorMessage}` : ''}]` });
        return;
      }
      await purchaseTickets(1, 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      showToast({ title: 'Thanks for Watching!', message: '1 ticket added to your inventory.' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClaimEasterEgg() {
    setActionLoading(true);
    try {
      await purchaseTickets(5, 0);
      await AsyncStorage.setItem('easter_egg_claimed', 'true');
      setEasterEggClaimed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuyMillionaireSkip() {
    if (!profile) return;
    if (unlockedItems.has('upgrade_millionaire_skip')) return;

    const cost = 30000;
    if (goldBalance < cost) {
      showNotEnoughGold(cost);
      return;
    }
    
    setActionLoading(true);
    try {
      await purchaseAvatarItem('flag', 'upgrade_millionaire_skip', cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      setUnlockedItems(prev => new Set(prev).add('upgrade_millionaire_skip'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  function handleTicketShopPress() {
    setShowTicketModal(true);
  }

  const tickets = profile?.tickets ?? 0;
  const gold = goldBalance;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleTicketShopPress}>
            <View style={styles.currencyPill}>
              <View style={[styles.currencyIcon, styles.currencyIconTicket]}>
                <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </View>
              <Text style={styles.currencyAmount}>{tickets}</Text>
              <Text style={styles.currencyPillPlus}>+</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowGoldShop(true)}>
            <View style={styles.currencyPill}>
              <View style={styles.currencyIcon}>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
              </View>
              <Text style={styles.currencyAmount}>{gold.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conqueror's Pass Banner (hide for active Conquerors) */}
      {!profile?.is_conquerer && (
        <TouchableOpacity
          style={styles.commanderBanner}
          onPress={() => navigation.getParent()?.navigate('Premium')}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('../../assets/avatars/crown.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
            <Text style={styles.commanderBannerText}>Conqueror's Pass — Unlock Everything</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      {(() => {
        const allOwned = !loadingCountries && countries.length > 0 && ownedCountries.length >= countries.length;
        const visibleTabs = (['countries', 'avatars', 'flags', 'upgrades'] as ShopTab[])
          .filter(t => t !== 'countries' || !allOwned);
        return (
          <View style={styles.tabBar}>
            {visibleTabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => { setActiveTab(tab); setSubTab('buy'); }}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'countries' ? 'Countries' : tab === 'avatars' ? 'Avatars' : tab === 'flags' ? 'Flags' : 'Upgrades'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })()}



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
                <TouchableOpacity
                  style={[styles.sortButtonCompact, sortMode === 'name' && styles.sortButtonActive]}
                  onPress={() => setSortMode('name')}
                >
                  <Text style={[styles.sortText, sortMode === 'name' && styles.sortTextActive]}>A–Z</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButtonCompact, (sortMode === 'price-asc' || sortMode === 'price-desc') && styles.sortButtonActive]}
                  onPress={() => setSortMode(sortMode === 'price-asc' ? 'price-desc' : 'price-asc')}
                >
                  <Text style={[styles.sortText, (sortMode === 'price-asc' || sortMode === 'price-desc') && styles.sortTextActive]}>
                    {sortMode === 'price-desc' ? '↓$' : '↑$'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButtonCompact, !hideOwned && styles.sortButtonActive]}
                  onPress={() => setHideOwned(h => !h)}
                >
                  <Text style={[styles.sortText, !hideOwned && styles.sortTextActive]}>
                    {!hideOwned ? '✓' : '—'} Owned
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.goldBanner} onPress={() => setShowGoldShop(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Image source={require('../../assets/avatars/diamond.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                  <Text style={styles.goldBannerText}>Need more Gold?</Text>
                </View>
                <Text style={styles.goldBannerCta}>Buy Gold →</Text>
              </TouchableOpacity>
              {bulkBuyPreview && (
                <TouchableOpacity
                  style={styles.bulkBuyCard}
                  onPress={handleBulkBuy}
                  disabled={bulkBuying}
                  activeOpacity={0.85}
                >
                  <View style={styles.bulkBuyLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <Image source={require('../../assets/avatars/diamond.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
                      <Text style={styles.bulkBuyTitle}>Bulk Buy</Text>
                    </View>
                    <Text style={styles.bulkBuyDesc}>
                      Conquer {bulkBuyPreview.count} countries for{' '}
                      <Text style={styles.bulkBuyCost}>{bulkBuyPreview.totalCost.toLocaleString()} gold</Text>
                    </Text>
                    <Text style={styles.bulkBuyRemaining}>
                      {bulkBuyPreview.goldLeft.toLocaleString()} gold remaining
                    </Text>
                  </View>
                  <View style={styles.bulkBuyBtn}>
                    {bulkBuying ? (
                      <ActivityIndicator size="small" color="#1a1a2e" />
                    ) : (
                      <Text style={styles.bulkBuyBtnText}>Buy All</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
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
                  const flagSource = SHOP_LOCAL_FLAG_SOURCES[item.cca2] ?? { uri: item.flagUrl };
                  return (
                    <TouchableOpacity
                      style={[styles.countryCard, owned && styles.countryCardOwned]}
                      onPress={() => handleBuyCountry(item)}
                      activeOpacity={0.8}
                      disabled={!!purchasingCca2}
                    >
                      <Image source={flagSource} style={styles.flag} resizeMode="contain" />
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
                            <View style={styles.goldRow}>
                              <Image
                                source={require('../../assets/avatars/gold_coin.png')}
                                style={[styles.goldCoinTiny, !affordable && { opacity: 0.45 }]}
                                resizeMode="contain"
                              />
                              <Text style={[styles.priceText, !affordable && styles.priceTextDim]}>{price}</Text>
                            </View>
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
              <TouchableOpacity
                key={t}
                style={[styles.subTab, subTab === t && styles.subTabActive]}
                onPress={() => { setSubTab(t); if (t === 'owned') { setNewItemBadge(null); clearAvatarNotification(); } }}
              >
                <View style={{ position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {t === 'owned' && <Image source={require('../../assets/avatars/crown.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />}
                    <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
                      {t === 'buy' ? 'Buy' : 'Owned'}
                    </Text>
                  </View>
                  {t === 'owned' && (newItemBadge === 'avatar' || pendingAvatarNotification) && (
                    <View style={{ position: 'absolute', top: -3, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Avatar of the Day ───────────────────────────────────────── */}
          {subTab === 'buy' && featuredAvatar && !unlockedItems.has(featuredAvatar.emoji) && (
            <TouchableOpacity
              style={styles.featuredAvatarCard}
              onPress={() => handleItemPress('avatar', featuredAvatar.emoji, featuredAvatar.discountedPrice, featuredAvatar.isPremium, featuredAvatar.label)}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              <View style={styles.featuredAvatarBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/star.png')} style={{ width: 10, height: 10 }} resizeMode="contain" />
                  <Text style={styles.featuredAvatarBadgeText}>FEATURED TODAY</Text>
                </View>
              </View>
              <View style={styles.featuredAvatarBody}>
                <AvatarDisplay avatarId={featuredAvatar.emoji} size={64} />
                <View style={styles.featuredAvatarInfo}>
                  <Text style={styles.featuredAvatarName}>{featuredAvatar.label}</Text>
                  <Text style={styles.featuredAvatarSub}>20% off today only</Text>
                  <View style={styles.featuredPriceRow}>
                    <Text style={styles.featuredOldPrice}>{(featuredAvatar.price ?? 0).toLocaleString()}</Text>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.featuredNewPrice}>{featuredAvatar.discountedPrice.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

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
                questOnly: a.questOnly,
                isPremiumSubscription: a.isPremiumSubscription,
                requiresLevel: a.requiresLevel,
              }))] as any[]).filter((a: any) => {
                const isOwned = (!a.isPremium && !a.questOnly) || unlockedItems.has(a.emoji);
                if (subTab === 'owned') return isOwned;
                return !isOwned && !a.questOnly;
              }).sort((a: any, b: any) => {
                const pa = a.price ?? 0;
                const pb = b.price ?? 0;
                if (pa !== pb) return pa - pb;
                return String(a.label ?? '').localeCompare(String(b.label ?? ''));
              })}
              ListHeaderComponent={subTab === 'buy' && affordableAvatarCount > 0 ? (
                <TouchableOpacity
                  style={styles.affordBanner}
                  onPress={() => {}}
                  activeOpacity={0.8}
                >
                  <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Text style={styles.affordBannerText}>
                    You can afford <Text style={styles.affordBannerCount}>{affordableAvatarCount}</Text> {affordableAvatarCount === 1 ? 'avatar' : 'avatars'} right now
                  </Text>
                  <Text style={styles.affordBannerArrow}>↓</Text>
                </TouchableOpacity>
              ) : null}
              ListFooterComponent={(() => {
                const visibleChains = subTab === 'owned'
                  ? avatarTierChains.filter(chain =>
                      chain.some(a => (!a.isPremium && !a.questOnly) || unlockedItems.has(a.key))
                    )
                  : avatarTierChains;
                if (visibleChains.length === 0) return null;
                return (
                  <View>
                    {visibleChains.map((chain, idx) => {
                      const sectionName = chain[0].collection?.replace(/ Tier \d+$/, '') || chain[0].culture;
                      return (
                        <View key={idx} style={styles.tierSection}>
                          <Text style={styles.tierSectionTitle}>{sectionName}</Text>
                          <View style={styles.tierRow}>
                            {chain.map((a, i) => {
                              const id = a.key;
                              const isUnlocked = (!a.isPremium && !a.questOnly) || unlockedItems.has(id);
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
                                    onLongPress={isUnlocked ? () => setPreviewAvatar({ id, label: a.label }) : undefined}
                                    delayLongPress={300}
                                    disabled={actionLoading}
                                  >
                                    <View style={{ opacity: tierLocked ? 0.3 : 1, alignItems: 'center' }}>
                                      <AvatarDisplay avatarId={id} size={44} />
                                    </View>
                                    <Text style={styles.itemLabel} numberOfLines={1}>{a.label}</Text>
                                    {isEquipped ? (
                                      <View style={styles.equippedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.equippedBadgeText}>Equipped</Text></View>
                                    ) : isUnlocked ? (
                                      subTab === 'owned'
                                        ? <View style={styles.equipBadge}><Text style={styles.equipBadgeText}>Equip</Text></View>
                                        : <View style={styles.ownedItemBadge}><Text style={styles.ownedItemText}>Owned</Text></View>
                                    ) : tierLocked ? (
                                      <View style={styles.statusBadgeTierLocked}>
                                        <View style={styles.goldRow}>
                                          <Image source={require('../../assets/avatars/gold_coin.png')} style={[styles.goldCoinTiny, { opacity: 0.6 }]} resizeMode="contain" />
                                          <Text style={styles.statusTextTierLocked}>{a.price}</Text>
                                        </View>
                                      </View>
                                    ) : (
                                      <View style={styles.itemPriceBadge}>
                                        <View style={styles.goldRow}>
                                          <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinTiny} resizeMode="contain" />
                                          <Text style={styles.itemPriceText}>{a.price}</Text>
                                        </View>
                                      </View>
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
                );
              })()}
              keyExtractor={(item) => item.emoji}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              renderItem={({ item }) => {
                const id = item.emoji;
                const isUnlocked = (!item.isPremium && !(item as any).questOnly) || unlockedItems.has(id);
                const isEquipped = profile?.avatar_emoji === id;
                const cs = resolveCardState({
                  isUnlocked,
                  isSubscriptionLocked: !!item.isPremiumSubscription && !profile?.is_conquerer,
                  requiredLevel: item.requiresLevel,
                  playerLevel,
                });
                const cp = CARD_PALETTES[cs.primaryState];
                const bp = CARD_PALETTES[cs.badgeState];
                return (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      isEquipped
                        ? styles.itemCardEquipped
                        : cs.states.length > 0
                          ? { backgroundColor: cp.cardBg, borderColor: cp.cardBorder }
                          : undefined,
                      (!isUnlocked && cs.states.length === 0) && styles.itemCardLocked,
                    ]}
                    onPress={() => {
                      if (cs.isSubscriptionLocked) {
                        showPremiumAlert({
                          itemNode: <AvatarDisplay avatarId={id} size={72} />,
                          itemName: item.label,
                          onUpgrade: () => navigation.getParent()?.navigate('Premium'),
                        });
                        return;
                      }
                      if (cs.isLevelLocked) {
                        showLevelAlert({ requiredLevel: item.requiresLevel ?? 0, itemName: item.label });
                        return;
                      }
                      handleItemPress('avatar', id, item.price, item.isPremium, item.label);
                    }}
                    onLongPress={isUnlocked ? () => setPreviewAvatar({ id, label: item.label }) : undefined}
                    delayLongPress={300}
                    disabled={actionLoading}
                  >
                    <View style={{ opacity: cs.contentOpacity }}>
                      <AvatarDisplay avatarId={id} size={44} />
                    </View>
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>
                    {isEquipped ? (
                      <View style={styles.equippedBadge}><Ionicons name="checkmark-circle" size={12} color="#fff" /><Text style={styles.equippedBadgeText}>Equipped</Text></View>
                    ) : isUnlocked ? (
                      subTab === 'owned'
                        ? <View style={styles.equipBadge}><Text style={styles.equipBadgeText}>Equip</Text></View>
                        : <View style={styles.ownedItemBadge}><Text style={styles.ownedItemText}>Owned</Text></View>
                    ) : cs.isLevelLocked ? (
                      <View style={[styles.stateBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                        <Image source={require('../../assets/avatars/lock.png')} style={{ width: 10, height: 10 }} resizeMode="contain" />
                        <Text style={[styles.stateBadgeText, { color: bp.badgeColor }]}>Lvl {item.requiresLevel}</Text>
                      </View>
                    ) : cs.isSubscriptionLocked ? (
                      <View style={styles.conquerorStamp}>
                        <Image source={require('../../assets/avatars/conqueror.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                        <Text style={styles.conquerorStampText}>Conqueror</Text>
                      </View>
                    ) : (
                      <View style={styles.itemPriceBadge}>
                        <View style={styles.goldRow}>
                          <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinTiny} resizeMode="contain" />
                          <Text style={styles.itemPriceText}>{item.price}</Text>
                        </View>
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
          <View style={styles.subTabBar}>
            {(['buy', 'owned'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.subTab, subTab === t && styles.subTabActive]}
                onPress={() => { setSubTab(t); if (t === 'owned') setNewItemBadge(null); }}
              >
                <View style={{ position: 'relative' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {t === 'owned' && <Image source={require('../../assets/avatars/crown.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />}
                    <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
                      {t === 'buy' ? 'Buy' : 'Owned'}
                    </Text>
                  </View>
                  {t === 'owned' && newItemBadge === 'flag' && (
                    <View style={{ position: 'absolute', top: -3, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' }} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {loadingUnlocks ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#FFD700" />
            </View>
          ) : (
            <FlatList
              data={[
                ...SHOP_FLAGS.filter(item => {
                  const isOwned = !item.isPremium || unlockedItems.has(item.id) || profile?.avatar_flag === item.id;
                  return subTab === 'owned' ? isOwned : !isOwned;
                }),
                ...(subTab === 'owned'
                  ? QUEST_FLAGS.filter(item => unlockedItems.has(item.id) || profile?.avatar_flag === item.id)
                  : []),
              ].sort((a, b) => {
                if (a.price !== b.price) return a.price - b.price;
                return a.label.localeCompare(b.label);
              })}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.itemListContent}
              columnWrapperStyle={styles.itemRow}
              ListFooterComponent={subTab === 'buy' && !easterEggClaimed ? (
                <TouchableOpacity
                  style={styles.easterEggFooter}
                  onPress={() => {
                    showAlert({
                      variant: 'ticket',
                      title: '🎉 Easter Egg Found!',
                      message: 'Good job on finding the easter egg! Here are 5 free tickets.',
                      buttons: [
                        { text: 'Claim!', style: 'cta', onPress: () => handleClaimEasterEgg() },
                        { text: 'Cancel', style: 'cancel' },
                      ],
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Image source={require('../../assets/avatars/raffle_ticket_pack.png')} style={styles.easterEggImage} resizeMode="contain" />
                </TouchableOpacity>
              ) : null}
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
                      <View style={styles.itemPriceBadge}>
                        <View style={styles.goldRow}>
                          <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinTiny} resizeMode="contain" />
                          <Text style={styles.itemPriceText}>{item.price}</Text>
                        </View>
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

          {/* Capitals Quiz Unlock (complete Speed Detective quest) */}
          {(() => {
            const isOwned = unlockedItems.has('upgrade_capitals');
            const isQuestUnlocked = claimedAchievementIds.has('flag_mastery_30s');
            const cs = resolveCardState({ isUnlocked: isOwned, isUniqueUnlock: !isOwned });
            const cp = CARD_PALETTES[cs.primaryState];
            const bp = CARD_PALETTES[cs.badgeState];
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isOwned ? { backgroundColor: cp.cardBg, borderColor: cp.cardBorder } : { backgroundColor: cp.cardBg, borderColor: cp.cardBorder, opacity: 0.8 }]}
                onPress={handleBuyCapitalsQuiz}
                disabled={actionLoading || isOwned}
                activeOpacity={0.8}
              >
                <Image source={require('../../assets/avatars/building.png')} style={styles.upgradeCardImage} resizeMode="contain" />
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Capitals Quiz</Text>
                  {!isQuestUnlocked && !isOwned && <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Turn in Speed Detective quest</Text>}
                </View>
                {isOwned ? (
                  <View style={styles.uniqueOwnedBadge}>
                    <Text style={styles.uniqueOwnedBadgeText}>- Owned</Text>
                  </View>
                ) : isQuestUnlocked ? (
                  <View style={styles.goldBadge}>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.goldText}>2000</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.upgradeBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    <Text style={[styles.upgradeBadgeText, { color: bp.badgeColor }]}>Locked</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Borders Quiz Unlock (complete Ground Invasion quest) */}
          {(() => {
            const isOwned = unlockedItems.has('upgrade_borders');
            const isQuestUnlocked = claimedAchievementIds.has('ground_invasion');
            const cs = resolveCardState({ isUnlocked: isOwned, isUniqueUnlock: !isOwned });
            const cp = CARD_PALETTES[cs.primaryState];
            const bp = CARD_PALETTES[cs.badgeState];
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isOwned ? { backgroundColor: cp.cardBg, borderColor: cp.cardBorder } : { backgroundColor: cp.cardBg, borderColor: cp.cardBorder, opacity: 0.8 }]}
                onPress={handleBuyBordersQuiz}
                disabled={actionLoading || isOwned}
                activeOpacity={0.8}
              >
                <Image source={require('../../assets/avatars/border.png')} style={styles.upgradeCardImage} resizeMode="contain" />
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Borders Quiz</Text>
                  {!isQuestUnlocked && !isOwned && <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Turn in Ground Invasion quest</Text>}
                </View>
                {isOwned ? (
                  <View style={styles.uniqueOwnedBadge}>
                    <Text style={styles.uniqueOwnedBadgeText}>- Owned</Text>
                  </View>
                ) : isQuestUnlocked ? (
                  <View style={styles.goldBadge}>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.goldText}>2000</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.upgradeBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    <Text style={[styles.upgradeBadgeText, { color: bp.badgeColor }]}>Locked</Text>
                  </View>
                )}
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
              <Image source={require('../../assets/avatars/expedition2.png')} style={styles.upgradeCardImage} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Level 2 Expedition</Text>
                {(profile?.max_quiz_turns || 10) < 20 && <Text style={styles.upgradeDesc}>Play up to 20 turns per quiz</Text>}
              </View>
              {(profile?.max_quiz_turns || 10) >= 20 ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Switch
                    value={!disabledUpgrades.has('upgrade_level_2')}
                    onValueChange={() => toggleUpgrade('upgrade_level_2')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_level_2') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}>
                  <View style={styles.goldRow}>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                    <Text style={styles.goldText}>2000</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}

          {(() => {
            const isOwned = (profile?.max_quiz_turns || 10) >= 30;
            const cs = resolveCardState({ isUnlocked: isOwned, requiredLevel: 25, playerLevel });
            const cp = CARD_PALETTES[cs.primaryState];
            const bp = CARD_PALETTES[cs.badgeState];
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isOwned ? styles.upgradeCardOwned : { backgroundColor: cp.cardBg, borderColor: cp.cardBorder, opacity: cs.states.length > 0 ? 0.8 : 1 }]}
                onPress={() => {
                  if (cs.isLevelLocked) {
                    showLevelAlert({ requiredLevel: 25, itemName: 'Level 3 Expedition' });
                    return;
                  }
                  if (isOwned) return;
                  handleBuyUpgrade(30, 5000);
                }}
                disabled={actionLoading || isOwned}
                activeOpacity={0.8}
              >
                <Image source={require('../../assets/avatars/expedition3.png')} style={styles.upgradeCardImage} resizeMode="contain" />
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Level 3 Expedition</Text>
                  {!isOwned && <Text style={styles.upgradeDesc}>Play up to 30 turns per quiz</Text>}
                </View>
                {isOwned ? (
                  <View style={styles.ownedItemBadgeRow}>
                    <Switch
                      value={!disabledUpgrades.has('upgrade_level_3')}
                      onValueChange={() => toggleUpgrade('upgrade_level_3')}
                      trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                      thumbColor={!disabledUpgrades.has('upgrade_level_3') ? '#1a1a2e' : '#888'}
                    />
                  </View>
                ) : cs.isLevelLocked ? (
                  <View style={[styles.upgradeBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    <Text style={[styles.upgradeBadgeText, { color: bp.badgeColor }]}>Locked</Text>
                  </View>
                ) : (
                  <View style={styles.goldBadge}>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.goldText}>5000</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Millionaire Swap (before Dark Scroll) */}
          {(
            <TouchableOpacity
              style={[styles.upgradeCard, unlockedItems.has('upgrade_millionaire_skip') && styles.upgradeCardOwned]}
              onPress={() => {
                if (unlockedItems.has('upgrade_millionaire_skip')) return;
                handleBuyMillionaireSkip();
              }}
              disabled={actionLoading || unlockedItems.has('upgrade_millionaire_skip')}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/swap.png')} style={styles.upgradeCardImage} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Millionaire Swap</Text>
                {!unlockedItems.has('upgrade_millionaire_skip') && <Text style={styles.upgradeDesc}>Swap one question in the Millionaire Quiz</Text>}
              </View>
              {unlockedItems.has('upgrade_millionaire_skip') ? (
                <View style={styles.ownedItemBadgeRow}>
                  <Switch
                    value={!disabledUpgrades.has('upgrade_millionaire_skip')}
                    onValueChange={() => toggleUpgrade('upgrade_millionaire_skip')}
                    trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                    thumbColor={!disabledUpgrades.has('upgrade_millionaire_skip') ? '#1a1a2e' : '#888'}
                  />
                </View>
              ) : (
                <View style={styles.goldBadge}>
                  <View style={styles.goldRow}>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                    <Text style={styles.goldText}>30000</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Dark Scroll (after Millionaire Swap) */}
          {(() => {
            const isOwned = unlockedItems.has('upgrade_nightmare');
            const cs = resolveCardState({ isUnlocked: isOwned, requiredLevel: 33, playerLevel });
            const cp = CARD_PALETTES[cs.primaryState];
            const bp = CARD_PALETTES[cs.badgeState];
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isOwned ? styles.upgradeCardOwned : { backgroundColor: cp.cardBg, borderColor: cp.cardBorder, opacity: cs.states.length > 0 ? 0.8 : 1 }]}
                onPress={() => {
                  if (cs.isLevelLocked) {
                    showLevelAlert({ requiredLevel: 33, itemName: 'Dark Scroll' });
                    return;
                  }
                  if (isOwned) return;
                  handleBuyNightmare();
                }}
                disabled={actionLoading || isOwned}
                activeOpacity={0.8}
              >
                <Image source={require('../../assets/avatars/dark_scroll.png')} style={styles.upgradeCardImage} resizeMode="contain" />
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Dark Scroll</Text>
                  {!isOwned && !cs.isLevelLocked && <Text style={styles.upgradeDesc}>Unlocks the Nightmare Quiz</Text>}
                </View>
                {isOwned ? (
                  <View style={styles.ownedItemBadgeRow}>
                    <Switch
                      value={!disabledUpgrades.has('upgrade_nightmare')}
                      onValueChange={() => toggleUpgrade('upgrade_nightmare')}
                      trackColor={{ false: '#2a2a4e', true: '#FFD700' }}
                      thumbColor={!disabledUpgrades.has('upgrade_nightmare') ? '#1a1a2e' : '#888'}
                    />
                  </View>
                ) : cs.isLevelLocked ? (
                  <View style={[styles.upgradeBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    <Text style={[styles.upgradeBadgeText, { color: bp.badgeColor }]}>Locked</Text>
                  </View>
                ) : (
                  <View style={styles.goldBadge}>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.goldText}>66666</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Infinite Maps */}
          {(() => {
            const isOwned = unlockedItems.has('upgrade_infinite_maps');
            const cs = resolveCardState({ isUnlocked: isOwned, requiredLevel: 110, playerLevel });
            const cp = CARD_PALETTES[cs.primaryState];
            const bp = CARD_PALETTES[cs.badgeState];
            return (
              <TouchableOpacity
                style={[styles.upgradeCard, isOwned ? styles.upgradeCardOwned : { backgroundColor: cp.cardBg, borderColor: cp.cardBorder, opacity: cs.states.length > 0 ? 0.8 : 1 }]}
                onPress={() => {
                  if (cs.isLevelLocked) {
                    showLevelAlert({ requiredLevel: 110, itemName: 'Infinite Maps' });
                    return;
                  }
                  if (isOwned) return;
                  handleBuyInfiniteMaps();
                }}
                disabled={actionLoading || isOwned}
                activeOpacity={0.8}
              >
                <Image source={require('../../assets/avatars/ancient_map.png')} style={styles.upgradeCardImage} resizeMode="contain" />
                <View style={styles.upgradeInfo}>
                  <Text style={styles.upgradeTitle}>Infinite Maps</Text>
                  {!isOwned && !cs.isLevelLocked && <Text style={styles.upgradeDesc}>Never wait for maps again</Text>}
                </View>
                {isOwned ? (
                  <View style={[styles.ownedItemBadgeRow, { paddingRight: 12 }]}>
                    <Text style={{ color: '#FFD700', fontSize: 22, fontWeight: 'bold' }}>∞</Text>
                  </View>
                ) : cs.isLevelLocked ? (
                  <View style={[styles.upgradeBadge, { backgroundColor: bp.badgeBg, borderColor: bp.badgeBorder, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                    <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                    <Text style={[styles.upgradeBadgeText, { color: bp.badgeColor }]}>Lvl 110</Text>
                  </View>
                ) : (
                  <View style={styles.goldBadge}>
                    <View style={styles.goldRow}>
                      <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.goldCoinSmall} resizeMode="contain" />
                      <Text style={styles.goldText}>50,000</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}
        </ScrollView>
      )}

      {/* Action loading overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}

      {/* Ticket Shop Modal */}
      <Modal
        visible={showTicketModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowTicketModal(false)}
      >
        <TouchableOpacity
          style={styles.ticketModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTicketModal(false)}
        >
          <View style={styles.ticketModalContainer} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Text style={styles.ticketModalTitle}>acquire millionaire tickets</Text>
            </View>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 4, borderColor: '#c0392b' }]}
              onPress={() => { setShowTicketModal(false); handleBuyTicket(); }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Millionaire Ticket</Text>
                <Text style={styles.upgradeDesc}>1 ticket</Text>
              </View>
              <View style={[styles.goldBadge, { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8, marginLeft: -8 }]}>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.goldText}>2,000</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 4, borderColor: '#c0392b' }]}
              onPress={() => { setShowTicketModal(false); handleBuyTicketPack(); }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/raffle_ticket_pack.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Ticket Pack</Text>
                <Text style={styles.upgradeDesc}>5 millionaire tickets</Text>
              </View>
              <View style={[styles.goldBadge, { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 8, marginLeft: -8 }]}>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.goldText}>8,500</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 4, borderColor: '#9b59b6' }]}
              onPress={() => { setShowTicketModal(false); handleWatchAdForTicket(); }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Watch an ad</Text>
                <Text style={styles.upgradeDesc}>1 ticket for 1 ad</Text>
              </View>
              <View style={[styles.goldBadge, { backgroundColor: '#9b59b6', borderColor: '#9b59b6' }]}>
                <Text style={styles.goldText}>Free</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ticketModalCancel}
              onPress={() => setShowTicketModal(false)}
            >
              <Text style={styles.ticketModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {showConfetti && <TopFallConfetti />}

      {/* Avatar long-press preview overlay */}
      {previewAvatar && (
        <TouchableOpacity
          style={styles.avatarPreviewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewAvatar(null)}
        >
          <View style={styles.avatarPreviewCard}>
            <AvatarDisplay avatarId={previewAvatar.id} size={120} />
            <Text style={styles.avatarPreviewLabel}>{previewAvatar.label}</Text>
            <Text style={styles.avatarPreviewHint}>Tap anywhere to close</Text>
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
  },
  currencyIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#0a0a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyIconTicket: { backgroundColor: '#1a0a2a' },
  currencyAmount: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  currencyPillPlus: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 11 },
  tabTextActive: { color: '#0a0a1a', fontWeight: 'bold' },
  // Sub-tab bar (Buy / Owned)
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
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
    marginHorizontal: 12,
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
    paddingHorizontal: 12,
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
  list: { paddingHorizontal: 12, paddingBottom: 20 },
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
    borderWidth: 1,
    borderColor: '#4CAF50',
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
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goldBannerText: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
  goldBannerCta: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  bulkBuyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d2a1a',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  bulkBuyLeft: { flex: 1, marginRight: 12 },
  bulkBuyTitle: { color: '#22c55e', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  bulkBuyDesc: { color: '#aaa', fontSize: 13 },
  bulkBuyCost: { color: '#FFD700', fontWeight: 'bold' },
  bulkBuyRemaining: { color: '#666', fontSize: 11, marginTop: 3 },
  bulkBuyBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  bulkBuyBtnText: { color: '#0d2a1a', fontWeight: 'bold', fontSize: 13 },
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
  /** Generic state badge for grid cards — apply colors inline from CARD_PALETTES */
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
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
  equipBadge: {
    backgroundColor: '#1a3a2e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e66',
  },
  equipBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  avatarPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  avatarPreviewCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#FFD70066',
    minWidth: 230,
  },
  avatarPreviewLabel: {
    color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center',
  },
  avatarPreviewHint: { color: '#555', fontSize: 11 },
  itemPriceBadge: {
    backgroundColor: '#1a1a30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  itemPriceText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
  featuredAvatarCard: {
    marginHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#1a1020',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  featuredAvatarBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  featuredAvatarBadgeText: {
    color: '#0a0a1a',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  featuredAvatarBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  featuredAvatarInfo: { flex: 1 },
  featuredAvatarName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  featuredAvatarSub: { color: '#6BCB77', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  featuredPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featuredOldPrice: { color: '#555', fontSize: 13, textDecorationLine: 'line-through' },
  featuredNewPrice: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  affordBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  affordBannerText: { flex: 1, color: '#ccc', fontSize: 13 },
  affordBannerCount: { color: '#FFD700', fontWeight: 'bold' },
  affordBannerArrow: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  conquerorStamp: {
    backgroundColor: '#2a1a4a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9B59B6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conquerorStampText: {
    color: '#9B59B6',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
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
    paddingHorizontal: 12,
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
    padding: 12,
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
    backgroundColor: '#1a1a2e',
  },
  /** Generic state badge for upgrade row cards — apply colors inline from CARD_PALETTES */
  upgradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  upgradeBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  upgradeCardImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  upgradeCardImageLarge: {
    width: 84,
    height: 84,
    marginRight: 10,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  upgradeDesc: {
    color: '#888',
    fontSize: 12,
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
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goldCoinTiny: { width: 12, height: 12 },
  goldCoinSmall: { width: 14, height: 14 },
  goldText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  uniqueOwnedBadge: {
    backgroundColor: '#0a1c1a',
    borderColor: '#2ae8c8',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  uniqueOwnedBadgeText: {
    color: '#2ae8c8',
    fontWeight: '700',
    fontSize: 12,
  },
  ownedItemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  easterEggFooter: {
    alignItems: 'center',
    paddingVertical: 32,
    opacity: 0.25,
  },
  easterEggImage: {
    width: 48,
    height: 48,
  },
  // Ticket shop modal
  ticketModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ticketModalContainer: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  ticketModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketModalCancel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 2,
  },
  ticketModalCancelText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});
