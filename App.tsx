import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './app/context/AuthContext';
import { GameProvider } from './app/context/GameContext';
import { ToastProvider } from './app/context/ToastContext';
import { AlertProvider } from './app/context/AlertContext';
import AppNavigator from './app/navigation/AppNavigator';
import AudioEngine from './app/components/AudioEngine';
import { supabase } from './app/lib/supabase';

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlertProvider>
          <ToastProvider>
            <AuthProvider>
              <GameProvider>
                <StatusBar style="light" />
                <AudioEngine />
                <AppNavigator />
              </GameProvider>
            </AuthProvider>
          </ToastProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
