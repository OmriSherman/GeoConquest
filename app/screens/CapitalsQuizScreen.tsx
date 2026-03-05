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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList, QuizQuestion, Country, cca2ToFlagEmoji } from '../types';
import { buildCapitalsQuizQuestions, fetchCountries, getCca3ToCca2Map } from '../lib/countryData';
import { useGame } from '../context/GameContext';
import AnswerButton from '../components/AnswerButton';
import WorldMapView from '../components/WorldMapView';
import { playDingStreak, playWrong, playTextToSpeech } from '../lib/audio';
import HeatStreakBadge from '../components/HeatStreakBadge';
import { useAuth } from '../context/AuthContext';
import * as Speech from 'expo-speech';

const GOLD_PER_CORRECT = 15;
const AUTO_ADVANCE_DELAY_MS = 2500;

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'CapitalsQuiz'>;
};

type AnswerState = 'default' | 'correct' | 'wrong' | 'disabled';

export default function CapitalsQuizScreen({ navigation }: Props) {
  const { addGold } = useGame();
  const { profile, effectiveMaxTurns } = useAuth();
  
  const TOTAL_QUESTIONS = effectiveMaxTurns;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>([
    'default', 'default', 'default', 'default',
  ]);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoCountry, setInfoCountry] = useState<Country | null>(null);

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
        const q = buildCapitalsQuizQuestions(countries, TOTAL_QUESTIONS);
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
      Speech.stop();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        Speech.stop();
        if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      };
    }, [])
  );

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
    if (showInfoModal) return;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    advanceQuestion();
  }

  function advanceQuestion() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }

    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      Speech.stop();
      navigation.replace('QuizResults', {
        score: scoreRef.current,
        total: TOTAL_QUESTIONS,
        goldEarned: goldRef.current,
        quizType: 'capitals',
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
      Speech.stop();
    });
  }

  function openCountryInfo() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const question = questionsRef.current[currentIndexRef.current];
    if (question) {
      setInfoCountry(question.country);
      setShowInfoModal(true);
    }
  }

  function closeInfoAndContinue() {
    setShowInfoModal(false);
    autoAdvanceTimer.current = setTimeout(advanceQuestion, 1500);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading capitals…</Text>
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

  return (
    <TouchableWithoutFeedback onPress={skipToNext}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.progress}>
              {currentIndex + 1} / {TOTAL_QUESTIONS}
            </Text>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.scoreFill, { width: `${((currentIndex) / TOTAL_QUESTIONS) * 100}%` as any }]} />
            </View>
            <HeatStreakBadge combo={currentCombo} />
          </View>

          <Animated.View style={[styles.questionArea, { opacity: fadeAnim }]}>
            <View style={styles.questionCard}>
              <View style={styles.capitalQuestionTextRow}>
                <Text style={[styles.questionCardText, { flex: 1 }]}>
                  Which country has{' '}
                  <Text style={styles.capitalHighlight}>{question.country.capital}</Text>
                  {' '}as its capital?
                </Text>
                <TouchableOpacity 
                  style={styles.speakerBtn} 
                  onPress={() => {
                    Speech.stop();
                    playTextToSpeech(question.country.capital || '');
                  }}
                >
                  <Text style={styles.speakerEmoji}>🔊</Text>
                </TouchableOpacity>
              </View>
              
              {answered && (
                <TouchableOpacity style={styles.infoBadge} onPress={openCountryInfo}>
                  <Text style={styles.infoBadgeIcon}>ℹ️</Text>
                  <Text style={styles.infoBadgeText}>Learn</Text>
                </TouchableOpacity>
              )}
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

            {answered && (
              <Text style={styles.tapHint}>Tap anywhere to continue →</Text>
            )}
            
            {showConfetti && (
              <ConfettiCannon 
                count={40} 
                origin={{ x: -10, y: 0 }} 
                explosionSpeed={350} 
                fallSpeed={2000} 
                fadeOut 
              />
            )}
          </Animated.View>
        </ScrollView>

        <Modal
          visible={showInfoModal}
          transparent
          animationType="slide"
          onRequestClose={closeInfoAndContinue}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {infoCountry && (
                <>
                  <View style={styles.modalHeader}>
                    <Image source={{ uri: infoCountry.flagUrl }} style={styles.modalFlag} resizeMode="contain" />
                    <Text style={styles.modalTitle}>{infoCountry.name}</Text>
                  </View>

                  <WorldMapView
                    ownedCountries={[infoCountry.cca2]}
                    focusCountry={infoCountry.cca2}
                    height={180}
                  />

                  <View style={styles.factsGrid}>
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Capital</Text>
                      <Text style={styles.factValue}>{infoCountry.capital || 'N/A'}</Text>
                    </View>
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Region</Text>
                      <Text style={styles.factValue}>{infoCountry.region}</Text>
                    </View>
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Population</Text>
                      <Text style={styles.factValue}>{infoCountry.population.toLocaleString()}</Text>
                    </View>
                    <View style={styles.factItem}>
                      <Text style={styles.factLabel}>Area</Text>
                      <Text style={styles.factValue}>{infoCountry.area.toLocaleString()} km²</Text>
                    </View>
                  </View>

                  <View style={styles.neighborsSection}>
                    <Text style={styles.factLabel}>Neighbors</Text>
                    {infoCountry.borders.length > 0 ? (
                      <View style={styles.neighborsRow}>
                        {infoCountry.borders.map((cca3Code) => {
                          const cca2 = getCca3ToCca2Map()[cca3Code] || '';
                          const emoji = cca2 ? cca2ToFlagEmoji(cca2) : '🏳️';
                          return (
                            <Text key={cca3Code} style={styles.neighborFlag}>
                              {emoji}
                            </Text>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.factValue}>🏝️ Island nation</Text>
                    )}
                  </View>

                  <TouchableOpacity style={styles.closeButton} onPress={closeInfoAndContinue}>
                    <Text style={styles.closeButtonText}>Got it!</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
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
  progressBarWrapper: { flex: 1, height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
  comboBadge: {
    backgroundColor: '#3a0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  comboText: { color: '#ff8888', fontWeight: 'bold', fontSize: 13 },
  scoreFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  questionArea: { flex: 1, padding: 20 },
  questionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 20,
    minHeight: 140,
    justifyContent: 'center',
    position: 'relative',
  },
  capitalQuestionTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionCardText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  capitalHighlight: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  speakerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerEmoji: {
    fontSize: 20,
  },
  infoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 6,
  },
  infoBadgeIcon: { fontSize: 13 },
  infoBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  answers: { gap: 8 },
  tapHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  modalHeader: { alignItems: 'center', gap: 8 },
  modalFlag: { width: 72, height: 48, borderRadius: 6 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factItem: {
    width: '47%',
    backgroundColor: '#0a0a1a',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  factLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase' },
  factValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  neighborsSection: {
    backgroundColor: '#0a0a1a',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  neighborsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  neighborFlag: {
    fontSize: 24,
  },
  closeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
});
