import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { fetchCountries } from '../lib/countryData';
import {
  playDingStreak,
  playGauntletFail,
  playGauntletShield,
  playGauntletTier,
  playGauntletBoss,
  playTick,
} from '../lib/audio';
import { supabase } from '../lib/supabase';
import { Country, QuizStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'Gauntlet'>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type QType = 'flag' | 'capital' | 'borders';
type Phase = 'loading' | 'playing';
type BtnState = 'default' | 'correct' | 'wrong' | 'disabled';

interface GQuestion {
  type: QType;
  prompt: string;
  options: string[];
  correctIndex: number;
  flagUrl?: string;
  isBoss: boolean;
  gold: number;
}

// ─── Tier System ──────────────────────────────────────────────────────────────

const TIERS = [
  { minScore: 100, label: 'VOID',    accent: '#9b5cf6', bg: '#04000e', cardBg: '#0d001f', btnBorder: '#9b5cf640' },
  { minScore: 51,  label: 'INFERNO', accent: '#ef4444', bg: '#0b0003', cardBg: '#180008', btnBorder: '#ef444440' },
  { minScore: 26,  label: 'FIRE',    accent: '#ff6b35', bg: '#0b0300', cardBg: '#160700', btnBorder: '#ff6b3540' },
  { minScore: 11,  label: 'PERIL',   accent: '#22c55e', bg: '#00080a', cardBg: '#001210', btnBorder: '#22c55e40' },
  { minScore: 0,   label: 'DANGER',  accent: '#4D96FF', bg: '#02040e', cardBg: '#00091c', btnBorder: '#4D96FF40' },
];

function getTier(score: number) {
  return TIERS.find(t => score >= t.minScore) ?? TIERS[TIERS.length - 1];
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

// Boss rounds get 2 fewer seconds; floor at 3s
function timerForRound(round: number, boss: boolean): number {
  let base: number;
  if (round < 5)       base = 9;
  else if (round < 15) base = 8;
  else if (round < 25) base = 7;
  else if (round < 40) base = 6;
  else if (round < 60) base = 5;
  else                  base = 4;
  return boss ? Math.max(3, base - 2) : base;
}

function tierPool(countries: Country[], round: number, boss: boolean): Country[] {
  if (boss || round >= 30) return countries;
  if (round < 5)  return countries.filter(c => c.population >= 5_000_000 && c.population <= 50_000_000);
  if (round < 15) return countries.filter(c => c.population >= 1_000_000 && c.population < 10_000_000);
  return countries.filter(c => c.population >= 100_000 && c.population < 2_000_000);
}

function isBossRound(round: number): boolean {
  return round >= 5 && (round - 5) % 6 === 0;
}

function goldForRound(_round: number, boss: boolean): number {
  return boss ? 50 : 25;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(
  round: number,
  used: Set<string>,
  all: Country[],
  cca3Map: Record<string, string>,
): GQuestion | null {
  const boss = isBossRound(round);
  let pool = tierPool(all, round, boss).filter(c => !used.has(c.cca2));
  if (pool.length === 0) pool = all.filter(c => !used.has(c.cca2));
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(Math.random() * pool.length)];
  used.add(subject.cca2);

  const types: QType[] = ['flag', 'capital', 'borders'];
  let type = types[round % 3];
  if (type === 'capital' && !subject.capital?.trim()) type = 'flag';
  if (type === 'borders' && subject.borders.length === 0) type = 'flag';

  const wrongPool = shuffle(all.filter(c => c.cca2 !== subject.cca2));
  const gold = goldForRound(round, boss);

  if (type === 'flag') {
    const options = shuffle([subject.name, ...wrongPool.slice(0, 5).map(c => c.name)]);
    return { type, prompt: 'Which country does this flag belong to?', options, correctIndex: options.indexOf(subject.name), flagUrl: subject.flagUrl, isBoss: boss, gold };
  }
  if (type === 'capital') {
    const options = shuffle([subject.name, ...wrongPool.slice(0, 5).map(c => c.name)]);
    return { type, prompt: `Which country has "${subject.capital}" as its capital?`, options, correctIndex: options.indexOf(subject.name), isBoss: boss, gold };
  }

  // borders
  const neighborCca2s = subject.borders.map(b => cca3Map[b]).filter(Boolean);
  const neighbors = all.filter(c => neighborCca2s.includes(c.cca2));
  if (neighbors.length === 0) {
    const options = shuffle([subject.name, ...wrongPool.slice(0, 5).map(c => c.name)]);
    return { type: 'flag', prompt: 'Which country does this flag belong to?', options, correctIndex: options.indexOf(subject.name), flagUrl: subject.flagUrl, isBoss: boss, gold };
  }
  const correctNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
  const nonNeighbors = shuffle(all.filter(c => c.cca2 !== subject.cca2 && !neighborCca2s.includes(c.cca2)));
  const options = shuffle([correctNeighbor.name, ...nonNeighbors.slice(0, 5).map(c => c.name)]);
  return { type: 'borders', prompt: `Which country borders ${subject.name}?`, options, correctIndex: options.indexOf(correctNeighbor.name), isBoss: boss, gold };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<QType, string> = { flag: 'FLAG', capital: 'CAPITAL', borders: 'BORDERS' };
const TYPE_COLOR: Record<QType, string> = { flag: '#4d96ff', capital: '#ffd700', borders: '#ff6b35' };
const SCORE_MILESTONES = new Set([5, 10, 15, 20, 25, 30, 40, 50, 75, 100]);

// ─── Cosmic background (generated once at module load) ────────────────────────

const STARS = Array.from({ length: 65 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top:  Math.random() * 100,
  size: 0.7 + Math.random() * 1.6,
  opacity: 0.12 + Math.random() * 0.52,
}));

const NEBULAE = [
  { left: -80,  top: -60,  size: 320, color: '#2e1065', opacity: 0.13 },
  { left: 210,  top: 100,  size: 230, color: '#0f1b5c', opacity: 0.11 },
  { left: 40,   top: 360,  size: 300, color: '#1a0a46', opacity: 0.10 },
  { left: 240,  top: 560,  size: 200, color: '#3b1070', opacity: 0.09 },
  { left: -30,  top: 680,  size: 180, color: '#0c1445', opacity: 0.08 },
];

function CosmicBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {NEBULAE.map((n, i) => (
        <View
          key={`nb-${i}`}
          style={{
            position: 'absolute',
            left: n.left,
            top: n.top,
            width: n.size,
            height: n.size,
            borderRadius: n.size / 2,
            backgroundColor: n.color,
            opacity: n.opacity,
          }}
        />
      ))}
      {STARS.map(s => (
        <View
          key={`st-${s.id}`}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#ffffff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GauntletScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile, unlockedItems } = useAuth();
  const { addGold } = useGame();

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<GQuestion | null>(null);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['default', 'default', 'default', 'default', 'default', 'default']);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(0);
  const [goldPopText, setGoldPopText] = useState('');
  const [tierFlashLabel, setTierFlashLabel] = useState<string | null>(null);
  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null);

  // Stale-closure-safe refs
  const answeredRef = useRef(false);
  const scoreRef = useRef(0);
  const roundRef = useRef(0);
  const shieldsRef = useRef(0);
  const prevTierLabelRef = useRef(getTier(0).label);
  const questionRef = useRef<GQuestion | null>(null);
  const allCountriesRef = useRef<Country[]>([]);
  const cca3MapRef = useRef<Record<string, string>>({});
  const usedRef = useRef(new Set<string>());
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const urgencyTimersRef = useRef<NodeJS.Timeout[]>([]);
  const totalGoldEarnedRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Animated values
  const timerAnim = useRef(new Animated.Value(1)).current;
  const questionSlideX = useRef(new Animated.Value(0)).current;
  const questionFade = useRef(new Animated.Value(1)).current;
  const answerFade = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const correctFlashAnim = useRef(new Animated.Value(0)).current;
  const wrongFlashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shieldFlashAnim = useRef(new Animated.Value(0)).current;
  const tierFlashAnim = useRef(new Animated.Value(0)).current;
  const milestoneFlashAnim = useRef(new Animated.Value(0)).current;
  const goldPopAnim = useRef(new Animated.Value(0)).current;
  const bossBannerAnim = useRef(new Animated.Value(-40)).current;

  const skipMapCheck = (profile?.is_conquerer ?? false) || unlockedItems.has('upgrade_infinite_maps');

  useEffect(() => {
    fetchCountries().then(cs => {
      allCountriesRef.current = cs;
      const map: Record<string, string> = {};
      cs.forEach(c => { map[c.cca3] = c.cca2; });
      cca3MapRef.current = map;
      startTimeRef.current = Date.now();
      beginRound(0);
      setPhase('playing');
    }).catch(() => setPhase('playing'));
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────────────

  function startTimer(duration: number) {
    urgencyTimersRef.current.forEach(t => clearTimeout(t));
    urgencyTimersRef.current = [];

    for (let i = Math.min(3, Math.floor(duration - 0.5)); i >= 1; i--) {
      urgencyTimersRef.current.push(
        setTimeout(() => { if (!answeredRef.current) playTick(); }, (duration - i) * 1000)
      );
    }

    timerAnim.setValue(1);
    timerAnimRef.current?.stop();
    timerAnimRef.current = Animated.timing(timerAnim, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
    });
    timerAnimRef.current.start(({ finished }) => {
      if (finished && !answeredRef.current) {
        answeredRef.current = true;
        const q = questionRef.current!;
        setBtnStates(q.options.map((_, i) => i === q.correctIndex ? 'correct' : 'disabled'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playGauntletFail();
        triggerWrongEffects();
        if (shieldsRef.current > 0) {
          shieldsRef.current -= 1;
          setShields(shieldsRef.current);
          triggerShieldEffects();
          setTimeout(() => beginRound(roundRef.current + 1), 1400);
        } else {
          setTimeout(endRun, 1500);
        }
      }
    });
  }

  // ── Effect triggers ────────────────────────────────────────────────────────

  function triggerCorrectEffects() {
    correctFlashAnim.setValue(0.85);
    Animated.timing(correctFlashAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    scoreScale.setValue(1.55);
    Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  }

  function triggerWrongEffects() {
    wrongFlashAnim.setValue(0.85);
    Animated.timing(wrongFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }

  function triggerShieldEffects() {
    playGauntletShield();
    shieldFlashAnim.setValue(1);
    Animated.timing(shieldFlashAnim, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
  }

  function triggerTierFlash(label: string) {
    setTierFlashLabel(label);
    tierFlashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(tierFlashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(tierFlashAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setTierFlashLabel(null));
  }

  function triggerMilestoneFlash(label: string) {
    setMilestoneLabel(label);
    milestoneFlashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(milestoneFlashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(milestoneFlashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setMilestoneLabel(null));
  }

  // ── Round lifecycle ────────────────────────────────────────────────────────

  function beginRound(r: number) {
    const q = buildQuestion(r, usedRef.current, allCountriesRef.current, cca3MapRef.current);
    if (!q) { usedRef.current = new Set(); beginRound(r); return; }

    roundRef.current = r;
    questionRef.current = q;
    answeredRef.current = false;
    setRound(r);
    setQuestion(q);
    setBtnStates(['default', 'default', 'default', 'default', 'default', 'default']);

    questionSlideX.setValue(50);
    questionFade.setValue(0);
    answerFade.setValue(0);
    Animated.parallel([
      Animated.timing(questionSlideX, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(questionFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(answerFade, { toValue: 1, duration: 280, delay: 80, useNativeDriver: true }),
    ]).start();

    if (q.isBoss) {
      playGauntletBoss();
      bossBannerAnim.setValue(-40);
      Animated.spring(bossBannerAnim, { toValue: 0, friction: 7, useNativeDriver: true }).start();
    }

    startTimer(timerForRound(r, q.isBoss));
  }

  function handleAnswer(index: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    timerAnimRef.current?.stop();
    urgencyTimersRef.current.forEach(t => clearTimeout(t));
    urgencyTimersRef.current = [];

    const q = questionRef.current!;

    if (index === q.correctIndex) {
      setBtnStates(s => s.map((_, i) => i === index ? 'correct' : 'disabled'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);

      playDingStreak(newScore);
      triggerCorrectEffects();

      setGoldPopText(`+${q.gold}`);
      goldPopAnim.setValue(1);
      Animated.timing(goldPopAnim, { toValue: 0, duration: 900, useNativeDriver: true }).start();

      if (newScore % 10 === 0 && shieldsRef.current < 3) {
        shieldsRef.current = Math.min(3, shieldsRef.current + 1);
        setShields(shieldsRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const newTierLabel = getTier(newScore).label;
      if (newTierLabel !== prevTierLabelRef.current) {
        prevTierLabelRef.current = newTierLabel;
        playGauntletTier();
        triggerTierFlash(newTierLabel);
      } else if (SCORE_MILESTONES.has(newScore)) {
        triggerMilestoneFlash(`${newScore} STREAK!`);
      }

      totalGoldEarnedRef.current += q.gold;
      addGold(q.gold);

      // Speed up transitions as score climbs
      const nextDelay = newScore >= 25 ? 500 : newScore >= 10 ? 650 : 800;
      setTimeout(() => beginRound(roundRef.current + 1), nextDelay);
    } else {
      setBtnStates(q.options.map((_, i) => {
        if (i === q.correctIndex) return 'correct';
        if (i === index) return 'wrong';
        return 'disabled';
      }));

      if (shieldsRef.current > 0) {
        shieldsRef.current -= 1;
        setShields(shieldsRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        playGauntletFail();
        triggerWrongEffects();
        triggerShieldEffects();
        setTimeout(() => beginRound(roundRef.current + 1), 1400);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playGauntletFail();
        triggerWrongEffects();
        setTimeout(endRun, 1500);
      }
    }
  }

  async function endRun() {
    const final = scoreRef.current;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await supabase.from('gauntlet_scores').insert({ user_id: profile!.id, score: final });
    } catch {}

    navigation.replace('QuizResults', {
      score: final,
      total: roundRef.current + 1,
      goldEarned: totalGoldEarnedRef.current,
      quizType: 'gauntlet',
      elapsedSeconds: elapsed,
    });
  }

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const timerColor = timerAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: ['#ff2222', '#ffaa00', '#00cc88'] });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (phase === 'loading' || (phase === 'playing' && !question)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#020610' }]}>
        <CosmicBackground />
        <Image source={require('../../assets/avatars/flame.png')} style={{ width: 56, height: 56, marginBottom: 16 }} resizeMode="contain" />
        <Text style={styles.loadingText}>Entering the Gauntlet...</Text>
      </View>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────

  const q = question!;
  const typeColor = TYPE_COLOR[q.type];
  const tier = getTier(score);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: tier.bg }]}>
      <CosmicBackground />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { timerAnimRef.current?.stop(); navigation.goBack(); }}>
          <Text style={styles.backBtn}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: tier.accent }]}>THE GAUNTLET</Text>
          <Text style={[styles.tierLabel, { color: tier.accent + 'aa' }]}>{tier.label}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.shieldIcons}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.shieldIcon,
                  i < shields
                    ? { backgroundColor: tier.accent + '20', borderColor: tier.accent }
                    : { backgroundColor: 'transparent', borderColor: '#1a1a2a' },
                ]}
              >
                <Image
                  source={require('../../assets/avatars/war_medal.png')}
                  style={{ width: 12, height: 12, opacity: i < shields ? 1 : 0.12 }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
          <View style={[styles.scoreBadge, { borderColor: tier.accent + '66', backgroundColor: tier.cardBg }]}>
            <Image source={require('../../assets/avatars/flame.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
            <Animated.Text style={[styles.scoreBadgeText, { color: tier.accent, transform: [{ scale: scoreScale }] }]}>
              {score}
            </Animated.Text>
          </View>
        </View>
      </View>

      {/* ── Timer bar ───────────────────────────────────────────────────── */}
      <View style={styles.timerBg}>
        <Animated.View style={[styles.timerFill, { width: timerWidth, backgroundColor: timerColor }]} />
      </View>

      {/* ── Boss banner ─────────────────────────────────────────────────── */}
      {q.isBoss && (
        <Animated.View style={[styles.bossBanner, { transform: [{ translateY: bossBannerAnim }] }]}>
          <Image source={require('../../assets/avatars/crown.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
          <Text style={styles.bossBannerText}>BOSS ROUND  ×3 GOLD</Text>
          <Image source={require('../../assets/avatars/crown.png')} style={{ width: 13, height: 13 }} resizeMode="contain" />
        </Animated.View>
      )}

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <View style={styles.metaRow}>
        <Text style={styles.roundText}>Round {round + 1}</Text>
        <View style={styles.metaRight}>
          <View style={[styles.typeBadge, { borderColor: typeColor }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{TYPE_LABEL[q.type]}</Text>
          </View>
          {goldPopText !== '' && (
            <Animated.Text style={[styles.goldPop, { opacity: goldPopAnim }]}>
              {goldPopText}
            </Animated.Text>
          )}
        </View>
      </View>

      {/* ── Question + answers (shake wrapper) ──────────────────────────── */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnim }] }}>

        <Animated.View
          style={[
            styles.questionArea,
            { opacity: questionFade, transform: [{ translateX: questionSlideX }] },
          ]}
        >
          {q.type === 'flag' && q.flagUrl ? (
            <>
              <Image
                source={{ uri: q.flagUrl }}
                style={[styles.flagImage, q.isBoss && { borderWidth: 2, borderColor: '#ffd700', borderRadius: 8 }]}
                resizeMode="contain"
              />
              <Text style={styles.flagPrompt}>{q.prompt}</Text>
            </>
          ) : (
            <Text style={styles.textPrompt}>{q.prompt}</Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.answersGrid, { opacity: answerFade }]}>
          {q.options.map((opt, i) => {
            const s = btnStates[i];
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.answerBtn,
                  { backgroundColor: tier.cardBg, borderColor: tier.btnBorder },
                  s === 'correct'  && styles.answerCorrect,
                  s === 'wrong'    && styles.answerWrong,
                  s === 'disabled' && styles.answerDisabled,
                ]}
                onPress={() => handleAnswer(i)}
                disabled={answeredRef.current}
                activeOpacity={0.72}
              >
                <Text
                  style={[
                    styles.answerText,
                    s === 'correct'  && styles.answerTextCorrect,
                    s === 'wrong'    && styles.answerTextWrong,
                    s === 'disabled' && styles.answerTextDisabled,
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

      </Animated.View>

      {/* ── Full-screen overlays (pointerEvents none) ───────────────────── */}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#00cc6618', opacity: correctFlashAnim }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#ff222230', opacity: wrongFlashAnim }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.shieldOverlay, { opacity: shieldFlashAnim }]}
      >
        <View style={styles.shieldOverlayInner}>
          <Image source={require('../../assets/avatars/war_medal.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={styles.shieldOverlayText}>SHIELD ABSORBED</Text>
        </View>
      </Animated.View>

      {tierFlashLabel !== null && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.tierFlashOverlay, { opacity: tierFlashAnim }]}
        >
          <Text style={[styles.tierFlashText, { color: tier.accent }]}>{tierFlashLabel}</Text>
        </Animated.View>
      )}

      {/* Streak milestone toast */}
      {milestoneLabel !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.milestoneBanner, { opacity: milestoneFlashAnim }]}
        >
          <Image source={require('../../assets/avatars/flame.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
          <Text style={styles.milestoneBannerText}>{milestoneLabel}</Text>
          <Image source={require('../../assets/avatars/flame.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { color: '#4D96FF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: { color: '#555', fontSize: 16, fontWeight: 'bold', padding: 4 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  tierLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shieldIcons: { flexDirection: 'row', gap: 4 },
  shieldIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  scoreBadgeText: { fontSize: 18, fontWeight: 'bold' },

  timerBg: { height: 5, backgroundColor: '#111', width: '100%' },
  timerFill: { height: '100%' },

  bossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a0e00',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ffd70055',
    paddingVertical: 6,
  },
  bossBannerText: { color: '#ffd700', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundText: { color: '#444', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  typeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  goldPop: { color: '#ffd700', fontSize: 14, fontWeight: 'bold' },

  questionArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  flagImage: { width: '85%', height: 125, borderRadius: 6 },
  flagPrompt: { color: '#666', fontSize: 16, textAlign: 'center' },
  textPrompt: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.2,
  },

  answersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 16 },
  answerBtn: {
    width: '47.5%',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 54,
  },
  answerCorrect:  { backgroundColor: '#0a2e10', borderColor: '#00cc66' },
  answerWrong:    { backgroundColor: '#2e0808', borderColor: '#ff4444' },
  answerDisabled: { backgroundColor: '#0c0c0c', borderColor: '#1a1a1a' },
  answerText:         { color: '#ddd', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  answerTextCorrect:  { color: '#00cc66' },
  answerTextWrong:    { color: '#ff4444' },
  answerTextDisabled: { color: '#333' },

  shieldOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#00ccff10' },
  shieldOverlayInner: { alignItems: 'center', gap: 10, backgroundColor: '#001a20cc', paddingHorizontal: 28, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: '#00ccff55' },
  shieldOverlayText: { color: '#00ccff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },

  tierFlashOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088' },
  tierFlashText: { fontSize: 48, fontWeight: 'bold', letterSpacing: 6 },

  milestoneBanner: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a0e00',
    borderWidth: 1,
    borderColor: '#ffd70077',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 20,
  },
  milestoneBannerText: { color: '#ffd700', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
});
