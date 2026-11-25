import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';

export default function UsernamePickerScreen() {
  const { setUsername, profile } = useAuth();
  const [username, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('username.enter'));
      return;
    }
    if (trimmed.length < 3) {
      Alert.alert(t('common.error'), t('username.tooShort'));
      return;
    }
    if (trimmed.length > 20) {
      Alert.alert(t('common.error'), t('username.tooLong'));
      return;
    }

    setLoading(true);
    try {
      await setUsername(trimmed);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message ?? t('username.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>🌍</Text>
        <Text style={styles.title}>{t('username.title')}</Text>
        <Text style={styles.subtitle}>
          {t('username.subtitle')}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={t('username.placeholder')}
          placeholderTextColor="#555"
          value={username}
          onChangeText={setUsernameInput}
          autoCapitalize="none"
          autoFocus
          maxLength={20}
        />

        <Text style={styles.hint}>{t('username.hint')}</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? t('username.setup') : t('username.start')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    alignItems: 'center',
  },
  emoji: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '100%',
    textAlign: 'center',
  },
  hint: {
    color: '#555',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 17 },
});
