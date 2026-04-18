import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import { Country, QuizStackParamList } from '../types';
import { fetchCountries, getOfflineFullCountries, getCca3ToCca2Map } from '../lib/countryData';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import AnswerButton from '../components/AnswerButton';
import WorldMapView from '../components/WorldMapView';
import { playDingStreak, playWrong } from '../lib/audio';
import HeatStreakBadge from '../components/HeatStreakBadge';
import { filterQuizCountries } from '../lib/quizCountryFilters';

const GOLD_PER_CORRECT = 22;
const MAX_LIVES = 3;
const AUTO_ADVANCE_DELAY_MS = 2200;
const MIN_TRAIL_COUNTRY_AREA_KM2 = 15000;
const MAX_VISIBLE_TRAIL_STEPS = 24;

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'TrailQuiz'>;
};

type TrailQuestionType = 'name' | 'capital';
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

function buildQuestion(country: Country, pool: Country[]): TrailQuestion {
  const type: TrailQuestionType = Math.random() < 0.5 ? 'name' : 'capital';
  if (type === 'capital') return buildCapitalQuestion(country, pool);
  return buildNameQuestion(country, pool);
}

export default function TrailQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TrailQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
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

        const eligible = filterQuizCountries(countries).filter((c) =>
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
    if (answered || gameOver || !currentQuestionRef.current) return;
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
    if (!answered || gameOver) return;
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

  return (
    <TouchableWithoutFeedback onPress={skipToNext}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.progress}>Q{questionNumber}</Text>
            <Text style={styles.lives}>Lives: {'❤️'.repeat(livesLeft)}{'🖤'.repeat(Math.max(0, MAX_LIVES - livesLeft))}</Text>
            <HeatStreakBadge combo={currentCombo} />
          </View>

          <View style={styles.questionArea}>
            <View style={styles.shapeContainer}>
              <WorldMapView
                ownedCountries={[]}
                focusCountry={currentQuestion.country.cca2}
                zoomToFocusCountry
                focusScaleOverride={4.2}
                trailPath={trailPath}
                trailColor="#ff4d4d"
                interactive={false}
                showNames={false}
                height={180}
              />
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.questionText}>{currentQuestion.prompt}</Text>

            <View style={styles.answers}>
              {currentQuestion.options.map((option, i) => (
                <AnswerButton
                  key={`${questionNumber}-${currentQuestion.country.cca2}-${option}`}
                  label={option}
                  state={buttonStates[i]}
                  onPress={() => handleAnswer(i)}
                />
              ))}
            </View>

            {answered && <Text style={styles.tapHint}>Tap anywhere to continue →</Text>}
            </Animated.View>
          </View>
        </ScrollView>
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
  progress: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  lives: { color: '#ddd', fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'center' },
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
  questionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  answers: { gap: 2 },
  tapHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
