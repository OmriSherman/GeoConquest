import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Country, QuizStackParamList } from '../types';
import { fetchCountries, getOfflineFullCountries, getCca3ToCca2Map } from '../lib/countryData';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import WorldMapView from '../components/WorldMapView';
import { playDingStreak, playWrong } from '../lib/audio';
import HeatStreakBadge from '../components/HeatStreakBadge';
import QuitConfirmModal from '../components/QuitConfirmModal';
import EarningsStrip from '../components/EarningsStrip';

const GOLD_PER_CORRECT = 22;
const ANSWER_COLORS = ['#4FC3F7', '#F44336', '#FFD700', '#4CAF50'];
const MAX_LIVES = 3;
const AUTO_ADVANCE_DELAY_MS = 2200;
const MIN_TRAIL_COUNTRY_AREA_KM2 = 15000;
const MAX_VISIBLE_TRAIL_STEPS = 24;

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'TrailQuiz'>;
};

type TrailQuestionType = 'name' | 'capital' | 'flag';
type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';

interface TrailQuestion {
  country: Country;
  type: TrailQuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomStart(countries: Country[], excludeCca2?: string): Country {
  const pool = excludeCca2 ? countries.filter((c) => c.cca2 !== excludeCca2) : countries;
  return pickRandom(pool.length > 0 ? pool : countries);
}

function buildNameQuestion(country: Country, pool: Country[]): TrailQuestion {
  const wrongNames = shuffle(pool.filter((c) => c.cca2 !== country.cca2))
    .slice(0, 3)
    .map((c) => c.name);

  const options = shuffle([...wrongNames, country.name]);
  return {
    country,
    type: 'name',
    prompt: 'What country is this?',
    options,
    correctIndex: options.findIndex((opt) => opt === country.name),
  };
}

function buildCapitalQuestion(country: Country, pool: Country[]): TrailQuestion {
  const seen = new Set<string>([country.capital.trim().toLowerCase()]);
  const wrongCapitals: string[] = [];

  for (const c of shuffle(pool)) {
    if (c.cca2 === country.cca2) continue;
    const cap = c.capital?.trim();
    if (!cap) continue;
    const key = cap.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    wrongCapitals.push(cap);
    if (wrongCapitals.length >= 3) break;
  }

  if (wrongCapitals.length < 3) {
    return buildNameQuestion(country, pool);
  }

  const options = shuffle([...wrongCapitals, country.capital]);
  return {
    country,
    type: 'capital',
    prompt: 'What is the capital of this country?',
    options,
    correctIndex: options.findIndex((opt) => opt === country.capital),
  };
}

function zoomForArea(area: number): number {
  if (area > 3_000_000) return 2.0;
  if (area > 1_000_000) return 2.8;
  if (area > 300_000)  return 3.8;
  if (area > 100_000)  return 5.0;
  if (area > 30_000)   return 6.5;
  return 8.5;
}

function buildFlagQuestion(country: Country, pool: Country[]): TrailQuestion {
  if (!country.flagUrl) return buildNameQuestion(country, pool);

  const wrongFlags = shuffle(pool.filter(c => c.cca2 !== country.cca2 && !!c.flagUrl))
    .slice(0, 3)
    .map(c => c.flagUrl!);

  if (wrongFlags.length < 3) return buildNameQuestion(country, pool);

  const options = shuffle([...wrongFlags, country.flagUrl]);
  return {
    country,
    type: 'flag',
    prompt: 'What is this country\'s flag?',
    options,
    correctIndex: options.findIndex(opt => opt === country.flagUrl),
  };
}

function buildQuestion(country: Country, pool: Country[]): TrailQuestion {
  const r = Math.random();
  if (r < 0.34) return buildCapitalQuestion(country, pool);
  if (r < 0.67) return buildFlagQuestion(country, pool);
  return buildNameQuestion(country, pool);
}

export default function TrailQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mapZoomMultiplier, setMapZoomMultiplier] = useState(1);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const allowLeaveRef = useRef(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TrailQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [goldDelta, setGoldDelta] = useState(0);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [longestTrail, setLongestTrail] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [answered, setAnswered] = useState(false);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [livesLeft, setLivesLeft] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const eligibleCountriesRef = useRef<Country[]>([]);
  const byCca2Ref = useRef<Record<string, Country>>({});
  const currentQuestionRef = useRef<TrailQuestion | null>(null);
  const visitedRef = useRef<Set<string>>(new Set());
  const trailPathRef = useRef<string[]>([]);
  const questionNumberRef = useRef(1);
  const attemptsRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);
  const goldRef = useRef(0);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizStartRef = useRef<number>(0);
  const [trailPath, setTrailPath] = useState<string[]>([]);

  function setQuestion(question: TrailQuestion) {
    currentQuestionRef.current = question;
    setCurrentQuestion(question);
  }

  function setTrailPathCodes(codes: string[]) {
    trailPathRef.current = codes;
    setTrailPath(codes);
  }

  function getUnvisitedNeighbors(country: Country): Country[] {
    const cca3ToCca2 = getCca3ToCca2Map();
    const neighbors: Country[] = [];
    for (const neighborCca3 of country.borders ?? []) {
      const neighborCca2 = cca3ToCca2[neighborCca3];
      if (!neighborCca2) continue;
      const neighbor = byCca2Ref.current[neighborCca2];
      if (!neighbor) continue;
      if (visitedRef.current.has(neighbor.cca2)) continue;
      neighbors.push(neighbor);
    }
    return neighbors;
  }

  function resolveNextCountry(currentCountry: Country): Country {
    const neighbors = getUnvisitedNeighbors(currentCountry);
    if (neighbors.length > 0) {
      const next = pickRandom(neighbors);
      visitedRef.current.add(next.cca2);
      const appended = [...trailPathRef.current, next.cca2];
      // Keep trail readable and light-weight on long endless runs.
      setTrailPathCodes(appended.slice(-MAX_VISIBLE_TRAIL_STEPS));
      return next;
    }

    const freshStart = pickRandomStart(eligibleCountriesRef.current, currentCountry.cca2);
    visitedRef.current = new Set([freshStart.cca2]);
    setTrailPathCodes([freshStart.cca2]);
    return freshStart;
  }

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      const unsubscribe = (parent as any).addListener('tabPress', (e: any) => {
        if (!readyRef.current) return;
        e.preventDefault();
        onConfirmQuitRef.current = () => {
          if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
          allowLeaveRef.current = true;
          navigation.popToTop();
        };
        setShowQuitModal(true);
      });
      return unsubscribe;
    }, [navigation])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !readyRef.current) return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
        allowLeaveRef.current = true;
        navigation.dispatch(e.data.action);
      };
      setShowQuitModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        let countries: Country[];
        try {
          countries = await fetchCountries();
        } catch {
          if (profile?.is_conquerer) {
            countries = getOfflineFullCountries();
          } else {
            throw new Error('OFFLINE_NO_PREMIUM');
          }
        }

        const eligible = countries.filter((c) =>
          !!c.capital &&
          c.capital.trim().length > 0 &&
          Number(c.area || 0) >= MIN_TRAIL_COUNTRY_AREA_KM2 &&
          Array.isArray(c.borders) &&
          c.borders.length > 0
        );

        if (eligible.length < 4) {
          throw new Error('Not enough countries available for Trail Quiz.');
        }

        eligibleCountriesRef.current = eligible;
        byCca2Ref.current = Object.fromEntries(eligible.map((c) => [c.cca2, c]));

        const startCountry = pickRandom(eligible);
        visitedRef.current = new Set([startCountry.cca2]);
        setTrailPathCodes([startCountry.cca2]);
        setQuestion(buildQuestion(startCountry, eligible));
      } catch (e: any) {
        setError(
          e.message === 'OFFLINE_NO_PREMIUM'
            ? 'offline_upgrade'
            : (e.message ?? 'Failed to load countries')
        );
      } finally {
        setLoading(false);
        quizStartRef.current = Date.now();
      }
    })();

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  function handleAnswer(selectedIndex: number) {
    if (answered || gameOver || paused || !currentQuestionRef.current) return;
    setAnswered(true);

    const question = currentQuestionRef.current;
    const isCorrect = selectedIndex === question.correctIndex;
    attemptsRef.current += 1;

    setButtonStates(question.options.map((_, i) => {
      if (i === question.correctIndex) return 'correct';
      if (i === selectedIndex && !isCorrect) return 'wrong';
      return 'disabled';
    }));

    if (isCorrect) {
      comboRef.current += 1;
      setCurrentCombo(comboRef.current);
      playDingStreak(comboRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      scoreRef.current += 1;
      const earned = Math.round(GOLD_PER_CORRECT * (1 + (comboRef.current - 1) * 0.1));
      goldRef.current += earned;
      setScore(scoreRef.current);
      setGoldEarned(goldRef.current);
      setGoldDelta(earned);
      setAnimTrigger(t => t + 1);
      setLongestTrail(prev => Math.max(prev, comboRef.current));
      addGold(earned);
    } else {
      comboRef.current = 0;
      setCurrentCombo(0);
      const nextLives = Math.max(0, livesRef.current - 1);
      livesRef.current = nextLives;
      setLivesLeft(nextLives);
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (nextLives <= 0) {
        setGameOver(true);
      }
    }

    autoAdvanceTimer.current = setTimeout(advanceQuestion, AUTO_ADVANCE_DELAY_MS);
  }

  function skipToNext() {
    if (!answered || gameOver || paused) return;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    advanceQuestion();
  }

  function advanceQuestion() {
    if (!currentQuestionRef.current) return;

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }

    if (gameOver || livesRef.current <= 0) {
      allowLeaveRef.current = true;
      navigation.replace('QuizResults', {
        score: scoreRef.current,
        total: Math.max(1, attemptsRef.current),
        goldEarned: goldRef.current,
        quizType: 'trail',
        elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
      });
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      const nextCountry = resolveNextCountry(currentQuestionRef.current!.country);
      const nextQuestion = buildQuestion(nextCountry, eligibleCountriesRef.current);

      questionNumberRef.current += 1;
      setQuestionNumber(questionNumberRef.current);
      setQuestion(nextQuestion);
      setAnswered(false);
      setMapZoomMultiplier(1);
      setButtonStates(['default', 'default', 'default', 'default']);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Preparing trail…</Text>
      </View>
    );
  }

  if (error || !currentQuestion) {
    if (error === 'offline_upgrade') {
      return (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
          <Text style={[styles.errorText, { color: '#FFD700', fontWeight: 'bold' }]}>You're Offline</Text>
          <Text style={[styles.errorText, { color: '#aaa', fontSize: 14, marginTop: 8 }]}>
            Upgrade to Conqueror&apos;s Pass to play all quizzes without an internet connection.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('Premium')}
            style={{ marginTop: 20, backgroundColor: '#7B2FBE', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No questions available'}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0a0a1a' }]}>
        <Image source={require('../../assets/avatars/compass.png')} style={{ width: 80, height: 80, marginBottom: 20 }} resizeMode="contain" />
        <Text style={styles.readyTitle}>TRAIL QUIZ</Text>
        <Text style={styles.readySubtitle}>Follow the trail of neighboring countries</Text>
        <TouchableOpacity style={styles.readyBtn} onPress={() => { quizStartRef.current = Date.now(); setReady(true); }}>
          <Text style={styles.readyBtnText}>LET'S GO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.readyBackLink}>
          <Text style={styles.readyBackLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={skipToNext}>
      <View style={styles.container}>
        {/* Pause overlay */}
        {paused && (
          <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
            <Image source={require('../../assets/avatars/stop_it.png')} style={styles.pauseStopIt} resizeMode="contain" />
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={() => setPaused(false)}>
              <Text style={styles.resumeBtnText}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { allowLeaveRef.current = true; navigation.goBack(); }} style={{ marginTop: 16 }}>
              <Text style={styles.quitText}>Quit</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.livesRow}>
              {Array.from({ length: MAX_LIVES }, (_, i) => (
                <Image
                  key={i}
                  source={require('../../assets/avatars/red_heart.png')}
                  style={[styles.heartIcon, i >= livesLeft && styles.heartDead]}
                  resizeMode="contain"
                />
              ))}
            </View>
            <View style={styles.longestTrailBadge}>
              <Image source={require('../../assets/avatars/footprint_trail.png')} style={styles.trailIcon} resizeMode="contain" />
              <Text style={styles.longestTrailText}>{longestTrail}</Text>
            </View>
            <TouchableOpacity onPress={() => !answered && setPaused(p => !p)} style={styles.pauseBtn}>
              <View style={styles.pauseIconBar} />
              <View style={styles.pauseIconBar} />
            </TouchableOpacity>
          </View>
          <EarningsStrip
            goldTotal={goldEarned}
            goldDelta={goldDelta}
            animTrigger={animTrigger}
            accuracy={null}
          />

          <View style={styles.questionArea}>
            <View style={styles.shapeContainer}>
              <WorldMapView
                ownedCountries={[]}
                focusCountry={currentQuestion.country.cca2}
                zoomToFocusCountry
                focusScaleOverride={zoomForArea(currentQuestion.country.area) * mapZoomMultiplier}
                trailPath={trailPath}
                trailColor="#ff4d4d"
                interactive={false}
                showNames={false}
                height={180}
              />
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setMapZoomMultiplier(z => Math.min(4, z + 0.5))}
                activeOpacity={0.7}
              >
                <Text style={styles.zoomBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.questionText}>{currentQuestion.prompt}</Text>

            <View style={styles.answersGrid}>
              {currentQuestion.options.map((option, i) => {
                const s = buttonStates[i];
                const isFlag = currentQuestion.type === 'flag';
                const accentColor = ANSWER_COLORS[i % ANSWER_COLORS.length];
                return (
                  <TouchableOpacity
                    key={`${questionNumber}-${currentQuestion.country.cca2}-${i}`}
                    style={[
                      styles.gridBtn,
                      s === 'default' && { borderColor: accentColor },
                      s === 'correct'  && styles.btnCorrect,
                      s === 'wrong'    && styles.btnWrong,
                      s === 'disabled' && styles.btnDisabled,
                    ]}
                    onPress={() => handleAnswer(i)}
                    disabled={s !== 'default'}
                    activeOpacity={0.75}
                  >
                    {isFlag ? (
                      <Image
                        source={{ uri: option }}
                        style={styles.flagAnswerImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.gridBtnText,
                          s === 'correct'  && styles.textCorrect,
                          s === 'wrong'    && styles.textWrong,
                          s === 'disabled' && styles.textDisabled,
                        ]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                      >
                        {option}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.tapHint, { opacity: answered ? 1 : 0 }]}>Tap anywhere to continue →</Text>
            </Animated.View>
          </View>
        </ScrollView>
      <QuitConfirmModal
        visible={showQuitModal}
        onStay={() => { setShowQuitModal(false); onConfirmQuitRef.current = null; }}
        onQuit={() => { setShowQuitModal(false); onConfirmQuitRef.current?.(); onConfirmQuitRef.current = null; }}
      />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16, textAlign: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { color: '#555', fontSize: 16, fontWeight: 'bold', padding: 4 },
  progress: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  livesRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  heartIcon: { width: 24, height: 24 },
  heartDead: { opacity: 0.2 },
  longestTrailBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  trailIcon: { width: 18, height: 18 },
  longestTrailText: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  questionArea: { flex: 1, padding: 20 },
  prompt: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  shapeContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 14,
  },
  zoomBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(10,10,26,0.85)',
    borderWidth: 1,
    borderColor: '#4d96ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { color: '#4d96ff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },
  questionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  answersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  gridBtn: {
    width: '47%',
    height: 100,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 2,
    backgroundColor: '#1a1a2e',
    borderColor: '#2a2a4e',
  },
  gridBtnText: { fontSize: 15, fontWeight: '600', color: '#eee', textAlign: 'center' },
  btnCorrect:  { backgroundColor: '#1a3a1a', borderColor: '#4CAF50' },
  btnWrong:    { backgroundColor: '#3a1a1a', borderColor: '#f44336' },
  btnDisabled: { backgroundColor: '#111', borderColor: '#222', opacity: 0.5 },
  textCorrect:  { color: '#4CAF50' },
  textWrong:    { color: '#f44336' },
  textDisabled: { color: '#444' },
  flagAnswerImg: { width: '100%', height: 70, borderRadius: 6 },
  tapHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },

  // ── Ready screen ──────────────────────────────────────────────────────────
  readyTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, marginBottom: 36 },
  readyBtn: { backgroundColor: '#4d96ff', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  readyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  readyBackLink: { marginTop: 20 },
  readyBackLinkText: { color: '#555', fontSize: 14 },

  // ── Pause ─────────────────────────────────────────────────────────────────
  pauseBtn: { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0a1a', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60, zIndex: 100 },
  pauseStopIt: { width: 140, height: 140, marginBottom: 12 },
  pauseTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 32 },
  resumeBtn: { borderWidth: 2, borderColor: '#4d96ff', paddingHorizontal: 36, paddingVertical: 13, borderRadius: 14, marginBottom: 8 },
  resumeBtnText: { color: '#4d96ff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  quitText: { color: '#555', fontSize: 14, fontWeight: '600', marginTop: 8 },
});
