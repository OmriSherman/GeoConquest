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
import ConfettiCannon from 'react-native-confetti-cannon';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  MillionaireQuestion,
  MILLIONAIRE_GOLD_LADDER,
  MILLIONAIRE_SAFE_ZONES,
  QuizStackParamList,
  Country,
} from '../types';
import { fetchCountries } from '../lib/countryData';
import { buildMillionaireQuestions, buildSingleMillionaireQuestion } from '../lib/questionDifficulty';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import AnswerButton from '../components/AnswerButton';
import CountryShapeView from '../components/CountryShapeView';
import { playDing, playWrong, playTick, playTextToSpeech } from '../lib/audio';
import * as Speech from 'expo-speech';

const AUTO_ADVANCE_DELAY_MS = 2500;
const TIMER_SECONDS = 15;

// Show walk-or-continue checkpoint before these 0-indexed questions
// (i.e. before Q7, Q9, Q11, Q13, Q15 in 1-indexed)
const WALK_AWAY_CHECKPOINT_INDICES = [6, 9, 12];

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

export default function MillionaireQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();
  const { profile, disabledUpgrades } = useAuth();

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
  const [confettiActive, setConfettiActive] = useState(false);

  // Walk-or-continue checkpoint modal
  const [showWalkOrContinue, setShowWalkOrContinue] = useState(false);
  const [walkOrContinuePrize, setWalkOrContinuePrize] = useState(0);
  const pendingNextIndex = useRef<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const questionsRef = useRef<MillionaireQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ladderScrollRef = useRef<ScrollView>(null);
  const [ladderWidth, setLadderWidth] = useState(0);
  const breathAnim = useRef(new Animated.Value(1)).current;

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

  function startTimer() {
    stopTimer();
    timeLeftRef.current = TIMER_SECONDS;
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      const t = timeLeftRef.current;
      setTimeLeft(t);
      if (t > 0 && t <= 3) {
        playTick();
      }
      if (t <= 0) {
        stopTimer();
        handleAutoTimeout();
      }
    }, 1000);
  }

  function endGameWithLoss() {
    const failedIndex = currentIndexRef.current;
    const prize = 0;

    navigation.replace('QuizResults', {
      score: failedIndex, // number of correct answers
      total: 15,
      goldEarned: prize,
      quizType: 'millionaire',
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
        startTimer();
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
      stopTimer();
      Speech.stop(); // Clean up speech on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle app background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        if (!answered && !gameOver && !showWin && !loading && !error && !showWalkOrContinue) {
          // Resume timer
          startTimer();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        Speech.stop();
        stopTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [answered, gameOver, showWin, showWalkOrContinue, loading, error, timeLeft]);

  // Handle navigation focus (stop timer if user hits back button)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // When screen loses focus, stop the timer immediately and kill any speech
        stopTimer();
        Speech.stop();
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
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
    playDing();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

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
        addGold(MILLIONAIRE_GOLD_LADDER[14]);
        setConfettiActive(true);
        setShowWin(true);
        return;
      }

      autoAdvanceTimer.current = setTimeout(afterCorrectAnswer, AUTO_ADVANCE_DELAY_MS);
    } else {
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    if (prize > 0) addGold(prize);
    navigation.replace('QuizResults', {
      score: currentIndexRef.current + 1,
      total: 15,
      goldEarned: prize,
      quizType: 'millionaire',
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
    navigation.replace('QuizResults', {
      score: 15,
      total: 15,
      goldEarned: MILLIONAIRE_GOLD_LADDER[14],
      quizType: 'millionaire',
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

  // ── Main render ────────────────────────────────────────────────────────────

  const question = questions[currentIndex];
  const isSafeZone = MILLIONAIRE_SAFE_ZONES.includes(currentIndex);
  const currentPrize = MILLIONAIRE_GOLD_LADDER[currentIndex];
  const timerPct = timeLeft / TIMER_SECONDS;
  const timerColor = timeLeft <= 3 ? '#f44336' : timeLeft <= 6 ? '#FF9800' : '#FFD700';

  return (
    <View style={styles.container}>
      {/* Timer bar */}
      {!answered && (
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
          const isSafe = MILLIONAIRE_SAFE_ZONES.includes(i);
          return (
            <View
              key={i}
              style={[
                styles.ladderItem,
                isCurrent && styles.ladderItemCurrent,
                isPast && styles.ladderItemPast,
                isSafe && !isCurrent && styles.ladderItemSafe,
              ]}
            >
              <Text style={[styles.ladderText, isCurrent && styles.ladderTextCurrent]}>
                {isSafe ? '🔒' : ''}
                {amount >= 1000 ? `${amount / 1000}K` : String(amount)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Scrollable question area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.touchArea} onPress={skipToNext} activeOpacity={1}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Flag image (flag-type questions) */}
            {question.type === 'flag' && question.flagUrl && (
              <View style={styles.flagContainer}>
                <Image source={{ uri: question.flagUrl }} style={styles.flag} resizeMode="contain" />
              </View>
            )}

            {/* Text card (non-flag, non-shape questions) */}
            {question.type !== 'flag' && question.type !== 'shape' && (
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
                  <Text style={styles.questionCardText}>{question.questionText}</Text>
                )}
              </View>
            )}

            {/* Shape display */}
            {question.type === 'shape' && (
              <View>
                <Text style={styles.prompt}>{question.questionText}</Text>
                <View style={styles.shapeContainer}>
                  <CountryShapeView
                    countryCode={question.subjectCountry.cca2}
                    height={160}
                    color="#FFD700"
                  />
                </View>
              </View>
            )}

            {/* Prompt line (flag type only) */}
            {question.type === 'flag' && (
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
                    onPress={useSkipLifeline}
                    disabled={skipUsed || answered || !isSkipEnabled}
                  >
                    <Text style={[styles.lifelineBtnText, !isSkipEnabled && { color: '#666' }]}>⏭️ Skip</Text>
                  </TouchableOpacity>
                );
              })()}
              <TouchableOpacity
                style={[styles.lifelineBtn, (audienceUsed || answered) && styles.lifelineBtnUsed]}
                onPress={useAudienceLifeline}
                disabled={audienceUsed || answered}
              >
                <Text style={styles.lifelineBtnText}>👥 Audience</Text>
              </TouchableOpacity>
            </View>

            {/* Answer buttons + audience bars */}
            <View style={styles.answers}>
              {question.options.map((option, i) => {
                if (hiddenOptions.has(i)) {
                  return <View key={i} style={styles.hiddenSlot} />;
                }
                let detail;
                return (
                  <View key={i}>
                    <AnswerButton
                      label={option}
                      state={buttonStates[i]}
                      onPress={() => handleAnswer(i)}
                      detail={detail}
                    />
                    {audienceVotes && (
                      <View style={styles.audienceBarRow}>
                        <View style={styles.audienceBarTrack}>
                          <View
                            style={[
                              styles.audienceBarFill,
                              { width: `${audienceVotes[i]}%` as any },
                              i === question.correctIndex && styles.audienceBarCorrect,
                            ]}
                          />
                        </View>
                        <Text style={styles.audiencePct}>{audienceVotes[i]}%</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {answered && !showWin && !showWalkOrContinue && (
              <Text style={styles.tapHint}>Tap anywhere to continue →</Text>
            )}
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>

      {/* Jackpot confetti */}
      {confettiActive && (
        <ConfettiCannon
          count={120}
          origin={{ x: -10, y: 0 }}
          explosionSpeed={350}
          fallSpeed={2500}
          fadeOut
        />
      )}

      {/* Walk-or-Continue checkpoint modal */}
      <Modal visible={showWalkOrContinue} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🔥</Text>
            <Text style={styles.modalTitle}>You're on Fire!</Text>
            <Text style={styles.modalBody}>
              You're so close to the next tier. One more correct answer could change everything.
            </Text>
            <View style={styles.prizeCompare}>
              <View style={styles.prizeCompareItem}>
                <Text style={styles.prizeCompareLabel}>Now</Text>
                <Text style={styles.prizeCompareAmount}>💰 {walkOrContinuePrize.toLocaleString()}</Text>
              </View>
              <Text style={styles.prizeCompareArrow}>→</Text>
              <View style={styles.prizeCompareItem}>
                <Text style={styles.prizeCompareLabel}>Next</Text>
                <Text style={[styles.prizeCompareAmount, { color: '#4CAF50' }]}>
                  💰 {(MILLIONAIRE_GOLD_LADDER[pendingNextIndex.current ?? (currentIndexRef.current + 1)] ?? 0).toLocaleString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={continueFromCheckpoint}>
              <Animated.Text style={[styles.primaryBtnText, { transform: [{ scale: breathAnim }] }]}>
                🚀 Push Forward!
              </Animated.Text>
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
            <Text style={styles.modalEmoji}>👑</Text>
            <Text style={styles.modalTitle}>JACKPOT!</Text>
            <Text style={styles.modalBody}>
              You've conquered all 15 questions!
            </Text>
            <Text style={styles.modalGoldLarge}>
              💰 {MILLIONAIRE_GOLD_LADDER[14].toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleWinContinue}>
              <Text style={styles.primaryBtnText}>Claim Your Gold 👑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Ladder strip
  ladderStrip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    alignItems: 'center',
  },
  ladderItem: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    minWidth: 36,
    alignItems: 'center',
  },
  ladderItemCurrent: {
    backgroundColor: '#2a2000',
    borderColor: '#FFD700',
  },
  ladderItemPast: {
    opacity: 0.4,
  },
  ladderItemSafe: {
    borderColor: '#4CAF50',
  },
  ladderText: { color: '#666', fontSize: 10, fontWeight: '600' },
  ladderTextCurrent: { color: '#FFD700' },

  // Scrollable content
  scrollContent: { flexGrow: 1, paddingBottom: 16 },
  touchArea: { flex: 1, paddingHorizontal: 12 },

  // Shape display (no alignItems so WebView stretches to full width)
  shapeContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 6,
    marginBottom: 4,
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
    height: 160,
    marginTop: 10,
    marginBottom: 8,
  },
  flag: { width: '100%', height: '100%' },

  // Text question card
  questionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginTop: 10,
    marginBottom: 8,
    gap: 12,
    minHeight: 140,
  },
  subjectFlag: { width: 80, height: 50, borderRadius: 6 },
  questionCardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 18,
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
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
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

  // Answers
  answers: { gap: 2, marginBottom: 4 },
  hiddenSlot: { height: 48, marginVertical: 4 },

  // Audience bars
  audienceBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  audienceBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  audienceBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  audienceBarCorrect: {
    backgroundColor: '#4CAF50',
  },
  audiencePct: {
    color: '#aaa',
    fontSize: 10,
    width: 28,
    textAlign: 'right',
  },

  tapHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
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
  dimBtn: { paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  dimBtnText: { color: '#555', fontSize: 13 },
});
