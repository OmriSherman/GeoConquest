import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
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
import MillionaireQuizScreen from '../screens/MillionaireQuizScreen';
import NightmareQuizScreen from '../screens/NightmareQuizScreen';
import QuizResultsScreen from '../screens/QuizResultsScreen';
import ShopScreen from '../screens/ShopScreen';
import GoldShopScreen from '../screens/GoldShopScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import GoldDisplay from '../components/GoldDisplay';

// ─── Stack / Tab creators ─────────────────────────────────────────────────────

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const QuizStack = createStackNavigator<QuizStackParamList>();

// ─── Tab Icons (emoji-based for simplicity) ───────────────────────────────────

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{label}</Text>;
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
        options={{ title: 'Choose a Quiz', headerRight: () => <GoldDisplay /> }}
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
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="QuizMenu"
        component={QuizNavigator}
        options={{
          tabBarLabel: 'Quizzes',
          tabBarIcon: ({ focused }) => <TabIcon label="🧠" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => <TabIcon label="🛒" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Ranks',
          tabBarIcon: ({ focused }) => <TabIcon label="🏆" focused={focused} />,
        }}
      />
      <MainTab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarLabel: 'Quests',
          tabBarIcon: ({ focused }) => <TabIcon label="🏅" focused={focused} />,
        }}
      />
    </MainTab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { session, loading, needsUsername } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : needsUsername ? (
          <RootStack.Screen name="ChooseUsername" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
