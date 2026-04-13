import React, { useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList } from '../types';
import QuizCard from '../components/QuizCard';
import DailyRewardModal from '../components/DailyRewardModal';
import GoldShopScreen from './GoldShopScreen';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useAlert } from '../context/AlertContext';
import { useToast } from '../context/ToastContext';
import { playPurchasedItem } from '../lib/audio';
import * as Haptics from 'expo-haptics';
import { showRewardedAd } from '../lib/rewardedAds';
import { getLevelInfo } from '../lib/xpSystem';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'QuizMenu'>;
};

const QUIZ_ICON_IMAGES: Record<string, any> = {
  '🏴': require('../../assets/avatars/flags.png'),
  '🗺️': require('../../assets/avatars/shape.png'),
  '🏛️': require('../../assets/avatars/building.png'),
  '🧩': require('../../assets/avatars/border.png'),
  '🧭': require('../../assets/avatars/compass.png'),
  '💰': require('../../assets/avatars/gold_bag.png'),
};

const TerrorIcon = ({ size = 48 }) => (
  <Image
    source={require('../../assets/avatars/demon_hand.png')}
    style={{ width: size, height: size, transform: [{ rotate: '180deg' }] }}
    resizeMode="contain"
  />
);

const QUIZZES = [
  {
    screen: 'FlagQuiz' as const,
    title: 'Flag Quiz',
    description: 'Identify the country from its flag',
    goldAmount: '10',
    goldSuffix: '/ 5 XP per correct',
    emoji: '🏴',
  },
  {
    screen: 'ShapeQuiz' as const,
    title: 'Shape Quiz',
    description: 'Recognize countries by their silhouette',
    goldAmount: '15',
    goldSuffix: '/ 7 XP per correct',
    emoji: '🗺️',
  },
  {
    screen: 'CapitalsQuiz' as const,
    title: 'Capitals Quiz',
    description: 'Match the capital city to its country',
    goldAmount: '18',
    goldSuffix: '/ 12 XP per correct',
    emoji: '🏛️',
  },
  {
    screen: 'BordersQuiz' as const,
    title: 'Borders Quiz',
    description: 'Find the country that does NOT share a border',
    goldAmount: '20',
    goldSuffix: '/ 15 XP per correct',
    emoji: '🧩',
  },
  {
    screen: 'TrailQuiz' as const,
    title: 'Trail Quiz',
    description: 'Hop across neighboring countries by name/capital',
    goldAmount: '22',
    goldSuffix: '/ 16 XP per correct',
    emoji: '🧭',
  },
  {
    screen: 'MillionaireQuiz' as const,
    title: 'Millionaire Quiz',
    description: 'Answer 15 questions for the grand prize!',
    goldAmount: '10,000',
    goldSuffix: '/ 1,000 XP max prize',
    emoji: '💰',
  },
];

export default function QuizMenuScreen({ navigation }: Props) {
  const { disabledUpgrades, unlockedItems, profile, purchaseTicket, purchaseTickets } = useAuth();
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const { questHighlightId } = useGame();
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const tickets = profile?.tickets ?? 0;
  const gold = profile?.gold_balance ?? 0;
  const playerLevel = getLevelInfo(profile?.xp ?? 0).level;

  const TICKET_COST = 2000;
  const PACK_COST = 8500;

  async function handleBuyTicket() {
    if (!profile) return;
    if (gold < TICKET_COST) {
      setShowTicketModal(false);
      setShowGoldShop(true);
      return;
    }
    setActionLoading(true);
    try {
      await purchaseTicket(TICKET_COST);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playPurchasedItem();
      showToast({ title: 'Ticket Added', message: '1 ticket added to your inventory.' });
    } catch (err: any) {
      showAlert({ title: 'Purchase Failed', message: err.message });
    } finally {
      setActionLoading(false);
      setShowTicketModal(false);
    }
  }

  async function handleBuyTicketPack() {
    if (!profile) return;
    if (gold < PACK_COST) {
      setShowTicketModal(false);
      setShowGoldShop(true);
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
      setShowTicketModal(false);
    }
  }

  async function handleWatchAdForTicket() {
    if (!profile) return;
    setActionLoading(true);
    try {
      const { rewarded } = await showRewardedAd();
      if (!rewarded) {
        showAlert({ title: 'Ad Unavailable', message: 'Could not load a rewarded ad right now. Please try again.' });
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
      setShowTicketModal(false);
    }
  }

  function showRewardsInfo() {
    showAlert({
      title: 'Multipliers',
      messageAlign: 'left',
      message:
        'Gold scales by combo streak:\n\n' +
        '×1.0 — combo 1\n' +
        '×1.1 — combo 2\n' +
        '×1.2 — combo 3\n' +
        '... (+10% per extra streak)\n\n' +
        'XP scales by accuracy:\n\n' +
        '×1.0 — any score\n' +
        '×1.5 — above 85% accuracy\n' +
        '×2.0 — perfect score',
    });
  }

  return (
    <View style={styles.screen}>
      {/* Inline header matching Shop */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Quizzes</Text>
          <TouchableOpacity style={styles.infoBtn} onPress={showRewardsInfo}>
            <Text style={styles.infoBtnText}>?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowTicketModal(true)}>
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

      <ScrollView contentContainerStyle={styles.container}>
        {QUIZZES.map((quiz) => {
          let isLocked = false;
          let lockReason: 'upgrade_capitals' | 'upgrade_borders' | 'trail_level' | null = null;

          if (quiz.screen === 'CapitalsQuiz') {
            isLocked = !unlockedItems.has('upgrade_capitals');
            if (isLocked) lockReason = 'upgrade_capitals';
          } else if (quiz.screen === 'BordersQuiz') {
            isLocked = !unlockedItems.has('upgrade_borders');
            if (isLocked) lockReason = 'upgrade_borders';
          } else if (quiz.screen === 'TrailQuiz') {
            isLocked = playerLevel < 50;
            if (isLocked) lockReason = 'trail_level';
          }

          const isMillionaire = quiz.screen === 'MillionaireQuiz';

          // Map quiz screens to achievement IDs for highlighting
          const achievementIdForQuiz: Record<string, string> = {
            'FlagQuiz': 'flag_mastery_30s',
            'CapitalsQuiz': 'ground_invasion',
          };

          const shouldBlink = questHighlightId ? achievementIdForQuiz[quiz.screen] === questHighlightId : undefined;

          return (
            <QuizCard
              key={quiz.screen}
              title={quiz.title}
              description={quiz.description}
              goldRewardParts={{ amount: quiz.goldAmount, suffix: quiz.goldSuffix }}
              iconNode={QUIZ_ICON_IMAGES[quiz.emoji] ? <Image source={QUIZ_ICON_IMAGES[quiz.emoji]} style={{ width: 32, height: 32 }} resizeMode="contain" /> : undefined}
              emoji={QUIZ_ICON_IMAGES[quiz.emoji] ? undefined : quiz.emoji}
              isLocked={isLocked}
              cardState={lockReason === 'trail_level' ? 'leveled' : (isLocked ? 'unique' : undefined)}
              costBadge={isMillionaire ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
                  <Text style={{ color: '#aaa', fontSize: 12 }}>1 ticket</Text>
                </View>
              ) : lockReason === 'trail_level' ? (
                <Text style={{ color: '#8ab4ff', fontSize: 12, fontWeight: '700' }}>🔒 Lvl 50</Text>
              ) : undefined}
              shouldBlink={shouldBlink}
              onPress={() => {
                if (isLocked) {
                  if (lockReason === 'trail_level') {
                    showAlert({
                      variant: 'leveled',
                      title: 'Trail Quiz Locked',
                      message: `Reach Level 50 to unlock Trail Quiz.\n\nCurrent level: ${playerLevel}`,
                    });
                  } else {
                    const isCapitals = quiz.screen === 'CapitalsQuiz';
                    showAlert({
                      variant: 'unique',
                      title: 'Quiz Locked',
                      message: isCapitals
                        ? 'Unlock the Capitals Quiz in the Shop.'
                        : 'Unlock the Borders Quiz in the Shop.',
                      buttons: [
                        { text: 'Display in Shop', style: 'cta', onPress: () => navigation.getParent()?.navigate('Shop', { initialTab: 'upgrades' }) },
                        { text: 'Got it', style: 'cancel' },
                      ],
                    });
                  }
                } else if (isMillionaire && tickets < 1) {
                  showAlert({
                    variant: 'ticket',
                    title: 'No Tickets',
                    message: 'You need at least 1 ticket to play the Millionaire Quiz.\n\nEarn tickets from daily rewards or buy them in Shop → Items.',
                  });
                } else {
                  navigation.navigate(quiz.screen);
                }
              }}
            />
          );
        })}

        {(() => {
          const isBought = unlockedItems.has('upgrade_nightmare');
          const isEnabled = !disabledUpgrades.has('upgrade_nightmare');
          const isUnlocked = isBought && isEnabled;

          return (
            <QuizCard
              title={isUnlocked ? "Nightmare Quiz" : "???"}
              description={isUnlocked ? "Is it worth it...?" : ""}
              goldReward={isUnlocked ? "" : "???"}
              iconNode={<TerrorIcon />}
              onPress={() => {
                if (isUnlocked) {
                  navigation.navigate('NightmareQuiz' as any);
                }
              }}
              style={{
                borderColor: '#b30000',
                borderWidth: 2,
                backgroundColor: '#2a0000',
                shadowColor: '#ff0000',
                shadowOpacity: 0.8,
                shadowRadius: 15,
                elevation: 10,
              }}
            />
          );
        })()}

        <DailyRewardModal />
      </ScrollView>

      {/* Gold shop */}
      <Modal visible={showGoldShop} animationType="slide" onRequestClose={() => setShowGoldShop(false)}>
        <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
          <View style={{ paddingTop: 56, paddingBottom: 8, paddingHorizontal: 16, backgroundColor: '#0a0a1a' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#1a1a2e', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' as const }}
              onPress={() => setShowGoldShop(false)}
            >
              <Text style={{ color: '#aaa', fontSize: 14 }}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <GoldShopScreen />
        </View>
      </Modal>

      {/* Ticket shop modal */}
      <Modal visible={showTicketModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowTicketModal(false)}>
        <TouchableOpacity style={styles.ticketModalOverlay} activeOpacity={1} onPress={() => setShowTicketModal(false)}>
          <View style={styles.ticketModalContainer} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Text style={styles.ticketModalTitle}>acquire millionaire tickets</Text>
            </View>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 4, borderColor: '#c0392b' }]}
              onPress={handleBuyTicket}
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
              onPress={handleBuyTicketPack}
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
              onPress={handleWatchAdForTicket}
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

            <TouchableOpacity style={styles.ticketModalCancel} onPress={() => setShowTicketModal(false)}>
              <Text style={styles.ticketModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#3a3a5e', alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  container: { flexGrow: 1, padding: 12, justifyContent: 'center' },
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
  currencyIconTicket: {
    backgroundColor: '#1a0a2a',
  },
  currencyIconText: { fontSize: 15 },
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
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  ticketModalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ticketModalCancel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 2,
  },
  ticketModalCancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
  upgradeCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#13132a',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a5e',
    overflow: 'hidden' as const,
    gap: 10,
  },
  upgradeCardImageLarge: { width: 56, height: 56 },
  upgradeInfo: { flex: 1, paddingVertical: 10 },
  upgradeTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  upgradeDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  goldBadge: {
    backgroundColor: '#302a10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  goldText: { color: '#FFD700', fontWeight: 'bold' },
});
