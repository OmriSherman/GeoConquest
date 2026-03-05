import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../context/GameContext';

export default function GoldDisplay() {
  const { goldBalance } = useGame();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.amount}>{goldBalance.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 6,
  },
  icon: { fontSize: 16 },
  amount: { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },
});
