import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  QuizStackParamList,
} from '../types';

// ─── Screen imports ───────────────────────────────────────────────────────────

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import QuizMenuScreen from '../screens/QuizMenuScreen';
import FlagQuizScreen from '../screens/FlagQuizScreen';
import ShapeQuizScreen from '../screens/ShapeQuizScreen';
import BordersQuizScreen from '../screens/BordersQuizScreen';
import CapitalsQuizScreen from '../screens/CapitalsQuizScreen';
import TrailQuizScreen from '../screens/TrailQuizScreen';
import MillionaireQuizScreen from '../screens/MillionaireQuizScreen';
import NightmareQuizScreen from '../screens/NightmareQuizScreen';
import GauntletScreen from '../screens/GauntletScreen';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import ShopScreen from '../screens/ShopScreen';
import GoldShopScreen from '../screens/GoldShopScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import QuestToastBanner from '../components/QuestToastBanner';
import { useGame } from '../context/GameContext';

// ─── Stack / Tab creators ─────────────────────────────────────────────────────

const navigationRef = createNavigationContainerRef<any>();

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const QuizStack = createStackNavigator<QuizStackParamList>();

// ─── Tab Icons ────────────────────────────────────────────────────────────────

function TabIcon({ source, focused }: { source: any; focused: boolean }) {
  return <Image source={source} style={{ width: 28, height: 28, opacity: focused ? 1 : 0.45 }} resizeMode="contain" />;
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Quiz stack ───────────────────────────────────────────────────────────────

function QuizNavigator() {
  return (
    <QuizStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a1a' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <QuizStack.Screen
        name="QuizMenu"
        component={QuizMenuScreen}
        options={{ headerShown: false }}
      />
      <QuizStack.Screen
        name="FlagQuiz"
        component={FlagQuizScreen}
        options={{ title: 'Flag Quiz' }}
      />
      <QuizStack.Screen
        name="ShapeQuiz"
        component={ShapeQuizScreen}
        options={{ title: 'Shape Quiz' }}
      />
      <QuizStack.Screen
        name="BordersQuiz"
        component={BordersQuizScreen}
        options={{ title: 'Borders Quiz' }}
      />
      <QuizStack.Screen
        name="CapitalsQuiz"
        component={CapitalsQuizScreen}
        options={{ title: 'Capitals Quiz' }}
      />
      <QuizStack.Screen
        name="TrailQuiz"
        component={TrailQuizScreen}
        options={{ title: 'Trail Quiz' }}
      />
      <QuizStack.Screen
        name="MillionaireQuiz"
        component={MillionaireQuizScreen}
        options={{ title: 'Millionaire Quiz' }}
      />
      <QuizStack.Screen
        name="NightmareQuiz"
        component={NightmareQuizScreen}
        options={{ title: 'Nightmare Mode' }}
      />
      <QuizStack.Screen
        name="Gauntlet"
        component={GauntletScreen}
        options={{ headerShown: false }}
      />
      <QuizStack.Screen
        name="QuizResults"
        component={QuizResultsScreen}
        options={{ title: 'Results', headerLeft: () => null }}
      />
    </QuizStack.Navigator>
  );
}

// ─── Main tabs ────────────────────────────────────────────────────────────────

function MainNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a1a',
          borderTopColor: '#1a1a2e',
          height: 64 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/avatars/castle.png')} focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Quizzes"
        component={QuizNavigator}
        options={{
          tabBarLabel: 'Quizzes',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/avatars/open_scroll.png')} focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/avatars/cart.png')} focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/avatars/trophy.png')} focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarLabel: 'Quests',
          tabBarIcon: ({ focused }) => <TabIcon source={require('../../assets/avatars/war_medal.png')} focused={focused} />,
        }}
      />
    </MainTab.Navigator>
  );
}



export default function AppNavigator() {
  const { session, loading, needsUsername } = useAuth();
  const { questToast, questHighlightId, clearQuestToast } = useGame();

  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    async function handleUrl(url: string) {
      if (url.includes('reset-password')) {
        const codeMatch = url.match(/[?&]code=([^&]+)/);
        if (codeMatch?.[1]) {
          try { await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1])); } catch {}
          setShowResetModal(true);
          return;
        }
        const typeMatch = url.match(/[#&]type=([^&]+)/);
        if (typeMatch?.[1] === 'recovery') {
          setShowResetModal(true);
          return;
        }
      }
      const match = url.match(/[?&]code=([^&]+)/);
      if (match?.[1]) {
        await AsyncStorage.setItem('@pending_referral_code', decodeURIComponent(match[1]));
      }
    }
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  async function handlePasswordReset() {
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords must match and cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowResetModal(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been updated!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update password.');
    } finally {
      setResetLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <View style={{ flex: 1 }}>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!session ? (
              <RootStack.Screen name="Auth" component={AuthNavigator} />
            ) : needsUsername ? (
              <RootStack.Screen name="ChooseUsername" component={OnboardingScreen} />
            ) : (
              <>
                <RootStack.Screen name="Main" component={MainNavigator} />
                <RootStack.Screen
                  name="Premium"
                  component={PremiumScreen}
                  options={{ presentation: 'modal', headerShown: false }}
                />
              </>
            )}
          </RootStack.Navigator>
          {session && !needsUsername && (
            <QuestToastBanner
              message={questToast}
              highlightId={questHighlightId}
              onDismiss={clearQuestToast}
              onNavigateToQuests={(hid) => {
                if (navigationRef.isReady()) {
                  navigationRef.dispatch(
                    CommonActions.navigate({
                      name: 'Achievements',
                      params: hid ? { highlightId: hid } : {},
                    })
                  );
                }
              }}
            />
          )}
        </View>
      </NavigationContainer>

      <Modal visible={showResetModal} transparent animationType="fade" onRequestClose={() => {}}>
        <KeyboardAvoidingView style={resetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={resetStyles.card}>
            <Text style={resetStyles.title}>Set New Password</Text>
            <Text style={resetStyles.message}>Enter a new password for your account.</Text>
            <TextInput
              style={resetStyles.input}
              placeholder="New password"
              placeholderTextColor="#555"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={resetStyles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#555"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[resetStyles.button, resetLoading && { opacity: 0.6 }]}
              onPress={handlePasswordReset}
              disabled={resetLoading}
            >
              <Text style={resetStyles.buttonText}>{resetLoading ? 'Saving…' : 'Save Password'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const resetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#0e0e1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    gap: 14,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
  },
  buttonText: {
    color: '#0a0a1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
