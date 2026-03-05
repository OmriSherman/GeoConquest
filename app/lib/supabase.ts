import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

// ─── Hybrid storage ───────────────────────────────────────────────────────────
// Keeps values in-memory so PKCE code verifiers survive the background/foreground
// cycle on Android when Chrome Custom Tabs is open. Also persists to AsyncStorage
// for session restore across full app restarts.
const memoryCache: Record<string, string> = {};

const hybridStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (key in memoryCache) return memoryCache[key];
    const value = await AsyncStorage.getItem(key);
    if (value != null) memoryCache[key] = value;
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryCache[key] = value;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryCache[key];
    await AsyncStorage.removeItem(key);
  },
};

// ─── Client ───────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: hybridStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
