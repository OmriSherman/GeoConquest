import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopFallConfetti from './TopFallConfetti';
import { playQuestComplete } from '../lib/audio';

interface Props {
  message: string | null;
  onDismiss: () => void;
  onNavigateToQuests?: (highlightId?: string | null) => void;
  highlightId?: string | null;
}

const BANNER_HEIGHT = 64;
const EASE_IN = 1000;
const VISIBLE = 4000;
const EASE_OUT = 1000;

export default function QuestToastBanner({ message, onDismiss, onNavigateToQuests, highlightId }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + insets.top + 16))).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (message) {
      setShowConfetti(true);
      playQuestComplete();
      translateY.setValue(-(BANNER_HEIGHT + insets.top + 16));
      Animated.timing(translateY, {
        toValue: insets.top + 8,
        duration: EASE_IN,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      dismissTimerRef.current = setTimeout(slideOut, EASE_IN + VISIBLE);
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [message]);

  function slideOut() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    Animated.timing(translateY, {
      toValue: -(BANNER_HEIGHT + insets.top + 16),
      duration: EASE_OUT,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShowConfetti(false);
      onDismiss();
    });
  }

  return (
    <>
      {showConfetti && <TopFallConfetti />}
      <Animated.View
        style={[styles.banner, { transform: [{ translateY }] }]}
        pointerEvents={message ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.inner} onPress={() => { onNavigateToQuests?.(highlightId); slideOut(); }} activeOpacity={0.85}>
          <Image source={require('../../assets/avatars/war_medal.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Quest Complete!</Text>
            <Text style={styles.message} numberOfLines={1}>{message ?? ''}</Text>
          </View>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  icon: { fontSize: 24 },
  textContainer: { flex: 1 },
  title: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  message: { color: '#ccc', fontSize: 12, marginTop: 1 },
  dismiss: { color: '#555', fontSize: 14, paddingLeft: 4 },
});
