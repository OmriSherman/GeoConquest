import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { View as FallbackView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { QuizStackParamList } from '../types';
import {
  playBoo,
  playFail,
  playSuccess,
  playMillionairePrize,
  playDevilLaugh,
  playXpGain,
  playPurchase,
} from '../lib/audio';
import { recordQuizCompletion } from './AchievementsScreen';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useGame } from '../context/GameContext';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { calcQuizXP, getLevelInfo } from '../lib/xpSystem';
import TopFallConfetti from '../components/TopFallConfetti';
import { showRewardedAd } from '../lib/rewardedAds';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'QuizResults'>;
  route: RouteProp<QuizStackParamList, 'QuizResults'>;
};

const RESULT_ICON_IMAGES: Record<string, any> = {
  png_lightning: require('../../assets/avatars/lightning.png'),
  png_evil_vanquished: require('../../assets/avatars/evil_vanquished.png'),
  png_crossed_swords: require('../../assets/avatars/crossed_swords.png'),
};

let ViewShot: any = FallbackView;
let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  const vs = require('react-native-view-shot');
  ViewShot = vs.default;
  captureRef = vs.captureRef;
} catch {
  // optional dependency
}

let Sharing: { isAvailableAsync: () => Promise<boolean>; shareAsync: (uri: string, opts?: any) => Promise<void> } | null = null;
try {
  Sharing = require('expo-sharing');
} catch {
  // optional dependency
}

function achIconNode(key: string | undefined, fallback: string) {
  const src = key && RESULT_ICON_IMAGES[key];
  if (src) return <Image source={src} style={{ width: 20, height: 20 }} resizeMode="contain" />;
  return <Text style={{ fontSize: 20 }}>{key ?? fallback}</Text>;
}

export default function QuizResultsScreen({ navigation, route }: Props) {
  const { score, total, goldEarned, quizType, elapsedSeconds } = route.params;
  const percentage = Math.round((score / total) * 100);
  const { showToast } = useToast();
  const { user, addXP, addGold, profile, incrementQuizCount, nextQuizBoostActive, setNextQuizBoostActive, consumeNextQuizBoost } = useAuth();
  const { showAlert } = useAlert();
  const { triggerQuestToast } = useGame();

  const tickets = profile?.tickets ?? 0;

  const [xpEarned, setXpEarned] = useState(0);
  const [xpTier, setXpTier] = useState<1 | 1.5 | 2>(1);
  const [boostApplied, setBoostApplied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [levelBonusGold, setLevelBonusGold] = useState(0);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [coinBurstNonce, setCoinBurstNonce] = useState(0);

  const [displayGoldGain, setDisplayGoldGain] = useState(goldEarned);
  const initialGoldTotal = Math.max(0, (profile?.gold_balance ?? 0) - goldEarned);
  const initialXpTotal = profile?.xp ?? 0;
  const [displayGoldTotal, setDisplayGoldTotal] = useState(initialGoldTotal);
  const [displayXpTotal, setDisplayXpTotal] = useState(initialXpTotal);

  const cardCaptureRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);
  const animatedLevelRef = useRef(getLevelInfo(initialXpTotal).level);
  const displayGoldRef = useRef(initialGoldTotal);
  const displayXpRef = useRef(initialXpTotal);

  const levelUpY = useRef(new Animated.Value(-80)).current;
  const levelUpOpacity = useRef(new Animated.Value(0)).current;
  const levelBonusScale = useRef(new Animated.Value(0.85)).current;
  const levelBonusOpacity = useRef(new Animated.Value(0)).current;
  const coinBurstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const QUIZ_LABELS: Record<string, string> = {
    flag: 'Flag Quiz',
    shape: 'Shape Quiz',
    capitals: 'Capitals Quiz',
    borders: 'Borders Quiz',
    millionaire: 'Millionaire Quiz',
    nightmare: 'Nightmare Mode',
  };

  async function handleShare() {
    if (!captureRef || !cardCaptureRef.current) {
      await Share.share({
        message: `I scored ${score}/${total} on ${QUIZ_LABELS[quizType] ?? quizType} in GeoConquest!\n\nCan you beat me? Download GeoConquest and prove your geography knowledge!`,
      });
      return;
    }

    try {
      const uri = await captureRef(cardCaptureRef, { format: 'png', quality: 0.95 });
      const isAvailable = Sharing ? await Sharing.isAvailableAsync() : false;
      if (!isAvailable) {
        await Share.share({
          message: `I scored ${score}/${total} on ${QUIZ_LABELS[quizType] ?? quizType} in GeoConquest!\n\nCan you beat me? Download GeoConquest and prove your geography knowledge!`,
        });
        return;
      }
      await Sharing?.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Your Result' });
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }

  function triggerLevelUp(newLevel: number) {
    setLevelUpTo(newLevel);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(levelUpY, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(levelUpOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(2500),
      Animated.parallel([
        Animated.timing(levelUpY, { toValue: -80, duration: 600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(levelUpOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function triggerLevelBonusVisual(bonusGold: number) {
    if (bonusGold <= 0) return;
    setLevelBonusGold(bonusGold);
    setCoinBurstNonce((n) => n + 1);
    setShowCoinBurst(true);
    if (coinBurstTimeoutRef.current) clearTimeout(coinBurstTimeoutRef.current);
    coinBurstTimeoutRef.current = setTimeout(() => setShowCoinBurst(false), 900);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(levelBonusOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(levelBonusScale, { toValue: 1.06, tension: 110, friction: 8, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(levelBonusOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(levelBonusScale, { toValue: 0.92, duration: 420, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function stopActiveAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function animateCounterValue(
    from: number,
    to: number,
    durationMs: number,
    onUpdate: (value: number) => void,
  ): Promise<void> {
    if (from === to) return Promise.resolve();

    stopActiveAnimation();

    return new Promise((resolve) => {
      const startAt = Date.now();
      const frame = () => {
        if (isUnmountedRef.current) {
          resolve();
          return;
        }

        const elapsed = Date.now() - startAt;
        const t = Math.min(elapsed / durationMs, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const next = Math.round(from + (to - from) * eased);

        onUpdate(next);

        if (t >= 1) {
          animationFrameRef.current = null;
          resolve();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(frame);
      };

      animationFrameRef.current = requestAnimationFrame(frame);
    });
  }

  async function animateGoldDelta(delta: number) {
    if (delta === 0) return;

    const start = displayGoldRef.current;
    const target = Math.max(0, start + delta);
    const gainStart = Math.max(0, delta);

    await animateCounterValue(start, target, 1100, (value) => {
      displayGoldRef.current = value;
      setDisplayGoldTotal(value);
      if (delta > 0) {
        const transferred = Math.max(0, value - start);
        setDisplayGoldGain(Math.max(0, gainStart - transferred));
      }
    });

    if (delta > 0) setDisplayGoldGain(0);
  }

  async function animateXpDelta(
    delta: number,
    bonusGoldFromLevelUp: number,
    onLevelBonusApplied?: () => void,
  ) {
    if (delta <= 0) return;
    const xpAnimationDurationMs = 1700;
    const xpTickSound = playXpGain(xpAnimationDurationMs, 10);

    const start = displayXpRef.current;
    const target = Math.max(0, start + delta);
    let levelBonusVisualShown = false;

    await animateCounterValue(start, target, xpAnimationDurationMs, (value) => {
      displayXpRef.current = value;
      setDisplayXpTotal(value);

      const levelNow = getLevelInfo(value).level;
      if (levelNow > animatedLevelRef.current) {
        animatedLevelRef.current = levelNow;
        triggerLevelUp(levelNow);
        if (!levelBonusVisualShown && bonusGoldFromLevelUp > 0) {
          levelBonusVisualShown = true;
          onLevelBonusApplied?.();
          triggerLevelBonusVisual(bonusGoldFromLevelUp);
        }
      }
    });

    await xpTickSound;
  }

  async function playResultSound() {
    if (quizType === 'millionaire') {
      if (score === total) await playMillionairePrize();
      else if (score >= 5) await playFail();
      else await playBoo();
      return;
    }

    if (quizType === 'nightmare') {
      if (percentage === 100) await playMillionairePrize();
      else await playDevilLaugh();
      return;
    }

    if (percentage >= 85) await playSuccess();
    else if (percentage >= 30) await playFail();
    else await playBoo();
  }

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (percentage === 100) {
      setTimeout(() => setShowConfetti(true), 350);
    }

    incrementQuizCount().then((bonusClaimed) => {
      if (bonusClaimed) {
        showToast({
          title: 'Referral Bonus!',
          message: 'You and your friend both received 1,500 gold!',
          icon: <Text style={{ fontSize: 20 }}>💰</Text>,
          duration: 4000,
        });
      }
    });

    recordQuizCompletion({
      quizType,
      perfect: percentage === 100,
      scorePercentage: percentage,
      durationSeconds: elapsedSeconds ?? 0,
      goldEarned,
      userId: user?.id,
    }).then(async ({ newlyCompletedSpeedDemon, newlyCompletedNightmare, newlyCompletedCapitalsMastery }) => {
      if (newlyCompletedSpeedDemon) {
        const ach = ACHIEVEMENTS_DATA.find((a) => a.id === 'flag_mastery_30s');
        showToast({
          title: 'Quest Complete!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : 'Flag Quiz Speed Demon!',
          icon: achIconNode(ach?.icon, '⚡'),
          duration: 3500,
        });
      }

      if (newlyCompletedNightmare) {
        const ach = ACHIEVEMENTS_DATA.find((a) => a.id === 'nightmare_complete');
        showToast({
          title: 'Quest Unlocked!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : 'Nightmare Survived!',
          icon: achIconNode(ach?.icon, '💀'),
          duration: 3500,
        });
      }

      if (newlyCompletedCapitalsMastery) {
        const ach = ACHIEVEMENTS_DATA.find((a) => a.id === 'ground_invasion');
        showToast({
          title: 'Quest Complete!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : 'Ground Invasion!',
          icon: achIconNode(ach?.icon, '⚔️'),
          duration: 3500,
        });
      }

      if (newlyCompletedSpeedDemon || newlyCompletedNightmare || newlyCompletedCapitalsMastery) {
        setShowConfetti(true);
      }

      const xp = calcQuizXP(quizType, score, total, newlyCompletedNightmare);
      const isBoostEligibleQuiz = ['flag', 'shape', 'capitals', 'borders'].includes(quizType);
      const shouldApplyBoost = isBoostEligibleQuiz && nextQuizBoostActive;
      const effectiveXp = shouldApplyBoost ? xp * 2 : xp;

      const quizResultUserId = user?.id ?? profile?.id;
      if (quizResultUserId) {
        supabase
          .from('quiz_results')
          .insert({
            user_id: quizResultUserId,
            quiz_type: quizType,
            score,
            gold_earned: goldEarned,
            total_questions: total,
            xp_earned: effectiveXp,
          })
          .then(({ error }) => {
            if (error) console.warn('[QuizResults] Failed to save quiz result:', error.message);
          });
      }

      let levelUpGoldBonus = 0;
      if (xp > 0) {
        const currentXp = profile?.xp ?? 0;
        const beforeLevel = getLevelInfo(currentXp).level;
        const afterLevel = getLevelInfo(currentXp + effectiveXp).level;
        if (afterLevel > beforeLevel) {
          levelUpGoldBonus = afterLevel * 20;
          await addGold(levelUpGoldBonus);
          const LEVEL_QUEST_THRESHOLDS = [10, 25, 30, 50, 80, 100];
          for (const threshold of LEVEL_QUEST_THRESHOLDS) {
            if (beforeLevel < threshold && afterLevel >= threshold) {
              const ach = ACHIEVEMENTS_DATA.find((a) => a.id === `level_${threshold}`);
              if (ach) triggerQuestToast(`${ach.title} — claim your reward in Quests!`, ach.id);
              break;
            }
          }
        }

        setXpEarned(effectiveXp);
        await addXP(xp);
        const accuracy = score / total;
        setXpTier(accuracy === 1 ? 2 : accuracy > 0.85 ? 1.5 : 1);
      }

      let boostGoldBonus = 0;
      if (shouldApplyBoost) {
        if (goldEarned > 0) {
          await addGold(goldEarned);
          boostGoldBonus = goldEarned;
        }
        if (xp > 0) await addXP(xp);
        await consumeNextQuizBoost();
        setBoostApplied(true);
        showToast({
          title: 'x2 Boost Used',
          message: 'Gold and XP were doubled for this quiz.',
        });
      }

      const quizGoldDelta = goldEarned + boostGoldBonus;
      const totalGoldDelta = quizGoldDelta + levelUpGoldBonus;

      if (quizType === 'millionaire' && goldEarned > 0) {
        await addGold(goldEarned);
      }

      setDisplayGoldGain(quizGoldDelta);

      await playResultSound();
      await animateXpDelta(effectiveXp, levelUpGoldBonus, () => {
        setDisplayGoldGain((prev) => prev + levelUpGoldBonus);
      });

      if (effectiveXp > 0) {
        playPurchase();
      }

      await animateGoldDelta(totalGoldDelta);

      if (totalGoldDelta > 0) {
        playPurchase();
      }
    });

    const isBoostOfferQuiz = ['flag', 'shape', 'capitals', 'borders'].includes(quizType);
    if (isBoostOfferQuiz && !nextQuizBoostActive && Math.random() < 0.07) {
      showAlert({
        title: 'Double Rewards Next Quiz?',
        message: 'Watch one ad now to get x2 Gold + x2 XP on your next quiz.',
        buttons: [
          {
            text: 'Watch Ad',
            style: 'cta',
            onPress: async () => {
              const { rewarded } = await showRewardedAd();
              if (!rewarded) {
                showAlert({ title: 'Ad Unavailable', message: 'Could not load an ad right now. Try again later.' });
                return;
              }
              await setNextQuizBoostActive(true);
              showToast({
                title: 'Boost Ready',
                message: 'Your next quiz rewards will be doubled.',
              });
            },
          },
          { text: 'Not now', style: 'cancel' },
        ],
      });
    }

    return () => {
      isUnmountedRef.current = true;
      stopActiveAnimation();
      if (coinBurstTimeoutRef.current) clearTimeout(coinBurstTimeoutRef.current);
    };
  }, []);

  function getRating(): { imageSource: any; label: string } {
    if (quizType === 'nightmare') {
      if (percentage === 100) return { imageSource: require('../../assets/avatars/skull.png'), label: 'Well played..' };
      return { imageSource: require('../../assets/avatars/demon_hand.png'), label: 'Pay up and get out' };
    }

    if (quizType === 'millionaire') {
      if (score === total) return { imageSource: require('../../assets/avatars/gold_bag.png'), label: 'Flawless Victory!' };
      if (score > 5) return { imageSource: require('../../assets/avatars/cringe.png'), label: 'Not good enough' };
      return { imageSource: require('../../assets/avatars/lmao.png'), label: 'No way you wasted a ticket for this..' };
    }

    if (percentage === 100) return { imageSource: require('../../assets/avatars/trophy.png'), label: 'Well played!' };
    if (percentage >= 80) return { imageSource: require('../../assets/avatars/bullseye.png'), label: 'Almost there!' };
    if (percentage >= 60) return { imageSource: require('../../assets/avatars/eyes.png'), label: 'Gotta pump those numbers up' };
    if (percentage >= 40) return { imageSource: require('../../assets/avatars/hand_shake.png'), label: 'Solid effort' };
    return { imageSource: require('../../assets/avatars/lmao.png'), label: 'Oof...' };
  }

  const rating = getRating();
  const isNightmare = quizType === 'nightmare';
  const animatedLevelInfo = getLevelInfo(displayXpTotal);
  const xpProgressPct =
    animatedLevelInfo.xpForNextLevel > 0
      ? Math.min((animatedLevelInfo.xpIntoLevel / animatedLevelInfo.xpForNextLevel) * 100, 100)
      : 100;

  const showGoldTransfer = displayGoldGain !== 0;

  return (
    <View style={[styles.container, isNightmare && styles.containerNightmare]}>
      <Image source={rating.imageSource} style={styles.ratingImage} resizeMode="contain" />
      <Text style={[styles.rating, isNightmare && styles.ratingNightmare]}>{rating.label}</Text>

      <ViewShot ref={cardCaptureRef} style={[styles.card, isNightmare && styles.cardNightmare]}>
        <Row label="Score" value={`${percentage}%`} />

        {elapsedSeconds != null && (
          <Row
            label="Total Time"
            value={`⏱ ${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`}
          />
        )}

        {xpEarned > 0 && <Row label="XP Earned" value={`+${xpEarned} XP`} xpTier={xpTier} />}
        {boostApplied && <Row label="Boost" value="x2 Applied" highlight />}

        <View style={styles.xpProgressSection}>
          <View style={styles.xpProgressHeader}>
            <Text style={styles.rowLabel}>Level {animatedLevelInfo.level}</Text>
            <Text style={styles.rowValueSmall}>
              {animatedLevelInfo.xpIntoLevel} / {animatedLevelInfo.xpForNextLevel || 0} XP
            </Text>
          </View>

          <View style={styles.xpProgressTrack}>
            <View style={[styles.xpProgressFill, { width: `${xpProgressPct}%` as any }]} />
          </View>

          <Animated.View style={[styles.levelBonusChip, { opacity: levelBonusOpacity, transform: [{ scale: levelBonusScale }] }]}>
            <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Text style={styles.levelBonusChipText}>Level-Up Bonus +{levelBonusGold.toLocaleString()}</Text>
          </Animated.View>

          {showCoinBurst && <CoinBurst key={coinBurstNonce} />}
        </View>

        <Row
          label="Gold"
          valueNode={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {showGoldTransfer ? (
                <>
                  <Text style={[styles.rowValue, displayGoldGain >= 0 ? styles.rowValueHighlight : styles.rowValueNegative]}>
                    {displayGoldGain > 0 ? `+${displayGoldGain.toLocaleString()}` : displayGoldGain.toLocaleString()}
                  </Text>
                  <Text style={styles.rowValueSmall}>→</Text>
                </>
              ) : null}
              <Text style={[styles.rowValue, styles.rowValueHighlight]}>{displayGoldTotal.toLocaleString()}</Text>
              <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
            </View>
          }
        />
      </ViewShot>

      <TouchableOpacity
        style={styles.playAgainButton}
        onPress={() => {
          if (quizType === 'millionaire') {
            if (tickets < 1) {
              showAlert({
                variant: 'ticket',
                title: 'No Tickets',
                message: 'You need at least 1 ticket to play again.\n\nEarn tickets from daily rewards or buy them in Shop → Items.',
              });
              return;
            }

            showAlert({
              variant: 'ticket',
              title: 'Play Again?',
              message: `This will cost 1 ticket. You have ${tickets} ticket${tickets !== 1 ? 's' : ''}.`,
              buttons: [
                { text: 'Play', style: 'cta', onPress: () => navigation.replace('MillionaireQuiz' as any) },
                { text: 'Cancel', style: 'cancel' },
              ],
            });
            return;
          }

          if (quizType === 'flag') navigation.replace('FlagQuiz');
          else if (quizType === 'shape') navigation.replace('ShapeQuiz');
          else if (quizType === 'borders') navigation.replace('BordersQuiz');
          else if (quizType === 'capitals') navigation.replace('CapitalsQuiz');
          else if (quizType === 'nightmare') navigation.replace('NightmareQuiz' as any);
        }}
      >
        <Text style={styles.playAgainText}>Play Again</Text>
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <TouchableOpacity style={[styles.menuButton, { flex: 1 }]} onPress={() => navigation.popToTop()}>
          <Text style={styles.menuText}>Back to Quizzes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shareButton, { flex: 1 }]} onPress={handleShare}>
          <Text style={styles.shareText}>Share Result</Text>
        </TouchableOpacity>
      </View>

      {showConfetti && <TopFallConfetti />}

      {levelUpTo !== null && (
        <Animated.View
          style={[styles.levelUpBanner, { transform: [{ translateY: levelUpY }], opacity: levelUpOpacity }]}
          pointerEvents="none"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.levelUpText}>Level Up — Level {levelUpTo}  (+{levelUpTo * 20}</Text>
            <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Text style={styles.levelUpText}>)</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  valueNode,
  highlight,
  negative,
  xpTier,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  highlight?: boolean;
  negative?: boolean;
  xpTier?: 1 | 1.5 | 2;
}) {
  const xpStyle = xpTier === 2 ? styles.rowValueXp2 : xpTier === 1.5 ? styles.rowValueXp15 : xpTier === 1 ? styles.rowValueXp1 : undefined;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {valueNode ?? (
        <Text style={[styles.rowValue, highlight && styles.rowValueHighlight, negative && styles.rowValueNegative, xpStyle]}>{value}</Text>
      )}
    </View>
  );
}

function CoinBurst() {
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: 780,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, progress]);

  return (
    <View style={styles.coinBurstLayer} pointerEvents="none">
      {Array.from({ length: 9 }).map((_, index) => {
        const angle = (-70 + index * 20) * (Math.PI / 180);
        const distance = 34 + (index % 3) * 14;
        const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance - 28] });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.45, 1.1, 0.8] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${120 + index * 18}deg`] });

        return (
          <Animated.Image
            key={`coin-${index}`}
            source={require('../../assets/avatars/gold_coin.png')}
            resizeMode="contain"
            style={[
              styles.coinBurstCoin,
              {
                opacity: fade,
                transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    gap: 14,
  },
  containerNightmare: {
    backgroundColor: '#0d0000',
  },
  ratingImage: { width: 120, height: 120 },
  rating: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  ratingNightmare: { color: '#ff8888', fontStyle: 'italic' },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardNightmare: {
    backgroundColor: '#1a0000',
    borderColor: '#ff4444',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { color: '#aaa', fontSize: 16 },
  rowValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  rowValueSmall: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  rowValueHighlight: { color: '#FFD700' },
  rowValueNegative: { color: '#f87171' },
  rowValueXp1: { color: '#94a3b8' },
  rowValueXp15: { color: '#34d399' },
  rowValueXp2: { color: '#fb923c' },
  xpProgressSection: {
    gap: 6,
    marginTop: -2,
    position: 'relative',
  },
  xpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpProgressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#2a2a4e',
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 6,
  },
  levelBonusChip: {
    marginTop: 2,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2a2000',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelBonusChipText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  coinBurstLayer: {
    position: 'absolute',
    left: 86,
    top: 6,
    width: 20,
    height: 20,
    zIndex: 5,
  },
  coinBurstCoin: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 16,
    height: 16,
  },
  playAgainButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  playAgainText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 17 },
  bottomRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  menuButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  menuText: { color: '#aaa', fontSize: 15 },
  levelUpBanner: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  levelUpText: { color: '#FFD700', fontSize: 15, fontWeight: '700' },
  shareButton: {
    backgroundColor: '#1a2a40',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4a9eff',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shareText: { color: '#b7d4ff', fontSize: 15, fontWeight: '600' },
});
