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
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  MillionaireQuestion,
  QuizStackParamList,
  Country,
} from '../types';
import { fetchCountries } from '../lib/countryData';
import { buildNightmareQuestions } from '../lib/questionDifficulty';
import { useGame } from '../context/GameContext';
import AnswerButton from '../components/AnswerButton';
import CountryShapeView from '../components/CountryShapeView';
import { playDing, playWrong, playTick, playTextToSpeech } from '../lib/audio';
import * as Speech from 'expo-speech';

const AUTO_ADVANCE_DELAY_MS = 2500;
const TIMER_SECONDS = 15;
const TOTAL_QUESTIONS = 10;
const PRIZE_GOLD = 50000;

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'NightmareQuiz'>;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';

export default function NightmareQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();

  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [questions, setQuestions] = useState<MillionaireQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(TIMER_SECONDS);

  // Game-over / win state
  const [showLoss, setShowLoss] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const questionsRef = useRef<MillionaireQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizStartRef = useRef<number>(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

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
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    navigation.replace('QuizResults', {
      score: currentIndexRef.current, // number of correct answers
      total: TOTAL_QUESTIONS,
      goldEarned: 0,
      quizType: 'nightmare',
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
    stopTimer();
    
    // Show loss modal
    setShowLoss(true);
  }

  // ── Load questions ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const countries = await fetchCountries();
        setAllCountries(countries);
        const q = buildNightmareQuestions(countries);
        setQuestions(q);
        questionsRef.current = q;
        startTimer();
      } catch (e: any) {
        setError(e.message ?? 'Failed to load questions');
      } finally {
        setLoading(false);
        quizStartRef.current = Date.now();
        elapsedIntervalRef.current = setInterval(() => {
          setElapsedSec(Math.floor((Date.now() - quizStartRef.current) / 1000));
        }, 1000);
      }
    })();

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      stopTimer();
      Speech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle app background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        if (!answered && !showLoss && !showWin && !loading && !error) {
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
  }, [answered, showLoss, showWin, loading, error, timeLeft]);

  // ── Answer handling ────────────────────────────────────────────────────────

  function handleAnswer(selectedIndex: number) {
    if (answered) return;
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

      // Final question — win!
      if (idx === TOTAL_QUESTIONS - 1) {
        addGold(PRIZE_GOLD);
        setConfettiActive(true);
        setShowWin(true);
        return;
      }

      autoAdvanceTimer.current = setTimeout(advanceQuestion, AUTO_ADVANCE_DELAY_MS);
    } else {
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowLoss(true);
    }
  }

  function advanceQuestion() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const nextIdx = currentIndexRef.current + 1;

    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      setAnswered(false);
      setButtonStates(['default', 'default', 'default', 'default']);
      startTimer();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function skipToNext() {
    if (!answered || showWin || showLoss) return;
    advanceQuestion();
  }

  // ── End game handlers ──────────────────────────────────────────────────────

  function handleWinContinue() {
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    navigation.replace('QuizResults', {
      score: TOTAL_QUESTIONS,
      total: TOTAL_QUESTIONS,
      goldEarned: PRIZE_GOLD,
      quizType: 'nightmare',
      elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
    });
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Awakening the Nightmare…</Text>
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
  const timerPct = timeLeft / TIMER_SECONDS;
  const timerColor = timeLeft <= 3 ? '#f44336' : timeLeft <= 6 ? '#FF9800' : '#FFD700';

  return (
    <View style={styles.container}>
      {/* Timer & Progress */}
      <View style={styles.header}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {TOTAL_QUESTIONS}
        </Text>
        <Text style={styles.elapsedTimerText}>⏱ {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}</Text>
        <Text style={styles.prizeHeader}>Prize: 💰 100k</Text>
      </View>

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

      {/* Scrollable question area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.touchArea} onPress={skipToNext} activeOpacity={1}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Flag image — rotated for nightmare difficulty */}
            {question.type === 'flag' && question.flagUrl && (
              <View>
                <View style={styles.flagContainer}>
                  <Image
                    source={{ uri: question.flagUrl }}
                    style={[
                      styles.flag,
                      question.rotation ? { transform: [{ rotate: `${question.rotation}deg` }] } : undefined,
                    ]}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            {/* Area question — card rotated for nightmare difficulty */}
            {question.type === 'area_largest' && (
              <View>
                <View
                  style={[
                    styles.questionCard,
                    question.rotation ? { transform: [{ rotate: `${question.rotation}deg` }] } : undefined,
                  ]}
                >
                  <Text style={styles.areaIcon}>📐</Text>
                  <Text style={styles.questionCardText}>{question.questionText}</Text>
                </View>
              </View>
            )}

            {/* Text card — capital / border questions */}
            {question.type !== 'flag' && question.type !== 'shape' && question.type !== 'area_largest' && (
              <View style={styles.questionCard}>
                {(question.type === 'border_yes' || question.type === 'border_no') && (
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
                  <View style={question.rotation ? { transform: [{ rotate: `${question.rotation}deg` }] } : undefined}>
                    <CountryShapeView
                      countryCode={question.subjectCountry.cca2}
                      height={150}
                      color="#FF4444"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Prompt line */}
            {question.type === 'flag' && (
              <Text style={styles.prompt}>{question.questionText}</Text>
            )}

            {/* Answer buttons */}
            <View style={styles.answers}>
              {question.options.map((option, i) => {
                let detail;
                if (answered && (question.type.startsWith('population') || question.type.startsWith('area'))) {
                  const country = allCountries.find(c => c.name === option);
                  if (country) {
                    if (question.type.startsWith('population')) {
                      detail = `Pop: ${country.population.toLocaleString()}`;
                    } else if (question.type.startsWith('area')) {
                      detail = `Area: ${country.area.toLocaleString()} km²`;
                    }
                  }
                }
                return (
                  <View key={i}>
                    <AnswerButton
                      label={option}
                      state={buttonStates[i]}
                      onPress={() => handleAnswer(i)}
                      detail={detail}
                    />
                  </View>
                );
              })}
            </View>

            {answered && !showWin && !showLoss && (
              <Text style={styles.tapHint}>Tap anywhere to continue →</Text>
            )}
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>

      {/* Confetti */}
      {confettiActive && (
        <ConfettiCannon
          count={150}
          origin={{ x: -10, y: 0 }}
          explosionSpeed={400}
          fallSpeed={2500}
          fadeOut
        />
      )}

      {/* Loss Modal */}
      <Modal visible={showLoss} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>💀</Text>
            <Text style={styles.modalTitle}>Nightmare Over</Text>
            <Text style={styles.modalBody}>
              One mistake is all it takes. Better luck next time.
            </Text>
            <Text style={styles.modalGoldLarge}>💰 0</Text>
            <TouchableOpacity style={styles.primaryBtnLoss} onPress={endGameWithLoss}>
              <Text style={styles.primaryBtnText}>Accept Defeat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Win Modal */}
      <Modal visible={showWin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={styles.modalTitle}>NIGHTMARE CONQUERED!</Text>
            <Text style={styles.modalBody}>
              You survived the ultimate test of geographical knowledge!
            </Text>
            <Text style={styles.modalGoldLarge}>
              💰 {PRIZE_GOLD.toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleWinContinue}>
              <Text style={styles.primaryBtnText}>Claim Your Prize 🏆</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' }, // Dark red tint for nightmare
  centered: {
    flex: 1,
    backgroundColor: '#1a0000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#ff4444', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16, textAlign: 'center', padding: 24 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressText: { color: '#ff8888', fontWeight: 'bold', fontSize: 16 },
  prizeHeader: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
  elapsedTimerText: { color: '#aaa', fontSize: 13, fontWeight: '600' },

  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  timerBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#3a0000',
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

  // Scrollable content
  scrollContent: { flexGrow: 1, paddingBottom: 16, paddingTop: 10 },
  touchArea: { flex: 1, paddingHorizontal: 16 },

  shapeContainer: {
    backgroundColor: '#2a0000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ff4444',
    marginTop: 6,
    marginBottom: 4,
  },

  flagContainer: {
    backgroundColor: '#2a0000',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    height: 130,
    marginTop: 6,
    marginBottom: 10,
  },
  flag: { width: '100%', height: '100%' },

  questionCard: {
    backgroundColor: '#2a0000',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    marginTop: 6,
    marginBottom: 10,
    gap: 10,
  },
  subjectFlag: { width: 70, height: 45, borderRadius: 6 },
  questionCardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  capitalQuestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  capitalHighlight: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 20,
  },
  speakerBtn: {
    backgroundColor: '#4a0000',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  speakerEmoji: {
    fontSize: 20,
  },

  prompt: {
    color: '#ff8888',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 10,
  },

  answers: { gap: 10, marginTop: 10 },

  tapHint: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#2a0000',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  modalEmoji: { fontSize: 64, marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalBody: { color: '#ff8888', fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalGoldLarge: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  
  primaryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  primaryBtnLoss: {
    backgroundColor: '#ff4444',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  primaryBtnText: {
    color: '#1a0000',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  rotationHint: {
    color: '#ff4444',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  areaIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
});
