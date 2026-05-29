import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { fetchCountries } from '../lib/countryData';
import CountryShapeView, { hasCountryShape } from '../components/CountryShapeView';
import QuitConfirmModal from '../components/QuitConfirmModal';
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
import TierBackground, { TierLabel } from '../components/TierBackground';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'Gauntlet'>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type QType =
  | 'flag'
  | 'capital'
  | 'borders'
  | 'shape'
  | 't2_flag_capital'
  | 't2_flag_border'
  | 't2_flag_shape'
  | 't2_shape_capital'
  | 't2_shape_border'
  | 't2_shape_flag'
  | 't2_capital_flag'
  | 't2_capital_shape'
  | 't2_capital_border';
type Phase = 'loading' | 'ready' | 'playing';
type BtnState = 'default' | 'correct' | 'wrong' | 'disabled' | 'hovered';
type AnswerVisual = 'text' | 'flag' | 'shape';

interface GQuestion {
  type: QType;
  prompt: string;
  options: string[];
  optionCountries?: Country[];
  answerVisual?: AnswerVisual;
  correctIndex: number;
  flagUrl?: string;
  dragLabel?: string;
  subjectCca2?: string; // shape questions: country to display on map
  subjectArea?: number; // shape questions: area for adaptive zoom
  dragTokenLabel?: string;
  isBoss: boolean;
  gold: number;
}

// ─── Tier System ──────────────────────────────────────────────────────────────

const TIERS = [
  { minScore: 70, label: 'ETERNITY', accent: '#fbbf24', bg: '#080500', cardBg: '#130a00', btnBorder: '#fbbf2440' },
  { minScore: 60, label: 'OBLIVION', accent: '#f43f5e', bg: '#0a0008', cardBg: '#1a000f', btnBorder: '#f43f5e40' },
  { minScore: 50, label: 'INFERNO',  accent: '#ef4444', bg: '#0b0003', cardBg: '#180008', btnBorder: '#ef444440' },
  { minScore: 40, label: 'HELL',     accent: '#ff6b35', bg: '#0b0300', cardBg: '#160700', btnBorder: '#ff6b3540' },
  { minScore: 30, label: 'VOID',     accent: '#9b5cf6', bg: '#04000e', cardBg: '#0d001f', btnBorder: '#9b5cf640' },
  { minScore: 20, label: 'ABYSS',    accent: '#818cf8', bg: '#03030f', cardBg: '#0a0a1e', btnBorder: '#818cf840' },
  { minScore: 10, label: 'PERIL',    accent: '#22c55e', bg: '#00080a', cardBg: '#001210', btnBorder: '#22c55e40' },
  { minScore:  0, label: 'DANGER',   accent: '#4D96FF', bg: '#02040e', cardBg: '#00091c', btnBorder: '#4D96FF40' },
];

function getTier(score: number) {
  return TIERS.find(t => score >= t.minScore) ?? TIERS[TIERS.length - 1];
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

// Regular: 10s base, -1s every 15 rounds, floor 4s
// Boss: same base then 25% less time, floor 3s
function timerForRound(round: number, boss: boolean): number {
  const base = Math.max(4, 10 - Math.floor(round / 15));
  if (boss) return Math.max(3, Math.round(base * 0.75));
  return base;
}

function tierPool(countries: Country[], round: number, boss: boolean): Country[] {
  if (boss || round >= 30) return countries;
  if (round < 5)  return countries.filter(c => c.population >= 5_000_000 && c.population <= 50_000_000);
  if (round < 15) return countries.filter(c => c.population >= 1_000_000 && c.population < 10_000_000);
  return countries.filter(c => c.population >= 100_000 && c.population < 2_000_000);
}

function isBossRound(round: number): boolean {
  return round >= 6 && (round - 6) % 7 === 0;
}

function goldForRound(_round: number, _boss: boolean): number {
  return 25;
}

const PHASE_STEP = 10;
const FINAL_PHASE_SCORE = 40;
const T2_BASE_CHANCE = 0.25;
const T2_STAGE_BONUS = 0.15;
const MAX_T2_STAGE = 4;

function t2ChanceForScore(score: number): number {
  const stage = Math.min(MAX_T2_STAGE, Math.floor(score / PHASE_STEP));
  return Math.min(1, T2_BASE_CHANCE + stage * T2_STAGE_BONUS);
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
  score: number,
): GQuestion | null {
  const boss = isBossRound(round);
  let pool = tierPool(all, round, boss).filter(c => !used.has(c.cca2));
  if (pool.length === 0) pool = all.filter(c => !used.has(c.cca2));
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(Math.random() * pool.length)];
  used.add(subject.cca2);

  const baseTypes: QType[] = ['flag', 'capital', 'borders', 'shape'];
  const t2Types: QType[] = [
    't2_flag_capital',
    't2_flag_border',
    't2_flag_shape',
    't2_shape_capital',
    't2_shape_border',
    't2_shape_flag',
    't2_capital_flag',
    't2_capital_shape',
    't2_capital_border',
  ];

  let type: QType;
  if (Math.random() < t2ChanceForScore(score)) {
    type = t2Types[Math.floor(Math.random() * t2Types.length)];
  } else {
    type = baseTypes[round % 4];
  }

  const subjectHasCapital = !!subject.capital?.trim();
  const subjectHasBorders = subject.borders.length > 0;
  const subjectHasShape = hasCountryShape(subject.cca2);

  if (type === 'capital' && !subjectHasCapital) type = 'flag';
  if (type === 'borders' && !subjectHasBorders) type = 'flag';
  if (type === 'shape' && !subjectHasShape) type = 'flag';

  if (type === 't2_flag_capital' && !subjectHasCapital) {
    type = subjectHasBorders ? 't2_flag_border' : subjectHasShape ? 't2_flag_shape' : 'flag';
  }
  if (type === 't2_flag_border' && !subjectHasBorders) {
    type = subjectHasCapital ? 't2_flag_capital' : subjectHasShape ? 't2_flag_shape' : 'flag';
  }
  if (type === 't2_flag_shape' && !subjectHasShape) {
    type = subjectHasCapital ? 't2_flag_capital' : subjectHasBorders ? 't2_flag_border' : 'flag';
  }
  if (type === 't2_shape_capital' && (!subjectHasShape || !subjectHasCapital)) {
    type = subjectHasShape ? 'shape' : subjectHasCapital ? 't2_flag_capital' : 'flag';
  }
  if (type === 't2_shape_border' && (!subjectHasShape || !subjectHasBorders)) {
    type = subjectHasShape ? 'shape' : subjectHasBorders ? 't2_flag_border' : 'flag';
  }
  if (type === 't2_shape_flag' && !subjectHasShape) {
    type = subjectHasCapital ? 't2_capital_flag' : 'flag';
  }
  if (type === 't2_capital_flag' && !subjectHasCapital) {
    type = subjectHasShape ? 't2_shape_flag' : 'flag';
  }
  if (type === 't2_capital_shape' && (!subjectHasCapital || !subjectHasShape)) {
    type = subjectHasCapital ? 'capital' : subjectHasShape ? 'shape' : 'flag';
  }
  if (type === 't2_capital_border' && (!subjectHasCapital || !subjectHasBorders)) {
    type = subjectHasCapital ? 'capital' : subjectHasBorders ? 'borders' : 'flag';
  }

  const wrongPool = shuffle(all.filter(c => c.cca2 !== subject.cca2));
  const gold = goldForRound(round, boss);
  const t2Gold = gold;
  const shapeCountries = all.filter(c => c.cca2 !== subject.cca2 && hasCountryShape(c.cca2));
  const flagCountries = all.filter(c => c.cca2 !== subject.cca2 && !!c.flagUrl);

  const buildCountryNameOptions = () => shuffle([subject.name, ...wrongPool.slice(0, 3).map(c => c.name)]);
  const buildCapitalOptions = () => {
    const rightCapital = subject.capital!;
    const wrongCaps = shuffle(all.filter(c => c.cca2 !== subject.cca2 && c.capital?.trim()))
      .slice(0, 3)
      .map(c => c.capital!);
    const options = shuffle([rightCapital, ...wrongCaps]);
    return { options, correctIndex: options.indexOf(rightCapital) };
  };
  const buildNeighborOptions = () => {
    const neighborCca2s = subject.borders.map(b => cca3Map[b]).filter(Boolean);
    const neighbors = all.filter(c => neighborCca2s.includes(c.cca2));
    const correctNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    const nonNeighbors = shuffle(all.filter(c => c.cca2 !== subject.cca2 && !neighborCca2s.includes(c.cca2)));
    const options = shuffle([correctNeighbor.name, ...nonNeighbors.slice(0, 3).map(c => c.name)]);
    return { options, correctIndex: options.indexOf(correctNeighbor.name) };
  };
  const buildShapeAnswerOptions = () => {
    const optionCountries = shuffle([subject, ...shuffle(shapeCountries).slice(0, 3)]);
    return {
      optionCountries,
      options: optionCountries.map(c => c.name),
      correctIndex: optionCountries.findIndex(c => c.cca2 === subject.cca2),
    };
  };
  const buildFlagAnswerOptions = () => {
    const optionCountries = shuffle([subject, ...shuffle(flagCountries).slice(0, 3)]);
    return {
      optionCountries,
      options: optionCountries.map(c => c.name),
      correctIndex: optionCountries.findIndex(c => c.cca2 === subject.cca2),
    };
  };

  // ─── Base types ─────────────────────────────────────────────────────────────
  if (type === 'flag') {
    const options = buildCountryNameOptions();
    return { type, prompt: 'Which country has this flag?', options, correctIndex: options.indexOf(subject.name), flagUrl: subject.flagUrl, dragTokenLabel: 'DRAG FLAG', isBoss: boss, gold };
  }
  if (type === 'capital') {
    const options = buildCountryNameOptions();
    return { type, prompt: 'Which country has this capital?', options, correctIndex: options.indexOf(subject.name), dragLabel: subject.capital, dragTokenLabel: 'DRAG CAPITAL', isBoss: boss, gold };
  }
  if (type === 'shape') {
    const options = buildCountryNameOptions();
    return { type: 'shape', prompt: 'Which country has this shape?', options, correctIndex: options.indexOf(subject.name), subjectCca2: subject.cca2, subjectArea: subject.area, dragTokenLabel: 'DRAG SHAPE', isBoss: boss, gold };
  }
  if (type === 'borders') {
    if (!subjectHasBorders) {
      const options = buildCountryNameOptions();
      return { type: 'flag', prompt: 'Which country has this flag?', options, correctIndex: options.indexOf(subject.name), flagUrl: subject.flagUrl, isBoss: boss, gold };
    }
    const { options, correctIndex } = buildNeighborOptions();
    return { type: 'borders', prompt: `Which country borders ${subject.name}?`, options, correctIndex, dragLabel: subject.name, dragTokenLabel: 'DRAG COUNTRY', isBoss: boss, gold };
  }

  // ─── Tier 2 types ───────────────────────────────────────────────────────────
  if (type === 't2_flag_capital') {
    const { options, correctIndex } = buildCapitalOptions();
    return { type, prompt: 'Which capital belongs to this flag?', options, correctIndex, flagUrl: subject.flagUrl, dragTokenLabel: 'DRAG FLAG', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_flag_border') {
    const { options, correctIndex } = buildNeighborOptions();
    return { type, prompt: "Which country borders this flag's country?", options, correctIndex, flagUrl: subject.flagUrl, dragTokenLabel: 'DRAG FLAG', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_flag_shape') {
    const { optionCountries, options, correctIndex } = buildShapeAnswerOptions();
    return { type, prompt: 'Which shape belongs to this flag?', options, optionCountries, answerVisual: 'shape', correctIndex, flagUrl: subject.flagUrl, dragTokenLabel: 'DRAG FLAG', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_shape_capital') {
    const { options, correctIndex } = buildCapitalOptions();
    return { type, prompt: 'Which capital belongs to this shape?', options, correctIndex, subjectCca2: subject.cca2, subjectArea: subject.area, dragTokenLabel: 'DRAG SHAPE', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_shape_border') {
    const { options, correctIndex } = buildNeighborOptions();
    return { type, prompt: "Which country borders this shape's country?", options, correctIndex, subjectCca2: subject.cca2, subjectArea: subject.area, dragTokenLabel: 'DRAG SHAPE', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_shape_flag') {
    const { optionCountries, options, correctIndex } = buildFlagAnswerOptions();
    return { type, prompt: 'Which flag belongs to this shape?', options, optionCountries, answerVisual: 'flag', correctIndex, subjectCca2: subject.cca2, subjectArea: subject.area, dragTokenLabel: 'DRAG SHAPE', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_capital_flag') {
    const { optionCountries, options, correctIndex } = buildFlagAnswerOptions();
    return { type, prompt: 'Which flag belongs to this capital?', options, optionCountries, answerVisual: 'flag', correctIndex, dragLabel: subject.capital, dragTokenLabel: 'DRAG CAPITAL', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_capital_shape') {
    const { optionCountries, options, correctIndex } = buildShapeAnswerOptions();
    return { type, prompt: 'Which shape belongs to this capital?', options, optionCountries, answerVisual: 'shape', correctIndex, dragLabel: subject.capital, dragTokenLabel: 'DRAG CAPITAL', isBoss: boss, gold: t2Gold };
  }
  if (type === 't2_capital_border') {
    const { options, correctIndex } = buildNeighborOptions();
    return { type, prompt: "Which country borders this capital's country?", options, correctIndex, dragLabel: subject.capital, dragTokenLabel: 'DRAG CAPITAL', isBoss: boss, gold: t2Gold };
  }

  return null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<QType, string> = {
  flag: 'FLAG',
  capital: 'CAPITAL',
  borders: 'BORDERS',
  shape: 'SHAPE',
  t2_flag_capital: 'FLAG→CAPITAL',
  t2_flag_border: 'FLAG→BORDER',
  t2_flag_shape: 'FLAG→SHAPE',
  t2_shape_capital: 'SHAPE→CAPITAL',
  t2_shape_border: 'SHAPE→BORDER',
  t2_shape_flag: 'SHAPE→FLAG',
  t2_capital_flag: 'CAPITAL→FLAG',
  t2_capital_shape: 'CAPITAL→SHAPE',
  t2_capital_border: 'CAPITAL→BORDER',
};
const TYPE_COLOR: Record<QType, string> = {
  flag: '#4d96ff',
  capital: '#ffd700',
  borders: '#ff6b35',
  shape: '#a78bfa',
  t2_flag_capital: '#f472b6',
  t2_flag_border: '#fb923c',
  t2_flag_shape: '#60a5fa',
  t2_shape_capital: '#c084fc',
  t2_shape_border: '#818cf8',
  t2_shape_flag: '#38bdf8',
  t2_capital_flag: '#facc15',
  t2_capital_shape: '#e879f9',
  t2_capital_border: '#f97316',
};
const SCORE_MILESTONES = new Set([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100]);

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const BURST_DIST = 90;

const MILESTONE_TAGLINES: Record<number, string> = {
  5:   'JUST GETTING STARTED',
  10:  'DOUBLE DIGITS',
  15:  'LOCKED IN',
  20:  'INTO THE ABYSS',
  25:  'QUARTER CENTURY',
  30:  'THE VOID OPENS',
  40:  'WELCOME TO HELL',
  50:  'HALFWAY TO INFERNO',
  55:  'NO MERCY NOW',
  60:  'NO TURNING BACK',
  70:  'OBLIVION REACHED',
  75:  'LEGENDARY',
  85:  'BEYOND TIME',
  100: 'UNSTOPPABLE',
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  PERIL:    'The heat is rising...',
  ABYSS:    'The deep unknown...',
  VOID:     'Endless conquest',
  HELL:     'Hell - REBORN',
  INFERNO:  'Subjugation',
  OBLIVION: 'Nothing remains',
  ETERNITY: 'The beyond',
};

// Corner positions for the 4 answer zones (TL, TR, BL, BR)
const CORNER_POSITIONS = [
  { top: '4%',    left:  '3%' },
  { top: '4%',    right: '3%' },
  { bottom: '4%', left:  '3%' },
  { bottom: '4%', right: '3%' },
] as const;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GauntletScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { addGold } = useGame();

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<GQuestion | null>(null);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['default', 'default', 'default', 'default']);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(0);
  const [goldPopText, setGoldPopText] = useState('');
  const [tierFlashLabel, setTierFlashLabel] = useState<string | null>(null);
  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null);
  const [milestoneScore, setMilestoneScore] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showShieldAcquire, setShowShieldAcquire] = useState(false);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = phase === 'playing';
  const allowLeaveRef = useRef(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);

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
  const bossWiggleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const urgencyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const totalGoldEarnedRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const pausedFractionRef = useRef(1);

  // Drop zone refs for hit testing
  const dropZoneRefs = useRef<Array<View | null>>([null, null, null, null]);
  const dropZoneMeasures = useRef<Array<{ x: number; y: number; w: number; h: number } | null>>([]);

  // Animated values
  const timerAnim = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(1)).current;
  const wrongFlashAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shieldFlashAnim = useRef(new Animated.Value(0)).current;
  const tierFlashAnim = useRef(new Animated.Value(0)).current;
  const milestoneFlashAnim = useRef(new Animated.Value(0)).current;
  const goldPopAnim = useRef(new Animated.Value(0)).current;
  const bossBannerAnim = useRef(new Animated.Value(-40)).current;
  const dragPos = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragWiggle = useRef(new Animated.Value(0)).current;
  const correctFlashAnim = useRef(new Animated.Value(0)).current;
  const answerFade = useRef(new Animated.Value(1)).current;
  const tierFlashScale = useRef(new Animated.Value(0.4)).current;
  const milestoneScaleAnim = useRef(new Animated.Value(0.5)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const shieldAcquireAnim = useRef(new Animated.Value(0)).current;
  const shieldAcquireScale = useRef(new Animated.Value(0.5)).current;

  // ── Drag helpers ────────────────────────────────────────────────────────────

  function stopBossWiggle() {
    bossWiggleLoopRef.current?.stop();
    bossWiggleLoopRef.current = null;
    dragWiggle.setValue(0);
  }

  function startBossWiggle() {
    stopBossWiggle();
    bossWiggleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(dragWiggle, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(dragWiggle, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(dragWiggle, { toValue: 0.6, duration: 100, useNativeDriver: true }),
        Animated.timing(dragWiggle, { toValue: 0, duration: 90, useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    bossWiggleLoopRef.current.start();
  }

  function measureDropZones() {
    dropZoneRefs.current.forEach((ref, i) => {
      ref?.measureInWindow((x, y, w, h) => {
        dropZoneMeasures.current[i] = { x, y, w, h };
      });
    });
  }

  function findDropZone(touchX: number, touchY: number): number {
    const PAD = 16; // extra hit tolerance in px
    for (let i = 0; i < dropZoneMeasures.current.length; i++) {
      const m = dropZoneMeasures.current[i];
      if (m && touchX >= m.x - PAD && touchX <= m.x + m.w + PAD && touchY >= m.y - PAD && touchY <= m.y + m.h + PAD) {
        return i;
      }
    }
    return -1;
  }

  function snapDragBack() {
    Animated.spring(dragPos, { toValue: { x: 0, y: 0 }, friction: 5, tension: 40, useNativeDriver: true }).start();
    Animated.spring(dragScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }

  function onTimerExpired() {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const q = questionRef.current!;
    setBtnStates(q.options.map((_, i) => i === q.correctIndex ? 'correct' : 'disabled'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playGauntletFail();
    triggerWrongEffects();
    snapDragBack();
    setIsDragging(false);
    if (shieldsRef.current > 0) {
      shieldsRef.current -= 1;
      setShields(shieldsRef.current);
      triggerShieldEffects();
      setTimeout(() => beginRound(roundRef.current + 1), 1400);
    } else {
      setTimeout(endRun, 1500);
    }
  }

  function pauseGame() {
    if (paused || answeredRef.current) return;
    timerAnimRef.current?.stop();
    urgencyTimersRef.current.forEach(t => clearTimeout(t));
    urgencyTimersRef.current = [];
    pausedFractionRef.current = (timerAnim as any)._value ?? 1;
    setPaused(true);
  }

  function resumeGame() {
    setPaused(false);
    const fraction = pausedFractionRef.current;
    if (answeredRef.current || fraction <= 0) return;
    const q = questionRef.current!;
    const remainingMs = fraction * timerForRound(roundRef.current, q.isBoss) * 1000;
    timerAnimRef.current = Animated.timing(timerAnim, { toValue: 0, duration: remainingMs, useNativeDriver: false });
    timerAnimRef.current.start(({ finished }) => { if (finished) onTimerExpired(); });
  }

  // PanResponder — reads refs to avoid stale closures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => (questionRef.current?.isBoss ?? false) && !answeredRef.current,
      onMoveShouldSetPanResponder:  () => (questionRef.current?.isBoss ?? false) && !answeredRef.current,
      onPanResponderGrant: () => {
        dragPos.setOffset({ x: (dragPos.x as any)._value, y: (dragPos.y as any)._value });
        dragPos.setValue({ x: 0, y: 0 });
        Animated.spring(dragScale, { toValue: 1.12, friction: 5, useNativeDriver: true }).start();
        setIsDragging(true);
        measureDropZones();
      },
      onPanResponderMove: (_, gs) => {
        dragPos.setValue({ x: gs.dx, y: gs.dy });
        const hovered = findDropZone(gs.moveX, gs.moveY);
        setBtnStates(prev => prev.map((s, i) => {
          if (s === 'correct' || s === 'wrong' || s === 'disabled') return s;
          return i === hovered ? 'hovered' : 'default';
        }));
      },
      onPanResponderRelease: (_, gs) => {
        dragPos.flattenOffset();
        Animated.spring(dragScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        setIsDragging(false);
        setBtnStates(['default', 'default', 'default', 'default']);

        const dropped = findDropZone(gs.moveX, gs.moveY);
        if (dropped >= 0) {
          handleAnswer(dropped);
          // snap back if wrong so the draggable doesn't stay over a button
          if (dropped !== questionRef.current?.correctIndex) {
            snapDragBack();
          }
        } else {
          snapDragBack();
        }
      },
      onPanResponderTerminate: () => {
        dragPos.flattenOffset();
        setIsDragging(false);
        snapDragBack();
        setBtnStates(['default', 'default', 'default', 'default']);
      },
    })
  ).current;

  // Measure drop zones after question layout and animations complete
  useEffect(() => {
    if (!question) return;
    const t1 = setTimeout(measureDropZones, 200);
    const t2 = setTimeout(measureDropZones, 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [question]);

  useEffect(() => {
    if (phase === 'playing' && !paused && question?.isBoss) {
      startBossWiggle();
      return stopBossWiggle;
    }
    stopBossWiggle();
    return undefined;
  }, [phase, paused, question?.isBoss]);

  // Back-button guard (nav header ←, hardware back, swipe)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !isPlayingRef.current) return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
        timerAnimRef.current?.stop();
        urgencyTimersRef.current.forEach(t => clearTimeout(t));
        allowLeaveRef.current = true;
        navigation.dispatch(e.data.action);
      };
      setShowQuitModal(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Tab navigation guard — intercept bottom-tab presses while quiz is active
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      const unsubscribe = (parent as any).addListener('tabPress', (e: any) => {
        if (!isPlayingRef.current) return;
        e.preventDefault();
        onConfirmQuitRef.current = () => {
          timerAnimRef.current?.stop();
          urgencyTimersRef.current.forEach(t => clearTimeout(t));
          allowLeaveRef.current = true;
          navigation.popToTop();
        };
        setShowQuitModal(true);
      });
      return unsubscribe;
    }, [navigation])
  );

  useEffect(() => {
    fetchCountries().then(cs => {
      allCountriesRef.current = cs;
      const map: Record<string, string> = {};
      cs.forEach(c => { map[c.cca3] = c.cca2; });
      cca3MapRef.current = map;
      setPhase('ready');
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
    timerAnimRef.current.start(({ finished }) => { if (finished) onTimerExpired(); });
  }

  // ── Effect triggers ────────────────────────────────────────────────────────

  function triggerCorrectEffects() {
    correctFlashAnim.setValue(0.5);
    Animated.timing(correctFlashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    scoreScale.setValue(1.4);
    Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    burstAnim.setValue(0);
    Animated.timing(burstAnim, { toValue: 1, duration: 550, useNativeDriver: true }).start();
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
    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(shieldFlashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  function triggerTierFlash(label: string) {
    setTierFlashLabel(label);
    tierFlashAnim.setValue(0);
    tierFlashScale.setValue(0.35);
    Animated.parallel([
      Animated.timing(tierFlashAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(tierFlashScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(tierFlashAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start(() => setTierFlashLabel(null));
    }, 2200);
  }

  function triggerMilestoneFlash(scoreStr: string, mScore: number) {
    setMilestoneLabel(scoreStr);
    setMilestoneScore(mScore);
    milestoneFlashAnim.setValue(0);
    milestoneScaleAnim.setValue(0.5);
    Animated.parallel([
      Animated.timing(milestoneFlashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(milestoneScaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(milestoneFlashAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setMilestoneLabel(null));
    }, 1000);
  }

  function triggerShieldAcquireFlash() {
    setShowShieldAcquire(true);
    shieldAcquireAnim.setValue(0);
    shieldAcquireScale.setValue(0.5);
    Animated.parallel([
      Animated.timing(shieldAcquireAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(shieldAcquireScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(shieldAcquireAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setShowShieldAcquire(false));
    }, 1200);
  }

  // ── Round lifecycle ────────────────────────────────────────────────────────

  function beginRound(r: number) {
    const q = buildQuestion(r, usedRef.current, allCountriesRef.current, cca3MapRef.current, scoreRef.current);
    if (!q) { usedRef.current = new Set(); beginRound(r); return; }

    answerFade.setValue(0);

    requestAnimationFrame(() => {
      roundRef.current = r;
      questionRef.current = q;
      setRound(r);
      setQuestion(q);
      dragPos.setValue({ x: 0, y: 0 });
      dragPos.setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      dragScale.setValue(1);
      setBtnStates(['default', 'default', 'default', 'default']);

      Animated.timing(answerFade, { toValue: 1, duration: 220, delay: 60, useNativeDriver: false }).start(() => {
        answeredRef.current = false;
      });

      if (q.isBoss) {
        playGauntletBoss();
        bossBannerAnim.setValue(-40);
        Animated.spring(bossBannerAnim, { toValue: 0, friction: 7, useNativeDriver: true }).start();
      }
      startTimer(timerForRound(r, q.isBoss));
    });
  }

  function queueNextRound(delayMs: number) {
    const nextRound = roundRef.current + 1;
    setTimeout(() => beginRound(nextRound), delayMs);
  }

  function handleAnswer(index: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopBossWiggle();
    timerAnimRef.current?.stop();
    urgencyTimersRef.current.forEach(t => clearTimeout(t));
    urgencyTimersRef.current = [];

    const q = questionRef.current!;

    if (index === q.correctIndex) {
      setBtnStates(s => s.map((state, i) => i === index ? 'correct' : state === 'hovered' ? 'default' : state));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);

      playDingStreak(newScore);
      triggerCorrectEffects();

      setGoldPopText(`+${q.gold}`);
      goldPopAnim.setValue(1);
      Animated.timing(goldPopAnim, { toValue: 0, duration: 900, useNativeDriver: true }).start();

      if (newScore % 8 === 0 && shieldsRef.current < 3) {
        shieldsRef.current = Math.min(3, shieldsRef.current + 1);
        setShields(shieldsRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerShieldAcquireFlash();
      }

      const newTierLabel = getTier(newScore).label;
      const wasTierChange = newTierLabel !== prevTierLabelRef.current;
      const isMilestone = !wasTierChange && SCORE_MILESTONES.has(newScore);

      if (wasTierChange) {
        prevTierLabelRef.current = newTierLabel;
        playGauntletTier();
        triggerTierFlash(newTierLabel);
      } else if (isMilestone) {
        triggerMilestoneFlash(`${newScore}`, newScore);
      }

      totalGoldEarnedRef.current += q.gold;
      addGold(q.gold);

      const nextDelay = wasTierChange ? 2900 : isMilestone ? 1600 : (newScore >= 25 ? 500 : newScore >= 10 ? 650 : 800);
      queueNextRound(nextDelay);
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
        setTimeout(() => beginRound(roundRef.current + 1), 2100);
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
    allowLeaveRef.current = true;
    navigation.replace('QuizResults', {
      score: final,
      total: roundRef.current + 1,
      goldEarned: totalGoldEarnedRef.current,
      quizType: 'gauntlet',
      elapsedSeconds: elapsed,
      tierAccent: getTier(final).accent,
      tierLabel: getTier(final).label,
      tierBg: getTier(final).bg,
    });
  }

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const timerColor = timerAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: ['#ff2222', '#ffaa00', '#00cc88'] });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (phase === 'loading' || (phase === 'playing' && !question)) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#020610' }]}>
        <TierBackground tierLabel="DANGER" />
        <Image source={require('../../assets/avatars/flame.png')} style={{ width: 56, height: 56, marginBottom: 16 }} resizeMode="contain" />
        <Text style={styles.loadingText}>Entering the Gauntlet...</Text>
      </View>
    );
  }

  // ── Ready ──────────────────────────────────────────────────────────────────

  if (phase === 'ready') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#020610' }]}>
        <TierBackground tierLabel="DANGER" />
        <Image source={require('../../assets/avatars/crucible.png')} style={{ width: 80, height: 80, marginBottom: 20 }} resizeMode="contain" />
        <Text style={styles.readyTitle}>THE GAUNTLET</Text>
        <Text style={styles.readySubtitle}>Answer fast and survive the climb.</Text>
        <TouchableOpacity
          style={styles.readyBtn}
          onPress={() => { startTimeRef.current = Date.now(); setPhase('playing'); beginRound(0); }}
        >
          <Text style={styles.readyBtnText}>LET'S GO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.readyBackLink}>
          <Text style={styles.readyBackLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────

  const q = question!;
  const typeColor = TYPE_COLOR[q.type];
  const tier = getTier(score);
  const isAnswered = btnStates.some(s => s === 'correct' || s === 'wrong' || s === 'disabled');
  const phaseProgressScore = score >= FINAL_PHASE_SCORE ? PHASE_STEP : score % PHASE_STEP;
  const phaseProgressPct = score >= FINAL_PHASE_SCORE ? 100 : (phaseProgressScore / PHASE_STEP) * 100;
  const nextPhaseScore = Math.min(FINAL_PHASE_SCORE, (Math.floor(score / PHASE_STEP) + 1) * PHASE_STEP);
  const nextPhaseLabel = score >= FINAL_PHASE_SCORE ? 'FINAL PHASE' : `NEXT PHASE ${phaseProgressScore}/${PHASE_STEP}`;
  const nextPhaseDetail = score >= FINAL_PHASE_SCORE ? tier.label : `${nextPhaseScore - score} correct left`;
  const isShapeType = q.type === 'shape' || q.type === 't2_shape_capital' || q.type === 't2_shape_border' || q.type === 't2_shape_flag';
  const isFlagType = q.type === 'flag' || q.type === 't2_flag_capital' || q.type === 't2_flag_border' || q.type === 't2_flag_shape';
  const subjectCardStyle = [
    styles.subjectCard,
    isShapeType && [styles.shapeSubjectCard, { borderColor: tier.accent + '55' }],
    !isShapeType && { backgroundColor: 'transparent', borderColor: 'transparent' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: tier.bg }]}>
      <TierBackground key={tier.label} tierLabel={tier.label as TierLabel} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: tier.accent }]}>THE GAUNTLET</Text>
          <Text style={[styles.tierLabel, { color: tier.accent + 'aa' }]}>{tier.label}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={pauseGame} style={styles.pauseBtn}>
            <View style={styles.pauseIconBar} />
            <View style={styles.pauseIconBar} />
          </TouchableOpacity>
          <View style={styles.shieldIcons}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.shieldIcon, i < shields ? { backgroundColor: tier.accent + '20', borderColor: tier.accent } : { backgroundColor: 'transparent', borderColor: '#1a1a2a' }]}>
                <Image source={require('../../assets/gauntlet/gauntlet_danger.png')} style={{ width: 12, height: 12, opacity: i < shields ? 1 : 0.12 }} resizeMode="contain" />
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
          <Text style={styles.bossBannerText}>BOSS ROUND  x2</Text>
          <Image source={require('../../assets/avatars/gold_bag.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
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
            <Animated.Text style={[styles.goldPop, { opacity: goldPopAnim }]}>{goldPopText}</Animated.Text>
          )}
        </View>
      </View>

      {/* ── Playing area: corner drop zones + center draggable ─────────── */}
      <View style={styles.phaseProgressWrap}>
        <View style={styles.phaseProgressLabels}>
          <Text style={[styles.phaseProgressTitle, { color: tier.accent }]}>{nextPhaseLabel}</Text>
          <Text style={styles.phaseProgressDetail}>{nextPhaseDetail}</Text>
        </View>
        <View style={styles.phaseProgressTrack}>
          <View style={[styles.phaseProgressFill, { width: `${phaseProgressPct}%` as any, backgroundColor: tier.accent }]} />
        </View>
      </View>

      <View style={styles.playingArea}>
        <View style={styles.questionArea}>
          <Text style={[styles.promptText, { color: tier.accent + 'dd' }]}>{q.prompt}</Text>

          <View style={subjectCardStyle}>
            {isShapeType ? (
              <View style={styles.shapeSilhouetteContainer}>
                <CountryShapeView
                  key={`shape-${q.subjectCca2}`}
                  countryCode={q.subjectCca2 ?? ''}
                  height={148}
                  color={tier.accent}
                />
              </View>
            ) : isFlagType && q.flagUrl ? (
              <Image
                source={{ uri: q.flagUrl }}
                style={styles.subjectFlag}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.subjectText, { color: '#fff' }]} numberOfLines={2} adjustsFontSizeToFit>
                {q.dragLabel}
              </Text>
            )}
          </View>
        </View>

        <Animated.View style={[styles.answersGrid, { opacity: answerFade }]}>
          {q.options.map((opt, i) => {
            const s = btnStates[i];
            const optionCountry = q.optionCountries?.[i];
            const answerStyle = [
              styles.answerCard,
              { backgroundColor: tier.cardBg, borderColor: tier.btnBorder },
              s === 'correct' && styles.answerCorrect,
              s === 'wrong' && styles.answerWrong,
              s === 'disabled' && styles.answerDisabled,
            ] as any;

            const labelEl = q.answerVisual === 'flag' && optionCountry?.flagUrl ? (
              <Image source={{ uri: optionCountry.flagUrl }} style={styles.answerFlag} resizeMode="contain" />
            ) : q.answerVisual === 'shape' && optionCountry ? (
              <View style={styles.answerShapeWrap}>
                <CountryShapeView
                  key={`answer-shape-${round}-${optionCountry.cca2}`}
                  countryCode={optionCountry.cca2}
                  height={68}
                  color={s === 'correct' ? '#00cc66' : s === 'wrong' ? '#ff4444' : s === 'disabled' ? '#555555' : tier.accent}
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.answerText,
                  s === 'correct' && styles.answerTextCorrect,
                  s === 'wrong' && styles.answerTextWrong,
                  s === 'disabled' && styles.answerTextDisabled,
                ]}
                numberOfLines={3}
                adjustsFontSizeToFit
              >
                {opt}
              </Text>
            );

            return (
              <AnimatedTouchable
                key={`answer-${round}-${i}`}
                style={answerStyle}
                onPress={() => handleAnswer(i)}
                disabled={isAnswered}
                activeOpacity={0.8}
              >
                {labelEl}
              </AnimatedTouchable>
            );
          })}
        </Animated.View>
      </View>

      {/* ── Pause overlay ────────────────────────────────────────────────── */}
      {paused && (
        <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
          <Image source={require('../../assets/avatars/stop_it.png')} style={styles.pauseStopIt} resizeMode="contain" />
          <Text style={[styles.pauseTitle, { color: tier.accent }]}>PAUSED</Text>
          <TouchableOpacity style={[styles.resumeBtn, { borderColor: tier.accent }]} onPress={resumeGame}>
            <Text style={[styles.resumeBtnText, { color: tier.accent }]}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { timerAnimRef.current?.stop(); allowLeaveRef.current = true; navigation.goBack(); }}>
            <Text style={styles.quitText}>Quit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Full-screen overlays ─────────────────────────────────────────── */}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#00cc6622', opacity: correctFlashAnim }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#ff222230', opacity: wrongFlashAnim }]} />

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shieldOverlay, { opacity: shieldFlashAnim }]}>
        <View style={styles.shieldOverlayInner}>
          <Image source={require('../../assets/gauntlet/gauntlet_danger.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
          <Text style={styles.shieldOverlayText}>SHIELD ABSORBED</Text>
        </View>
      </Animated.View>

      {tierFlashLabel !== null && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.tierFlashOverlay, { opacity: tierFlashAnim, backgroundColor: tier.accent + '18' }]}
        >
          <Animated.View style={[styles.tierFlashCard, { borderColor: tier.accent + '55', transform: [{ scale: tierFlashScale }] }]}>
            <Text style={styles.tierFlashWelcome}>WELCOME TO</Text>
            <View style={[styles.tierFlashDivider, { backgroundColor: tier.accent + '66' }]} />
            <Text style={[styles.tierFlashText, { color: tier.accent }]}>{tierFlashLabel}</Text>
            {TIER_DESCRIPTIONS[tierFlashLabel] !== undefined && (
              <Text style={[styles.tierFlashDesc, { color: tier.accent + 'cc' }]}>{TIER_DESCRIPTIONS[tierFlashLabel]}</Text>
            )}
          </Animated.View>
        </Animated.View>
      )}

      {milestoneLabel !== null && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.milestoneOverlay, { opacity: milestoneFlashAnim }]}>
          <Animated.View style={[styles.milestoneInner, { transform: [{ scale: milestoneScaleAnim }] }]}>
            <Image source={require('../../assets/avatars/flame.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
            <Text style={styles.milestoneScoreText}>{milestoneLabel}</Text>
            <Text style={styles.milestoneTagline}>{MILESTONE_TAGLINES[milestoneScore] ?? 'KEEP GOING'}</Text>
          </Animated.View>
        </Animated.View>
      )}

      {showShieldAcquire && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shieldAcquireOverlay, { opacity: shieldAcquireAnim }]}>
          <Animated.View style={[styles.shieldAcquireInner, { transform: [{ scale: shieldAcquireScale }] }]}>
            <Image source={require('../../assets/gauntlet/gauntlet_danger.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
            <Text style={[styles.shieldAcquireText, { color: tier.accent }]}>SHIELD ACQUIRED</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Burst particles ──────────────────────────────────────────────────── */}
      {BURST_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * BURST_DIST;
        const dy = Math.sin(rad) * BURST_DIST;
        return (
          <Animated.View
            key={`burst-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '45%',
              left: '50%',
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              borderRadius: 5,
              backgroundColor: tier.accent,
              opacity: burstAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.9, 0] }),
              transform: [
                { translateX: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                { translateY: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
              ],
            }}
          />
        );
      })}

      <QuitConfirmModal
        visible={showQuitModal}
        title="Leave Gauntlet?"
        message="Your progress will be lost."
        onStay={() => { setShowQuitModal(false); onConfirmQuitRef.current = null; }}
        onQuit={() => { setShowQuitModal(false); onConfirmQuitRef.current?.(); onConfirmQuitRef.current = null; }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { color: '#4D96FF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  backBtn: { color: '#555', fontSize: 16, fontWeight: 'bold', padding: 4 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
  tierLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shieldIcons: { flexDirection: 'row', gap: 4 },
  shieldIcon: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  scoreBadgeText: { fontSize: 18, fontWeight: 'bold' },

  timerBg: { height: 5, backgroundColor: '#111', width: '100%' },
  timerFill: { height: '100%' },

  bossBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a0e00', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ffd70055', paddingVertical: 6 },
  bossBannerText: { color: '#ffd700', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundText: { color: '#444', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  typeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  goldPop: { color: '#ffd700', fontSize: 14, fontWeight: 'bold' },
  phaseProgressWrap: { paddingHorizontal: 16, marginBottom: 8, gap: 5 },
  phaseProgressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phaseProgressTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  phaseProgressDetail: { color: '#555', fontSize: 10, fontWeight: '700' },
  phaseProgressTrack: { height: 5, backgroundColor: '#111827', borderRadius: 3, overflow: 'hidden' },
  phaseProgressFill: { height: '100%', borderRadius: 3 },

  // ── Playing area (corners layout) ─────────────────────────────────────────
  playingArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  questionArea: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 18,
  },

  answerCard: {
    width: '48%',
    minHeight: 104,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },

  promptText: {
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    paddingHorizontal: 18,
  },
  subjectCard: {
    width: '100%',
    minHeight: 176,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  shapeSubjectCard: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#070b18',
    paddingVertical: 10,
  },
  subjectFlag: {
    width: '72%',
    maxWidth: 280,
    height: 164,
  },
  subjectText: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 8,
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },

  answerCorrect:  { backgroundColor: '#0d1f18', borderColor: '#00cc66' },
  answerWrong:    { backgroundColor: '#2e0808', borderColor: '#ff4444' },
  answerDisabled: { backgroundColor: '#0c0c0c', borderColor: '#1a1a1a' },
  answerText:         { color: '#ddd', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  answerTextCorrect:  { color: '#00cc66' },
  answerTextWrong:    { color: '#ff4444' },
  answerTextDisabled: { color: '#333' },
  answerFlag: { width: '100%', height: 48, borderRadius: 8 },
  answerShapeWrap: {
    width: '100%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },

  // ── Draggable (center chip) ────────────────────────────────────────────────

  shieldOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#00ccff18' },
  shieldOverlayInner: { alignItems: 'center', gap: 10, backgroundColor: '#001a20ee', paddingHorizontal: 28, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: '#00ccff55' },
  shieldOverlayText: { color: '#00ccff', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },

  shieldAcquireOverlay: { justifyContent: 'center', alignItems: 'center' },
  shieldAcquireInner: { alignItems: 'center', gap: 10, backgroundColor: '#001a20ee', paddingHorizontal: 28, paddingVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: '#00ccff55' },
  shieldAcquireText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },

  tierFlashOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000ee' },
  tierFlashCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#000000dd',
    paddingHorizontal: 48,
    paddingVertical: 36,
    borderRadius: 24,
    borderWidth: 1,
  },
  tierFlashWelcome: { color: '#ffffff88', fontSize: 12, fontWeight: '700', letterSpacing: 5 },
  tierFlashDivider: { width: 60, height: 1, borderRadius: 1 },
  tierFlashText: { fontSize: 40, fontWeight: 'bold', letterSpacing: 6 },
  tierFlashDesc: { fontSize: 14, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },

  milestoneOverlay: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000dd' },
  milestoneInner: { alignItems: 'center', gap: 8, backgroundColor: '#1a0e00ee', paddingHorizontal: 44, paddingVertical: 32, borderRadius: 24, borderWidth: 1, borderColor: '#ffd70055' },
  milestoneScoreText: { color: '#ffd700', fontSize: 72, fontWeight: 'bold', lineHeight: 76 },
  milestoneTagline: { color: '#ffd700aa', fontSize: 13, fontWeight: '700', letterSpacing: 3 },

  // ── Ready screen ──────────────────────────────────────────────────────────
  readyTitle:    { color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 10 },
  readySubtitle: { color: '#666', fontSize: 14, textAlign: 'center', paddingHorizontal: 36, marginBottom: 40 },
  readyBtn:          { backgroundColor: '#4D96FF', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  readyBtnText:      { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  readyBackLink:     { marginTop: 20 },
  readyBackLinkText: { color: '#555', fontSize: 14 },

  // ── Pause ─────────────────────────────────────────────────────────────────
  pauseBtn:     { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6, marginRight: 4 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0a1a', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60, zIndex: 100, gap: 6 },
  pauseStopIt:  { width: 140, height: 140, marginBottom: 4 },
  pauseTitle:   { fontSize: 34, fontWeight: 'bold', letterSpacing: 5, marginBottom: 16 },
  resumeBtn:    { borderWidth: 2, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  resumeBtnText:{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  quitText:     { color: '#444', fontSize: 14, fontWeight: '600', marginTop: 28 },

  // ── Shape map draggable ───────────────────────────────────────────────────
  shapeSilhouetteContainer: {
    width: '92%',
    maxWidth: 280,
    height: 150,
    overflow: 'hidden',
    justifyContent: 'center',
  },
});
