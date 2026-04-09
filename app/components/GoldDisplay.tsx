import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../context/GameContext';
import GoldCoinIcon from './GoldCoinIcon';

export default function GoldDisplay() {
  const { goldBalance } = useGame();
  return (
    <View style={styles.pill}>
      <View style={styles.iconBox}>
        <GoldCoinIcon size={16} />
      </View>
      <Text style={styles.amount}>{goldBalance.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
  },
  iconBox: {
    width: 32,
    height: 32,
    backgroundColor: '#0a0a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
  },
});
