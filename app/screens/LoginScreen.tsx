import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { AuthStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Sign In Failed', err.message ?? 'Something went wrong');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require('../../assets/login screen bg.gif')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay to keep text readable */}
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.inner}>
            {/* Hero text — floats over the animated map */}
            <View style={styles.heroSection}>
              <Text style={styles.title}>GeoConquest</Text>
              <Text style={styles.subtitle}>Conquer the world, one quiz at a time</Text>
            </View>

            {/* Form card */}
            <View style={styles.formCard}>
              {/* Google button */}
              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>
                  {googleLoading ? 'Connecting…' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#555"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.link}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,18,0.62)',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 6,
  },
  subtitle: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: 'rgba(10,10,26,0.82)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
    gap: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,30,60,0.9)',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a4e',
  },
  dividerText: {
    color: '#555',
    fontSize: 13,
  },
  input: {
    backgroundColor: 'rgba(20,20,45,0.9)',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  button: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
  link: {
    color: '#FFD700',
    textAlign: 'center',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
