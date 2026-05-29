import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
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
import AnalogCountdownClock from '../components/AnalogCountdownClock';

const MAX_MAPS = 5;
const MAPS_REFILL_SECONDS = 3600;
const MAX_ADS_PER_DAY = 3;

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


const QUIZZES = [
  {
    screen: 'MillionaireQuiz' as const,
    title: 'Millionaire Quiz',
    goldAmount: '10,000',
    goldSuffix: '/ 1,000 XP max prize',
    emoji: '💰',
  },
  {
    screen: 'FlagQuiz' as const,
    title: 'Flag Quiz',
    goldAmount: '10',
    goldSuffix: '/ 5 XP per correct',
    emoji: '🏴',
  },
  {
    screen: 'ShapeQuiz' as const,
    title: 'Shape Quiz',
    goldAmount: '15',
    goldSuffix: '/ 7 XP per correct',
    emoji: '🗺️',
  },
  {
    screen: 'CapitalsQuiz' as const,
    title: 'Capitals Quiz',
    goldAmount: '18',
    goldSuffix: '/ 12 XP per correct',
    emoji: '🏛️',
  },
  {
    screen: 'BordersQuiz' as const,
    title: 'Borders Quiz',
    goldAmount: '20',
    goldSuffix: '/ 15 XP per correct',
    emoji: '🧩',
  },
  {
    screen: 'TrailQuiz' as const,
    title: 'Trail Quiz',
    goldAmount: '22',
    goldSuffix: '/ 16 XP per correct',
    emoji: '🧭',
  },
];

export default function QuizMenuScreen({ navigation }: Props) {
  const { disabledUpgrades, unlockedItems, profile, purchaseTicket, purchaseTickets, maps, mapsNextRefillAt, mapsAdsUsedToday, deductMap, grantAdMap, syncMaps } = useAuth();
  const { showAlert } = useAlert();
  const { showToast } = useToast();
  const { questHighlightId } = useGame();
  const [showGoldShop, setShowGoldShop] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [nightmareCompleted, setNightmareCompleted] = useState(false);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [mapsRemainingSeconds, setMapsRemainingSeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const navigatingRef = useRef(false);
  const tickets = profile?.tickets ?? 0;
  const gold = profile?.gold_balance ?? 0;
  const playerLevel = getLevelInfo(profile?.xp ?? 0).level;
  const isConqueror = profile?.is_conquerer ?? false;
  const skipMapCheck = isConqueror || unlockedItems.has('upgrade_infinite_maps');

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
      setShowTicketModal(false);
    }
  }

  async function handleWatchAdForMap() {
    if (!profile) return;
    setActionLoading(true);
    try {
      const adResult = await showRewardedAd();
      if (!adResult.rewarded) {
        showAlert({ title: 'Ad Unavailable', message: `Could not load a rewarded ad right now. Please try again.\n\n[${adResult.reason ?? 'unknown'}${adResult.errorCode ? ` · ${adResult.errorCode}` : ''}${adResult.errorMessage ? `\n${adResult.errorMessage}` : ''}]` });
        return;
      }
      await grantAdMap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ title: 'Map Added!', message: 'Enjoy your quiz.' });
      setShowMapsModal(false);
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false;
      syncMaps();
      const key = profile?.id
        ? `@achievements/${profile.id}/nightmare_completed`
        : '@achievements/nightmare_completed';
      AsyncStorage.getItem(key).then(val => setNightmareCompleted(val === 'true'));
    }, [profile?.id])
  );

  useEffect(() => {
    if (!mapsNextRefillAt) {
      setMapsRemainingSeconds(0);
      return;
    }
    function update() {
      setMapsRemainingSeconds(Math.max(0, Math.floor((mapsNextRefillAt!.getTime() - Date.now()) / 1000)));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [mapsNextRefillAt]);

  function showRewardsInfo() {
    showAlert({
      title: 'How It Works',
      messageAlign: 'left',
      contentNode: (
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          {[
            { img: require('../../assets/avatars/ancient_map.png'), text: 'Each quiz costs 1 map. Get 100% correct and your map is refunded.' },
            { img: require('../../assets/avatars/raffle_ticket.png'), text: 'The Millionaire Quiz costs 1 ticket instead of a map.' },
            { img: require('../../assets/avatars/gold_bag.png'), text: 'Earn gold from quizzes, then spend it in the Shop to buy countries and expand your empire.' },
          ].map(({ img, text }, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Image source={img} style={{ width: 20, height: 20, marginTop: 1 }} resizeMode="contain" />
              <Text style={{ color: '#bbb', fontSize: 13, lineHeight: 19, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>
      ),
      message:
        '— Gold multipliers —\n\n' +
        '×1.0 — combo 1\n' +
        '×1.1 — combo 2\n' +
        '×1.2 — combo 3\n' +
        '... (+10% per extra streak)\n\n' +
        '— XP multipliers —\n\n' +
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
          {!skipMapCheck && (
            <TouchableOpacity onPress={() => setShowMapsModal(true)}>
              <View style={[styles.currencyPill, maps === 0 && { borderColor: '#ff4444' }]}>
                <View style={[styles.currencyIcon, { backgroundColor: '#0a1a0a' }]}>
                  <Image source={require('../../assets/avatars/ancient_map.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                </View>
                <Text style={[styles.currencyAmount, maps === 0 && { color: '#ff8888' }]}>
                  {maps} / {MAX_MAPS}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowTicketModal(true)}>
            <View style={styles.currencyPill}>
              <View style={[styles.currencyIcon, styles.currencyIconTicket]}>
                <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
              </View>
              <Text style={styles.currencyAmount}>{tickets}</Text>
              <Text style={styles.currencyPillPlus}>+</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {!profile?.is_conquerer && (
        <TouchableOpacity
          style={styles.commanderBanner}
          onPress={() => navigation.getParent()?.navigate('Premium')}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('../../assets/avatars/crown.png')} style={{ width: 16, height: 16 }} resizeMode='contain' />
            <Text style={styles.commanderBannerText}>Conqueror's Pass — Unlock Everything</Text>
          </View>
        </TouchableOpacity>
      )}

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
            isLocked = playerLevel < 40;
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
              goldRewardParts={{ amount: quiz.goldAmount, suffix: quiz.goldSuffix }}
              iconNode={QUIZ_ICON_IMAGES[quiz.emoji] ? <Image source={QUIZ_ICON_IMAGES[quiz.emoji]} style={{ width: 42, height: 42 }} resizeMode="contain" /> : undefined}
              emoji={QUIZ_ICON_IMAGES[quiz.emoji] ? undefined : quiz.emoji}
              isLocked={isLocked}
              cardState={lockReason === 'trail_level' ? 'leveled' : (isLocked ? 'unique' : undefined)}
              costBadge={isMillionaire ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
                  <Text style={{ color: '#aaa', fontSize: 12 }}>1 ticket</Text>
                </View>
              ) : lockReason === 'trail_level' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" />
                  <Text style={{ color: '#8ab4ff', fontSize: 12, fontWeight: '700' }}>Lvl 40</Text>
                </View>
              ) : undefined}
              style={isMillionaire ? { borderColor: '#FFD700', borderWidth: 1 } : undefined}
              shouldBlink={shouldBlink}
              onPress={async () => {
                if (isLocked) {
                  if (lockReason === 'trail_level') {
                    showAlert({
                      variant: 'leveled',
                      title: 'Trail Quiz Locked',
                      message: `Reach Level 40 to unlock Trail Quiz.\n\nCurrent level: ${playerLevel}`,
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
                } else if (isMillionaire) {
                  if (navigatingRef.current) return;
                  navigatingRef.current = true;
                  navigation.navigate(quiz.screen);
                } else if (!skipMapCheck && maps <= 0) {
                  setShowMapsModal(true);
                } else {
                  if (navigatingRef.current) return;
                  navigatingRef.current = true;
                  if (!skipMapCheck) {
                    const ok = await deductMap();
                    if (!ok) { navigatingRef.current = false; setShowMapsModal(true); return; }
                  }
                  navigation.navigate(quiz.screen);
                }
              }}
            />
          );
        })}

        {(() => {
          const gauntletLocked = playerLevel < 75;
          return (
            <QuizCard
              title="The Gauntlet"
              goldRewardParts={{ amount: '25', suffix: '/ 25 XP per correct' }}
              iconNode={<Image source={require('../../assets/avatars/galaxy.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />}
              isLocked={gauntletLocked}
              cardState={gauntletLocked ? 'leveled' : undefined}
              costBadge={gauntletLocked
                ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Image source={require('../../assets/avatars/lock.png')} style={{ width: 12, height: 12 }} resizeMode="contain" /><Text style={{ color: '#8ab4ff', fontSize: 12, fontWeight: '700' }}>Lvl 75</Text></View>
                : <Text style={{ color: '#ff6b35', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>ENDGAME</Text>
              }
              style={{ borderColor: '#ff6b35', borderWidth: 1.5 }}
              onPress={async () => {
                if (gauntletLocked) {
                  showAlert({
                    variant: 'leveled',
                    title: 'Gauntlet Locked',
                    message: `Reach Level 75 to unlock The Gauntlet.\n\nCurrent level: ${playerLevel}`,
                  });
                  return;
                }
                if (!skipMapCheck && maps <= 0) {
                  setShowMapsModal(true);
                  return;
                }
                if (navigatingRef.current) return;
                navigatingRef.current = true;
                if (!skipMapCheck) {
                  const ok = await deductMap();
                  if (!ok) { navigatingRef.current = false; setShowMapsModal(true); return; }
                }
                navigation.navigate('Gauntlet' as any);
              }}
            />
          );
        })()}

        {(() => {
          const isBought = unlockedItems.has('upgrade_nightmare');
          const isEnabled = !disabledUpgrades.has('upgrade_nightmare');
          const isUnlocked = isBought && isEnabled;

          return (
            <QuizCard
              title={isUnlocked ? "The Nightmare" : "???"}
              goldRewardParts={isUnlocked ? {
                amount: nightmareCompleted ? '2,000' : '50,000',
                suffix: nightmareCompleted ? '/ repeat reward' : '/ one-time reward',
              } : undefined}
              goldReward={!isUnlocked ? "???" : undefined}
              iconNode={<Image source={require('../../assets/avatars/beast_mark.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />}
              onPress={async () => {
                if (isUnlocked) {
                  if (!skipMapCheck && maps <= 0) {
                    setShowMapsModal(true);
                    return;
                  }
                  if (navigatingRef.current) return;
                  navigatingRef.current = true;
                  if (!skipMapCheck) {
                    const ok = await deductMap();
                    if (!ok) { navigatingRef.current = false; setShowMapsModal(true); return; }
                  }
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
              <Text style={styles.ticketModalTitle}>Acquire Millionaire Tickets</Text>
            </View>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 4, borderColor: '#c0392b' }]}
              onPress={handleBuyTicket}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/raffle_ticket.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>1 Ticket</Text>
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
                <Text style={styles.upgradeTitle}>5 Tickets</Text>
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
                <Text style={styles.upgradeTitle}>1 Ad = 1 Ticket</Text>
              </View>
              <View style={[styles.goldBadge, { backgroundColor: '#9b59b6', borderColor: '#9b59b6', marginLeft: -8, marginRight: 8 }]}>
                <Text style={styles.goldText}>Watch</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ticketModalCancel} onPress={() => setShowTicketModal(false)}>
              <Text style={styles.ticketModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Out of Maps modal */}
      <Modal visible={showMapsModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowMapsModal(false)}>
        <TouchableOpacity style={styles.ticketModalOverlay} activeOpacity={1} onPress={() => setShowMapsModal(false)}>
          <View style={styles.ticketModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={[styles.ticketModalTitle, { fontSize: 18, textAlign: 'center', marginBottom: 8 }]}>
              {maps === 0 ? 'Out of Maps!' : 'Ready to Conquer!'}
            </Text>

            {maps < MAX_MAPS && mapsRemainingSeconds > 0 && (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <AnalogCountdownClock
                  remainingSeconds={mapsRemainingSeconds}
                  totalSeconds={MAPS_REFILL_SECONDS}
                  format="mm:ss"
                  size={96}
                  color="#FFD700"
                />
                <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                  Next map in {Math.ceil(mapsRemainingSeconds / 60)}m
                </Text>
              </View>
            )}

            <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
              {maps === 0 ? 'Maps refill 1 every 60 minutes.' : `${maps} / ${MAX_MAPS} maps remaining. 1 per quiz.`}
            </Text>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 2, borderColor: '#9b59b6', backgroundColor: '#1a0a2e' }]}
              onPress={() => { setShowMapsModal(false); navigation.getParent()?.getParent()?.navigate('Premium' as any); }}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/conqueror.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={[styles.upgradeTitle, { fontSize: 12 }]} numberOfLines={1}>Become a Conqueror</Text>
                <Text style={styles.upgradeDesc}>Unlimited maps — never wait again</Text>
              </View>
              <View style={[styles.goldBadge, { backgroundColor: '#3a1a5a', borderColor: '#9b59b6' }]}>
                <Text style={[styles.goldText, { color: '#c084fc' }]}>Go</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.upgradeCard, { padding: 2, borderColor: '#FFD700', opacity: mapsAdsUsedToday >= MAX_ADS_PER_DAY || actionLoading ? 0.5 : 1 }]}
              onPress={handleWatchAdForMap}
              disabled={mapsAdsUsedToday >= MAX_ADS_PER_DAY || actionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/star2.png')} style={styles.upgradeCardImageLarge} resizeMode="contain" />
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeTitle}>Watch an Ad</Text>
                <Text style={styles.upgradeDesc}>{mapsAdsUsedToday >= MAX_ADS_PER_DAY ? 'Come back tomorrow' : `Get 1 map · ${MAX_ADS_PER_DAY - mapsAdsUsedToday} left today`}</Text>
              </View>
              <View style={[styles.goldBadge, { backgroundColor: '#302a10', borderColor: '#FFD700' }]}>
                <Text style={styles.goldText}>Watch</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ticketModalCancel} onPress={() => setShowMapsModal(false)}>
              <Text style={styles.ticketModalCancelText}>{maps > 0 ? "Let's Go!" : 'Wait'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a1a' },
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
  commanderBannerText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
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
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  ticketModalContainer: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    padding: 12,
    width: '100%',
    gap: 8,
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
    alignSelf: 'stretch' as const,
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
    minWidth: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  goldText: { color: '#FFD700', fontWeight: 'bold' },
});

