import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList, QuizQuestion, Country, cca2ToFlagEmoji } from '../types';
import { buildCapitalsQuizQuestions, fetchCountries, getOfflineFullCountries, getCca3ToCca2Map } from '../lib/countryData';
import { useGame } from '../context/GameContext';
import AnswerButton from '../components/AnswerButton';
import EarningsStrip from '../components/EarningsStrip';
import WorldMapView from '../components/WorldMapView';
import { playDingStreak, playWrong, playTextToSpeech } from '../lib/audio';
import HeatStreakBadge from '../components/HeatStreakBadge';
import { useAuth } from '../context/AuthContext';
import AvatarDisplay from '../components/AvatarDisplay';
import QuitConfirmModal from '../components/QuitConfirmModal';
import * as Speech from 'expo-speech';

const GOLD_PER_CORRECT = 18;
const AUTO_ADVANCE_DELAY_MS = 2500;
const ANSWER_COLORS = ['#4FC3F7', '#F44336', '#FFD700', '#4CAF50'];

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
  const [goldDelta, setGoldDelta] = useState(0);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [buttonStates, setButtonStates] = useState<AnswerState[]>([
    'default', 'default', 'default', 'default',
  ]);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoCountry, setInfoCountry] = useState<Country | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const allowLeaveRef = useRef(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentIndexRef = useRef(0);
  const scoreRef = useRef(0);
  const goldRef = useRef(0);
  const comboRef = useRef(0);
  const questionsRef = useRef<QuizQuestion[]>([]);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quizStartRef = useRef<number>(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [modalFlagError, setModalFlagError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let countries;
        try {
          countries = await fetchCountries();
        } catch {
          if (profile?.is_conquerer) {
            countries = getOfflineFullCountries();
          } else {
            throw new Error('OFFLINE_NO_PREMIUM');
          }
        }
        const q = buildCapitalsQuizQuestions(countries, TOTAL_QUESTIONS, { reverseFirst: true });
        setQuestions(q);
        questionsRef.current = q;
      } catch (e: any) {
        setError(e.message === 'OFFLINE_NO_PREMIUM'
          ? 'offline_upgrade'
          : (e.message ?? 'Failed to load countries'));
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !readyRef.current) return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
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

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      const unsubscribe = (parent as any).addListener('tabPress', (e: any) => {
        if (!readyRef.current) return;
        e.preventDefault();
        onConfirmQuitRef.current = () => {
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

  function handleAnswer(selectedIndex: number) {
    if (answered || paused) return;
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
      playDingStreak(comboRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      scoreRef.current += 1;
      const totalEarned = Math.round(GOLD_PER_CORRECT * (1 + (comboRef.current - 1) * 0.1));
      
      goldRef.current += totalEarned;
      setScore(scoreRef.current);
      setGoldEarned(goldRef.current);
      setGoldDelta(totalEarned);
      setAnimTrigger(t => t + 1);
      addGold(totalEarned);
    } else {
      comboRef.current = 0;
      setCurrentCombo(0);
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setAnsweredCount(c => c + 1);

    autoAdvanceTimer.current = setTimeout(advanceQuestion, AUTO_ADVANCE_DELAY_MS);
  }

  function skipToNext() {
    if (!answered || paused) return;
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
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      allowLeaveRef.current = true;
      navigation.replace('QuizResults', {
        score: scoreRef.current,
        total: TOTAL_QUESTIONS,
        goldEarned: goldRef.current,
        quizType: 'capitals',
        elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
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
      setModalFlagError(false);
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
    if (error === 'offline_upgrade') {
      return (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
          <Text style={[styles.errorText, { color: '#FFD700', fontWeight: 'bold' }]}>You're Offline</Text>
          <Text style={[styles.errorText, { color: '#aaa', fontSize: 14, marginTop: 8 }]}>
            Upgrade to Conqueror's Pass to play all quizzes without an internet connection.
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
      <View style={styles.readyContainer}>
        <Image source={require('../../assets/avatars/building.png')} style={{ width: 80, height: 80, marginBottom: 20 }} resizeMode="contain" />
        <Text style={styles.readyTitle}>CAPITALS QUIZ</Text>
        <Text style={styles.readySubtitle}>Match each capital city to its country.</Text>
        <TouchableOpacity
          style={styles.readyBtn}
          onPress={() => {
            quizStartRef.current = Date.now();
            elapsedIntervalRef.current = setInterval(() => {
              setElapsedSec(Math.floor((Date.now() - quizStartRef.current) / 1000));
            }, 1000);
            setReady(true);
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

  const question = questions[currentIndex];
  const isReverseQuestion = question.mode === 'reverse';

  return (
    <TouchableWithoutFeedback onPress={skipToNext}>
      <View style={styles.container}>
        {paused && (
          <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
            <TouchableOpacity style={styles.resumeBtn} onPress={() => setPaused(false)}>
              <Text style={styles.resumeBtnText}>RESUME</Text>
            </TouchableOpacity>
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <TouchableOpacity onPress={() => { if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current); Speech.stop(); allowLeaveRef.current = true; navigation.goBack(); }}>
              <Text style={styles.quitText}>Quit</Text>
            </TouchableOpacity>
          </View>
        )}

          <View style={styles.header}>
            <Text style={styles.progress}>
              {currentIndex + 1} / {TOTAL_QUESTIONS}
            </Text>
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.scoreFill, { width: `${((currentIndex) / TOTAL_QUESTIONS) * 100}%` as any }]} />
              </View>
              {profile?.avatar_emoji ? (
                <View style={[styles.progressAvatarWrap, { left: `${((currentIndex) / TOTAL_QUESTIONS) * 100}%` as any }]}>
                  <AvatarDisplay avatarId={profile.avatar_emoji} avatarFlag={profile.avatar_flag ?? undefined} size={22} isConqueror={profile.is_conquerer ?? false} />
                </View>
              ) : null}
            </View>
            <Text style={styles.timerText}>⏱ {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}</Text>
            <TouchableOpacity onPress={() => { if (!answered) { if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; } Speech.stop(); setPaused(true); } }} style={styles.pauseBtn}>
              <View style={styles.pauseIconBar} />
              <View style={styles.pauseIconBar} />
            </TouchableOpacity>
          </View>

          <EarningsStrip
            goldTotal={goldEarned}
            goldDelta={goldDelta}
            animTrigger={animTrigger}
            accuracy={answeredCount > 0 ? Math.round((score / answeredCount) * 100) : null}
            combo={currentCombo}
          />

          <Animated.View style={[styles.quizBody, { opacity: fadeAnim }]}>
            <View style={styles.questionCenter}>
              <View style={styles.questionCard}>
                <View style={styles.capitalQuestionTextRow}>
                  <Text style={[styles.questionCardText, { flex: 1 }]}>
                    {isReverseQuestion ? (
                      <>
                        What is the capital of{' '}
                        <Text style={styles.capitalHighlight}>{question.country.name}</Text>?
                      </>
                    ) : (
                      <>
                        Which country has{' '}
                        <Text style={styles.capitalHighlight}>{question.country.capital}</Text>
                        {' '}as its capital?
                      </>
                    )}
                  </Text>
                  <TouchableOpacity
                    style={[styles.speakerBtn, isReverseQuestion && styles.speakerBtnHidden]}
                    onPress={() => {
                      if (!isReverseQuestion) playTextToSpeech(question.country.capital || '');
                    }}
                    disabled={isReverseQuestion}
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
            </View>

            <View style={styles.answersSection}>
              <View style={styles.answers}>
                {question.options.map((option, i) => (
                  <AnswerButton
                    key={`${currentIndex}-${option.cca2}`}
                    label={isReverseQuestion ? option.capital : option.name}
                    style={[styles.answerGridButton, buttonStates[i] === 'default' && { borderColor: ANSWER_COLORS[i % ANSWER_COLORS.length] }]}
                    state={buttonStates[i]}
                    onPress={() => handleAnswer(i)}
                  />
                ))}
              </View>

              <Text style={[styles.tapHint, { opacity: answered ? 1 : 0 }]}>
                Tap anywhere to continue →
              </Text>
            </View>
          </Animated.View>

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
                    {infoCountry.flagUrl && !modalFlagError ? (
                      <Image source={{ uri: infoCountry.flagUrl }} style={styles.modalFlag} resizeMode="contain" onError={() => setModalFlagError(true)} />
                    ) : (
                      <Text style={{ fontSize: 48 }}>{cca2ToFlagEmoji(infoCountry.cca2)}</Text>
                    )}
                    <Text style={styles.modalTitle}>{infoCountry.name}</Text>
                  </View>

                  <WorldMapView
                    ownedCountries={[infoCountry.cca2]}
                    focusCountry={infoCountry.cca2}
                    height={180}
                    showNames={false}
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
  earningsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#151530',
  },
  earningsItem: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  earningsGoldText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  earningsScoreText: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  earningsLabel: { color: '#666', fontSize: 13 },
  earningsDivider: { width: 1, height: 16, backgroundColor: '#2a2a4e' },
  quizBody: { flex: 1 },
  questionCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 },
  answersSection: { paddingHorizontal: 20, paddingBottom: 20 },
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
  timerText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  progressBarWrapper: { flex: 1, height: 22, justifyContent: 'center' },
  progressBarTrack: { height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
  progressAvatarWrap: { position: 'absolute', transform: [{ translateX: -11 }] },
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
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
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
  speakerBtnHidden: { opacity: 0, width: 0 },
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
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  answerGridButton: { width: '48%', minHeight: 84, marginVertical: 0, paddingHorizontal: 10 },
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

  backBtn: { color: '#555', fontSize: 16, fontWeight: 'bold', padding: 4 },
  pauseBtn: { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0a1a', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 100, zIndex: 100 },
  pauseTitle: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 20, marginTop: 20 },
  resumeBtn: { borderWidth: 2, borderColor: '#FFD700', paddingHorizontal: 36, paddingVertical: 13, borderRadius: 14 },
  resumeBtnText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  quitText: { color: '#555', fontSize: 14, fontWeight: '600' },

  readyContainer: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyTitle: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  readyBtn: { backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  readyBtnText: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  readyBackLink: { marginTop: 20 },
  readyBackLinkText: { color: '#555', fontSize: 14 },
});
