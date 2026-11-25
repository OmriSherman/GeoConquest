import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

type State = 'default' | 'correct' | 'wrong' | 'disabled' | 'phantom';

interface Props {
  label: string;
  detail?: string;
  detailColor?: string;
  state?: State;
  onPress: () => void;
  variant?: 'nightmare';
  style?: StyleProp<ViewStyle>;
  visual?: ReactNode;
  showLabel?: boolean;
}

export default function AnswerButton({ label, detail, detailColor, state = 'default', onPress, variant, style, visual, showLabel = true }: Props) {
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong';

  const buttonStyle = variant === 'nightmare'
    ? (state === 'default' ? styles.nightmareDefault
      : state === 'correct' ? styles.correct
      : state === 'phantom' ? styles.phantom
      : styles[state])
    : styles[state];

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {visual}
        {showLabel && (
          <Text
            style={[styles.label, state === 'default' && styles.defaultLabel]}
            numberOfLines={3}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
        )}
        {detail && (
          <Text style={[styles.detailText, detailColor ? { color: detailColor } : null]}>{detail}</Text>
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
  nightmareDefault: {
    backgroundColor: '#2a0000',
    borderColor: '#6b0000',
  },
  phantom: {
    backgroundColor: '#0d2a0d',
    borderColor: '#336633',
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
    justifyContent: 'center',
    width: '100%',
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
