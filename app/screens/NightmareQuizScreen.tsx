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
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  MillionaireQuestion,
  QuizStackParamList,
  Country,
} from '../types';
import { fetchCountries } from '../lib/countryData';
import { buildNightmareQuestions } from '../lib/questionDifficulty';
import { useAuth } from '../context/AuthContext';
import AnswerButton from '../components/AnswerButton';
import QuitConfirmModal from '../components/QuitConfirmModal';
import CountryShapeView from '../components/CountryShapeView';
import { playDing, playWrong, playTick, playTextToSpeech, playDiceRoll, playMillionaireSwap } from '../lib/audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const NIGHTMARE_LOSS_KEY = 'nightmare_loss_count';

const AUTO_ADVANCE_DELAY_MS = 2500;
const BASE_TIMER = 11;
const MIN_TIMER = 5;
const TOTAL_QUESTIONS = 10;
const PRIZE_GOLD = 50000;
const REPEAT_PRIZE_GOLD = 2000;

type Curse = 'none' | 'blind' | 'shuffle' | 'rush' | 'phantom';
const ALL_CURSES: Curse[] = ['blind', 'shuffle', 'rush', 'phantom'];
const CURSE_LABEL: Record<Curse, string> = { none: '', blind: 'BLIND', shuffle: 'SHUFFLE', rush: 'RUSH', phantom: 'PHANTOM' };
const CURSE_COLOR: Record<Curse, string> = { none: '', blind: '#cc3300', shuffle: '#cc8800', rush: '#4466cc', phantom: '#aa00cc' };
const CURSE_DESC: Record<Curse, string> = {
  none: '',
  blind: 'Out of darkness...',
  shuffle: 'Careful where you click.',
  rush: '5 seconds. Clock starts now.',
  phantom: 'Trust the Phantom.',
};

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'NightmareQuiz'>;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled' | 'phantom';

export default function NightmareQuizScreen({ navigation }: Props) {
  const { addGold, profile } = useAuth();

  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [questions, setQuestions] = useState<MillionaireQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(BASE_TIMER);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLeftRef = useRef(BASE_TIMER);

  const wasAlreadyCompletedRef = useRef(false);
  useEffect(() => {
    const key = profile?.id
      ? `@achievements/${profile.id}/nightmare_completed`
      : '@achievements/nightmare_completed';
    AsyncStorage.getItem(key).then(val => { wasAlreadyCompletedRef.current = val === 'true'; });
  }, [profile?.id]);

  // Game-over / win state
  const [showWin, setShowWin] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const allowLeaveRef = useRef(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const questionsRef = useRef<MillionaireQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizStartRef = useRef<number>(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Curses
  const [currentCurse, setCurrentCurse] = useState<Curse>('none');
  const currentCurseRef = useRef<Curse>('none');
  const [displayOrder, setDisplayOrder] = useState([0, 1, 2, 3]);
  const [phantomIndex, setPhantomIndex] = useState<number | null>(null);
  const blindCover = useRef(new Animated.Value(0)).current;
  const blindTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phantomShowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phantomClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Escalating vignette + shake
  const vignetteAnim = useRef(new Animated.Value(0)).current;
  const vignetteLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shakeLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  // Curse reveal
  const [showCurseReveal, setShowCurseReveal] = useState(false);
  const diceSpinAnim = useRef(new Animated.Value(0)).current;
  const curseRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────

  function getTimerSeconds(idx: number) { return Math.max(MIN_TIMER, BASE_TIMER - idx); }

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
      if (t > 0 && currentCurseRef.current === 'rush') playTick();
      else if (t > 0 && t <= 3) playTick();
      if (t <= 0) { stopTimer(); handleAutoTimeout(); }
    }, 1000);
  }

  function startTimer() { startTimerFrom(getTimerSeconds(currentIndexRef.current)); }

  function pauseGame() {
    if (pausedRef.current || answered || showWin) return;
    stopTimer();
    Speech.stop();
    pausedRef.current = true;
    setPaused(true);
  }

  function resumeGame() {
    pausedRef.current = false;
    setPaused(false);
    startTimerFrom(timeLeftRef.current);
  }

  function clearCurseTimers() {
    if (blindTimerRef.current) { clearTimeout(blindTimerRef.current); blindTimerRef.current = null; }
    if (shuffleTimerRef.current) { clearInterval(shuffleTimerRef.current); shuffleTimerRef.current = null; }
    if (phantomShowRef.current) { clearTimeout(phantomShowRef.current); phantomShowRef.current = null; }
    if (phantomClearRef.current) { clearTimeout(phantomClearRef.current); phantomClearRef.current = null; }
    if (curseRevealTimerRef.current) { clearTimeout(curseRevealTimerRef.current); curseRevealTimerRef.current = null; }
  }

  function applyNewCurse(question: MillionaireQuestion) {
    clearCurseTimers();
    setDisplayOrder([0, 1, 2, 3]);
    setPhantomIndex(null);
    blindCover.setValue(0);

    const curse: Curse = ALL_CURSES[Math.floor(Math.random() * ALL_CURSES.length)];
    setCurrentCurse(curse);
    currentCurseRef.current = curse;

    // Show dice reveal overlay for 2s, then start timer and apply curse effects
    diceSpinAnim.setValue(0);
    Animated.timing(diceSpinAnim, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
    setShowCurseReveal(true);
    playDiceRoll();

    curseRevealTimerRef.current = setTimeout(() => {
      setShowCurseReveal(false);

      if (curse === 'blind') {
        blindCover.setValue(1);
        Animated.timing(blindCover, { toValue: 0, duration: 6500, useNativeDriver: true }).start();
      }
      if (curse === 'shuffle') {
        shuffleTimerRef.current = setInterval(() => {
          setDisplayOrder([0, 1, 2, 3].sort(() => Math.random() - 0.5));
          playMillionaireSwap();
        }, 2000);
      }
      if (curse === 'phantom') {
        const allIndices = question.options.map((_, i) => i);
        const fakeIdx = allIndices[Math.floor(Math.random() * allIndices.length)];
        phantomShowRef.current = setTimeout(() => {
          setPhantomIndex(fakeIdx);
          phantomClearRef.current = setTimeout(() => setPhantomIndex(null), 1800);
        }, 1200);
      }

      if (curse === 'rush') startTimerFrom(5);
      else startTimer();
    }, 2000);
  }

  async function endGameWithLoss() {
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    const stored = await AsyncStorage.getItem(NIGHTMARE_LOSS_KEY);
    const lossCount = parseInt(stored ?? '0', 10);
    const toll = 200 + lossCount * 20;
    await AsyncStorage.setItem(NIGHTMARE_LOSS_KEY, String(lossCount + 1));
    await addGold(-toll);
    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: currentIndexRef.current,
      total: TOTAL_QUESTIONS,
      goldEarned: -toll,
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
    
    endGameWithLoss();
  }

  // ── Load questions ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(NIGHTMARE_LOSS_KEY);
        const lossCount = parseInt(stored ?? '0', 10);
        const toll = 200 + lossCount * 20;
        if ((profile.gold_balance ?? 0) < toll) {
          setError(`You need at least ${toll.toLocaleString()} gold to enter Nightmare (penalty on failure).`);
          return;
        }

        const countries = await fetchCountries();
        setAllCountries(countries);
        const q = buildNightmareQuestions(countries);
        setQuestions(q);
        questionsRef.current = q;
      } catch (e: any) {
        setError(e.message ?? 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      clearCurseTimers();
      if (vignetteLoopRef.current) vignetteLoopRef.current.stop();
      if (shakeLoopRef.current) shakeLoopRef.current.stop();
      stopTimer();
      Speech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Stop shake + shuffle interval while waiting to advance
  useEffect(() => {
    if (answered) {
      if (shakeLoopRef.current) shakeLoopRef.current.stop();
      shakeAnim.setValue(0);
      if (shuffleTimerRef.current) { clearInterval(shuffleTimerRef.current); shuffleTimerRef.current = null; }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  // Handle app background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (ready && !pausedRef.current && !answered && !showWin && !loading && !error) {
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
  }, [answered, showWin, loading, error, timeLeft, ready]);

  // Escalating atmosphere — vignette + shake — starts Q1, intensifies to Q10
  useEffect(() => {
    if (vignetteLoopRef.current) vignetteLoopRef.current.stop();
    if (shakeLoopRef.current) shakeLoopRef.current.stop();
    shakeAnim.setValue(0);

    if (ready && !showWin) {
      const progress = (currentIndex + 1) / TOTAL_QUESTIONS; // 0.1 at Q1, 1.0 at Q10
      const maxIntensity = 0.04 + progress * 0.32; // 0.072 → 0.36
      const pulseDuration = Math.max(350, 1400 - currentIndex * 105); // 1400ms → 455ms

      vignetteLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(vignetteAnim, { toValue: maxIntensity, duration: pulseDuration, useNativeDriver: true }),
          Animated.timing(vignetteAnim, { toValue: maxIntensity * 0.15, duration: pulseDuration, useNativeDriver: true }),
        ])
      );
      vignetteLoopRef.current.start();

      // Tremor starts at Q6, grows to Q10
      if (currentIndex >= 4) {
        const amplitude = (currentIndex - 3) * 1.2; // 1.2 → 7.2
        const restMs = Math.max(300, 900 - currentIndex * 60);
        shakeLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: amplitude, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -amplitude, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: amplitude * 0.4, duration: 55, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: restMs, useNativeDriver: true }),
          ])
        );
        shakeLoopRef.current.start();
      }
    } else {
      vignetteAnim.setValue(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, ready, showWin]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !readyRef.current) return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
        stopTimer();
        Speech.stop();
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
        allowLeaveRef.current = true;
        navigation.dispatch(e.data.action);
      };
      setShowQuitModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Tab navigation guard
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
          if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
          allowLeaveRef.current = true;
          navigation.popToTop();
        };
        setShowQuitModal(true);
      });
      return unsubscribe;
    }, [navigation])
  );

  // ── Answer handling ────────────────────────────────────────────────────────

  async function handleAnswer(selectedIndex: number) {
    if (answered || paused) return;
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
        const prize = wasAlreadyCompletedRef.current ? REPEAT_PRIZE_GOLD : PRIZE_GOLD;
        await addGold(prize);
        setConfettiActive(true);
        setShowWin(true);
        return;
      }

      autoAdvanceTimer.current = setTimeout(advanceQuestion, AUTO_ADVANCE_DELAY_MS);
    } else {
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      endGameWithLoss();
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
      applyNewCurse(questionsRef.current[nextIdx]); // calls startTimer after reveal
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function skipToNext() {
    if (!answered || showWin) return;
    advanceQuestion();
  }

  // ── End game handlers ──────────────────────────────────────────────────────

  function handleWinContinue() {
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: TOTAL_QUESTIONS,
      total: TOTAL_QUESTIONS,
      goldEarned: wasAlreadyCompletedRef.current ? REPEAT_PRIZE_GOLD : PRIZE_GOLD,
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

  // ── Ready screen ──────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <View style={styles.readyContainer}>
        <Image source={require('../../assets/avatars/demon_hand.png')} style={{ width: 80, height: 80, marginBottom: 20, transform: [{ rotate: '180deg' }] }} resizeMode="contain" />
        <Text style={styles.readyTitle}>NIGHTMARE</Text>
        <Text style={styles.readySubtitle}>10 questions. 15 seconds each. One wrong answer and it will cost you.</Text>
        <TouchableOpacity
          style={styles.readyBtn}
          onPress={() => {
            quizStartRef.current = Date.now();
            elapsedIntervalRef.current = setInterval(() => {
              setElapsedSec(Math.floor((Date.now() - quizStartRef.current) / 1000));
            }, 1000);
            setReady(true);
            applyNewCurse(questionsRef.current[0]); // calls startTimer after reveal
          }}
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
  const timerSeconds = getTimerSeconds(currentIndex);
  const timerPct = timeLeft / timerSeconds;
  const timerColor = '#ff4444';
  const bgProgress = (currentIndex + 1) / TOTAL_QUESTIONS;
  const bgDark = Math.max(4, Math.round(26 - bgProgress * 22));
  const bgHexStr = bgDark.toString(16).padStart(2, '0');
  const bgColor = `#${bgHexStr}0000`;
  const diceRotation = diceSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <View style={styles.shakeWrapper}>
    <Animated.View style={[styles.container, { backgroundColor: bgColor, transform: [{ translateX: shakeAnim }] }]}>
      {/* Pulsing vignette — grows from Q1 to Q10 */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#880000', opacity: vignetteAnim, zIndex: 0 }]}
      />

      {/* Curse reveal overlay */}
      {showCurseReveal && (
        <View style={[StyleSheet.absoluteFill, styles.curseRevealOverlay]}>
          <View style={styles.diceStack}>
            <Image source={require('../../assets/avatars/demons_gamble.png')} style={styles.diceBackground} resizeMode="contain" />
            <Animated.Image
              source={require('../../assets/avatars/cursed_dice.png')}
              style={[styles.diceForeground, { transform: [{ rotate: diceRotation }] }]}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.curseRevealLabel}>CURSE DRAWN</Text>
          <Text style={[styles.curseRevealName, { color: CURSE_COLOR[currentCurse] }]}>
            {CURSE_LABEL[currentCurse]}
          </Text>
          <Text style={styles.curseRevealDesc}>{CURSE_DESC[currentCurse]}</Text>
        </View>
      )}

      {/* Pause overlay */}
      {paused && (
        <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
          <Image source={require('../../assets/avatars/stop_it.png')} style={styles.pauseStopIt} resizeMode="contain" />
          <Text style={styles.pauseTitle}>PAUSED</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={resumeGame}>
            <Text style={styles.resumeBtnText}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { stopTimer(); allowLeaveRef.current = true; navigation.goBack(); }}>
            <Text style={styles.quitText}>Quit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {TOTAL_QUESTIONS}
        </Text>
        {currentCurse !== 'none' && !answered && (
          <View style={[styles.curseBadge, { borderColor: CURSE_COLOR[currentCurse] }]}>
            <Text style={[styles.curseBadgeText, { color: CURSE_COLOR[currentCurse] }]}>{CURSE_LABEL[currentCurse]}</Text>
          </View>
        )}
        <Text style={styles.elapsedTimerText}>⏱ {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}</Text>
        <TouchableOpacity onPress={pauseGame} style={styles.pauseBtn} disabled={answered || showWin}>
          <View style={styles.pauseIconBar} />
          <View style={styles.pauseIconBar} />
        </TouchableOpacity>
      </View>

      <View style={[styles.timerContainer, answered && { opacity: 0.35 }]}>
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

      {/* Scrollable question area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!answered}
      >
        <Animated.View style={[{ opacity: fadeAnim }, styles.touchArea]}>
          {/* Question visual — blind curse covers this area */}
          <View style={{ position: 'relative' }}>
            {/* Flag image — rotated for nightmare difficulty */}
            {question.type === 'flag' && question.flagUrl && (
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
            )}

            {/* Area question — card rotated for nightmare difficulty */}
            {question.type === 'area_largest' && (
              <View
                style={[
                  styles.questionCard,
                  question.rotation ? { transform: [{ rotate: `${question.rotation}deg` }] } : undefined,
                ]}
              >
                <Text style={styles.areaIcon}>📐</Text>
                <Text style={styles.questionCardText}>{question.questionText}</Text>
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

            {/* Blind curse — dark cover that lifts over 4s */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity: blindCover, borderRadius: 16 }]}
            />
          </View>

          {/* Answer buttons — rendered in displayOrder for shuffle curse */}
          <View style={styles.answers}>
            {displayOrder.map((logicalIdx, displayPos) => {
              const option = question.options[logicalIdx];
              let detail;
              if (answered && (question.type.startsWith('population') || question.type.startsWith('area'))) {
                const country = allCountries.find(c => c.name === option);
                if (country) {
                  detail = question.type.startsWith('population')
                    ? `Pop: ${country.population.toLocaleString()}`
                    : `Area: ${country.area.toLocaleString()} km²`;
                }
              }
              const isPhantom = phantomIndex === logicalIdx && buttonStates[logicalIdx] === 'default';
              return (
                <AnswerButton
                  key={displayPos}
                  label={option}
                  style={styles.answerGridButton}
                  state={isPhantom ? 'phantom' : buttonStates[logicalIdx]}
                  onPress={() => handleAnswer(logicalIdx)}
                  detail={detail}
                  variant="nightmare"
                />
              );
            })}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Tap-anywhere overlay when answered — outside ScrollView to avoid scroll jump */}
      {answered && !showWin && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
          onPress={skipToNext}
          activeOpacity={1}
        />
      )}

      {/* Fixed bottom tap hint — outside ScrollView so it never shifts layout */}
      {answered && !showWin && (
        <View style={styles.tapHintFixed} pointerEvents="none">
          <Text style={styles.tapHint}>Tap anywhere to continue →</Text>
        </View>
      )}

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

      {/* Win Modal */}
      <Modal visible={showWin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Image source={require('../../assets/avatars/evil_vanquished.png')} style={styles.modalImage} resizeMode="contain" />
            <Text style={styles.modalTitle}>The beast mark is yours</Text>
            <Text style={styles.modalBody}>
              You are the new king of the underworld
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <Text style={styles.modalGoldLarge}>{PRIZE_GOLD.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtnWin} onPress={handleWinContinue}>
              <Text style={styles.primaryBtnWinText}>Take What Is Owed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <QuitConfirmModal
        visible={showQuitModal}
        title="Leave Nightmare?"
        message="Your progress will be lost."
        onStay={() => { setShowQuitModal(false); onConfirmQuitRef.current = null; }}
        onQuit={() => { setShowQuitModal(false); onConfirmQuitRef.current?.(); onConfirmQuitRef.current = null; }}
      />
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shakeWrapper: { flex: 1, backgroundColor: '#030000' },
  container: { flex: 1, backgroundColor: '#1a0000' },
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
  elapsedTimerText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  curseBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  curseBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  curseRevealOverlay: {
    backgroundColor: 'rgba(5, 0, 0, 0.97)',
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  diceStack: {
    width: 225,
    height: 225,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  diceBackground: {
    position: 'absolute',
    width: 225,
    height: 225,
    opacity: 0.9,
  },
  diceForeground: {
    width: 56,
    height: 56,
    marginTop: 100,
  },
  curseRevealLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  curseRevealName: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 4,
  },
  curseRevealDesc: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
  },

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

  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  answerGridButton: { width: '48%', minHeight: 84, marginVertical: 0, paddingHorizontal: 10 },

  tapHintFixed: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 11,
  },
  tapHint: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
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
  modalImage: { width: 120, height: 120, marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalBody: { color: '#ff8888', fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalGoldLarge: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', marginBottom: 24 },
  
  primaryBtnLoss: {
    backgroundColor: '#ff4444',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  primaryBtnWin: {
    backgroundColor: '#3a0000',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#8b0000',
  },
  primaryBtnText: {
    color: '#1a0000',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  primaryBtnWinText: {
    color: '#ff8888',
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

  backBtn: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', padding: 4 },
  pauseBtn: { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0000', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60, zIndex: 100 },
  pauseStopIt: { width: 140, height: 140, marginBottom: 12 },
  pauseTitle: { color: '#ff4444', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 20, marginTop: 20 },
  resumeBtn: { borderWidth: 2, borderColor: '#ff4444', paddingHorizontal: 36, paddingVertical: 13, borderRadius: 14 },
  resumeBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  quitText: { color: '#8b0000', fontSize: 14, fontWeight: '600' },

  readyContainer: { flex: 1, backgroundColor: '#1a0000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyTitle: { color: '#ff4444', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  readyBtn: { backgroundColor: '#ff4444', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  readyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  readyBackLink: { marginTop: 20 },
  readyBackLinkText: { color: '#8b0000', fontSize: 14 },
});
