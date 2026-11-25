import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { geoMercator, geoPath } from 'd3-geo';
import { mesh } from 'topojson-client';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { QuizStackParamList, Country, cca2ToFlagEmoji } from '../types';
import { fetchCountries, getCca3ToCca2Map } from '../lib/countryData';
import { hasCountryShape, A2_TO_NUM, ANTIMERIDIAN_IDS, getFeatureForNumericId, normalizeGeometry } from '../components/CountryShapeView';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { DEV_MODE } from '../lib/devMode';
import { t, useLocale } from '../lib/i18n';
import { filterQuizCountries } from '../lib/quizCountryFilters';
import { playDing, playWrong } from '../lib/audio';
import AvatarDisplay from '../components/AvatarDisplay';
import QuitConfirmModal from '../components/QuitConfirmModal';

const IMG_GOLD_COIN = require('../../assets/avatars/gold_coin.png');
const IMG_GOLD_MEDAL = require('../../assets/avatars/gold_medal.png');
const IMG_SILVER_MEDAL = require('../../assets/avatars/silver_medal.png');
const IMG_BRONZE_MEDAL = require('../../assets/avatars/bronze_medal.png');
const IMG_BORDER = require('../../assets/avatars/border_drawing_quiz.png');
const IMG_SKULL = require('../../assets/avatars/skull.png');

import worldAtlas from '../assets/map/countries-50m.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_HEIGHT = 300;
const MIN_AREA = 5_000;    // km² — skip micro-states and very small countries
const MAX_AREA_RATIO = 25; // skip pairs where one country is vastly larger than the other

type Rating = 'perfect' | 'great' | 'good' | 'close' | 'miss';

const RATING_GOLD: Record<Rating, number> = { perfect: 100, great: 75, good: 50, close: 25, miss: 0 };
const RATING_COLOR: Record<Rating, string> = { perfect: '#FFD700', great: '#FFA500', good: '#B0C4DE', close: '#CD7F32', miss: '#f44336' };
const RATING_IMG: Record<Rating, any> = { perfect: IMG_GOLD_MEDAL, great: IMG_GOLD_MEDAL, good: IMG_SILVER_MEDAL, close: IMG_BRONZE_MEDAL, miss: IMG_SKULL };
function getRatingLabel(r: Rating) {
  const key = r === 'perfect' ? 'ratingPerfect' : r === 'great' ? 'ratingGreat' : r === 'good' ? 'ratingGood' : r === 'close' ? 'ratingClose' : 'ratingMiss';
  return t(`drawQuiz.${key}` as any);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawPair { countryA: Country; countryB: Country; }

type Props = { navigation: StackNavigationProp<QuizStackParamList, 'BorderDrawQuiz'>; };

// ─── Geo helpers ──────────────────────────────────────────────────────────────

function buildCombinedData(cca2A: string, cca2B: string, cw: number, ch: number) {
  const numA = A2_TO_NUM[cca2A];
  const numB = A2_TO_NUM[cca2B];
  if (!numA || !numB) return null;

  let featA = getFeatureForNumericId(numA);
  let featB = getFeatureForNumericId(numB);
  if (!featA || !featB) return null;

  if (ANTIMERIDIAN_IDS.has(numA)) featA = normalizeGeometry(featA);
  if (ANTIMERIDIAN_IDS.has(numB)) featB = normalizeGeometry(featB);

  const combined = { type: 'FeatureCollection', features: [featA, featB] };
  const padding = 24;
  const projection = geoMercator().fitExtent(
    [[padding, padding], [cw - padding, ch - padding]],
    combined as any,
  );
  const pathGen = geoPath().projection(projection);

  const topo = worldAtlas as any;
  const sharedGeo = mesh(topo, topo.objects.countries, (a: any, b: any) => {
    const aId = String(a.id);
    const bId = String(b.id);
    return (aId === numA && bId === numB) || (aId === numB && bId === numA);
  });

  const borderPoints: [number, number][] = [];
  const sharedGeoAny = sharedGeo as any;
  if (sharedGeoAny?.coordinates?.length) {
    const flatten = (line: number[][]) => line.forEach((c) => {
      const pt = projection(c as [number, number]);
      if (pt) borderPoints.push(pt as [number, number]);
    });
    if (sharedGeoAny.type === 'LineString') flatten(sharedGeoAny.coordinates);
    else if (sharedGeoAny.type === 'MultiLineString') sharedGeoAny.coordinates.forEach(flatten);
  }

  return {
    pathA: pathGen(featA) ?? '',
    pathB: pathGen(featB) ?? '',
    borderSvgPath: borderPoints.length ? (pathGen(sharedGeo as any) ?? null) : null,
    borderPoints,
  };
}

const TIER_ORDER: Rating[] = ['perfect', 'great', 'good', 'close', 'miss'];

function scoreStroke(userPts: [number, number][], borderPts: [number, number][], diagonal: number): Rating {
  if (userPts.length < 3 || borderPts.length === 0) return 'miss';

  const averageMinDistance = (fromPts: [number, number][], toPts: [number, number][]) => {
    let total = 0;
    for (const [fx, fy] of fromPts) {
      let minD = Infinity;
      for (const [tx, ty] of toPts) {
        const d = Math.sqrt((fx - tx) ** 2 + (fy - ty) ** 2);
        if (d < minD) minD = d;
      }
      total += minD;
    }
    return total / fromPts.length;
  };

  // Accuracy: average min-distance from each user point to the border.
  let totalDist = 0;
  for (const [ux, uy] of userPts) {
    let minD = Infinity;
    for (const [bx, by] of borderPts) {
      const d = Math.sqrt((ux - bx) ** 2 + (uy - by) ** 2);
      if (d < minD) minD = d;
    }
    totalDist += minD;
  }
  const norm = (totalDist / userPts.length) / diagonal;
  const borderNorm = averageMinDistance(borderPts, userPts) / diagonal;

  // Coverage: fraction of border points "touched" by the stroke
  const coverageThreshold = diagonal * 0.045;
  let covered = 0;
  for (const [bx, by] of borderPts) {
    let minD = Infinity;
    for (const [ux, uy] of userPts) {
      const d = Math.sqrt((ux - bx) ** 2 + (uy - by) ** 2);
      if (d < minD) minD = d;
    }
    if (minD < coverageThreshold) covered++;
  }
  const coverageRatio = covered / borderPts.length;

  // Base tier from accuracy
  let idx: number;
  if (norm < 0.01) idx = 0;        // perfect
  else if (norm < 0.022) idx = 1;  // great
  else if (norm < 0.045) idx = 2;  // good
  else if (norm < 0.075) idx = 3;  // close
  else return 'miss';

  // Penalise short strokes and sloppy coverage.
  if (borderNorm > 0.08) return 'miss';
  if (borderNorm > 0.055 || coverageRatio < 0.55) idx = Math.min(idx + 2, TIER_ORDER.length - 1);
  else if (borderNorm > 0.035 || coverageRatio < 0.80) idx = Math.min(idx + 1, TIER_ORDER.length - 1);

  return TIER_ORDER[idx];
}

function ptsToPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  return `M${pts[0][0]},${pts[0][1]}` + pts.slice(1).map(([x, y]) => `L${x},${y}`).join('');
}

// ─── Pair builder ─────────────────────────────────────────────────────────────

async function buildPairs(count: number): Promise<DrawPair[]> {
  const countries = filterQuizCountries(await fetchCountries());
  const cca3Map = getCca3ToCca2Map();
  const topo = worldAtlas as any;
  const pairs: DrawPair[] = [];
  const used = new Set<string>();

  const shuffled = [...countries].sort(() => Math.random() - 0.5);
  for (const country of shuffled) {
    if (pairs.length >= count) break;
    if (!country.borders?.length || !hasCountryShape(country.cca2)) continue;
    if ((country.area ?? 0) < MIN_AREA) continue;
    const numA = A2_TO_NUM[country.cca2];
    if (!numA) continue;

    const neighborCca3s = [...country.borders].sort(() => Math.random() - 0.5);
    for (const nCca3 of neighborCca3s) {
      const nCca2 = cca3Map[nCca3];
      if (!nCca2 || !hasCountryShape(nCca2)) continue;
      const numB = A2_TO_NUM[nCca2];
      if (!numB) continue;

      const neighbor = countries.find((c) => c.cca2 === nCca2);
      if (!neighbor || (neighbor.area ?? 0) < MIN_AREA) continue;
      const areaA = country.area ?? 1;
      const areaB = neighbor.area ?? 1;
      if (Math.max(areaA, areaB) / Math.min(areaA, areaB) > MAX_AREA_RATIO) continue;

      const key = [numA, numB].sort().join('-');
      if (used.has(key)) continue;

      const shared = mesh(topo, topo.objects.countries, (a: any, b: any) => {
        const aId = String(a.id);
        const bId = String(b.id);
        return (aId === numA && bId === numB) || (aId === numB && bId === numA);
      });
      if (!shared?.coordinates?.length) continue;

      used.add(key);
      pairs.push({ countryA: country, countryB: neighbor });
      break;
    }
  }
  return pairs;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BorderDrawQuizScreen({ navigation }: Props) {
  // Subscribe to locale changes so the ready screen and quiz labels update immediately.
  useLocale();
  const { addGold } = useGame();
  const { profile, unlockedItems, loading, effectiveMaxTurns } = useAuth();
  const ROUND_COUNT = useRef(effectiveMaxTurns).current;
  const quizStartRef = useRef(0);

  const [phase, setPhase] = useState<'loading' | 'error' | 'ready' | 'quiz'>('loading');
  const [pairs, setPairs] = useState<DrawPair[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<Rating | null>(null);
  const [userPoints, setUserPoints] = useState<[number, number][]>([]);
  const [paused, setPaused] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(320);
  const [totalGold, setTotalGold] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [goldRatings, setGoldRatings] = useState(0); // questions rated top-3 tier
  const ratingScale = useRef(new Animated.Value(0)).current;
  const allowLeaveRef = useRef(false);
  const onConfirmQuitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!DEV_MODE && !unlockedItems.has('upgrade_border_draw')) {
      navigation.replace('QuizMenu');
      return;
    }
    buildPairs(ROUND_COUNT)
      .then((p) => {
        if (p.length < ROUND_COUNT) {
          setPhase('error');
        } else {
          setPairs(p);
          setPhase('ready');
        }
      })
      .catch(() => setPhase('error'));
  }, [loading, unlockedItems.has('upgrade_border_draw'), navigation]);

  useFocusEffect(
    React.useCallback(() => {
      const parent = navigation.getParent();
      if (!parent) return;
      const unsubscribe = (parent as any).addListener('tabPress', (e: any) => {
        if (phase !== 'quiz') return;
        e.preventDefault();
        onConfirmQuitRef.current = () => {
          allowLeaveRef.current = true;
          navigation.popToTop();
        };
        setShowQuitModal(true);
      });
      return unsubscribe;
    }, [navigation, phase])
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || phase !== 'quiz') return;
      e.preventDefault();
      onConfirmQuitRef.current = () => {
        allowLeaveRef.current = true;
        navigation.dispatch(e.data.action);
      };
      setShowQuitModal(true);
    });
    return unsub;
  }, [navigation, phase]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setUserPoints([[locationX, locationY]]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setUserPoints((pts) => [...pts, [locationX, locationY]]);
      },
    })
  ).current;

  function handleSubmit() {
    if (submitted) return;
    const pair = pairs[qIndex];
    const data = buildCombinedData(pair.countryA.cca2, pair.countryB.cca2, canvasWidth, CANVAS_HEIGHT);
    const diagonal = Math.sqrt(canvasWidth ** 2 + CANVAS_HEIGHT ** 2);
    const r = data ? scoreStroke(userPoints, data.borderPoints, diagonal) : 'miss';
    const gold = RATING_GOLD[r];

    const xp = Math.round(gold / 2);
    setRating(r);
    setSubmitted(true);
    setTotalGold((g) => g + gold);
    setTotalXP((x) => x + xp);
    if (r === 'perfect' || r === 'great' || r === 'good') setGoldRatings((n) => n + 1);
    addGold(gold);

    Haptics.impactAsync(r === 'miss' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
    if (r === 'miss') {
      playWrong();
    } else {
      playDing();
    }

    Animated.spring(ratingScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
  }

  function handleNext() {
    const nextIndex = qIndex + 1;
    if (nextIndex >= ROUND_COUNT) {
      allowLeaveRef.current = true;
      navigation.replace('QuizResults', {
        score: goldRatings,
        total: ROUND_COUNT,
        goldEarned: totalGold,
        quizType: 'draw',
        xpOverride: totalXP,
        elapsedSeconds: Math.floor((Date.now() - quizStartRef.current) / 1000),
      });
      return;
    }
    ratingScale.setValue(0);
    setQIndex(nextIndex);
    setSubmitted(false);
    setRating(null);
    setUserPoints([]);
  }

  function confirmQuit() {
    setShowQuitModal(false);
    onConfirmQuitRef.current?.();
    onConfirmQuitRef.current = null;
  }

  function quitFromPause() {
    allowLeaveRef.current = true;
    navigation.goBack();
  }

  if (phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('drawQuiz.loading')}</Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('drawQuiz.error')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('quizCommon.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'ready') {
    return (
      <View style={styles.readyContainer}>
        <Image source={IMG_BORDER} style={styles.readyIcon} resizeMode="contain" />
        <Text style={styles.readyTitle}>{t('drawQuiz.title')}</Text>
        <Text style={styles.readySubtitle}>{t('drawQuiz.subtitle')}{'\n'}{t('drawQuiz.round', { current: 1, total: ROUND_COUNT })}</Text>
        <TouchableOpacity style={styles.readyBtn} onPress={() => { quizStartRef.current = Date.now(); setPhase('quiz'); }}>
          <Text style={styles.readyBtnText}>{t('quizCommon.letsGo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={styles.goBackText}>{t('quizCommon.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Quiz phase ─────────────────────────────────────────────────────────────
  const pair = pairs[qIndex];
  const geoData = buildCombinedData(pair.countryA.cca2, pair.countryB.cca2, canvasWidth, CANVAS_HEIGHT);
  const userStrokePath = ptsToPath(userPoints);

  return (
    <View style={styles.container}>
      {paused && (
        <View style={[StyleSheet.absoluteFill, styles.pauseOverlay]}>
          <Image source={require('../../assets/avatars/stop_it.png')} style={styles.pauseStopIt} resizeMode="contain" />
          <Text style={styles.pauseTitle}>{t('quizCommon.paused')}</Text>
          <TouchableOpacity onPress={() => setPaused(false)} style={styles.resumeBtn}>
            <Text style={styles.resumeText}>{t('quizCommon.resume')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={quitFromPause} style={{ marginTop: 16 }}>
            <Text style={{ color: '#f44336', fontWeight: 'bold' }}>{t('quizCommon.quit')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progress}>{qIndex + 1} / {ROUND_COUNT}</Text>
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(qIndex / ROUND_COUNT) * 100}%` as any }]} />
          </View>
          {profile?.avatar_emoji ? (
            <View style={[styles.progressAvatarWrap, { left: `${(qIndex / ROUND_COUNT) * 100}%` as any }]}>
              <AvatarDisplay avatarId={profile.avatar_emoji} avatarFlag={profile.avatar_flag ?? undefined} size={22} isConqueror={profile.is_conquerer ?? false} />
            </View>
          ) : null}
        </View>
        <View style={styles.goldRow}>
          <Image source={IMG_GOLD_COIN} style={styles.goldIcon} resizeMode="contain" />
        <Text style={styles.goldText}>{totalGold}</Text>
        <TouchableOpacity onPress={() => !submitted && setPaused(true)} style={[styles.pauseBtn, submitted && { opacity: 0.35 }]} disabled={submitted} accessibilityRole="button" accessibilityLabel={t('quizCommon.paused')}>
          <View style={styles.pauseIconBar} />
          <View style={styles.pauseIconBar} />
        </TouchableOpacity>
      </View>
      </View>

      {/* Country labels */}
      <View style={styles.countriesRow}>
        <View style={styles.countryCard}>
          <Text style={styles.countryFlag}>{cca2ToFlagEmoji(pair.countryA.cca2)}</Text>
          <Text style={styles.countryName} numberOfLines={2}>{pair.countryA.name}</Text>
        </View>
        <View style={styles.dividerCol}>
          <View style={styles.dividerLine} />
          <Image source={IMG_BORDER} style={styles.vsIcon} resizeMode="contain" />
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.countryCard}>
          <Text style={styles.countryFlag}>{cca2ToFlagEmoji(pair.countryB.cca2)}</Text>
          <Text style={styles.countryName} numberOfLines={2}>{pair.countryB.name}</Text>
        </View>
      </View>

      <Text style={styles.prompt}>
        {submitted ? t('drawQuiz.revealPrompt') : t('drawQuiz.drawPrompt')}
      </Text>

      {/* Canvas */}
      <View
        style={styles.canvasWrapper}
        onLayout={(e) => setCanvasWidth(e.nativeEvent.layout.width)}
      >
        <Svg width={canvasWidth} height={CANVAS_HEIGHT}>
          {geoData?.pathA && geoData?.pathB ? (
            <SvgPath d={`${geoData.pathA} ${geoData.pathB}`} fill="#FFD700" stroke="none" fillRule="nonzero" />
          ) : null}
          {/* User stroke */}
          {userStrokePath ? (
            <SvgPath
              d={userStrokePath}
              stroke={submitted ? '#FF7043' : '#fff'}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
          {/* Revealed border */}
          {submitted && geoData?.borderSvgPath ? (
            <SvgPath
              d={geoData.borderSvgPath}
              stroke="#4CAF50"
              strokeWidth={3.5}
              strokeDasharray="8,5"
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </Svg>

        {/* Touch capture layer - only when drawing */}
        {!submitted && (
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        )}
      </View>

      {/* Rating badge — below canvas so it never covers the border comparison */}
      {submitted && rating ? (
        <Animated.View style={[styles.ratingBadge, { transform: [{ scale: ratingScale }] }]}>
          <Image source={RATING_IMG[rating]} style={styles.ratingIcon} resizeMode="contain" />
          <Text style={[styles.ratingText, { color: RATING_COLOR[rating] }]}>
            {getRatingLabel(rating)}
          </Text>
          <View style={styles.ratingGoldRow}>
            <Text style={styles.ratingGold}>+{RATING_GOLD[rating]}</Text>
            <Image source={IMG_GOLD_COIN} style={styles.ratingGoldIcon} resizeMode="contain" />
          </View>
        </Animated.View>
      ) : null}

      {/* Legend */}
      {submitted && geoData?.borderSvgPath ? (
        <View style={styles.legend}>
          <Text style={styles.legendItem}>— <Text style={{ color: '#4CAF50' }}>{t('drawQuiz.actualBorder')}</Text></Text>
          <Text style={styles.legendItem}>— <Text style={{ color: '#FF7043' }}>{t('drawQuiz.yourStroke')}</Text></Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actions}>
        {!submitted ? (
          <>
            <TouchableOpacity
              style={[styles.clearBtn, userPoints.length === 0 && { opacity: 0.3 }]}
              onPress={() => setUserPoints([])}
              disabled={userPoints.length === 0}
            >
              <Text style={styles.clearBtnText}>{t('drawQuiz.clear')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, userPoints.length < 3 && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={userPoints.length < 3}
            >
              <Text style={styles.submitBtnText}>{t('drawQuiz.submit')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {qIndex + 1 >= ROUND_COUNT ? t('drawQuiz.seeResults') : t('drawQuiz.next')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <QuitConfirmModal
        visible={showQuitModal}
        onStay={() => { setShowQuitModal(false); onConfirmQuitRef.current = null; }}
        onQuit={confirmQuit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  centered: { flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 15, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 },
  progress: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  progressBarWrapper: { flex: 1, height: 22, justifyContent: 'center' },
  progressTrack: { height: 4, backgroundColor: '#1a1a2e', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 2 },
  progressAvatarWrap: { position: 'absolute', top: 0, marginLeft: -11 },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goldIcon: { width: 18, height: 18 },
  goldText: { color: '#FFD700', fontWeight: 'bold', fontSize: 14 },
  pauseBtn: { flexDirection: 'row', gap: 3, alignItems: 'center', padding: 6 },
  pauseIconBar: { width: 4, height: 14, backgroundColor: '#FFD700', borderRadius: 2 },
  pauseOverlay: { backgroundColor: '#0a0a1a', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60, zIndex: 100 },
  pauseStopIt: { width: 140, height: 140, marginBottom: 12 },
  pauseTitle: { color: '#FFD700', fontSize: 32, fontWeight: 'bold', letterSpacing: 4, marginBottom: 20, marginTop: 20 },
  resumeBtn: { backgroundColor: '#FFD700', paddingHorizontal: 42, paddingVertical: 14, borderRadius: 14 },
  resumeText: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold' },

  countriesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  countryCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 6, backgroundColor: '#111128', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4e' },
  countryFlag: { fontSize: 28 },
  countryName: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  dividerCol: { alignItems: 'center', gap: 4 },
  dividerLine: { width: 1, height: 18, backgroundColor: '#2a2a4e' },
  vsIcon: { width: 24, height: 24 },

  prompt: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },

  canvasWrapper: {
    marginHorizontal: 16,
    height: CANVAS_HEIGHT,
    backgroundColor: '#111128',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
  },

  ratingBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111128',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  ratingIcon: { width: 28, height: 28 },
  ratingText: { fontSize: 20, fontWeight: 'bold' },
  ratingGoldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingGold: { color: '#FFD700', fontSize: 14, fontWeight: '600' },
  ratingGoldIcon: { width: 16, height: 16 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 8 },
  legendItem: { color: '#666', fontSize: 12 },

  actions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  clearBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  clearBtnText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  submitBtn: { flex: 2, backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 15 },
  nextBtn: { flex: 1, backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },

  backBtn: { borderWidth: 1, borderColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: '#FFD700', fontWeight: 'bold' },

  readyContainer: { flex: 1, backgroundColor: '#0a0a1a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  readyIcon: { width: 64, height: 64, marginBottom: 16 },
  readyTitle: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', letterSpacing: 3, marginBottom: 12 },
  readySubtitle: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  readyBtn: { backgroundColor: '#FFD700', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 14 },
  readyBtnText: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold', letterSpacing: 1.5 },
  goBackText: { color: '#555', fontSize: 14 },
});
