import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
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
  playGauntletTier,
  playGauntletFail,
} from '../lib/audio';
import { recordQuizCompletion } from './AchievementsScreen';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useGame } from '../context/GameContext';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { calcQuizXP, getLevelInfo } from '../lib/xpSystem';
import TopFallConfetti from '../components/TopFallConfetti';
import AvatarDisplay from '../components/AvatarDisplay';
import AnalogCountdownClock from '../components/AnalogCountdownClock';
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
const FALLBACK_ICON_IMAGES: Record<string, any> = {
  lightning:      require('../../assets/avatars/lightning.png'),
  skull:          require('../../assets/avatars/skull.png'),
  hourglass:      require('../../assets/avatars/hourglass.png'),
  crossed_swords: require('../../assets/avatars/crossed_swords.png'),
};
const SHARE_QUIZ_ICON_IMAGES: Record<string, any> = {
  flag: require('../../assets/avatars/flags.png'),
  shape: require('../../assets/avatars/shape.png'),
  capitals: require('../../assets/avatars/building.png'),
  borders: require('../../assets/avatars/border.png'),
  trail: require('../../assets/avatars/compass.png'),
  millionaire: require('../../assets/avatars/gold_bag.png'),
  nightmare: require('../../assets/avatars/skull.png'),
  gauntlet: require('../../assets/avatars/crucible.png'),
};
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.geoconquest.app';

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

function achIconNode(key: string | undefined, fallbackKey: string) {
  const src = key && RESULT_ICON_IMAGES[key];
  if (src) return <Image source={src} style={{ width: 20, height: 20 }} resizeMode="contain" />;
  const fallbackSrc = FALLBACK_ICON_IMAGES[fallbackKey];
  if (fallbackSrc) return <Image source={fallbackSrc} style={{ width: 20, height: 20 }} resizeMode="contain" />;
  return <Text style={{ fontSize: 20 }}>{key ?? fallbackKey}</Text>;
}

export default function QuizResultsScreen({ navigation, route }: Props) {
  const { score, total, goldEarned, quizType, elapsedSeconds, tierAccent, tierLabel, tierBg } = route.params;
  const percentage = Math.round((score / total) * 100);
  const { showToast } = useToast();
  const { user, addXP, addGold, profile, incrementQuizCount, nextQuizBoostActive, setNextQuizBoostActive, consumeNextQuizBoost, refundMap, maps, deductMap, mapsNextRefillAt, mapsAdsUsedToday, grantAdMap, unlockedItems } = useAuth();
  const { showAlert } = useAlert();
  const { triggerQuestToast } = useGame();

  const tickets = profile?.tickets ?? 0;
  const isConqueror = profile?.is_conquerer ?? false;
  const skipMapCheck = isConqueror || unlockedItems.has('upgrade_infinite_maps');

  const [xpEarned, setXpEarned] = useState(0);
  const [xpTier, setXpTier] = useState<1 | 1.5 | 2>(1);
  const [boostApplied, setBoostApplied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [levelBonusGold, setLevelBonusGold] = useState(0);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [coinBurstNonce, setCoinBurstNonce] = useState(0);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [mapsRemainingSeconds, setMapsRemainingSeconds] = useState(0);
  const [mapsActionLoading, setMapsActionLoading] = useState(false);

  const MAPS_REFILL_SECONDS = 5400;
  const MAX_ADS_PER_DAY = 3;
  const MAX_MAPS = 5;

  const [displayGoldGain, setDisplayGoldGain] = useState(goldEarned < 0 ? 0 : goldEarned);
  const initialGoldTotal = Math.max(0, (profile?.gold_balance ?? 0) - goldEarned);
  const initialXpTotal = profile?.xp ?? 0;
  const [displayGoldTotal, setDisplayGoldTotal] = useState(initialGoldTotal);
  const [displayXpTotal, setDisplayXpTotal] = useState(initialXpTotal);

  const cardCaptureRef = useRef<any>(null);
  const shareCaptureRef = useRef<any>(null);
  const eternityGlowAnim = useRef(new Animated.Value(0)).current;
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
    trail: 'Trail Quiz',
    millionaire: 'Millionaire Quiz',
    nightmare: 'Nightmare Mode',
    gauntlet: 'The Gauntlet',
  };

  function buildShareMessage() {
    return `This is how much I scored in the quiz, think you can do better?\nGeoConquest - find us on Google Play\n${PLAY_STORE_URL}`;
  }

  async function handleShare() {
    const shareMessage = buildShareMessage();
    if (!captureRef || !shareCaptureRef.current) {
      await Share.share({ message: shareMessage });
      return;
    }

    try {
      const uri = await captureRef(shareCaptureRef, { format: 'png', quality: 0.95 });
      const isAvailable = Sharing ? await Sharing.isAvailableAsync() : false;
      if (isAvailable) {
        await Sharing?.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Your Result' });
        return;
      }
      await Share.share({ message: `${shareMessage}\n${uri}` });
    } catch (e) {
      console.warn('Share failed:', e);
      try {
        await Share.share({ message: shareMessage });
      } catch (fallbackErr) {
        console.warn('Share fallback failed:', fallbackErr);
      }
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
    const penaltyTarget = Math.abs(Math.min(0, delta));

    await animateCounterValue(start, target, 1100, (value) => {
      displayGoldRef.current = value;
      setDisplayGoldTotal(value);
      if (delta > 0) {
        const transferred = Math.max(0, value - start);
        setDisplayGoldGain(Math.max(0, gainStart - transferred));
      } else {
        const transferred = Math.max(0, start - value);
        setDisplayGoldGain(-Math.min(penaltyTarget, transferred));
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

  async function playResultSound(skipPerfectMillionaire: boolean = false) {
    if (quizType === 'millionaire') {
      if (score === total) {
        if (!skipPerfectMillionaire) await playMillionairePrize();
        return;
      }
      if (score >= 5) await playFail();
      else await playBoo();
      return;
    }

    if (quizType === 'nightmare') {
      if (percentage === 100) await playMillionairePrize();
      else await playDevilLaugh();
      return;
    }

    if (quizType === 'gauntlet') {
      if (score >= 11) await playGauntletTier();
      else await playGauntletFail();
      return;
    }

    if (percentage >= 70) await playSuccess();
    else if (percentage >= 30) await playFail();
    else await playBoo();
  }

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const millionairePerfectWin = quizType === 'millionaire' && score === total;
    if (millionairePerfectWin) {
      void playMillionairePrize();
    }

    if (percentage === 100) {
      setTimeout(() => setShowConfetti(true), 350);
    }

    incrementQuizCount().then(({ claimed, goldAwarded }) => {
      if (!claimed) return;
      showAlert({
        variant: 'unique',
        title: 'Referral Reward!',
        message: `You and your friend both received ${goldAwarded.toLocaleString()} gold.`,
        icon: <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 54, height: 54 }} resizeMode="contain" />,
      });
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
          icon: achIconNode(ach?.icon, 'lightning'),
          duration: 3500,
        });
      }

      if (newlyCompletedNightmare) {
        const ach = ACHIEVEMENTS_DATA.find((a) => a.id === 'nightmare_complete');
        showToast({
          title: 'Quest Unlocked!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : 'Nightmare Survived!',
          icon: achIconNode(ach?.icon, 'skull'),
          duration: 3500,
        });
      }

      if (newlyCompletedCapitalsMastery) {
        const ach = ACHIEVEMENTS_DATA.find((a) => a.id === 'ground_invasion');
        showToast({
          title: 'Quest Complete!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : 'Ground Invasion!',
          icon: achIconNode(ach?.icon, 'crossed_swords'),
          duration: 3500,
        });
      }

      if (newlyCompletedSpeedDemon || newlyCompletedNightmare || newlyCompletedCapitalsMastery) {
        setShowConfetti(true);
      }

      if (percentage === 100 && quizType !== 'millionaire' && !isConqueror) {
        try {
          await refundMap();
          showToast({ title: 'Map Returned!', message: 'Perfect score — your map was refunded.' });
        } catch { /* silent — refund is a bonus */ }
      }

      const xp = calcQuizXP(quizType, score, total, newlyCompletedNightmare);
      const isBoostEligibleQuiz = ['flag', 'shape', 'capitals', 'borders', 'trail'].includes(quizType);
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

      setDisplayGoldGain(quizGoldDelta > 0 ? quizGoldDelta : 0);

      await playResultSound(millionairePerfectWin);
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

    const isBoostOfferQuiz = ['flag', 'shape', 'capitals', 'borders', 'trail'].includes(quizType);
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

    let glowLoop: Animated.CompositeAnimation | null = null;
    if (tierLabel === 'ETERNITY') {
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(eternityGlowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
          Animated.timing(eternityGlowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
        ])
      );
      glowLoop.start();
    }

    return () => {
      isUnmountedRef.current = true;
      stopActiveAnimation();
      if (coinBurstTimeoutRef.current) clearTimeout(coinBurstTimeoutRef.current);
      glowLoop?.stop();
    };
  }, []);

  useEffect(() => {
    if (!mapsNextRefillAt) { setMapsRemainingSeconds(0); return; }
    function update() {
      setMapsRemainingSeconds(Math.max(0, Math.floor((mapsNextRefillAt!.getTime() - Date.now()) / 1000)));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [mapsNextRefillAt]);

  function startQuiz() {
    if (quizType === 'flag') navigation.replace('FlagQuiz');
    else if (quizType === 'shape') navigation.replace('ShapeQuiz');
    else if (quizType === 'borders') navigation.replace('BordersQuiz');
    else if (quizType === 'capitals') navigation.replace('CapitalsQuiz');
    else if (quizType === 'trail') navigation.replace('TrailQuiz' as any);
    else if (quizType === 'nightmare') navigation.replace('NightmareQuiz' as any);
    else if (quizType === 'gauntlet') navigation.replace('Gauntlet' as any);
  }

  async function handleWatchAdForMap() {
    setMapsActionLoading(true);
    try {
      const { rewarded } = await showRewardedAd();
      if (!rewarded) {
        showAlert({ title: 'Ad Unavailable', message: 'Could not load a rewarded ad right now. Please try again.' });
        return;
      }
      await grantAdMap();
      const ok = await deductMap();
      if (ok) {
        setShowMapsModal(false);
        startQuiz();
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    } finally {
      setMapsActionLoading(false);
    }
  }

  function getRating(): { imageSource: any; label: string } {
    if (quizType === 'nightmare') {
      if (percentage === 100) return { imageSource: require('../../assets/avatars/demon.png'), label: 'Well played..' };
      return { imageSource: require('../../assets/avatars/demon_hand.png'), label: 'Pay up and get out' };
    }

    if (quizType === 'millionaire') {
      if (score === total) return { imageSource: require('../../assets/avatars/gold_bag.png'), label: 'Flawless Victory!' };
      if (score > 5) return { imageSource: require('../../assets/avatars/cringe.png'), label: 'Not good enough' };
      return { imageSource: require('../../assets/avatars/lmao.png'), label: 'No way you wasted a ticket for this..' };
    }

    if (quizType === 'gauntlet') {
      const GAUNTLET_RATINGS: Record<string, { imageSource: any; label: string }> = {
        ETERNITY: { imageSource: require('../../assets/gauntlet/gauntlet_eternity.png'), label: 'Eternal Champion!'  },
        OBLIVION: { imageSource: require('../../assets/gauntlet/gauntlet_oblivion.png'), label: 'Almost out'         },
        INFERNO:  { imageSource: require('../../assets/gauntlet/gauntlet_inferno.png'),  label: 'Fueled The Inferno' },
        HELL:     { imageSource: require('../../assets/gauntlet/gauntlet_hell.png'),     label: 'A Fresh Soul..'     },
        VOID:     { imageSource: require('../../assets/gauntlet/gauntlet_void.png'),     label: 'Void Walker'        },
        ABYSS:    { imageSource: require('../../assets/gauntlet/gauntlet_abyss.png'),    label: 'Fell Too Deep'      },
        PERIL:    { imageSource: require('../../assets/gauntlet/gauntlet_peril.png'),    label: 'Feeling the Peril'  },
        DANGER:   { imageSource: require('../../assets/gauntlet/gauntlet_danger.png'),   label: 'NOT WORTHY'         },
      };
      return GAUNTLET_RATINGS[tierLabel ?? 'DANGER'] ?? GAUNTLET_RATINGS['DANGER'];
    }

    if (percentage === 100) return { imageSource: require('../../assets/avatars/trophy.png'), label: 'Well played!' };
    if (percentage >= 80) return { imageSource: require('../../assets/avatars/bullseye.png'), label: 'Almost there!' };
    if (percentage >= 60) return { imageSource: require('../../assets/avatars/eyes.png'), label: 'Gotta pump those numbers up' };
    if (percentage >= 40) return { imageSource: require('../../assets/avatars/hand_shake.png'), label: 'Solid effort' };
    return { imageSource: require('../../assets/avatars/lmao.png'), label: 'Oof...' };
  }

  const rating = getRating();
  const shareBadgeSource = rating.imageSource;
  const shareQuizIcon = SHARE_QUIZ_ICON_IMAGES[quizType] ?? require('../../assets/icon.png');
  const isNightmare = quizType === 'nightmare';
  const isGauntlet = quizType === 'gauntlet';
  const animatedLevelInfo = getLevelInfo(displayXpTotal);
  const xpProgressPct =
    animatedLevelInfo.xpForNextLevel > 0
      ? Math.min((animatedLevelInfo.xpIntoLevel / animatedLevelInfo.xpForNextLevel) * 100, 100)
      : 100;
  const xpProgressFillColor = profile?.is_conquerer ? '#a78bfa' : '#FFD700';

  const showGoldTransfer = displayGoldGain !== 0;

  return (
    <View style={[styles.container, isNightmare && styles.containerNightmare, isGauntlet && tierBg && { backgroundColor: tierBg }]}>
      {tierLabel === 'ETERNITY' && (
        <>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: -SCREEN_W * 0.1, top: -SCREEN_H * 0.1, width: SCREEN_W * 1.2, height: SCREEN_H * 1.2, borderRadius: SCREEN_W * 0.6, backgroundColor: '#fbbf24', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.10] }) }} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: SCREEN_W / 2 - 220, top: SCREEN_H * 0.1, width: 440, height: 440, borderRadius: 220, backgroundColor: '#fbbf24', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.24] }) }} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: SCREEN_W / 2 - 140, top: -100, width: 280, height: 280, borderRadius: 140, backgroundColor: '#ffffff', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.16] }) }} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: SCREEN_W / 2 - 280, top: SCREEN_H * 0.55, width: 560, height: 560, borderRadius: 280, backgroundColor: '#fde68a', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.10] }) }} />
        </>
      )}

      <View style={styles.ratingGroup}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          {tierLabel === 'ETERNITY' && (
            <>
              <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#fbbf24', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }) }} />
              <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90,  backgroundColor: '#ffffff', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.30] }) }} />
              <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65,  backgroundColor: '#fde68a', opacity: eternityGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.45] }) }} />
            </>
          )}
          <Image
            source={rating.imageSource}
            style={[styles.ratingImage, isNightmare && percentage < 100 && styles.ratingImageLoss, isGauntlet && styles.ratingImageGauntlet]}
            resizeMode="contain"
          />
        </View>
        <Text style={[
          styles.rating,
          isNightmare && styles.ratingNightmare,
          isNightmare && percentage < 100 && styles.ratingLoss,
          isGauntlet && tierAccent && { color: tierAccent },
        ]}>{rating.label}</Text>
      </View>

      <ViewShot ref={cardCaptureRef} style={[styles.card, isNightmare && styles.cardNightmare, isGauntlet && tierAccent && { backgroundColor: tierAccent + '12', borderColor: tierAccent + '44' }]}>
        {isGauntlet
          ? <Row label="Score" value={`${score}`} highlight />
          : <Row label="Score" value={`${percentage}%`} />
        }

        {elapsedSeconds != null && (
          <Row
            label="Total Time"
            value={`⏱ ${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`}
          />
        )}

        {xpEarned > 0 && !(isNightmare && percentage < 100) && <Row label="XP Earned" value={`+${xpEarned} XP`} xpTier={xpTier} />}
        {boostApplied && <Row label="Boost" value="x2 Applied" highlight />}

        {!(isNightmare && percentage < 100) && <View style={styles.xpProgressSection}>
          <View style={styles.xpProgressHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {profile?.avatar_emoji ? (
                <AvatarDisplay
                  avatarId={profile.avatar_emoji}
                  avatarFlag={profile.avatar_flag ?? undefined}
                  size={28}
                  isConqueror={profile.is_conquerer ?? false}
                />
              ) : null}
              <Text style={styles.rowLabel}>Level {animatedLevelInfo.level}</Text>
            </View>
            <Text style={styles.rowValueSmall}>
              {animatedLevelInfo.xpIntoLevel} / {animatedLevelInfo.xpForNextLevel || 0} XP
            </Text>
          </View>

          <View style={styles.xpProgressTrack}>
            <View style={[styles.xpProgressFill, { width: `${xpProgressPct}%` as any, backgroundColor: xpProgressFillColor }]} />
          </View>

          <Animated.View style={[styles.levelBonusChip, { opacity: levelBonusOpacity, transform: [{ scale: levelBonusScale }] }]}>
            <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Text style={styles.levelBonusChipText}>Level-Up Bonus +{levelBonusGold.toLocaleString()}</Text>
          </Animated.View>

          {showCoinBurst && <CoinBurst key={coinBurstNonce} />}
        </View>}

        {isNightmare ? (
          <View style={styles.nightmareGoldPanel}>
            <View style={styles.nightmareGoldHeaderRow}>
              <Image source={require('../../assets/avatars/demon.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={[styles.nightmareGoldTag, goldEarned < 0 ? styles.nightmareGoldTagPenalty : styles.nightmareGoldTagReward]}>
                {goldEarned < 0 ? 'PENALTY' : 'REWARD'}
              </Text>
            </View>
            <Text style={[styles.nightmareGoldAmount, goldEarned < 0 ? styles.nightmareGoldAmountPenalty : styles.nightmareGoldAmountReward]}>
              {goldEarned > 0 ? '+' : ''}{goldEarned.toLocaleString()}
            </Text>
            <View style={styles.nightmareGoldBalanceRow}>
              <Text style={styles.nightmareGoldBalanceLabel}>Balance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.nightmareGoldBalanceValue}>{displayGoldTotal.toLocaleString()}</Text>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
              </View>
            </View>
          </View>
        ) : (
          <Row
            label="Gold"
            valueNode={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {showGoldTransfer && displayGoldGain < 0 ? (
                  <>
                    <Text style={[styles.rowValue, styles.rowValueHighlight]}>{displayGoldTotal.toLocaleString()}</Text>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                    <Text style={styles.rowValueSmall}>→</Text>
                    <Text style={[styles.rowValue, styles.rowValueNegative]}>
                      {displayGoldGain.toLocaleString()}
                    </Text>
                  </>
                ) : showGoldTransfer ? (
                  <>
                    <Text style={[styles.rowValue, displayGoldGain >= 0 ? styles.rowValueHighlight : styles.rowValueNegative]}>
                      {displayGoldGain > 0 ? `+${displayGoldGain.toLocaleString()}` : displayGoldGain.toLocaleString()}
                    </Text>
                    <Text style={styles.rowValueSmall}>→</Text>
                    <Text style={[styles.rowValue, styles.rowValueHighlight]}>{displayGoldTotal.toLocaleString()}</Text>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  </>
                ) : (
                  <>
                    <Text style={[styles.rowValue, styles.rowValueHighlight]}>{displayGoldTotal.toLocaleString()}</Text>
                    <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  </>
                )}
              </View>
            }
          />
        )}
      </ViewShot>

      {/* Hidden capture card for sharing only (not shown in summary UI) */}
      <View style={styles.shareCaptureContainer} pointerEvents="none">
        <ViewShot ref={shareCaptureRef} style={styles.shareCaptureCard}>
          {/* Player identity — top-left */}
          {profile?.avatar_emoji ? (
            <View style={styles.sharePlayerRow}>
              <AvatarDisplay
                avatarId={profile.avatar_emoji}
                avatarFlag={profile.avatar_flag ?? undefined}
                size={32}
                isConqueror={profile.is_conquerer ?? false}
              />
              <Text style={styles.sharePlayerName} numberOfLines={1}>{profile.username ?? 'Explorer'}</Text>
            </View>
          ) : null}
          <View style={styles.shareCaptureBrandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.shareCaptureBrandLogo} resizeMode="contain" />
          </View>
          <View style={styles.shareCaptureHeader}>
            <Image source={shareQuizIcon} style={styles.shareCaptureIcon} resizeMode="contain" />
            <Text style={styles.shareCaptureHeadline}>
              This is how much I scored in the quiz,{'\n'}think you can do better?
            </Text>
          </View>
          <View style={styles.shareCaptureStoreRow}>
            <Text style={styles.shareCaptureStoreText}>Download Geo Conquest</Text>
          </View>
          <Image source={shareBadgeSource} style={styles.shareCaptureHero} resizeMode="contain" />
          <Text style={styles.shareCaptureQuiz}>{QUIZ_LABELS[quizType] ?? quizType}</Text>
          <Text style={styles.shareCaptureScore}>{score}/{total} ({percentage}%)</Text>
        </ViewShot>
      </View>

      <TouchableOpacity
        style={[styles.playAgainButton, isNightmare && styles.playAgainButtonNightmare, isGauntlet && tierAccent && { backgroundColor: tierAccent }]}
        onPress={async () => {
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

          if (!skipMapCheck && maps <= 0) {
            setShowMapsModal(true);
            return;
          }
          if (!skipMapCheck) {
            const ok = await deductMap();
            if (!ok) {
              setShowMapsModal(true);
              return;
            }
          }
          startQuiz();
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

      {/* Out of Maps modal — mirrors the one in QuizMenuScreen */}
      <Modal visible={showMapsModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowMapsModal(false)}>
        <TouchableOpacity style={styles.mapsModalOverlay} activeOpacity={1} onPress={() => setShowMapsModal(false)}>
          <View style={styles.mapsModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.mapsModalTitle}>Out of Maps!</Text>

            {mapsRemainingSeconds > 0 && (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <AnalogCountdownClock
                  remainingSeconds={mapsRemainingSeconds}
                  totalSeconds={MAPS_REFILL_SECONDS}
                  format="mm:ss"
                  size={96}
                  color="#FFD700"
                />
              </View>
            )}

            <Text style={styles.mapsModalSubtext}>Maps refill 1 every 60 minutes.</Text>

            <TouchableOpacity
              style={styles.mapsModalCard}
              onPress={() => { setShowMapsModal(false); navigation.getParent()?.navigate('Premium' as any); }}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/conqueror.png')} style={{ width: 72, height: 72, margin: -8 }} resizeMode="contain" />
              <View style={styles.mapsModalCardInfo}>
                <Text style={[styles.mapsModalCardTitle, { fontSize: 12 }]} numberOfLines={1}>Become a Conqueror</Text>
                <Text style={styles.mapsModalCardDesc}>Unlimited maps — never wait again</Text>
              </View>
              <View style={[styles.mapsModalBadge, { backgroundColor: '#3a1a5a', borderColor: '#9b59b6' }]}>
                <Text style={[styles.mapsModalBadgeText, { color: '#c084fc' }]}>Go</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mapsModalCard, { borderColor: '#FFD700', opacity: (mapsAdsUsedToday ?? 0) >= MAX_ADS_PER_DAY || mapsActionLoading ? 0.5 : 1 }]}
              onPress={handleWatchAdForMap}
              disabled={(mapsAdsUsedToday ?? 0) >= MAX_ADS_PER_DAY || mapsActionLoading}
              activeOpacity={0.8}
            >
              <Image source={require('../../assets/avatars/star2.png')} style={{ width: 72, height: 72, margin: -8 }} resizeMode="contain" />
              <View style={styles.mapsModalCardInfo}>
                <Text style={styles.mapsModalCardTitle}>Watch an Ad</Text>
                <Text style={styles.mapsModalCardDesc}>
                  {(mapsAdsUsedToday ?? 0) >= MAX_ADS_PER_DAY
                    ? 'Come back tomorrow'
                    : `Get 1 map · ${MAX_ADS_PER_DAY - (mapsAdsUsedToday ?? 0)} left today`}
                </Text>
              </View>
              <View style={[styles.mapsModalBadge, { backgroundColor: '#302a10', borderColor: '#FFD700' }]}>
                <Text style={styles.mapsModalBadgeText}>Watch</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mapsModalCancel} onPress={() => setShowMapsModal(false)}>
              <Text style={styles.mapsModalCancelText}>Wait</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    padding: 16,
    gap: 6,
  },
  containerNightmare: {
    backgroundColor: '#0d0000',
  },
  ratingGroup: { alignItems: 'center', gap: 4 },
  ratingImage: { width: 80, height: 80 },
  ratingImageLoss: { width: 110, height: 110 },
  ratingImageGauntlet: { width: 120, height: 120 },
  rating: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  ratingLoss: { fontSize: 26 },
  ratingNightmare: { color: '#ff8888', fontStyle: 'italic' },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    gap: 7,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardNightmare: {
    backgroundColor: '#1a0000',
    borderColor: '#ff4444',
  },
  containerGauntlet: {
    backgroundColor: '#0c0500',
  },
  cardGauntlet: {
    backgroundColor: '#180a00',
    borderColor: '#ff6b3555',
  },
  ratingGauntlet: {
    color: '#ff6b35',
  },
  shareCaptureContainer: {
    position: 'absolute',
    left: -1200,
    top: -1200,
    width: 360,
  },
  sharePlayerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sharePlayerName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  shareCaptureCard: {
    width: 340,
    backgroundColor: '#10162b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3a4f7a',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  shareCaptureBrandRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareCaptureBrandLogo: {
    width: 30,
    height: 30,
  },
  shareCaptureHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareCaptureIcon: { width: 22, height: 22 },
  shareCaptureHeadline: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  shareCaptureStoreRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  shareCaptureStoreIcon: {
    width: 18,
    height: 18,
  },
  shareCaptureStoreText: {
    color: '#b7d4ff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shareCaptureHero: { width: 86, height: 86, marginTop: 2 },
  shareCaptureQuiz: {
    color: '#bcd2ff',
    fontSize: 13,
    fontWeight: '700',
  },
  shareCaptureScore: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '800',
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
  nightmareGoldPanel: {
    borderTopWidth: 1,
    borderTopColor: '#3a0000',
    paddingTop: 14,
    paddingBottom: 4,
    gap: 4,
    alignItems: 'center',
  },
  nightmareGoldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nightmareGoldTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  nightmareGoldTagPenalty: { color: '#ff4444' },
  nightmareGoldTagReward: { color: '#FFD700' },
  nightmareGoldAmount: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
    marginVertical: 2,
  },
  nightmareGoldAmountPenalty: { color: '#ff4444' },
  nightmareGoldAmountReward: { color: '#FFD700' },
  nightmareGoldBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  nightmareGoldBalanceLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  nightmareGoldBalanceValue: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '700',
  },
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
  playAgainButtonNightmare: {
    backgroundColor: '#e05353',
  },
  playAgainButtonGauntlet: {
    backgroundColor: '#ff6b35',
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
  // Out of Maps modal
  mapsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  mapsModalContainer: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    padding: 12,
    width: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  mapsModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  mapsModalSubtext: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  mapsModalCard: {
    backgroundColor: '#1a0a2e',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#9b59b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  mapsModalCardInfo: { flex: 1 },
  mapsModalCardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  mapsModalCardDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  mapsModalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  mapsModalBadgeText: { color: '#FFD700', fontWeight: 'bold' },
  mapsModalCancel: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 2,
  },
  mapsModalCancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
});
