import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DIFFICULTIES, DIFFICULTY_MULTIPLIER, QuizDifficulty } from '../lib/quizDifficulty';
import { XP_PER_CORRECT } from '../lib/xpSystem';
import { XpIcon } from './XpIcon';
import { QuizType } from '../types';
import { t } from '../lib/i18n';

const COLOR: Record<QuizDifficulty, string> = { easy: '#4CAF50', medium: '#FFD700', hard: '#F44336' };

type Props = {
  quiz: QuizType;
  baseGold: number;
  value: QuizDifficulty;
  onChange: (d: QuizDifficulty) => void;
  disabled?: boolean;
};

// Easy / Medium / Hard picker for the quiz start page, with the gold and XP per correct answer.
export default function DifficultyPicker({ quiz, baseGold, value, onChange, disabled }: Props) {
  const mult = DIFFICULTY_MULTIPLIER[value];
  const gold = Math.round(baseGold * mult);
  const xp = Math.round((XP_PER_CORRECT[quiz] ?? 0) * mult);
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('difficulty.title').toUpperCase()}</Text>
      <View style={styles.row}>
        {DIFFICULTIES.map(d => {
          const active = d === value;
          return (
            <TouchableOpacity
              key={d}
              disabled={disabled}
              onPress={() => onChange(d)}
              style={[styles.pill, { borderColor: COLOR[d] }, active && { backgroundColor: COLOR[d] }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <Text style={[styles.pillText, { color: active ? '#111' : COLOR[d] }]}>{t(`difficulty.${d}`)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.rewardRow}>
        <View style={styles.rewardItem}>
          <Image source={require('../../assets/avatars/gold_coin.png')} style={styles.coin} resizeMode="contain" />
          <Text style={[styles.reward, { color: COLOR[value] }]}>{gold}</Text>
        </View>
        <View style={styles.rewardItem}>
          <XpIcon size={14} />
          <Text style={[styles.reward, { color: COLOR[value] }]}>{xp}</Text>
        </View>
      </View>
      <Text style={styles.perCorrect}>{t('quizMenu.perCorrect')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 28, width: '100%' },
  title: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  pillText: { fontSize: 14, fontWeight: '800' },
  // Icon first, number in a fixed-width centered box: icons stay put when a digit is added, and the row stays centered
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reward: { fontSize: 15, fontWeight: '800', width: 28, textAlign: 'center' },
  perCorrect: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 6 },
  coin: { width: 20, height: 20 },
});
