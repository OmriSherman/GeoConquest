import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './app/context/AuthContext';
import { GameProvider } from './app/context/GameContext';
import AppNavigator from './app/navigation/AppNavigator';
import AudioEngine from './app/components/AudioEngine';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GameProvider>
            <StatusBar style="light" />
            <AudioEngine />
            <AppNavigator />
          </GameProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
