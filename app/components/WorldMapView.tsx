import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text as RNText, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Path, G, Text as SvgText, Line, Circle } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getMapFeatures } from '../lib/mapData';
import { fetchCountries, getCcn3ToCca2Map, getCca3ToCca2Map } from '../lib/countryData';

const AnimatedG = Animated.createAnimatedComponent(G) as any;
const AnimatedLine = Animated.createAnimatedComponent(Line) as any;

interface WorldMapViewProps {
  ownedCountries: string[];
  focusCountry?: string; // a cca2 code
  height?: number;
  interactive?: boolean;
  showNames?: boolean;
  resetKey?: number;
  zoomToFocusCountry?: boolean;
  focusScaleOverride?: number;
  trailPath?: string[]; // ordered cca2 list for drawing a visible route
  trailColor?: string;
}

const OWNED_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6EC7',
  '#FF8C42', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#82E0AA', '#85C1E9', '#F1948A', '#BB8FCE',
  '#73C6B6', '#F0B27A', '#AED6F1', '#D7BDE2', '#A3E4D7',
  '#FAD7A0', '#A9CCE3', '#D5F5E3', '#FADBD8', '#D6EAF8',
];

function getCountryColor(cca2: string): string {
  let hash = 0;
  for (let i = 0; i < cca2.length; i++) {
    hash = (hash * 31 + cca2.charCodeAt(i)) % OWNED_COLORS.length;
  }
  return OWNED_COLORS[Math.abs(hash)];
}

const VIEWBOX_W = 800;
const VIEWBOX_H = 600;
const screenW = Dimensions.get('window').width;
const RATIO = VIEWBOX_W / screenW;
const FOCUS_ANIMATION_MS = 520;

const CountryLabel = React.memo(({ f, showNames }: { f: any, showNames: boolean }) => {
  const [cx, cy] = f.centroid || [0, 0];
  const bounds = f.bounds;

  if (!showNames || !f.centroid || Number.isNaN(cx) || !bounds) return null;

  const dx = bounds[1][0] - bounds[0][0];
  const dy = bounds[1][1] - bounds[0][1];
  const sizeProxy = Math.max(dx, dy);
  
  // Scale text from 1.2pt up to 7pt max, so tiny countries have tiny text 
  // when zoomed out, but become readable when deeply zooming in.
  const dynamicSize = Math.max(1.2, Math.min(7, sizeProxy * 0.08));

  // Multiply by 10 and scale down to avoid native Android/iOS font kerning rounding errors on tiny fonts
  const renderSize = Math.round(dynamicSize * 10);

  return (
    <G transform={`translate(${cx}, ${cy}) scale(0.1)`}>
      <SvgText
        x={0}
        y={0}
        fill="#fff"
        fontSize={renderSize}
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
        opacity={0.9}
      >
        {f.name}
      </SvgText>
    </G>
  );
});

function AnimatedTrailSegment({
  from,
  to,
  index,
  progress,
  color,
}: {
  from: [number, number];
  to: [number, number];
  index: number;
  progress: { value: number };
  color: string;
}) {
  const length = Math.max(1, Math.hypot(to[0] - from[0], to[1] - from[1]));
  const animatedProps = useAnimatedProps(() => {
    const segmentProgress = Math.max(0, Math.min(1, progress.value - index));
    const strokeDashoffset = length * (1 - segmentProgress);
    return {
      strokeDasharray: `${length} ${length}`,
      strokeDashoffset,
      opacity: segmentProgress > 0 ? 0.88 : 0,
    };
  });

  return (
    <AnimatedLine
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

export default function WorldMapView({
  ownedCountries,
  focusCountry,
  height = 200,
  interactive = true,
  showNames = true,
  resetKey,
  zoomToFocusCountry = true,
  focusScaleOverride,
  trailPath = [],
  trailColor = '#6BCBFF',
}: WorldMapViewProps) {
  const [loading, setLoading] = useState(true);
  const [nameToCca2Map, setNameToCca2Map] = useState<Record<string, string>>({});

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const trailDrawProgress = useSharedValue(0);

  // Load features safely
  const features = useMemo(() => {
    try {
      return getMapFeatures();
    } catch (e) {
      console.warn('Failed to parse map features', e);
      return [];
    }
  }, []);

  // Memoize owned set — only rebuilt when ownedCountries changes
  const ownedSet = useMemo(() => new Set(ownedCountries), [ownedCountries]);
  const trailPathSafe = useMemo(
    () => (trailPath || []).filter((code) => !!code && typeof code === 'string'),
    [trailPath],
  );
  const trailSet = useMemo(() => new Set(trailPathSafe), [trailPathSafe]);

  // Memoize CCA2 lookups for all features — recomputed only when features/nameToCca2Map changes
  const featureCca2List = useMemo(() => {
    if (!features) return [];
    const ccn3Map = getCcn3ToCca2Map();
    const cca3Map = getCca3ToCca2Map();
    return (features as any[]).map((f: any) =>
      ccn3Map[f.rawFeature.id] || cca3Map[f.rawFeature.id] || nameToCca2Map[f.name] || ''
    );
  }, [features, nameToCca2Map]);

  const centroidByCca2 = useMemo(() => {
    const out: Record<string, [number, number]> = {};
    (features as any[]).forEach((f: any, i: number) => {
      const cca2 = featureCca2List[i];
      const c = f?.centroid;
      if (!cca2 || !c || Number.isNaN(c[0]) || Number.isNaN(c[1])) return;
      out[cca2] = [c[0], c[1]];
    });
    return out;
  }, [features, featureCca2List]);

  const trailSegments = useMemo(() => {
    const segments: { from: [number, number]; to: [number, number] }[] = [];
    for (let i = 1; i < trailPathSafe.length; i++) {
      const from = centroidByCca2[trailPathSafe[i - 1]];
      const to = centroidByCca2[trailPathSafe[i]];
      if (!from || !to) continue;
      segments.push({ from, to });
    }
    return segments;
  }, [trailPathSafe, centroidByCca2]);

  useEffect(() => {
    const target = trailSegments.length;
    if (target <= 0) {
      trailDrawProgress.value = 0;
      return;
    }

    if (target > trailDrawProgress.value) {
      trailDrawProgress.value = withTiming(target, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    trailDrawProgress.value = target;
  }, [trailSegments.length, trailDrawProgress]);

  useEffect(() => {
    // We must ensure countries are fetched so maps are populated
    fetchCountries().then((countries) => {
      // Build a fallback map from Country common names to CCA2
      const fallback: Record<string, string> = {};
      countries.forEach((c) => {
        fallback[c.name] = c.cca2;
      });
      setNameToCca2Map(fallback);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      if (focusCountry && zoomToFocusCountry) {
        const fIdx = featureCca2List.findIndex((cca2: string) => cca2 === focusCountry);
        const f = fIdx >= 0 ? (features || [])[fIdx] : undefined;
        if (f && f.bounds && f.centroid && !Number.isNaN(f.centroid[0])) {
          const [[xmin, ymin], [xmax, ymax]] = f.bounds;
          const dx = xmax - xmin;
          const dy = ymax - ymin;

          // Scale so the country occupies the center 1/9 of a 3×3 grid (1/3 width, 1/3 height).
          // Antimeridian countries (e.g. Russia) have inflated bounding boxes — use a fixed zoom.
          let s: number;
          if (typeof focusScaleOverride === 'number' && Number.isFinite(focusScaleOverride)) {
            s = Math.min(Math.max(focusScaleOverride, 1), 12);
          } else if (dx > VIEWBOX_W * 0.7) {
            s = 1.5;
          } else {
            s = (1 / 3) / Math.max(dx / VIEWBOX_W, dy / VIEWBOX_H);
            // Cap scale so micro-states don't get an extreme zoom
            if (s > 12) s = 12;
            if (s < 1) s = 1;
          }

          const [cx, cy] = f.centroid;
          let tx = s * (400 - cx);
          let ty = s * (300 - cy);

          const boundX = (s - 1) * (VIEWBOX_W / 2);
          const boundY = (s - 1) * (VIEWBOX_H / 2);
          tx = Math.min(Math.max(tx, -boundX), boundX);
          ty = Math.min(Math.max(ty, -boundY), boundY);

          scale.value = withTiming(s, { duration: FOCUS_ANIMATION_MS, easing: Easing.out(Easing.cubic) });
          translateX.value = withTiming(tx, { duration: FOCUS_ANIMATION_MS, easing: Easing.out(Easing.cubic) });
          translateY.value = withTiming(ty, { duration: FOCUS_ANIMATION_MS, easing: Easing.out(Easing.cubic) });
          savedScale.value = s;
          savedTranslateX.value = tx;
          savedTranslateY.value = ty;
        } else {
          // Country not found in GeoJSON — reset to world view
          scale.value = 1;
          translateX.value = 0;
          translateY.value = 0;
          savedScale.value = 1;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }
      } else {
        // Reset to world view
        scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        translateX.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    }
  }, [loading, focusCountry, zoomToFocusCountry, focusScaleOverride, featureCca2List, features]);

  useEffect(() => {
    if (!loading && resetKey !== undefined) {
      scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      translateX.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [resetKey]);

  const canInteract = interactive && (!focusCountry || !zoomToFocusCountry);

  const pinch = Gesture.Pinch()
    .enabled(canInteract)
    .onUpdate((e) => {
      const s = Math.min(Math.max(savedScale.value * e.scale, 1), 20); // Min zoom is 1
      scale.value = s;
      
      const boundX = (s - 1) * (VIEWBOX_W / 2);
      const boundY = (s - 1) * (VIEWBOX_H / 2);
      
      translateX.value = Math.min(Math.max(translateX.value, -boundX), boundX);
      translateY.value = Math.min(Math.max(translateY.value, -boundY), boundY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .enabled(canInteract)
    .onUpdate((e) => {
      // Scale translation uniformly by RATIO so 1 pixel of user finger movement maps perfectly to the map
      const tx = savedTranslateX.value + (e.translationX * RATIO);
      const ty = savedTranslateY.value + (e.translationY * RATIO);
      
      const boundX = (scale.value - 1) * (VIEWBOX_W / 2);
      const boundY = (scale.value - 1) * (VIEWBOX_H / 2);
      
      translateX.value = Math.min(Math.max(tx, -boundX), boundX);
      translateY.value = Math.min(Math.max(ty, -boundY), boundY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  // useAnimatedProps with `matrix` avoids the Android ClassCastException caused by
  // passing a String to a native prop that expects ReadableArray. The `matrix` prop
  // takes [a,b,c,d,e,f] where the transform is: x'=s*x+e, y'=s*y+f.
  // At tx=ty=0 this scales around the viewbox center (400,300).
  const animatedProps = useAnimatedProps(() => {
    const s = scale.value;
    const tx = translateX.value;
    const ty = translateY.value;
    const e = tx + 400 * (1 - s);
    const f = ty + 300 * (1 - s);
    return { matrix: [s, 0, 0, s, e, f] };
  });

  if (loading) {
    return (
      <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#FFD700" />
        <RNText style={{ color: '#555', marginTop: 8 }}>Loading High-Res Map...</RNText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <GestureDetector gesture={composed}>
        <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
          <Svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <AnimatedG animatedProps={animatedProps}>
              {(features || []).map((f: any, i: number) => {
                const cca2 = featureCca2List[i] || '';
                const isOwn = ownedSet.has(cca2);
                const isFoc = cca2 === focusCountry;

                const fillColor = isFoc
                  ? '#FFD700'
                  : (isOwn ? getCountryColor(cca2) : '#1a1a2e');

                const fillOpacity = isFoc ? 0.475 : (isOwn ? 0.75 : 0.35);
                const color = isFoc ? '#FFD700' : '#7a7a9c';
                const weight = isFoc ? 1.25 : 0.25;

                return (
                  <Path
                    key={`path-${f.name}`}
                    d={f.d}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    stroke={color}
                    strokeWidth={weight}
                  />
                );
              })}

              {/* Trail route overlay */}
              {trailSegments.map((segment, i) => (
                <AnimatedTrailSegment
                  key={`trail-segment-${i}`}
                  from={segment.from}
                  to={segment.to}
                  index={i}
                  progress={trailDrawProgress}
                  color={trailColor}
                />
              ))}
              {trailPathSafe.map((code, i) => {
                const pt = centroidByCca2[code];
                if (!pt) return null;
                const isCurrent = code === focusCountry;
                return (
                  <Circle
                    key={`trail-node-${code}-${i}`}
                    cx={pt[0]}
                    cy={pt[1]}
                    r={isCurrent ? 2.2 : 1.4}
                    fill={isCurrent ? '#FFD700' : trailColor}
                    opacity={isCurrent ? 0.6 : 0.88}
                  />
                );
              })}

              {/* Render labels on top of all paths only when enabled */}
              {showNames
                ? (features || []).map((f: any, i: number) => {
                    const cca2 = featureCca2List[i] || '';
                    const isOwn = ownedSet.has(cca2);
                    const isFoc = cca2 === focusCountry;
                    const isTrail = trailSet.has(cca2);

                    if (isOwn || isFoc || isTrail) {
                      return <CountryLabel key={`lbl-${f.name}`} f={f} showNames={showNames} />;
                    }
                    return null;
                  })
                : null}
            </AnimatedG>
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#0a0a1a' },
});
