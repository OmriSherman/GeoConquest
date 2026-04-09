import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Country flags only (for onboarding flag step)
const COUNTRY_FLAGS = FLAG_OPTIONS.filter(f => f.category === 'country');

/** Decode cca2 from a standard ISO regional-indicator flag emoji (e.g. 🇮🇱 → 'IL') */
function flagEmojiToCca2(emoji: string): string | null {
  try {
    const chars = [...emoji];
    if (chars.length !== 2) return null;
    const code = chars.map(c => String.fromCharCode(c.codePointAt(0)! - 127397)).join('');
    if (/^[A-Z]{2}$/.test(code)) return code;
  } catch {}
  return null;
}

type Step = 'username' | 'avatar' | 'flag';

export default function OnboardingScreen() {
  const { setUsername: commitProfile } = useAuth();
  const [step, setStep] = useState<Step | 'referral'>('username');
  const [username, setUsernameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('png_explorer_male');
  const [selectedFlag, setSelectedFlag] = useState('🏴‍☠️');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [flagSearch, setFlagSearch] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referralMessage, setReferralMessage] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('@pending_referral_code').then(code => {
      if (code) setReferralCode(code);
    });
  }, []);

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

  async function verifyReferralCode(): Promise<string | null> {
    const code = referralCode.trim();
    if (!code) {
      setReferralStatus('idle');
      setReferralMessage('');
      return null;
    }

    if (code.toLowerCase() === username.trim().toLowerCase()) {
      setReferralStatus('error');
      setReferralMessage("You can't use your own username as a referral code.");
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', code)
      .limit(1);

    if (error || !data || data.length === 0) {
      setReferralStatus('error');
      setReferralMessage('Referral code not found. Please check and try again.');
      return null;
    }

    const canonical = data[0].username as string;
    setReferralStatus('success');
    setReferralMessage('Referral accepted! You and your friend each get 1,500 gold after your first completed quiz.');
    return canonical;
  }

  async function handleFinish() {
    setLoading(true);
    try {
      let code = referralCode.trim() || null;
      if (code) {
        const validated = await verifyReferralCode();
        if (!validated) {
          setLoading(false);
          return;
        }
        code = validated;
      }
      await commitProfile(
        username.trim(),
        selectedAvatar,
        selectedFlag,
        flagEmojiToCca2(selectedFlag),
        code
      );
      if (code) await AsyncStorage.removeItem('@pending_referral_code');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  }

  // ── Progress dots ──────────────────────────────────────────────────────────

  const steps: Array<Step | 'referral'> = ['username', 'avatar', 'flag', 'referral'];
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
            <AvatarDisplay avatarId={selectedAvatar} size={80} />
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
                  <AvatarDisplay avatarId={av.emoji} size={52} />
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
                style={[styles.nextButton, styles.navNextButton]}
                onPress={() => setStep('referral')}
              >
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'referral' && (
          <View style={styles.stepContainerUsername}>
            <Image source={require('../../assets/avatars/compass.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <Text style={styles.stepTitle}>Got a Referral Code?</Text>
            <Text style={styles.stepSubtitle}>
              If a friend invited you to the conquest, enter their username below.
            </Text>

            <View style={styles.referralRow}>
              <TextInput
                style={[
                  styles.referralInputProminent,
                  referralStatus === 'success' && styles.referralInputSuccess,
                  referralStatus === 'error' && styles.referralInputError,
                ]}
                placeholder="Referral code (optional)"
                placeholderTextColor="#666"
                value={referralCode}
                onChangeText={(value) => {
                  setReferralCode(value);
                  setReferralStatus('idle');
                  setReferralMessage('');
                }}
                autoCapitalize="none"
                maxLength={20}
              />
              <TouchableOpacity style={styles.verifyReferralButton} onPress={verifyReferralCode} disabled={loading}>
                <Text style={styles.verifyReferralText}>Verify</Text>
              </TouchableOpacity>
            </View>

            {referralStatus !== 'idle' && (
              <Text style={[styles.referralStatusText, referralStatus === 'success' ? styles.referralStatusSuccess : styles.referralStatusError]}>
                {referralMessage}
              </Text>
            )}

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep('flag')}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, styles.navNextButton, loading && styles.buttonDisabled]}
                onPress={handleFinish}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading ? 'Creating…' : "I'm ready"}
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
  // Avatar grid (2x2 for 4 explorer items)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    width: '100%',
  },
  gridItem: {
    width: 100,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
    gap: 6,
  },
  gridItemSelected: { borderColor: '#FFD700', backgroundColor: '#1a1a30' },
  gridEmoji: { fontSize: 32 },
  gridLabel: { color: '#888', fontSize: 11 },
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
  referralInput: {
    backgroundColor: '#111122',
    color: '#888',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e1e3a',
    width: '100%',
    textAlign: 'center',
  },
  referralInputProminent: {
    backgroundColor: '#151530',
    color: '#fff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#2a2a4e',
    flex: 1,
    textAlign: 'center',
  },
  referralRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralInputSuccess: { borderColor: '#34d399' },
  referralInputError: { borderColor: '#f87171' },
  referralStatusText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 2,
    lineHeight: 18,
  },
  referralStatusSuccess: { color: '#34d399' },
  referralStatusError: { color: '#f87171' },
  verifyReferralButton: {
    borderWidth: 1,
    borderColor: '#4a9eff',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#0d1b2a',
  },
  verifyReferralText: {
    color: '#4a9eff',
    fontWeight: '700',
    fontSize: 13,
  },
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
