import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList, QuizQuestion } from '../types';
import { buildBordersQuizQuestions, fetchCountries, getCca3ToCca2Map } from '../lib/countryData';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import AnswerButton from '../components/AnswerButton';
import BordersMapView from '../components/BordersMapView';
import { playDingStreak, playWrong } from '../lib/audio';
import HeatStreakBadge from '../components/HeatStreakBadge';

const GOLD_PER_CORRECT = 15;
const AUTO_ADVANCE_DELAY_MS = 2500;

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'BordersQuiz'>;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';

export default function BordersQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();
  const { profile, effectiveMaxTurns } = useAuth();
  const TOTAL_QUESTIONS = effectiveMaxTurns;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>(['default', 'default', 'default', 'default']);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const scoreRef = useRef(0);
  const goldRef = useRef(0);
  const comboRef = useRef(0);
  const questionsRef = useRef<QuizQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const countries = await fetchCountries();
        const q = buildBordersQuizQuestions(countries, TOTAL_QUESTIONS);
        setQuestions(q);
        questionsRef.current = q;
      } catch (e: any) {
        setError(e.message ?? 'Failed to load countries');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  function handleAnswer(selectedIndex: number) {
    if (answered) return;
    setAnswered(true);

    const question = questionsRef.current[currentIndexRef.current];
    if (!question) return;
    const isCorrect = selectedIndex === question.correctIndex;

    const newStates: AnswerState[] = question.options.map((_, i) => {
      if (i === question.correctIndex) return 'correct';
      if (i === selectedIndex && !isCorrect) return 'wrong';
      return 'disabled';
    });
    setButtonStates(newStates);

    if (isCorrect) {
      comboRef.current += 1;
      setCurrentCombo(comboRef.current);
      setShowConfetti(true);
      playDingStreak(comboRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      scoreRef.current += 1;
      const comboBonus = comboRef.current > 1 ? comboRef.current - 1 : 0;
      const totalEarned = GOLD_PER_CORRECT + comboBonus;
      
      goldRef.current += totalEarned;
      setScore(scoreRef.current);
      setGoldEarned(goldRef.current);
      addGold(totalEarned);
    } else {
      comboRef.current = 0;
      setCurrentCombo(0);
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    autoAdvanceTimer.current = setTimeout(advanceQuestion, AUTO_ADVANCE_DELAY_MS);
  }

  function skipToNext() {
    if (!answered) return;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    advanceQuestion();
  }

  function advanceQuestion() {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      navigation.replace('QuizResults', {
        score: scoreRef.current,
        total: TOTAL_QUESTIONS,
        goldEarned: goldRef.current,
        quizType: 'borders',
      });
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      setAnswered(false);
      setShowConfetti(false);
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
        <Text style={styles.loadingText}>Loading shapes…</Text>
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

  const question = questions[currentIndex];
  // Calculate all neighbors for the map
  const cca3Map = getCca3ToCca2Map();
  const allActualNeighbors = question.country.borders.map(b => cca3Map[b]).filter(Boolean);

  return (
    <TouchableWithoutFeedback onPress={skipToNext}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.progress}>{currentIndex + 1} / {TOTAL_QUESTIONS}</Text>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.scoreFill, { width: `${(currentIndex / TOTAL_QUESTIONS) * 100}%` as any }]} />
            </View>
            <HeatStreakBadge combo={currentCombo} />
          </View>

          <Animated.View style={[styles.questionArea, { opacity: fadeAnim }]}>
            <Text style={styles.prompt}>Which country doesn't border {question.country.name}?</Text>

            <View style={styles.shapeContainer}>
              <BordersMapView
                targetCode={question.country.cca2}
                neighborCodes={allActualNeighbors}
                height={140}
              />
            </View>

            <View style={styles.answers}>
              {question.options.map((option, i) => (
                <AnswerButton
                  key={`${currentIndex}-${option.cca2}`}
                  label={option.name}
                  state={buttonStates[i]}
                  onPress={() => handleAnswer(i)}
                />
              ))}
            </View>

            {answered && <Text style={styles.tapHint}>Tap anywhere to continue →</Text>}
            
            {showConfetti && (
              <ConfettiCannon count={40} origin={{ x: -10, y: 0 }} explosionSpeed={350} fallSpeed={2000} fadeOut />
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  centered: { flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16, textAlign: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  progress: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  progressBarWrapper: { flex: 1, height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
  comboBadge: { backgroundColor: '#3a0000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#ff4444' },
  comboText: { color: '#ff8888', fontWeight: 'bold', fontSize: 13 },
  scoreFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  questionArea: { padding: 20 },
  prompt: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, marginTop: 4 },
  shapeContainer: { backgroundColor: '#1a1a2e', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a4e', marginBottom: 20 },
  answers: { gap: 8 },
  tapHint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
