import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import {
  MillionaireQuestion,
  MILLIONAIRE_GOLD_LADDER,
  QuizStackParamList,
  Country,
} from '../types';
import { fetchCountries } from '../lib/countryData';
import { buildMillionaireQuestions, buildSingleMillionaireQuestion } from '../lib/questionDifficulty';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../lib/supabase';
import AnswerButton from '../components/AnswerButton';
import QuitConfirmModal from '../components/QuitConfirmModal';
import CountryShapeView from '../components/CountryShapeView';
import { playDing, playWrong, playTick, playTextToSpeech, playMillionaireSwap } from '../lib/audio';
import * as Speech from 'expo-speech';
import { showRewardedAd } from '../lib/rewardedAds';

const ANSWER_COLORS = ['#4FC3F7', '#F44336', '#FFD700', '#4CAF50']; // blue, red, yellow, green

const AUTO_ADVANCE_DELAY_MS = 2500;
const TIMER_SECONDS = 15;
const SECOND_CHANCE_POPUP_DELAY_MS = 500;

// Show walk-or-continue checkpoint before these 0-indexed next-question indices:
// after answering Q5 (250), Q10 (1.5k), Q13 (4k).
const WALK_AWAY_CHECKPOINT_INDICES = [5, 10, 13];

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'MillionaireQuiz'>;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';

/** Simulates audience vote — correct answer gets 45–75% */
function simulateAudienceVote(correctIndex: number, count: number): number[] {
  const correctPct = 45 + Math.random() * 30;
  const remaining = 100 - correctPct;
  const others: number[] = [];
  let leftover = remaining;
  for (let i = 0; i < count - 2; i++) {
    const share = Math.random() * leftover * 0.7;
    others.push(Math.round(share));
    leftover -= share;
  }
  others.push(Math.round(leftover));
  others.sort(() => Math.random() - 0.5);

  const votes = Array(count).fill(0);
  let otherIdx = 0;
  for (let i = 0; i < count; i++) {
    votes[i] = i === correctIndex ? Math.round(correctPct) : (others[otherIdx++] ?? 0);
  }
  return votes;
}

function AudienceVoteCircle({ percentage, isCorrect }: { percentage: number; isCorrect: boolean }) {
  const size = 38;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(percentage, 100)) / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const center = size / 2;
  const accent = isCorrect ? '#4CAF50' : '#FFD700';

  return (
    <View style={styles.audienceCircleWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2a2a4e"
          strokeWidth={strokeWidth}
          fill="#0f1028"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
        <SvgText
          x={center}
          y={center + 4}
          textAnchor="middle"
          fill={accent}
          fontSize={10}
          fontWeight="bold"
        >
          {`${percentage}%`}
        </SvgText>
      </Svg>
    </View>
  );
}

export default function MillionaireQuizScreen({ navigation }: Props) {
  const { profile, disabledUpgrades, spendTicket } = useAuth();
  const { showAlert } = useAlert();

  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [questions, setQuestions] = useState<MillionaireQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lifelines
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [audienceUsed, setAudienceUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [ownsSkip, setOwnsSkip] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set());
  const [audienceVotes, setAudienceVotes] = useState<number[] | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(TIMER_SECONDS);

  // Game-over / win state
  const [gameOver, setGameOver] = useState(false);
  const [showWin, setShowWin] = useState(false);

  // Walk-or-continue checkpoint modal
  const [showWalkOrContinue, setShowWalkOrContinue] = useState(false);
  const [walkOrContinuePrize, setWalkOrContinuePrize] = useState(0);
  const pendingNextIndex = useRef<number | null>(null);
  const [showSecondChanceModal, setShowSecondChanceModal] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [secondChanceLoading, setSecondChanceLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const allowLeaveRef = useRef(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const questionsRef = useRef<MillionaireQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondChanceModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizStartRef = useRef<number>(0);
  const ladderScrollRef = useRef<ScrollView>(null);
  const [ladderWidth, setLadderWidth] = useState(0);
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Tab navigation guard — intercept bottom-tab presses while quiz is active
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      const unsubscribe = (parent as any).addListener('tabPress', (e: any) => {
        if (!readyRef.current) return;
        e.preventDefault();
        onConfirmQuitRef.current = () => {
          stopTimer();
          Speech.stop();
          if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
          allowLeaveRef.current = true;
          navigation.popToTop();
        };
        setShowQuitModal(true);
      });
      return unsubscribe;
    }, [navigation])
  );

  // Breathing animation for "Push Forward" button
  useEffect(() => {
    if (showWalkOrContinue) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, { toValue: 1.07, duration: 700, useNativeDriver: true }),
          Animated.timing(breathAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      breathAnim.setValue(1);
    }
  }, [showWalkOrContinue]);

  // Auto-center ladder on current question
  useEffect(() => {
    if (ladderWidth === 0) return;
    const ITEM_W = 44; // minWidth 36 + gap 4 + padding ~4
    const x = Math.max(0, currentIndex * ITEM_W - ladderWidth / 2 + ITEM_W / 2);
    ladderScrollRef.current?.scrollTo({ x, animated: true });
  }, [currentIndex, ladderWidth]);

  // ── Timer ──────────────────────────────────────────────────────────────────

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimerFrom(seconds: number) {
    stopTimer();
    timeLeftRef.current = seconds;
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      const t = timeLeftRef.current;
      setTimeLeft(t);
      if (t > 0 && t <= 3) playTick();
      if (t <= 0) { stopTimer(); handleAutoTimeout(); }
    }, 1000);
  }

  function startTimer() { startTimerFrom(TIMER_SECONDS); }

  function endGameWithLoss() {
    const failedIndex = currentIndexRef.current;
    const prize = 0;

    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: failedIndex, // number of correct answers
      total: 15,
      goldEarned: prize,
      quizType: 'millionaire',
      elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
    });
  }

  function handleAutoTimeout() {
    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;
    playWrong();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setButtonStates(question.options.map((_, i) =>
      i === question.correctIndex ? 'correct' : 'disabled',
    ));
    setAnswered(true);
    setGameOver(true);
    stopTimer();
    setTimeout(endGameWithLoss, 2000);
  }

  // ── Load questions ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const countries = await fetchCountries();
        const withoutAF = countries.filter(c => c.cca2 !== 'AF');
        setAllCountries(withoutAF);
        const q = buildMillionaireQuestions(withoutAF);
        setQuestions(q);
        questionsRef.current = q;
        await spendTicket();
      } catch (e: any) {
        setError(e.message ?? 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    })();

    if (profile?.id) {
      supabase
        .from('user_unlocked_items')
        .select('item_id')
        .eq('user_id', profile.id)
        .eq('item_id', 'upgrade_millionaire_skip')
        .then(({ data }) => {
          if (data && data.length > 0) {
            setOwnsSkip(true);
          }
        });
    }

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (secondChanceModalTimer.current) clearTimeout(secondChanceModalTimer.current);
      stopTimer();
      Speech.stop(); // Clean up speech on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle app background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (ready && !answered && !gameOver && !showWin && !loading && !error && !showWalkOrContinue) {
          startTimerFrom(timeLeftRef.current);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        Speech.stop();
        stopTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [answered, gameOver, showWin, showWalkOrContinue, loading, error, timeLeft, ready]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !readyRef.current) return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
        stopTimer();
        Speech.stop();
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        allowLeaveRef.current = true;
        navigation.dispatch(e.data.action);
      };
      setShowQuitModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Handle navigation focus (stop timer if user hits back button)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // When screen loses focus, stop the timer immediately and kill any speech
        stopTimer();
        Speech.stop();
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        if (secondChanceModalTimer.current) clearTimeout(secondChanceModalTimer.current);
      };
    }, [])
  );

  // ── Lifelines ──────────────────────────────────────────────────────────────

  function useFiftyFifty() {
    if (fiftyFiftyUsed || answered) return;
    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;

    const wrongIndices = question.options
      .map((_, i) => i)
      .filter((i) => i !== question.correctIndex && !hiddenOptions.has(i));
    const toHide = new Set(wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2));
    setHiddenOptions(toHide);
    setFiftyFiftyUsed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function useAudienceLifeline() {
    if (audienceUsed || answered) return;
    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;

    setAudienceVotes(simulateAudienceVote(question.correctIndex, question.options.length));
    setAudienceUsed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function useSkipLifeline() {
    if (skipUsed || answered) return;
    const isSkipEnabled = ownsSkip && !disabledUpgrades.has('upgrade_millionaire_skip');
    if (!isSkipEnabled) return;

    setSkipUsed(true);
    playMillionaireSwap();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    swapCurrentQuestionAndContinue();
  }

  function handleSkipPress() {
    if (skipUsed || answered) return;
    const isSkipEnabled = ownsSkip && !disabledUpgrades.has('upgrade_millionaire_skip');
    if (isSkipEnabled) {
      useSkipLifeline();
      return;
    }

    showAlert({
      variant: 'unique',
      title: 'Power-Up Locked',
      message: 'This power-up needs to be purchased from the Upgrades shop.',
      buttons: [
        { text: 'Display in Shop', style: 'cta', onPress: () => navigation.getParent()?.navigate('Shop', { initialTab: 'upgrades' }) },
        { text: 'Got it', style: 'cancel' },
      ],
    });
  }

  function swapCurrentQuestionAndContinue() {
    // Swap current question with a new one of the same tier
    const usedCca2 = new Set<string>();
    questionsRef.current.forEach(q => {
      usedCca2.add(q.subjectCountry.cca2);
      if (q.optionCountries) {
        q.optionCountries.forEach(c => usedCca2.add(c.cca2));
      }
    });

    // We can loosely estimate buckets here since we just need 1 question
    const buckets: Record<number, Country[]> = {};
    for (let d = 1; d <= 10; d++) buckets[d] = [];
    allCountries.forEach(c => {
      // Rough difficulty estimation if getCountryDifficulty isn't readily exported
      const diff = 5; 
      buckets[diff].push(c); 
    });
    // Let's just pass `allCountries` and empty buckets, `buildSingleMillionaireQuestion` handles fallbacks well enough
    const newQuestion = buildSingleMillionaireQuestion(
      allCountries,
      currentIndexRef.current,
      usedCca2,
      buckets // (Empty buckets will just force the safe fallback behavior, which is fine for a 1-off random question)
    );

    const updatedQuestions = [...questionsRef.current];
    updatedQuestions[currentIndexRef.current] = newQuestion;
    questionsRef.current = updatedQuestions;
    setQuestions(updatedQuestions);

    // Reset UI state for the new question
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setHiddenOptions(new Set());
      setAudienceVotes(null);
      setButtonStates(['default', 'default', 'default', 'default']);
      startTimer();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  async function handleSecondChanceAd() {
    setSecondChanceLoading(true);
    try {
      const { rewarded } = await showRewardedAd();
      if (!rewarded) {
        setShowSecondChanceModal(false);
        setGameOver(true);
        setTimeout(endGameWithLoss, 1500);
        return;
      }
      setSecondChanceUsed(true);
      setShowSecondChanceModal(false);
      setAnswered(false);
      setGameOver(false);
      swapCurrentQuestionAndContinue();
    } finally {
      setSecondChanceLoading(false);
    }
  }

  function declineSecondChance() {
    if (secondChanceModalTimer.current) {
      clearTimeout(secondChanceModalTimer.current);
      secondChanceModalTimer.current = null;
    }
    setShowSecondChanceModal(false);
    setGameOver(true);
    setTimeout(endGameWithLoss, 1500);
  }

  // ── Answer handling ────────────────────────────────────────────────────────

  function handleAnswer(selectedIndex: number) {
    if (answered || hiddenOptions.has(selectedIndex)) return;
    stopTimer();
    setAnswered(true);

    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;
    const isCorrect = selectedIndex === question.correctIndex;

    setButtonStates(
      question.options.map((_, i) => {
        if (i === question.correctIndex) return 'correct';
        if (i === selectedIndex && !isCorrect) return 'wrong';
        return 'disabled';
      }),
    );

    if (isCorrect) {
      playDing();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const idx = currentIndexRef.current;

      // Final question — jackpot!
      if (idx === 14) {
        setShowWin(true);
        return;
      }

      autoAdvanceTimer.current = setTimeout(afterCorrectAnswer, AUTO_ADVANCE_DELAY_MS);
    } else {
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!secondChanceUsed) {
        secondChanceModalTimer.current = setTimeout(() => {
          secondChanceModalTimer.current = null;
          setShowSecondChanceModal(true);
        }, SECOND_CHANCE_POPUP_DELAY_MS);
        return;
      }
      setGameOver(true);
      setTimeout(endGameWithLoss, 2000);
    }
  }

  /**
   * Called after revealing a correct answer (via timer or tap-to-skip).
   * Either shows the walk-or-continue checkpoint modal, or advances directly.
   */
  function afterCorrectAnswer() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const nextIdx = currentIndexRef.current + 1;
    if (WALK_AWAY_CHECKPOINT_INDICES.includes(nextIdx)) {
      const prize = MILLIONAIRE_GOLD_LADDER[currentIndexRef.current];
      pendingNextIndex.current = nextIdx;
      setWalkOrContinuePrize(prize);
      setShowWalkOrContinue(true);
    } else {
      advanceQuestion(nextIdx);
    }
  }

  function advanceQuestion(nextIndex?: number) {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const nextIdx = nextIndex ?? currentIndexRef.current + 1;

    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      setAnswered(false);
      setButtonStates(['default', 'default', 'default', 'default']);
      setHiddenOptions(new Set());
      setAudienceVotes(null);
      startTimer();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function skipToNext() {
    if (!answered || gameOver || showWin || showWalkOrContinue) return;
    afterCorrectAnswer();
  }

  // ── Walk-or-continue checkpoint ────────────────────────────────────────────
  function walkAwayFromCheckpoint() {
    setShowWalkOrContinue(false);
    const prize = walkOrContinuePrize;
    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: currentIndexRef.current + 1,
      total: 15,
      goldEarned: prize,
      quizType: 'millionaire',
      elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
    });
  }

  function continueFromCheckpoint() {
    setShowWalkOrContinue(false);
    const nextIdx = pendingNextIndex.current ?? currentIndexRef.current + 1;
    pendingNextIndex.current = null;
    advanceQuestion(nextIdx);
  }

  // ── End game handlers ──────────────────────────────────────────────────────

  function handleWinContinue() {
    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: 15,
      total: 15,
      goldEarned: MILLIONAIRE_GOLD_LADDER[14],
      quizType: 'millionaire',
      elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
    });
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Preparing your challenge…</Text>
      </View>
    );
  }

  if (error || questions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No questions available'}</Text>
      </View>
    );
  }

  // ── Ready screen ──────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <View style={styles.readyContainer}>
        <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 80, height: 80, marginBottom: 20 }} resizeMode="contain" />
        <Text style={styles.readyTitle}>MILLIONAIRE</Text>
        <Text style={styles.readySubtitle}>15 questions. 15 seconds each.{'\n'}Answer them all to win the jackpot.</Text>
        <TouchableOpacity
          style={styles.readyBtn}
          onPress={() => { quizStartRef.current = Date.now(); setReady(true); startTimer(); }}
        >
          <Text style={styles.readyBtnText}>LET'S GO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.readyBackLink}>
          <Text style={styles.readyBackLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const question = questions[currentIndex];
  const timerPct = timeLeft / TIMER_SECONDS;
  const timerColor = timeLeft <= 3 ? '#f44336' : timeLeft <= 6 ? '#FF9800' : '#FFD700';

  return (
    <View style={styles.container}>
      {/* Timer bar — stays visible (frozen) after answering */}
      {!gameOver && !showWin && (
        <View style={styles.timerContainer}>
          <View style={styles.timerBarTrack}>
            <View
              style={[
                styles.timerBarFill,
                { width: `${timerPct * 100}%` as any, backgroundColor: timerColor },
              ]}
            />
          </View>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      )}
      {/* Prize Ladder Strip */}
      <ScrollView
        ref={ladderScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ladderStrip}
        onLayout={(e) => setLadderWidth(e.nativeEvent.layout.width)}
      >
        {MILLIONAIRE_GOLD_LADDER.map((amount, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const isWalkCheckpointQuestion = WALK_AWAY_CHECKPOINT_INDICES.includes(i + 1);
          const isJackpot = i === 14;
          return (
            <View
              key={i}
              style={[
                styles.ladderItem,
                isCurrent && styles.ladderItemCurrent,
                isPast && styles.ladderItemPast,
                (isWalkCheckpointQuestion || isJackpot) && !isCurrent && styles.ladderItemCheckpoint,
                isJackpot && styles.ladderItemJackpot,
              ]}
            >
              <Text style={[styles.ladderText, isCurrent && styles.ladderTextCurrent]}>
                {amount >= 1000 ? `${amount / 1000}K` : String(amount)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Question area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.touchArea} onPress={skipToNext} activeOpacity={1}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Flag image (flag + capital_reverse) */}
            {(question.type === 'flag' || question.type === 'capital_reverse') && question.flagUrl && (
              <View style={styles.flagContainer}>
                <Image source={{ uri: question.flagUrl }} style={styles.flag} resizeMode="contain" />
              </View>
            )}

            {/* Text card (non-flag, non-shape, non-capital_reverse questions) */}
            {question.type !== 'flag' && question.type !== 'shape' && question.type !== 'capital_reverse' && (
              <View style={styles.questionCard}>
                {question.type.startsWith('border') && (
                  <Image
                    source={{ uri: question.subjectCountry.flagUrl }}
                    style={styles.subjectFlag}
                    resizeMode="contain"
                  />
                )}

                {question.type === 'capital' ? (
                  <View style={styles.capitalQuestionTextRow}>
                    <Text style={[styles.questionCardText, { flex: 1 }]}>
                      Which country has{' '}
                      <Text style={styles.capitalHighlight}>{question.subjectCountry.capital}</Text>
                      {' '}as its capital?
                    </Text>
                    <TouchableOpacity
                      style={styles.speakerBtn}
                      onPress={() => {
                        Speech.stop();
                        playTextToSpeech(question.subjectCountry.capital || '');
                      }}
                    >
                      <Text style={styles.speakerEmoji}>🔊</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.questionCardText} numberOfLines={4} adjustsFontSizeToFit>{question.questionText}</Text>
                )}
              </View>
            )}

            {/* Shape display */}
            {question.type === 'shape' && (
              <View>
                <View style={styles.shapeContainer}>
                  <CountryShapeView
                    countryCode={question.subjectCountry.cca2}
                    height={160}
                    color="#FFD700"
                  />
                </View>
                <Text style={styles.prompt}>{question.questionText}</Text>
              </View>
            )}

            {/* Prompt line (flag + capital_reverse) */}
            {(question.type === 'flag' || question.type === 'capital_reverse') && (
              <Text style={styles.prompt}>{question.questionText}</Text>
            )}

            {/* Controls row: lifelines (centered, 3 buttons) */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.lifelineBtn, (fiftyFiftyUsed || answered) && styles.lifelineBtnUsed]}
                onPress={useFiftyFifty}
                disabled={fiftyFiftyUsed || answered}
              >
                <Text style={styles.lifelineBtnText}>50/50</Text>
              </TouchableOpacity>
              {(() => {
                const isSkipEnabled = ownsSkip && !disabledUpgrades.has('upgrade_millionaire_skip');
                return (
                  <TouchableOpacity
                    style={[styles.lifelineBtn, (skipUsed || answered || !isSkipEnabled) && styles.lifelineBtnUsed]}
                    onPress={handleSkipPress}
                    disabled={skipUsed || answered}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Image source={require('../../assets/avatars/swap.png')} style={{ width: 14, height: 14, opacity: isSkipEnabled ? 1 : 0.4 }} resizeMode="contain" />
                      <Text style={[styles.lifelineBtnText, !isSkipEnabled && { color: '#666' }]}>Skip</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()}
              <TouchableOpacity
                style={[styles.lifelineBtn, (audienceUsed || answered) && styles.lifelineBtnUsed]}
                onPress={useAudienceLifeline}
                disabled={audienceUsed || answered}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/hand_shake.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                  <Text style={styles.lifelineBtnText}>Audience</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Answer buttons — 2×2 grid */}
            <View style={styles.answers}>
              {question.options.map((option, i) => {
                if (hiddenOptions.has(i)) {
                  return <View key={i} style={styles.hiddenSlot} />;
                }
                const detail = audienceVotes ? `${audienceVotes[i]}%` : undefined;
                const accentColor = ANSWER_COLORS[i % ANSWER_COLORS.length];
                const optCountry = question.optionCountries[i];
                const isVisual = question.type === 'flag_reverse' || question.type === 'shape_reverse';
                const visual = question.type === 'flag_reverse' && optCountry
                  ? <Image source={{ uri: optCountry.flagUrl }} style={{ width: '100%', height: 64 }} resizeMode="contain" />
                  : question.type === 'shape_reverse' && optCountry
                  ? <CountryShapeView countryCode={optCountry.cca2} height={72} color="#FFD700" />
                  : undefined;
                return (
                  <View key={i} style={styles.answerBtnWrap}>
                    <AnswerButton
                      label={option}
                      state={buttonStates[i]}
                      onPress={() => handleAnswer(i)}
                      detail={detail}
                      detailColor={audienceVotes ? accentColor : undefined}
                      visual={visual}
                      showLabel={!isVisual}
                      style={[
                        { marginVertical: 0, flex: 1 },
                        buttonStates[i] === 'default' && { borderColor: accentColor },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={[styles.tapHint, { opacity: (answered && !showWin && !showWalkOrContinue) ? 1 : 0 }]}>
              Tap anywhere to continue →
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>

      {/* Walk-or-Continue checkpoint modal */}
      <Modal visible={showWalkOrContinue} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../../assets/avatars/flame.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
            <Text style={styles.modalTitle}>You're on Fire!</Text>
            <Text style={styles.modalBody}>
              You're so close to the next tier. One more correct answer could change everything.
            </Text>
            <View style={styles.prizeCompare}>
              <View style={styles.prizeCompareItem}>
                <Text style={styles.prizeCompareLabel}>Now</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Text style={styles.prizeCompareAmount}>{walkOrContinuePrize.toLocaleString()}</Text>
                </View>
              </View>
              <Text style={styles.prizeCompareArrow}>→</Text>
              <View style={styles.prizeCompareItem}>
                <Text style={styles.prizeCompareLabel}>Next</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
                  <Text style={[styles.prizeCompareAmount, { color: '#4CAF50' }]}>
                    {(MILLIONAIRE_GOLD_LADDER[pendingNextIndex.current ?? (currentIndexRef.current + 1)] ?? 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={continueFromCheckpoint}>
              <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ scale: breathAnim }] }}>
                <Image source={require('../../assets/avatars/lightning.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={styles.primaryBtnText}>Push Forward!</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dimBtn} onPress={walkAwayFromCheckpoint}>
              <Text style={styles.dimBtnText}>Take my {walkOrContinuePrize.toLocaleString()} gold</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Win Modal */}
      <Modal visible={showWin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../../assets/avatars/crown.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
            <Text style={styles.modalTitle}>JACKPOT!</Text>
            <Text style={styles.modalBody}>
              You've conquered all 15 questions!
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
              <Text style={styles.modalGoldLarge}>{MILLIONAIRE_GOLD_LADDER[14].toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleWinContinue}>
              <Text style={styles.primaryBtnText}>Claim Your Gold</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSecondChanceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 44, height: 44 }} resizeMode="contain" />
            <Text style={styles.modalTitle}>Second Chance?</Text>
            <Text style={styles.modalBody}>
              Watch an ad to replace this question and keep going.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSecondChanceAd} disabled={secondChanceLoading}>
              <Text style={styles.primaryBtnText}>{secondChanceLoading ? 'Loading ad…' : 'Watch ad'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dimBtn} onPress={declineSecondChance} disabled={secondChanceLoading}>
              <Text style={styles.dimBtnText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <QuitConfirmModal
        visible={showQuitModal}
        onStay={() => { setShowQuitModal(false); onConfirmQuitRef.current = null; }}
        onQuit={() => { setShowQuitModal(false); onConfirmQuitRef.current?.(); onConfirmQuitRef.current = null; }}
      />
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
  errorText: { color: '#f44336', fontSize: 16, textAlign: 'center', padding: 24 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16, // This was 16, now will be handled by safe area
  },
  qChip: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qChipSafe: { borderColor: '#FFD700' },
  qChipText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  prizeChip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  prizeText: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  timerBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 26,
    textAlign: 'right',
  },
  elapsedTimerText: { color: '#aaa', fontSize: 13, fontWeight: '600', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 4 },

  // Ladder strip
  ladderStrip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 5,
    alignItems: 'center',
  },
  ladderItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    minWidth: 46,
    alignItems: 'center',
  },
  ladderItemCurrent: {
    backgroundColor: '#2a2000',
    borderColor: '#FFD700',
  },
  ladderItemPast: {
    opacity: 0.4,
  },
  ladderItemCheckpoint: {
    borderColor: '#FFD700',
  },
  ladderItemJackpot: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  ladderText: { color: '#666', fontSize: 13, fontWeight: '600' },
  ladderTextCurrent: { color: '#FFD700' },

  // Scrollable content
  scrollContent: { flexGrow: 1, paddingBottom: 8 },
  touchArea: { flex: 1, paddingHorizontal: 12 },

  // Shape display
  shapeContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 6,
    marginBottom: 4,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Flag display
  flagContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    height: 170,
    marginTop: 6,
    marginBottom: 4,
  },
  flag: { width: '100%', height: '100%' },

  // Text question card
  questionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 6,
    marginBottom: 4,
    gap: 8,
    height: 170,
    overflow: 'hidden',
  },
  subjectFlag: { width: 80, height: 50, borderRadius: 6 },
  questionCardText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  capitalQuestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  capitalHighlight: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 22,
  },
  speakerBtn: {
    backgroundColor: '#3a3a5e',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a4a7e',
  },
  speakerEmoji: {
    fontSize: 20,
  },

  prompt: {
    color: '#ccc',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },

  lifelineBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  lifelineBtnUsed: {
    borderColor: '#333',
    opacity: 0.35,
  },
  lifelineBtnText: { color: '#FFD700', fontWeight: 'bold', fontSize: 12 },

  // Answers — 2×2 grid
  answers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  answerBtnWrap: {
    width: '48%',
    flexDirection: 'column',
    minHeight: 80,
  },
  hiddenSlot: { width: '48%', minHeight: 80 },

  // Audience percentage circle
  audienceCircleWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },

  tapHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 48 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  modalBody: { color: '#aaa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modalGoldLarge: { color: '#FFD700', fontSize: 32, fontWeight: 'bold' },
  primaryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryBtnText: { color: '#aaa', fontSize: 14 },

  // Checkpoint modal prize comparison
  prizeCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    backgroundColor: '#0a0a1a',
    borderRadius: 12,
    padding: 14,
  },
  prizeCompareItem: { alignItems: 'center', gap: 4 },
  prizeCompareLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  prizeCompareAmount: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  prizeCompareArrow: { color: '#4CAF50', fontSize: 22, fontWeight: 'bold' },
  dimBtn: { paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: '#3a3a5e', borderRadius: 10, width: '100%' },
  dimBtnText: { color: '#ccc', fontSize: 15, fontWeight: '500' },

  // Ready screen
  readyContainer: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyTitle: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  readyBtn: { backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  readyBtnText: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  readyBackLink: { marginTop: 20 },
  readyBackLinkText: { color: '#555', fontSize: 14 },

  // Header
  millionaireBackBtn: { color: '#555', fontSize: 16, fontWeight: 'bold', padding: 4 },

});
