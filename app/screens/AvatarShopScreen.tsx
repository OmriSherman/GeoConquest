import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import AvatarDisplay from '../components/AvatarDisplay';
import { playPurchase, playDing } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { AVATAR_CHARACTERS, FLAG_OPTIONS, FlagOption } from '../lib/avatarData';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { fetchCountries } from '../lib/countryData';
import { cca2ToFlagEmoji } from '../types';
import CrateShopScreen from './CrateShopScreen';

type Tab = 'avatars' | 'flags' | 'crates';

export default function AvatarShopScreen() {
  const { profile, setUsername, purchaseAvatarItem } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('avatars');
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [countryFlags, setCountryFlags] = useState<FlagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUnlocks();
      fetchCountries().then(cc => {
        const mapped: FlagOption[] = cc.map(c => ({
          emoji: cca2ToFlagEmoji(c.cca2),
          label: c.name,
          category: 'country' as const,
          price: 250,
          isPremium: true,
        }));
        setCountryFlags(mapped);
      }).catch(console.warn);
    }, [profile?.id])
  );

  async function loadUnlocks() {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_unlocked_items')
        .select('item_id')
        .eq('user_id', profile.id);

      if (error) throw error;
      
      const unlockedSet = new Set<string>();
      if (data) {
        data.forEach(row => unlockedSet.add(row.item_id));
      }

      // Hack to retroactively fix the missed achievement reward bug:
      const { data: achData } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profile.id);

      if (achData) {
        const achIds = new Set(achData.map((a: any) => a.achievement_id));
        for (const ach of ACHIEVEMENTS_DATA) {
          if (ach.rewardItem && achIds.has(ach.id) && !unlockedSet.has(ach.rewardItem.itemId)) {
            await supabase.from('user_unlocked_items').insert({
               user_id: profile.id,
               item_id: ach.rewardItem.itemId,
               item_type: ach.rewardItem.type
            });
            unlockedSet.add(ach.rewardItem.itemId);
          }
        }
      }

      setUnlockedItems(unlockedSet);
    } catch (err) {
      console.warn('Failed to load unlocks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleItemPress(itemType: 'avatar' | 'flag', emoji: string, price: number, isPremium: boolean) {
    if (!profile) return;

    const isUnlocked = !isPremium || unlockedItems.has(emoji) || (itemType === 'flag' && profile.avatar_flag === emoji);
    
    // Check if it's currently equipped
    const isEquippedAvatar = itemType === 'avatar' && profile.avatar_emoji === emoji;
    const isEquippedFlag = itemType === 'flag' && profile.avatar_flag === emoji;
    
    if (isEquippedAvatar || isEquippedFlag) return;

    if (isUnlocked) {
      // Equip directly
      setActionLoading(true);
      try {
        if (itemType === 'avatar') {
          await setUsername(profile.username, emoji, profile.avatar_flag, profile.country);
        } else {
          await setUsername(profile.username, profile.avatar_emoji, emoji, profile.country);
        }
        playDing();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setActionLoading(false);
      }
    } else {
      // Purchase flow
      if (profile.gold_balance < price) {
        Alert.alert('Not enough gold', `You need 🪙 ${price} gold.`);
        return;
      }

      setActionLoading(true);
      try {
        await purchaseAvatarItem(itemType, emoji, price);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playPurchase();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setUnlockedItems(prev => new Set(prev).add(emoji));
      } catch (err: any) {
        Alert.alert('Purchase Failed', err.message);
      } finally {
        setActionLoading(false);
      }
    }
  }

  // Define data sources
  const flagListData = useMemo(() => {
    const symbols = FLAG_OPTIONS.filter(f => f.category !== 'country');
    return [...symbols, ...countryFlags];
  }, [countryFlags]);
  const listData = activeTab === 'avatars' ? AVATAR_CHARACTERS : flagListData;
  const itemType = activeTab === 'avatars' ? 'avatar' : 'flag';

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>Avatar Shop</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>💰 {profile?.gold_balance ?? 0}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Customize your explorer profile on the leaderboard.</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'avatars' && styles.tabActive]}
          onPress={() => setActiveTab('avatars')}
        >
          <Text style={[styles.tabText, activeTab === 'avatars' && styles.tabTextActive]}>
            🧑 Characters
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flags' && styles.tabActive]}
          onPress={() => setActiveTab('flags')}
        >
          <Text style={[styles.tabText, activeTab === 'flags' && styles.tabTextActive]}>
            🏳️ Flags & Badges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'crates' && styles.tabActive]}
          onPress={() => setActiveTab('crates')}
        >
          <Text style={[styles.tabText, activeTab === 'crates' && styles.tabTextActive]}>
            📦 Crates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Crates tab */}
      {activeTab === 'crates' && <CrateShopScreen />}

      {/* Main Content — avatars & flags */}
      {activeTab !== 'crates' && (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FFD700" size="large" />
          </View>
        ) : (
          <FlatList
            data={listData as any[]}
            keyExtractor={(item) => item.emoji}
            extraData={{ profile, unlockedItems }}
            numColumns={3}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => {
              const isUnlocked = !item.isPremium || unlockedItems.has(item.emoji) || (itemType === 'flag' && profile?.avatar_flag === item.emoji);
              const isEquipped = itemType === 'avatar'
                ? profile?.avatar_emoji === item.emoji
                : profile?.avatar_flag === item.emoji;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemCard,
                    isEquipped && styles.itemCardEquipped,
                    !isUnlocked && styles.itemCardLocked,
                  ]}
                  onPress={() => handleItemPress(itemType, item.emoji, item.price, item.isPremium)}
                  disabled={actionLoading}
                >
                  <AvatarDisplay
                    avatarId={itemType === 'avatar' ? item.emoji : '🧑'}
                    avatarFlag={itemType === 'flag' ? item.emoji : undefined}
                    size={46}
                  />
                  {item.label && <Text style={styles.itemLabel} numberOfLines={1}>{item.label}</Text>}
                  {isEquipped ? (
                    <View style={styles.statusBadgeEquipped}>
                      <Text style={styles.statusTextEquipped}>Equipped</Text>
                    </View>
                  ) : isUnlocked ? (
                    <View style={styles.statusBadgeOwned}>
                      <Text style={styles.statusTextOwned}>Owned</Text>
                    </View>
                  ) : (
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>💰 {item.price}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )
      )}
      
      {actionLoading && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      )}

      {showConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon 
            count={60} 
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  goldBadge: {
    backgroundColor: '#1a1a30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goldText: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
  subtitle: {
    color: '#888',
    paddingHorizontal: 20,
    marginBottom: 16,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#0a0a1a' },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'flex-start',
  },
  itemCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    // Force a max width for 3 columns to stop extreme stretching on edge cases
    maxWidth: '31%',
    minWidth: '30%',
  },
  itemCardEquipped: {
    borderColor: '#FFD700',
    backgroundColor: '#1a1a20',
  },
  itemCardLocked: {
    opacity: 0.8,
  },
  emojiText: {
    fontSize: 48,
    marginBottom: 8,
  },
  itemLabel: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadgeEquipped: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 'auto',
  },
  statusTextEquipped: {
    color: '#0a0a1a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadgeOwned: {
    backgroundColor: '#3a3a5e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 'auto',
  },
  statusTextOwned: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: '#1a1a30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    marginTop: 'auto',
  },
  priceText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,26,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
