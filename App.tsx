import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AppState, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './app/context/AuthContext';
import { GameProvider } from './app/context/GameContext';
import { ToastProvider } from './app/context/ToastContext';
import { AlertProvider } from './app/context/AlertContext';
import AppNavigator from './app/navigation/AppNavigator';
import ForceUpdateGate from './app/components/ForceUpdateGate';
import { supabase } from './app/lib/supabase';
import { getAllCustomAvatarImageSources } from './app/lib/customAvatars';
import { initRevenueCat } from './app/lib/revenueCat';
import { initI18n, isLocaleRTL, useLocale } from './app/lib/i18n';
import { initAudio } from './app/lib/audio';
import { startGameConfig } from './app/lib/gameConfig';

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
  const locale = useLocale(); // remount the tree on language change
  const direction = isLocaleRTL(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    const sources = getAllCustomAvatarImageSources();
    for (const source of sources) {
      const resolved = Image.resolveAssetSource(source);
      if (resolved?.uri) {
        Image.prefetch(resolved.uri).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    initRevenueCat();
  }, []);

  useEffect(() => {
    startGameConfig();
  }, []);

  useEffect(() => {
    initI18n();
  }, []);

  useEffect(() => {
    initAudio().catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ads = require('react-native-google-mobile-ads');
        const mobileAds = ads?.default;
        if (typeof mobileAds === 'function') {
          await mobileAds().initialize();
        }
      } catch {
        // Ads module is unavailable in Expo Go / unsupported environments.
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, direction }} key={`root-${direction}`}>
      <SafeAreaProvider>
        <AlertProvider>
          <ToastProvider>
            <AuthProvider>
              <GameProvider>
                <StatusBar style="light" />
                <ForceUpdateGate>
                  <AppNavigator key={locale} />
                </ForceUpdateGate>
              </GameProvider>
            </AuthProvider>
          </ToastProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
