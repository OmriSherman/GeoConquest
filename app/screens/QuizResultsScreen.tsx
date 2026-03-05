import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { QuizStackParamList } from '../types';
import { triggerSound } from '../components/AudioEngine';
import { recordQuizCompletion } from './AchievementsScreen';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'QuizResults'>;
  route: RouteProp<QuizStackParamList, 'QuizResults'>;
};

export default function QuizResultsScreen({ navigation, route }: Props) {
  const { score, total, goldEarned, quizType } = route.params;
  const percentage = Math.round((score / total) * 100);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (quizType === 'millionaire') {
      if (percentage === 100) { // 15/15
        triggerSound('wild_cheers');
      } else if (score > 0) { // 1-14/15
        triggerSound('ahhh');
      } else { // 0/15
        triggerSound('boo');
      }
    } else if (quizType === 'nightmare') {
      if (percentage === 100) { // survived all 10 — epic win
        triggerSound('wild_cheers');
      } else {
        triggerSound('boo');
      }
    } else {
      // Standard quizzes
      if (percentage >= 80) {
        triggerSound('cheers');
      } else if (percentage >= 40) {
        triggerSound('clap');
      } else {
        triggerSound('boo');
      }
    }

    recordQuizCompletion({
      quizType,
      perfect: percentage === 100,
      durationSeconds: 999, // duration tracking can be added per-quiz
      goldEarned,
    });
  }, []);

  function getRating() {
    if (percentage === 100) return { emoji: '👑', label: 'Flawless Victory. The World is Yours.' };
    if (percentage >= 80) return { emoji: '🔥', label: 'Incredible Performance!' };
    if (percentage >= 60) return { emoji: '👍', label: 'Solid Effort.' };
    if (percentage >= 40) return { emoji: '📚', label: 'Keep studying those maps.' };
    return { emoji: '💪', label: 'Every master was once a beginner.' };
  }

  const rating = getRating();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{rating.emoji}</Text>
      <Text style={styles.rating}>{rating.label}</Text>

      <View style={styles.card}>
        <Row label="Score" value={`${score} / ${total}`} />
        {quizType !== 'millionaire' && <Row label="Accuracy" value={`${percentage}%`} />}
        <Row label="Gold Earned" value={`🪙 ${goldEarned}`} highlight />
      </View>

      <TouchableOpacity
        style={styles.playAgainButton}
        onPress={() => {
          if (quizType === 'flag') navigation.replace('FlagQuiz');
          else if (quizType === 'shape') navigation.replace('ShapeQuiz');
          else if (quizType === 'borders') navigation.replace('BordersQuiz');
          else if (quizType === 'capitals') navigation.replace('CapitalsQuiz');
          else if (quizType === 'nightmare') navigation.replace('NightmareQuiz');
          else navigation.replace('QuizMenu');
        }}
      >
        <Text style={styles.playAgainText}>Play Again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.navigate('QuizMenu')}
      >
        <Text style={styles.menuText}>Back to Quiz Menu</Text>
      </TouchableOpacity>

      {percentage >= 60 && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          fallSpeed={2500}
          fadeOut={true}
          autoStart={true}
        />
      )}
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  emoji: { fontSize: 64 },
  rating: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { color: '#aaa', fontSize: 16 },
  rowValue: { color: '#fff', fontSize: 18, fontWeight: '600' },
  rowValueHighlight: { color: '#FFD700' },
  playAgainButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  playAgainText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 17 },
  menuButton: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  menuText: { color: '#aaa', fontSize: 15 },
});
