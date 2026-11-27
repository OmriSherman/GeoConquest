import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList, Country } from '../types';
import { fetchCountries, getOfflineFullCountries } from '../lib/countryData';
import { filterShapeQuizCountries } from '../lib/quizCountryFilters';
import { getMapFeatures } from '../lib/mapData';
import { NUM_TO_A2 } from '../components/CountryShapeView';
import { getCountryDifficulty } from '../lib/questionDifficulty';
import { calcQuizXP } from '../lib/xpSystem';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import EarningsStrip from '../components/EarningsStrip';
import QuitConfirmModal from '../components/QuitConfirmModal';
import { playCompassBullseye, playCompassClose, playDingStreak, playTick, playWrong } from '../lib/audio';
import { XpAmount } from '../components/XpIcon';
import { addQuizTabGuard } from '../lib/quizTabGuard';
import { cfg, serverRewardsFor } from '../lib/gameConfig';
import { t } from '../lib/i18n';

const ROUNDS = 10;
const ROUND_SECONDS = 15;
// Reward tiers (100% = quiz.gold.compass / quiz.xp.compass): bullseye 100%, good compass.w.good, close compass.w.close
const BULLSEYE_DEG = 5;
const FULL_DEG = 10; // good: counts as a correct answer (combo continues)
const PARTIAL_DEG = 30; // close: partial credit, combo resets
const MIN_DIST = 110; // map units (map is 800 wide): pairs closer than this are too easy / ambiguous
const MAX_DIST = 520;
const MAP_W = 800; // the flat map wraps horizontally: a country can be reached east or west
const WRAP_MIN_DX = MAP_W * 0.3; // the way across the map edge only counts when the target is at least this far east/west
const MAX_PAIR_DIFFICULTY = 7; // sensible pairs: countries most players know

type Pt = [number, number];
type MapEntry = { d: string; c: Pt; b: [Pt, Pt]; fb: [Pt, Pt] };
type Round = { from: Country; target: Country };
type Box = { x: number; y: number; w: number };

type Props = { navigation: StackNavigationProp<QuizStackParamList, 'CompassQuiz'> };

// cca2 -> projected outline, centre and bounds, all in the app's flat (Mercator) map space.
let mapIndex: Record<string, MapEntry> | null = null;
function getMapIndex() {
  if (mapIndex) return mapIndex;
  const out: Record<string, MapEntry> = {};
  for (const f of getMapFeatures() ?? []) {
    const id = String(f.rawFeature.id);
    const cca2 = NUM_TO_A2[id] ?? NUM_TO_A2[id.padStart(3, '0')];
    const c = f.focusCentroid as Pt;
    if (cca2 && f.d && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      out[cca2] = { d: f.d, c, b: f.bounds, fb: f.focusBounds };
    }
  }
  mapIndex = out;
  return out;
}

// Clockwise degrees from north of the straight line a -> b on the flat map (screen y grows downward).
const bearing = (a: Pt, b: Pt) => ((Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI + 360) % 360;
const angDiff = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// shortest distance around the globe (wraps at the map edge)
const wdist = (a: Pt, b: Pt) => { const dx = Math.abs(a[0] - b[0]); return Math.hypot(Math.min(dx, MAP_W - dx), a[1] - b[1]); };
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function buildRounds(pool: Country[], idx: Record<string, MapEntry>): Round[] {
  const rounds: Round[] = [];
  const usedFrom = new Set<string>();
  const usedTarget = new Set<string>();
  for (let guard = 0; rounds.length < ROUNDS && guard < 500; guard++) {
    const from = pick(pool);
    if (usedFrom.has(from.cca2)) continue;
    const fc = idx[from.cca2].c;
    const targets = pool.filter(c => c.cca2 !== from.cca2 && !usedTarget.has(c.cca2)
      && wdist(fc, idx[c.cca2].c) >= MIN_DIST && wdist(fc, idx[c.cca2].c) <= MAX_DIST);
    if (!targets.length) continue;
    const target = pick(targets);
    usedFrom.add(from.cca2);
    usedTarget.add(target.cca2);
    rounds.push({ from, target });
  }
  return rounds;
}

const intersects = (e: MapEntry, bx: Box) =>
  e.b[1][0] >= bx.x && e.b[0][0] <= bx.x + bx.w && e.b[1][1] >= bx.y && e.b[0][1] <= bx.y + bx.w;

// Static map layer: memoised so animating the view box does not rebuild thousands of path nodes.
const MapPaths = React.memo(function MapPaths({ items, fromCode, targetCode, targetDx, sw }: {
  items: { code: string; d: string; dx: number }[]; fromCode: string; targetCode: string | null; targetDx: number; sw: number;
}) {
  return (
    <G>
      {items.map(({ code, d, dx }) => {
        const isFrom = code === fromCode && dx === 0, isTarget = code === targetCode && dx === targetDx;
        return (
        <Path
          key={`${code}:${dx}`}
          d={d}
          transform={dx ? [{ translateX: dx }] : undefined}
          fill={isFrom ? '#FFD700' : isTarget ? '#4CAF50' : '#1e2a48'}
          fillOpacity={isFrom || isTarget ? 0.9 : 1}
          stroke="#3a4a7a"
          strokeWidth={sw}
        />
        );
      })}
    </G>
  );
});

export default function CompassQuizScreen({ navigation }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const SIZE = Math.round(Math.min(winW - 56, winH * 0.38));
  const R = SIZE * 0.44; // dial radius
  const { addGold } = useGame();
  const { profile } = useAuth();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'guess' | 'reveal'>('guess');
  const [angle, setAngle] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [diff, setDiff] = useState<number | null>(null);
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 200 });
  const [base, setBase] = useState<Box>({ x: 0, y: 0, w: 200 }); // fixed view box of this round's map; the camera is a transform on top of it
  const [ox, setOx] = useState(0); // x offset of the target copy that was aimed at (0, or +-MAP_W when the way round the globe is shorter)
  const zoom = useRef(new Animated.Value(1)).current;
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const [goldEarned, setGoldEarned] = useState(0);
  const [goldDelta, setGoldDelta] = useState(0);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showQuit, setShowQuit] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const idxRef = useRef<Record<string, MapEntry>>({});
  const phaseRef = useRef<'guess' | 'reveal'>('guess');
  const angleRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const roundsRef = useRef<Round[]>([]);
  const fullRef = useRef(0);
  const partialRef = useRef(0);
  const bullRef = useRef(0);
  const goldRef = useRef(0);
  const comboRef = useRef(0);
  const comboExtraRef = useRef(0);
  const startRef = useRef(0);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const allowLeaveRef = useRef(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);
  const boxRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });

  // ── leave guards (same as the other quizzes) ──
  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      return addQuizTabGuard((e) => {
        if (!readyRef.current) return;
        e.preventDefault();
        const tappedTab = e.tabName;
        onConfirmQuitRef.current = () => {
          allowLeaveRef.current = true;
          navigation.popToTop();
          if (tappedTab && tappedTab !== 'Quizzes') (parent as any).navigate(tappedTab);
        };
        setShowQuit(true);
      });
    }, [navigation])
  );
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (allowLeaveRef.current || !readyRef.current) return;
    e.preventDefault();
    onConfirmQuitRef.current = () => { allowLeaveRef.current = true; navigation.dispatch(e.data.action); };
    setShowQuit(true);
  }), [navigation]);

  // ── load ──
  useEffect(() => {
    (async () => {
      try {
        let countries: Country[];
        try {
          countries = await fetchCountries();
        } catch {
          if (profile?.is_conquerer) countries = getOfflineFullCountries();
          else throw new Error('OFFLINE_NO_PREMIUM');
        }
        const idx = getMapIndex();
        const pool = filterShapeQuizCountries(countries).filter(c => idx[c.cca2] && getCountryDifficulty(c) <= MAX_PAIR_DIFFICULTY);
        const r = buildRounds(pool, idx);
        if (r.length < ROUNDS) throw new Error('Not enough countries available.');
        idxRef.current = idx;
        roundsRef.current = r;
        setRounds(r);
        startRound(0, r);
      } catch (e: any) {
        setError(e.message === 'OFFLINE_NO_PREMIUM' ? 'offline_upgrade' : (e.message ?? 'Failed to load'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function guessBox(r: Round): Box {
    const e = idxRef.current[r.from.cca2];
    const span = Math.min(420, Math.max(130, Math.max(e.fb[1][0] - e.fb[0][0], e.fb[1][1] - e.fb[0][1]) * 2.4));
    return { x: e.c[0] - span / 2, y: e.c[1] - span / 2, w: span };
  }
  // Framing that shows both countries (never tighter than the guess view, so the reveal is a zoom OUT).
  function revealBox(r: Round, o: number): Box {
    const a = idxRef.current[r.from.cca2].c, b = idxRef.current[r.target.cca2].c.slice() as Pt;
    b[0] += o;
    const span = Math.max(150, guessBox(r).w, Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) * 1.6 + 60);
    return { x: (a[0] + b[0]) / 2 - span / 2, y: (a[1] + b[1]) / 2 - span / 2, w: span };
  }

  // Every framing this round can use (guess, reveal straight, reveal across the map edge).
  function framesFor(r: Round) {
    const fc = idxRef.current[r.from.cca2].c, tc = idxRef.current[r.target.cca2].c;
    const sgn = tc[0] - fc[0] >= 0 ? 1 : -1;
    const wrapOk = Math.abs(tc[0] - fc[0]) >= WRAP_MIN_DX;
    return { guess: guessBox(r), direct: revealBox(r, 0), wrapped: wrapOk ? revealBox(r, -sgn * MAP_W) : null, wrapOff: -sgn * MAP_W, wrapOk };
  }
  // Square box covering all of them: the map is drawn once at this box.
  function baseFor(r: Round): Box {
    const f = framesFor(r);
    const bs = [f.guess, f.direct, ...(f.wrapped ? [f.wrapped] : [])];
    const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y));
    const x1 = Math.max(...bs.map(b => b.x + b.w)), y1 = Math.max(...bs.map(b => b.y + b.w));
    const w = Math.max(x1 - x0, y1 - y0);
    return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / 2, w };
  }
  // Transform that makes the base view look like frame F.
  function setCamera(F: Box, U: Box, animate: boolean) {
    const s = U.w / F.w, half = SIZE / 2;
    const tx = half * (s - 1) + ((U.x - F.x) / F.w) * SIZE, ty = half * (s - 1) + ((U.y - F.y) / F.w) * SIZE;
    if (!animate) { zoom.setValue(s); panX.setValue(tx); panY.setValue(ty); return; }
    const a = { duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel([
      Animated.timing(zoom, { ...a, toValue: s }),
      Animated.timing(panX, { ...a, toValue: tx }),
      Animated.timing(panY, { ...a, toValue: ty }),
    ]).start();
  }

  function startRound(i: number, rs = roundsRef.current) {
    indexRef.current = i;
    phaseRef.current = 'guess';
    angleRef.current = null;
    setIndex(i);
    setPhase('guess');
    setAngle(null);
    setDiff(null);
    setSecondsLeft(ROUND_SECONDS);
    setOx(0);
    setBase(baseFor(rs[i]));
    setBox(guessBox(rs[i]));
  }

  // ── round timer ──
  useEffect(() => {
    if (!ready || phase !== 'guess' || paused) return;
    const id = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [ready, phase, index, paused]);
  useEffect(() => {
    if (!ready || phase !== 'guess' || paused) return;
    if (secondsLeft > 0 && secondsLeft <= 5) playTick(); // countdown for the last seconds
    if (secondsLeft <= 0) lockRound(true); // time is up: wrong, whatever the arrow says
  }, [secondsLeft]);

  function setAim(deg: number) {
    const a = ((Math.round(deg) % 360) + 360) % 360;
    angleRef.current = a;
    setAngle(a);
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === 'guess' && !pausedRef.current,
    onMoveShouldSetPanResponder: () => phaseRef.current === 'guess' && !pausedRef.current,
    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      boxRef.current?.measure((_x, _y, w, h, px, py) => {
        originRef.current = { x: px + w / 2, y: py + h / 2 };
        aimAt(pageX, pageY);
      });
    },
    onPanResponderMove: (e) => aimAt(e.nativeEvent.pageX, e.nativeEvent.pageY),
  })).current;

  function aimAt(px: number, py: number) {
    if (phaseRef.current !== 'guess') return;
    const dx = px - originRef.current.x, dy = py - originRef.current.y;
    if (Math.hypot(dx, dy) < 12) return;
    setAim((Math.atan2(dx, -dy) * 180) / Math.PI);
  }

  function lockRound(timedOut = false) {
    if (phaseRef.current !== 'guess') return;
    phaseRef.current = 'reveal';
    const r = roundsRef.current[indexRef.current];
    if (timedOut) { angleRef.current = null; setAngle(null); }
    const a = angleRef.current;
    const fc = idxRef.current[r.from.cca2].c, tc = idxRef.current[r.target.cca2].c;
    const sgn = tc[0] - fc[0] >= 0 ? 1 : -1;
    // Two ways to reach the target around the globe: straight, or across the map edge. Judge the one closest to the player's aim.
    const direct = { o: 0, b: bearing(fc, tc) };
    const wrapped = { o: -sgn * MAP_W, b: bearing(fc, [tc[0] - sgn * MAP_W, tc[1]]) };
    const best = !framesFor(r).wrapOk ? direct : a == null ? (Math.abs(tc[0] - fc[0]) <= MAP_W / 2 ? direct : wrapped) : angDiff(a, wrapped.b) < angDiff(a, direct.b) ? wrapped : direct;
    const d = a == null ? null : angDiff(a, best.b);
    const goldBase = cfg('quiz.gold.compass');
    let earned = 0;
    // Same formula as the server: base x (tier weight + 0.1 per combo step), combo built by bullseye/good rounds
    if (d != null && d <= FULL_DEG) {
      comboRef.current += 1;
      comboExtraRef.current += comboRef.current - 1;
      fullRef.current += 1;
      const bull = d <= BULLSEYE_DEG;
      if (bull) bullRef.current += 1;
      earned = Math.round(goldBase * ((bull ? 1 : cfg('compass.w.good')) + (comboRef.current - 1) * 0.1));
      if (bull) playCompassBullseye(); else playDingStreak(comboRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (d != null && d <= PARTIAL_DEG) {
      comboRef.current = 0;
      partialRef.current += 1;
      earned = Math.round(goldBase * cfg('compass.w.close'));
      playCompassClose();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      comboRef.current = 0;
      playWrong();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    goldRef.current += earned;
    setCombo(comboRef.current);
    setScore(fullRef.current);
    setGoldEarned(goldRef.current);
    setGoldDelta(earned);
    setAnimTrigger(n => n + 1);
    setAnsweredCount(n => n + 1);
    setDiff(d);
    setPhase('reveal');
    if (earned > 0 && !serverRewardsFor('compass')) addGold(earned); // with server rewards, gold is settled once on the results screen

    // zoom out to show both countries
    // The map is already drawn for every framing; only the native camera transform moves (no redraw at confirm).
    const to = revealBox(r, best.o);
    setOx(best.o);
    setBox(to);
    setCamera(to, base, true);
  }

  function next() {
    if (phaseRef.current !== 'reveal') return;
    const n = indexRef.current + 1;
    if (n >= ROUNDS) {
      allowLeaveRef.current = true;
      const full = fullRef.current, partial = partialRef.current, bull = bullRef.current;
      const units = bull + (full - bull) * cfg('compass.w.good') + partial * cfg('compass.w.close');
      navigation.replace('QuizResults', {
        score: full,
        total: ROUNDS,
        goldEarned: goldRef.current,
        quizType: 'compass',
        comboExtra: comboExtraRef.current,
        elapsedSeconds: Math.floor((Date.now() - startRef.current) / 1000),
        serverExtra: { bullseye: bull, partial },
        xpOverride: calcQuizXP('compass', units, ROUNDS, false),
      });
      return;
    }
    startRound(n);
  }

  // ── render pieces ──
  const round = rounds[index];
  const items = useMemo(() => {
    if (!round) return [];
    const idx = idxRef.current;
    // Guess view and the zoomed-out reveal both draw from one list, so the zoom needs no re-render of the paths.
    // Everything visible in any of this round's framings. The map repeats left and right so a target across the edge is drawn where it is aimed.
    const f = framesFor(round);
    const frames = [f.guess, f.direct, ...(f.wrapped ? [f.wrapped] : [])];
    const out: { code: string; d: string; dx: number }[] = [];
    for (const dx of [-MAP_W, 0, MAP_W]) {
      for (const code of Object.keys(idx)) {
        if (frames.some(fr => intersects(idx[code], { ...fr, x: fr.x - dx }))) out.push({ code, d: idx[code].d, dx });
      }
    }
    return out;
  }, [round]);

  // Camera goes to the guess framing only AFTER the round's map has committed (until then the crisp layer covers the old view).
  useEffect(() => {
    if (round && base.w > 0 && idxRef.current[round.from.cca2]) setCamera(guessBox(round), base, false);
  }, [round, base]);
  // The guess view is drawn at native resolution on top (sharp), the big map underneath is only used for the zoom-out.
  const guessItems = useMemo(() => {
    if (!round) return [];
    const idx = idxRef.current, g = guessBox(round);
    return Object.keys(idx).filter(code => intersects(idx[code], g)).map(code => ({ code, d: idx[code].d, dx: 0 }));
  }, [round]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('compass.loading')}</Text>
      </View>
    );
  }
  if (error || !round) {
    if (error === 'offline_upgrade') {
      return (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: '#FFD700', fontWeight: 'bold' }]}>{t('quizCommon.offline.title')}</Text>
          <Text style={[styles.errorText, { color: '#aaa', fontSize: 14 }]}>{t('quizCommon.offline.body')}</Text>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Premium')} style={styles.upgradeBtn}>
            <Text style={styles.readyBtnText}>{t('quizCommon.offline.upgrade')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={styles.centered}><Text style={styles.errorText}>{error ?? t('quizCommon.noQuestions')}</Text></View>;
  }

  if (!ready) {
    return (
      <View style={styles.readyContainer}>
        <Image source={require('../../assets/avatars/compass.png')} style={{ width: 90, height: 90, marginBottom: 16 }} resizeMode="contain" />
        <Text style={styles.readyTitle}>{t('compass.title').toUpperCase()}</Text>
        <Text style={[styles.readySubtitle, { marginBottom: 18 }]}>{t('compass.subtitle')}</Text>
        <View style={styles.tiers}>
          {[
            { label: t('compass.tierBullseye'), deg: `≤ ${BULLSEYE_DEG}°`, w: 1, color: '#4CAF50' },
            { label: t('compass.tierGood'), deg: `≤ ${FULL_DEG}°`, w: cfg('compass.w.good'), color: '#8BC34A' },
            { label: t('compass.tierClose'), deg: `≤ ${PARTIAL_DEG}°`, w: cfg('compass.w.close'), color: '#FFD700' },
            { label: t('compass.tierMiss'), deg: `> ${PARTIAL_DEG}°`, w: 0, color: '#f44336' },
          ].map(row => (
            <View key={row.label} style={styles.tierRow}>
              <Text style={[styles.tierLabel, { color: row.color }]} numberOfLines={1}>{row.label}</Text>
              <Text style={styles.tierDeg}>{row.deg}</Text>
              <View style={styles.tierReward}>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.tierGold}>{Math.round(cfg('quiz.gold.compass') * row.w)}</Text>
                <XpAmount amount={Math.round(cfg('quiz.xp.compass') * row.w)} textStyle={styles.tierXp} />
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.readyBtn}
          onPress={() => { startRef.current = Date.now(); setReady(true); }}
        >
          <Text style={styles.readyBtnText}>{t('quizCommon.letsGo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#555', fontSize: 14 }}>{t('quizCommon.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const idx = idxRef.current;
  const fromE = idx[round.from.cca2], targetE = idx[round.target.cca2];
  const k = box.w / SIZE; // map units per pixel
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dirs = t('compass.dirs').split(',');
  const cx = SIZE / 2, cy = SIZE / 2;
  const pt = (deg: number, r: number) => ({ x: cx + r * Math.sin(rad(deg)), y: cy - r * Math.cos(rad(deg)) });
  const reveal = phase === 'reveal';
  // Reveal lines live in map space: the correct one runs to the target, the player's is the same length.
  const tpos: Pt = [targetE.c[0] + ox, targetE.c[1]];
  const lineLen = dist(fromE.c, tpos);
  const guessEnd: Pt | null = angle == null ? null : [fromE.c[0] + lineLen * Math.sin(rad(angle)), fromE.c[1] - lineLen * Math.cos(rad(angle))];
  const verdict = diff == null ? t('compass.noAnswer') : diff <= BULLSEYE_DEG ? t('compass.bullseye') : diff <= FULL_DEG ? t('compass.perfect') : diff <= PARTIAL_DEG ? t('compass.close') : t('compass.miss');
  const verdictColor = diff != null && diff <= FULL_DEG ? '#4CAF50' : diff != null && diff <= PARTIAL_DEG ? '#FFD700' : '#f44336';

  return (
    <View style={styles.container}>
      {paused && (
        <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
          <Image source={require('../../assets/avatars/stop_it.png')} style={styles.pauseStopIt} resizeMode="contain" />
          <Text style={styles.pauseTitle}>{t('quizCommon.paused')}</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={() => setPaused(false)}>
            <Text style={styles.resumeBtnText}>{t('quizCommon.resume')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { allowLeaveRef.current = true; navigation.goBack(); }}>
            <Text style={styles.quitText}>{t('quizCommon.quit')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.progress}>{index + 1} / {ROUNDS}</Text>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(index / ROUNDS) * 100}%` as any }]} /></View>
        <Text style={[styles.timer, !reveal && secondsLeft <= 5 && { color: '#f44336' }]}>⏱ {Math.max(0, secondsLeft)}</Text>
        <TouchableOpacity disabled={reveal} onPress={() => setPaused(true)} style={[styles.pauseBtn, reveal && { opacity: 0.3 }]}>
          <View style={styles.pauseIconBar} />
          <View style={styles.pauseIconBar} />
        </TouchableOpacity>
      </View>

      <EarningsStrip
        goldTotal={goldEarned}
        goldDelta={goldDelta}
        animTrigger={animTrigger}
        accuracy={answeredCount > 0 ? Math.round((score / answeredCount) * 100) : null}
        combo={combo}
      />

      <Text style={styles.prompt}>{t('compass.prompt', { target: round.target.name })}</Text>
      <Text style={styles.fromLine}>{t('compass.fromLine', { from: round.from.name })}</Text>

      <View ref={boxRef} collapsable={false} style={[styles.mapBox, { width: SIZE, height: SIZE }]} {...pan.panHandlers}>
        <Animated.View style={{ width: SIZE, height: SIZE, opacity: reveal ? 1 : 0, transform: [{ translateX: panX }, { translateY: panY }, { scale: zoom }] }}>
        <Svg width={SIZE} height={SIZE} viewBox={`${base.x} ${base.y} ${base.w} ${base.w}`}>
          <MapPaths items={items} fromCode={round.from.cca2} targetCode={null} targetDx={0} sw={0.8 * (guessBox(round).w / SIZE)} />
          {reveal && (
            <G>
              <Path d={targetE.d} transform={[{ translateX: ox }]} fill="#4CAF50" fillOpacity={0.9} stroke="#3a4a7a" strokeWidth={0.8 * k} />
              <Line x1={fromE.c[0]} y1={fromE.c[1]} x2={tpos[0]} y2={tpos[1]} stroke="#4CAF50" strokeWidth={3 * k} strokeLinecap="round" />
              {guessEnd && <Line x1={fromE.c[0]} y1={fromE.c[1]} x2={guessEnd[0]} y2={guessEnd[1]} stroke="#4FC3F7" strokeWidth={3 * k} strokeDasharray={`${8 * k},${6 * k}`} strokeLinecap="round" />}
              <Circle cx={fromE.c[0]} cy={fromE.c[1]} r={5 * k} fill="#FFD700" stroke="#000" strokeWidth={k} />
              <Circle cx={tpos[0]} cy={tpos[1]} r={5 * k} fill="#4CAF50" stroke="#000" strokeWidth={k} />
            </G>
          )}
        </Svg>
        </Animated.View>

        {!reveal && (
          <Svg width={SIZE} height={SIZE} viewBox={`${box.x} ${box.y} ${box.w} ${box.w}`} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect x={box.x} y={box.y} width={box.w} height={box.w} fill="#0d1428" />
            <MapPaths items={guessItems} fromCode={round.from.cca2} targetCode={null} targetDx={0} sw={0.8 * k} />
          </Svg>
        )}

        {!reveal && (
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Circle cx={cx} cy={cy} r={R} fill="rgba(10,10,26,0.25)" stroke="#FFD700" strokeWidth={2} />
            {Array.from({ length: 36 }, (_, i) => i * 10).map(deg => {
              const major = deg % 90 === 0;
              const a = pt(deg, R), b = pt(deg, R - (major ? 12 : 6));
              return <Line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFD700" strokeWidth={major ? 2 : 1} strokeOpacity={major ? 1 : 0.6} />;
            })}
            {[0, 90, 180, 270].map((deg, i) => {
              const p = pt(deg, R + 13);
              return <SvgText key={deg} x={p.x} y={p.y + 5} fill="#fff" fontSize={14} fontWeight="bold" textAnchor="middle">{dirs[i]}</SvgText>;
            })}
            {angle != null && (() => {
              const tip = pt(angle, R - 4), l = pt(angle - 150, 14), r2 = pt(angle + 150, 14);
              return (
                <G>
                  <Line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="#4FC3F7" strokeWidth={4} strokeLinecap="round" />
                  <Path d={`M${tip.x},${tip.y} L${tip.x + (l.x - cx)},${tip.y + (l.y - cy)} L${tip.x + (r2.x - cx)},${tip.y + (r2.y - cy)} Z`} fill="#4FC3F7" />
                </G>
              );
            })()}
            <Circle cx={cx} cy={cy} r={5} fill="#FFD700" stroke="#000" strokeWidth={1} />
          </Svg>
        )}
      </View>

      {reveal ? (
        <View style={styles.footer}>
          <Text style={styles.verdictRow}>
            <Text style={{ color: verdictColor }}>{verdict}</Text>
            {diff != null && <Text style={styles.offBy}>{`  ·  ${t('compass.offBy', { deg: Math.round(diff) })}`}</Text>}
          </Text>
          <TouchableOpacity style={styles.readyBtn} onPress={next}>
            <Text style={styles.readyBtnText}>{index + 1 >= ROUNDS ? t('compass.finish') : t('compass.next')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <View style={styles.nudgeRow}>
            <TouchableOpacity style={styles.nudgeBtn} onPress={() => setAim((angleRef.current ?? 0) - 1)}><Text style={styles.nudgeText}>−1°</Text></TouchableOpacity>
            <Text style={styles.angleText}>{angle == null ? t('compass.hint') : `${angle}°`}</Text>
            <TouchableOpacity style={styles.nudgeBtn} onPress={() => setAim((angleRef.current ?? 0) + 1)}><Text style={styles.nudgeText}>+1°</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.readyBtn, angle == null && { opacity: 0.4 }]} disabled={angle == null} onPress={() => lockRound()}>
            <Text style={styles.readyBtnText}>{t('compass.confirm')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <QuitConfirmModal
        visible={showQuit}
        onStay={() => { setShowQuit(false); onConfirmQuitRef.current = null; }}
        onQuit={() => { setShowQuit(false); onConfirmQuitRef.current?.(); onConfirmQuitRef.current = null; }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center' },
  centered: { flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16, textAlign: 'center', padding: 24 },
  upgradeBtn: { marginTop: 12, backgroundColor: '#7B2FBE', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 },
  progress: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  barTrack: { flex: 1, height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  timer: { color: '#FFD700', fontSize: 15, fontWeight: 'bold', minWidth: 48, textAlign: 'right' },
  prompt: { color: '#fff', fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },
  fromLine: { color: '#888', fontSize: 13, marginTop: 2, marginBottom: 8 },
  mapBox: { backgroundColor: '#0d1428', borderRadius: 16, borderWidth: 1, borderColor: '#2a2a4e', overflow: 'hidden' },
  footer: { alignItems: 'center', paddingTop: 12, gap: 6 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nudgeBtn: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a4e', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  nudgeText: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },
  angleText: { color: '#4FC3F7', fontSize: 20, fontWeight: 'bold', minWidth: 110, textAlign: 'center' },
  verdictRow: { fontSize: 17, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 12, marginBottom: 4 },
  offBy: { color: '#fff', fontWeight: '600' },
  pauseBtn: { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  pauseTitle: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 20, marginTop: 20 },
  resumeBtn: { borderWidth: 2, borderColor: '#FFD700', paddingHorizontal: 36, paddingVertical: 13, borderRadius: 14 },
  resumeBtnText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  quitText: { color: '#555', fontSize: 14, fontWeight: '600', marginTop: 28 },
  pauseStopIt: { width: 140, height: 140, marginBottom: 12 },
  tiers: { alignSelf: 'stretch', backgroundColor: '#13132a', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a4e', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 28 },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  tierLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  tierDeg: { color: '#888', fontSize: 13, width: 52, textAlign: 'center' },
  tierReward: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'flex-end' },
  tierGold: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  tierXp: { color: '#b995ef', fontSize: 14, fontWeight: 'bold' },
  readyContainer: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyTitle: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  readyBtn: { backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  readyBtnText: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
});
