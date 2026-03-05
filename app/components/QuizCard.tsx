import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface Props {
  title: string;
  description: string;
  goldReward: string;
  emoji?: string;
  onPress: () => void;
  style?: ViewStyle;
  iconNode?: React.ReactNode;
}

export default function QuizCard({ title, description, goldReward, emoji, onPress, style, iconNode }: Props) {
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.left, (title === '???' || title.includes('Nightmare')) && { backgroundColor: '#1a0000', borderColor: '#400', borderWidth: 1 }]}>
        {iconNode ? iconNode : <Text style={styles.emoji}>{emoji}</Text>}
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, (title === '???' || title.includes('Nightmare')) && { color: '#ff3333', textShadowColor: '#ff0000', textShadowRadius: 8, fontSize: 20, letterSpacing: 4 }]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <Text style={[styles.reward, (title === '???' || title.includes('Nightmare')) && { color: '#cc0000', marginTop: 6 }]}>
          {title === '???' ? goldReward : `🪙 ${goldReward}`}
        </Text>
      </View>
      <Text style={[styles.arrow, (title === '???' || title.includes('Nightmare')) && { color: '#880000' }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 14,
  },
  left: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0a0a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  body: { flex: 1, gap: 3 },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  description: { color: '#aaa', fontSize: 13 },
  reward: { color: '#FFD700', fontSize: 13, marginTop: 2 },
  arrow: { color: '#555', fontSize: 24 },
});
