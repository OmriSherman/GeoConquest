import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text as RNText, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { getMapFeatures } from '../lib/mapData';
import { fetchCountries, getCcn3ToCca2Map, getCca3ToCca2Map } from '../lib/countryData';

const AnimatedG = Animated.createAnimatedComponent(G) as any;

interface WorldMapViewProps {
  ownedCountries: string[];
  focusCountry?: string; // a cca2 code
  height?: number;
  interactive?: boolean;
  showNames?: boolean;
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

export default function WorldMapView({
  ownedCountries,
  focusCountry,
  height = 200,
  interactive = true,
  showNames = true,
}: WorldMapViewProps) {
  const [loading, setLoading] = useState(true);
  const [nameToCca2Map, setNameToCca2Map] = useState<Record<string, string>>({});

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Load features safely
  const features = useMemo(() => {
    try {
      return getMapFeatures();
    } catch (e) {
      console.warn('Failed to parse map features', e);
      return [];
    }
  }, []);

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

  const getCountryCca2 = (featureId: string, featureName: string) => {
    const ccn3Map = getCcn3ToCca2Map();
    const cca3Map = getCca3ToCca2Map();
    // Some features use strings like "716", some might use "ZWE" (CCA3/A3), some rely on name fallback
    return ccn3Map[featureId] || cca3Map[featureId] || nameToCca2Map[featureName] || '';
  };

  useEffect(() => {
    if (!loading) {
      if (focusCountry) {
        // Find feature
        const f = (features || []).find(
          (feat: any) => getCountryCca2(feat.rawFeature.id, feat.name) === focusCountry
        );
        if (f && f.bounds) {
          const [[xmin, ymin], [xmax, ymax]] = f.bounds;
          const dx = xmax - xmin;
          const dy = ymax - ymin;
          // compute scale so it fits nicely
          let s = 1.0 / Math.max(dx / VIEWBOX_W, dy / VIEWBOX_H);
          // clamp to a reasonable max zoom
          if (s > 10) s = 10;
          if (s < 1) s = 1;

          // compute center translation
          const cx = (xmin + xmax) / 2;
          const cy = (ymin + ymax) / 2;

          // Our styling centers scaling via VIEWBOX_W/2, so tx just needs to move cx to the center
          let tx = VIEWBOX_W / 2 - cx;
          let ty = VIEWBOX_H / 2 - cy;

          // Pre-clamp tx and ty so the initial zoom-in doesn't fly out of bounds
          // Which would cause onUpdate to glitch when the user first touches it
          const boundX = (s - 1) * (VIEWBOX_W / 2);
          const boundY = (s - 1) * (VIEWBOX_H / 2);
          tx = Math.min(Math.max(tx, -boundX), boundX);
          ty = Math.min(Math.max(ty, -boundY), boundY);

          scale.value = withTiming(s, { duration: 600, easing: Easing.out(Easing.cubic) });
          translateX.value = withTiming(tx, { duration: 600, easing: Easing.out(Easing.cubic) });
          translateY.value = withTiming(ty, { duration: 600, easing: Easing.out(Easing.cubic) });
          
          savedScale.value = s;
          savedTranslateX.value = tx;
          savedTranslateY.value = ty;
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
  }, [loading, focusCountry, features]);

  const canInteract = interactive && !focusCountry;

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

  const cx = VIEWBOX_W / 2;
  const cy = VIEWBOX_H / 2;

  const stylez = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { translateX: cx },
      { translateY: cy },
      { scale: scale.value },
      { translateX: -cx },
      { translateY: -cy },
    ],
  }));

  if (loading) {
    return (
      <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#FFD700" />
        <RNText style={{ color: '#555', marginTop: 8 }}>Loading High-Res Map...</RNText>
      </View>
    );
  }

  const ownedSet = new Set(ownedCountries);

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
            <AnimatedG style={stylez}>
              {(features || []).map((f: any) => {
                const cca2 = getCountryCca2(f.rawFeature.id, f.name);
                const isOwn = ownedSet.has(cca2);
                const isFoc = cca2 === focusCountry;

                const fillColor = isFoc 
                  ? '#FFD700' 
                  : (isOwn ? getCountryColor(cca2) : '#1a1a2e');
                
                const fillOpacity = isFoc ? 0.9 : (isOwn ? 0.75 : 0.35);
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
              
              {/* Render labels on top of all paths */}
              {(features || []).map((f: any) => {
                const cca2 = getCountryCca2(f.rawFeature.id, f.name);
                const isOwn = ownedSet.has(cca2);
                const isFoc = cca2 === focusCountry;

                if (isOwn || isFoc) {
                  return <CountryLabel key={`lbl-${f.name}`} f={f} showNames={showNames} />;
                }
                return null;
              })}
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
