import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type State = 'default' | 'correct' | 'wrong' | 'disabled';

interface Props {
  label: string;
  detail?: string;
  state?: State;
  onPress: () => void;
}

export default function AnswerButton({ label, detail, state = 'default', onPress }: Props) {
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong';

  return (
    <TouchableOpacity
      style={[styles.button, styles[state]]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={[styles.label, state === 'default' && styles.defaultLabel]}>{label}</Text>
        {detail && (
          <Text style={styles.detailText}>{detail}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  default: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2a2a4e',
  },
  correct: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  wrong: {
    backgroundColor: '#3a1a1a',
    borderColor: '#f44336',
  },
  disabled: {
    backgroundColor: '#111',
    borderColor: '#222',
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  defaultLabel: {
    color: '#eee',
  },
  detailText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },
});
