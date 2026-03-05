import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarDisplay from '../components/AvatarDisplay';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ONBOARDING_AVATARS,
  FLAG_OPTIONS,
  isValidUsername,
} from '../lib/avatarData';
import { StyleSheet } from 'react-native';

// Country flags only (for onboarding flag step)
const COUNTRY_FLAGS = FLAG_OPTIONS.filter(f => f.category === 'country');

type Step = 'username' | 'avatar' | 'flag';

export default function OnboardingScreen() {
  const { setUsername: commitProfile } = useAuth();
  const [step, setStep] = useState<Step>('username');
  const [username, setUsernameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🧑');
  const [selectedFlag, setSelectedFlag] = useState('🏴‍☠️');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [flagSearch, setFlagSearch] = useState('');

  const filteredFlags = flagSearch.trim()
    ? COUNTRY_FLAGS.filter(f =>
        f.label.toLowerCase().includes(flagSearch.toLowerCase())
      )
    : COUNTRY_FLAGS;

  // ── Username Step ──────────────────────────────────────────────────────────

  async function validateAndProceed() {
    const trimmed = username.trim();
    const validation = isValidUsername(trimmed);
    if (!validation.valid) {
      setUsernameError(validation.error!);
      return;
    }

    setLoading(true);
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      setUsernameError('This username is already taken');
      setLoading(false);
      return;
    }

    setUsernameError('');
    setLoading(false);
    setStep('avatar');
  }

  // ── Final Submit ───────────────────────────────────────────────────────────

  async function handleFinish() {
    setLoading(true);
    try {
      await commitProfile(
        username.trim(),
        selectedAvatar,
        selectedFlag,
        null
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  }

  // ── Progress dots ──────────────────────────────────────────────────────────

  const steps: Step[] = ['username', 'avatar', 'flag'];
  const currentIndex = steps.indexOf(step);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Progress dots */}
        <View style={styles.progressDots}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[
                styles.dot,
                step === s && styles.dotActive,
                currentIndex > i && styles.dotDone,
              ]}
            />
          ))}
        </View>

        {/* ── Username Step ──────────────────────────────────────────────────── */}
        {step === 'username' && (
          <View style={styles.stepContainerUsername}>
            <Text style={styles.stepEmoji}>🌍</Text>
            <Text style={styles.stepTitle}>Choose Your Name</Text>
            <Text style={styles.stepSubtitle}>
              Pick a unique username for the leaderboard
            </Text>

            <TextInput
              style={[styles.input, usernameError ? styles.inputError : null]}
              placeholder="Enter your username"
              placeholderTextColor="#555"
              value={username}
              onChangeText={(t) => { setUsernameInput(t); setUsernameError(''); }}
              autoCapitalize="none"
              autoFocus
              maxLength={20}
            />
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.hint}>3–20 characters, letters, numbers, underscores</Text>
            )}

            <TouchableOpacity
              style={[styles.nextButton, loading && styles.buttonDisabled]}
              onPress={validateAndProceed}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading ? 'Checking…' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Avatar Step ───────────────────────────────────────────────────── */}
        {step === 'avatar' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepEmoji}>{selectedAvatar}</Text>
            <Text style={styles.stepTitle}>Choose Your Avatar</Text>
            <Text style={styles.stepSubtitle}>
              This will represent you in the game
            </Text>

            <View style={styles.grid}>
              {ONBOARDING_AVATARS.map((av) => (
                <TouchableOpacity
                  key={av.emoji}
                  style={[
                    styles.gridItem,
                    selectedAvatar === av.emoji && styles.gridItemSelected,
                  ]}
                  onPress={() => setSelectedAvatar(av.emoji)}
                >
                  <Text style={styles.gridEmoji}>{av.emoji}</Text>
                  <Text style={styles.gridLabel}>{av.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('username')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextButton, styles.navNextButton]} onPress={() => setStep('flag')}>
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Flag Step ─────────────────────────────────────────────────────── */}
        {step === 'flag' && (
          <View style={styles.stepContainerFull}>
            <AvatarDisplay avatarId={selectedAvatar} avatarFlag={selectedFlag} size={80} />
            <Text style={styles.stepTitle}>Choose Your Flag</Text>
            <Text style={styles.stepSubtitle}>
              Pick your country's flag to fly beside your avatar
            </Text>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search country…"
              placeholderTextColor="#555"
              value={flagSearch}
              onChangeText={setFlagSearch}
            />

            <FlatList
              data={filteredFlags}
              keyExtractor={(item) => item.emoji + item.label}
              numColumns={5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flagGrid}
              style={styles.flagList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.flagItem,
                    selectedFlag === item.emoji && styles.flagItemSelected,
                  ]}
                  onPress={() => setSelectedFlag(item.emoji)}
                >
                  <Text style={styles.flagEmoji}>{item.emoji}</Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('avatar')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, styles.navNextButton, styles.finishButton, loading && styles.buttonDisabled]}
                onPress={handleFinish}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading ? 'Creating…' : 'Start Exploring 🚀'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a1a' },
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2a2a4e',
  },
  dotActive: { backgroundColor: '#FFD700', width: 24 },
  dotDone: { backgroundColor: '#6BCB77' },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stepContainerUsername: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 12,
  },
  stepContainerFull: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  stepEmoji: { fontSize: 56, marginBottom: 4 },
  stepTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  stepSubtitle: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#2a2a4e',
    width: '100%',
    textAlign: 'center',
  },
  inputError: { borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 13 },
  hint: { color: '#555', fontSize: 12 },
  // Standalone next button (username step)
  nextButton: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  // In navRow: needs flex to fill remaining space
  navNextButton: {
    flex: 1,
    width: undefined,
  },
  finishButton: { backgroundColor: '#6BCB77' },
  nextButtonText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
  buttonDisabled: { opacity: 0.6 },
  backButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  backButtonText: { color: '#aaa', fontSize: 14 },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  // Avatar grid (3x3 for 9 items)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  gridItem: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    gap: 2,
  },
  gridItemSelected: { borderColor: '#FFD700', backgroundColor: '#1a1a30' },
  gridEmoji: { fontSize: 32 },
  gridLabel: { color: '#888', fontSize: 9 },
  // Search
  searchInput: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    width: '100%',
  },
  // Flag grid
  flagList: { width: '100%' },
  flagGrid: { paddingBottom: 4 },
  flagItem: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    borderWidth: 2,
    borderColor: '#2a2a4e',
  },
  flagItemSelected: { borderColor: '#FFD700', backgroundColor: '#1a1a30' },
  flagEmoji: { fontSize: 26 },
  // Preview
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  previewFlag: { fontSize: 32 },
  previewAvatar: { fontSize: 48 },
});
