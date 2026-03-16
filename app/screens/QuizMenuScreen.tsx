import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { QuizStackParamList } from '../types';
import QuizCard from '../components/QuizCard';
import DailyRewardModal from '../components/DailyRewardModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useAlert } from '../context/AlertContext';

type Props = {
  navigation: StackNavigationProp<QuizStackParamList, 'QuizMenu'>;
};

const TerrorIcon = ({ size = 48 }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
      <Path d="M 20 50 Q 50 30 80 50 Q 50 70 20 50 Z" fill="#800" stroke="#f00" strokeWidth="2" />
      <Circle cx="50" cy="50" r="8" fill="#000" />
      <Circle cx="50" cy="50" r="2" fill="#f00" />
      {/* Blood drip */}
      <Path d="M 45 60 Q 48 80 48 85 A 2 2 0 0 0 52 85 Q 52 80 55 60 Z" fill="#f00" />
    </Svg>
  </View>
);

const QUIZZES = [
  {
    screen: 'FlagQuiz' as const,
    title: 'Flag Quiz',
    description: 'Identify the country from its flag',
    goldReward: '+10 Gold per correct answer',
    emoji: '🏴',
  },
  {
    screen: 'ShapeQuiz' as const,
    title: 'Shape Quiz',
    description: 'Recognize countries by their silhouette',
    goldReward: '+15 Gold per correct answer',
    emoji: '🗺️',
  },
  {
    screen: 'BordersQuiz' as const,
    title: 'Borders Quiz',
    description: 'Find the country that does NOT share a border',
    goldReward: '+18 Gold per correct answer',
    emoji: '🧩',
  },
  {
    screen: 'CapitalsQuiz' as const,
    title: 'Capitals Quiz',
    description: 'Match the capital city to its country',
    goldReward: '+18 Gold per correct answer',
    emoji: '🏛️',
  },
  {
    screen: 'MillionaireQuiz' as const,
    title: 'Millionaire Quiz',
    description: 'Progressive geography challenge — climb the ladder!',
    goldReward: '+25 to +10,000 Gold per run',
    emoji: '💰',
  },
];

export default function QuizMenuScreen({ navigation }: Props) {
  const { profile, disabledUpgrades } = useAuth();
  const { showAlert } = useAlert();
  const [unlockedItems, setUnlockedItems] = React.useState<Set<string>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      if (!profile) return;
      supabase.from('user_unlocked_items').select('item_id').eq('user_id', profile.id).then((res) => {
        if (!res.error && res.data) {
          setUnlockedItems(new Set(res.data.map((r) => r.item_id)));
        }
      });
    }, [profile?.id])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {QUIZZES.map((quiz) => {
        let isLocked = false;
        let lockMessage = '';

        if (quiz.screen === 'CapitalsQuiz') {
          // Lock behind the 'upgrade_capitals' item (requires 🔍 flag + Shop purchase)
          isLocked = !unlockedItems.has('upgrade_capitals');
          lockMessage = 'Unlock Capitals Quiz in the Shop → Upgrades tab!\n\n(Requires the Speed Detective flag 🔍 from the Flag Quiz Speed Demon quest.)';
        } else if (quiz.screen === 'BordersQuiz') {
          isLocked = !unlockedItems.has('upgrade_borders');
          lockMessage = 'Unlock Borders Quiz in the Shop → Upgrades tab!\n\n(Requires the Chariot avatar from the Ground Invasion quest.)';
        }

        return (
          <QuizCard
            key={quiz.screen}
            title={quiz.title}
            description={quiz.description}
            goldReward={quiz.goldReward}
            emoji={quiz.emoji}
            isLocked={isLocked}
            onPress={() => {
              if (isLocked) {
                showAlert({ title: 'Quiz Locked', message: lockMessage });
              } else {
                navigation.navigate(quiz.screen);
              }
            }}
          />
        );
      })}
      
      {(() => {
        const isBought = unlockedItems.has('upgrade_nightmare');
        const isEnabled = !disabledUpgrades.has('upgrade_nightmare');
        const isUnlocked = isBought && isEnabled;

        return (
          <QuizCard
            title={isUnlocked ? "Nightmare Quiz" : "???"}
            description={isUnlocked ? "Max difficulty. 10 questions. 1 mistake out." : ""}
            goldReward={isUnlocked ? "50,000 Gold Prize" : "???"}
            iconNode={<TerrorIcon />}
            onPress={() => {
              if (isUnlocked) {
                navigation.navigate('NightmareQuiz' as any);
              }
            }}
            style={{ 
              borderColor: '#b30000', 
              borderWidth: 2, 
              backgroundColor: '#2a0000',
              shadowColor: '#ff0000',
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 10,
            }}
          />
        );
      })()}

      <DailyRewardModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0a0a1a', padding: 12, justifyContent: 'center' },
});
