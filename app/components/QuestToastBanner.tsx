import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

const BANNER_HEIGHT = 64;
const VISIBLE_DURATION = 3500;

export default function QuestToastBanner({ message, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + insets.top + 16))).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message) {
      // Slide in
      Animated.spring(translateY, {
        toValue: insets.top + 8,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-dismiss
      dismissTimerRef.current = setTimeout(() => {
        slideOut();
      }, VISIBLE_DURATION);
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [message]);

  function slideOut() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    Animated.timing(translateY, {
      toValue: -(BANNER_HEIGHT + insets.top + 16),
      duration: 300,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents={message ? 'auto' : 'none'}
    >
      <TouchableOpacity style={styles.inner} onPress={slideOut} activeOpacity={0.85}>
        <Text style={styles.icon}>🏅</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Quest Complete!</Text>
          <Text style={styles.message} numberOfLines={1}>{message ?? ''}</Text>
        </View>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
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
