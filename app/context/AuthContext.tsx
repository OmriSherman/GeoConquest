import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Required for OAuth session completion on iOS
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  needsUsername: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string, avatarEmoji?: string, avatarFlag?: string, country?: string | null) => Promise<void>;
  purchaseAvatarItem: (itemType: 'avatar' | 'flag', itemId: string, cost: number) => Promise<void>;
  claimAchievement: (achievementId: string, rewardGold: number, rewardItem?: { type: 'avatar' | 'flag'; itemId: string }) => Promise<void>;
  purchaseQuizUpgrade: (newTurns: number, cost: number) => Promise<void>;
  disabledUpgrades: Set<string>;
  toggleUpgrade: (id: string) => Promise<void>;
  effectiveMaxTurns: number;
  dailyRewardAvailable: boolean;
  setDailyRewardAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  claimDailyReward: () => Promise<number>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [disabledUpgrades, setDisabledUpgrades] = useState<Set<string>>(new Set());
  const [dailyRewardAvailable, setDailyRewardAvailable] = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  //
  // onAuthStateChange is the primary source of truth for session state.
  // However, in React Native the INITIAL_SESSION event fires only after
  // AsyncStorage resolves, which can be slow. To avoid getting stuck on the
  // loading spinner indefinitely, we also call getSession() as a narrow
  // fallback: if it returns null we can safely unblock loading right away.
  // We never call fetchProfile from getSession() — onAuthStateChange owns that.

  useEffect(() => {
    AsyncStorage.getItem('@disabled_upgrades').then(val => {
      if (val) setDisabledUpgrades(new Set(JSON.parse(val)));
    });

    // Narrow fallback: only used when there is no stored session.
    // Safe because: if the user later signs in, SIGNED_IN fires and takes over.
    // If there IS a session, INITIAL_SESSION fires and handles loading properly.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) {
        setSession(null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // console.log('[Auth] onAuthStateChange:', event, session?.user?.email ?? 'no user');
        setSession(session);

        if (session?.user) {
          setLoading(true);
          const userId = session.user.id;
          const isGoogle =
            event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'google';

          // Use .then() chain — not async/await — so we don't block the Supabase
          // auth state machine with an async callback.
          fetchProfile(userId)
            .then(() => { if (isGoogle) return detectAndSetCountry(session.user); })
            .catch((err) => console.warn('[Auth] Post-login error:', err))
            .finally(() => setLoading(false));
        } else {
          setProfile(null);
          setNeedsUsername(false);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const p = data as Profile;
      setProfile(p);

      // Check daily reward availability
      if (p.last_reward_claim) {
        const lastClaimDateUtc = new Date(p.last_reward_claim);
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);
        
        // Very basic local vs UTC date check.
        // A robust local comparison:
        const lastClaimStr = lastClaimDateUtc.toISOString().split('T')[0];
        // We use the client timezone 'today' string to compare
        const clientTodayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        if (lastClaimStr < clientTodayStr) {
          setDailyRewardAvailable(true);
        } else {
          setDailyRewardAvailable(false);
        }
      } else {
        // Never claimed before
        setDailyRewardAvailable(true);
      }

      // Need onboarding if no avatar set yet, or if username is basically a placeholder
      if (
        !p.avatar_emoji ||
        !p.username ||
        p.username.includes('@') ||
        p.username === 'explorer' ||
        p.username.startsWith('user_')
      ) {
        setNeedsUsername(true);
      } else {
        setNeedsUsername(false);
      }
    } else if (error && error.code === 'PGRST116') {
      // Profile doesn't exist — needs onboarding
      // console.log('[Auth] No profile found, needs onboarding');
      setNeedsUsername(true);
      setDailyRewardAvailable(false);
    } else {
      setNeedsUsername(false);
      setDailyRewardAvailable(false);
    }
  }


  // Common language-only locales → country mapping
  const LANG_TO_COUNTRY: Record<string, string> = {
    he: 'IL', ja: 'JP', ko: 'KR', zh: 'CN', vi: 'VN', th: 'TH',
    uk: 'UA', ka: 'GE', hy: 'AM', az: 'AZ', et: 'EE', lv: 'LV',
    lt: 'LT', is: 'IS', sq: 'AL', mk: 'MK', bs: 'BA', sr: 'RS',
    hr: 'HR', sl: 'SI', sk: 'SK', cs: 'CZ', hu: 'HU', bg: 'BG',
    el: 'GR', tr: 'TR', hi: 'IN', bn: 'BD', ta: 'IN', te: 'IN',
    ml: 'IN', kn: 'IN', mr: 'IN', gu: 'IN', pa: 'IN', ur: 'PK',
    fa: 'IR', ar: 'SA', sw: 'KE', am: 'ET', my: 'MM', km: 'KH',
    lo: 'LA', ne: 'NP', si: 'LK', mn: 'MN', fi: 'FI', da: 'DK',
    nb: 'NO', nn: 'NO', sv: 'SE',
  };

  async function detectAndSetCountry(user: User) {
    const rawMeta = user.user_metadata ?? {};
    const locale = rawMeta.locale as string | undefined;

    // console.log('[Auth] Detecting country from metadata:', JSON.stringify(rawMeta));

    let countryCode: string | null = null;

    if (locale) {
      // Try parsing 'en-IL', 'en_US', 'pt-BR' etc.
      if (locale.length >= 4) {
        const separator = locale.includes('-') ? '-' : locale.includes('_') ? '_' : null;
        if (separator) {
          const parts = locale.split(separator);
          if (parts.length >= 2 && parts[1].length === 2) {
            countryCode = parts[1].toUpperCase();
          }
        }
      }

      // Fall back to language-to-country mapping for 2-letter locale codes
      if (!countryCode && locale.length === 2) {
        countryCode = LANG_TO_COUNTRY[locale.toLowerCase()] ?? null;
      }
    }

    // console.log('[Auth] Detected country:', countryCode, 'from locale:', locale);

    if (countryCode) {
      const { data: current } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (current && !current.country) {
        const { error } = await supabase
          .from('profiles')
          .update({ country: countryCode })
          .eq('id', user.id);

        if (!error) {
          setProfile((prev) => prev ? { ...prev, country: countryCode } : prev);
          // console.log('[Auth] Country set to:', countryCode);
        }
      }
    }
  }

  // ── Auth Actions ───────────────────────────────────────────────────────────
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    if (Platform.OS === 'web') {
      const redirectTo = window.location.origin;
      // console.log('[Auth] Web OAuth — redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      // console.log('[Auth] signInWithOAuth result:', { url: data?.url, error });
      if (error) throw error;
      return;
    }

    // Native (iOS / Android)
    const redirectUri = AuthSession.makeRedirectUri({ path: 'auth/callback' });
    // console.log('[Auth] Native redirectUri:', redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned from Supabase');

    // console.log('[Auth] Opening browser for OAuth...');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    // console.log('[Auth] Browser result type:', result.type);

    if (result.type === 'success') {
      const { url } = result;

      if (url.includes('#access_token=')) {
        // Implicit flow — extract tokens from hash fragment
        const hash = url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token') ?? '';
        const refresh_token = params.get('refresh_token') ?? '';
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) throw sessionError;
      } else {
        // PKCE flow — exchange auth code for session
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url);
        if (sessionError) throw sessionError;
      }
    } else if (result.type === 'dismiss' || result.type === 'cancel') {
      // On some Android configurations the browser closes but OAuth actually
      // completed (the deep link was handled natively). Check if Supabase
      // already has a valid session before treating this as an error.
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) {
        // Genuinely cancelled — do nothing, just return to login screen
        // console.log('[Auth] OAuth dismissed/cancelled with no session');
      }
      // If a session exists, onAuthStateChange already fired and will handle it
    } else {
      Alert.alert('OAuth Result', `type: ${result.type}\n\nredirectUri:\n${redirectUri}`);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out warning:', error);
    } finally {
      setSession(null);
      setProfile(null);
      setNeedsUsername(false);
    }
  }

  async function setUsernameAction(
    username: string,
    avatarEmoji?: string,
    avatarFlag?: string,
    country?: string | null
  ) {
    if (!session?.user) return;
    const userId = session.user.id;

    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    const updateData: any = {
      username,
      avatar_emoji: avatarEmoji || '🧑',
      avatar_flag: avatarFlag || '🏴‍☠️',
    };
    if (country !== undefined) updateData.country = country;

    if (existing) {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
      if (error) throw error;
    } else {
      // Create new profile
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userId, ...updateData, gold_balance: 500 });
      if (error) throw error;
    }

    setProfile((prev) => ({
      ...(prev || { id: userId, gold_balance: 500, created_at: new Date().toISOString() }),
      username,
      avatar_emoji: avatarEmoji || '🧑',
      avatar_flag: avatarFlag || '🏴‍☠️',
      country: country ?? prev?.country ?? null,
    } as Profile));
    setNeedsUsername(false);
  }

  async function purchaseAvatarItem(itemType: 'avatar' | 'flag', itemId: string, cost: number) {
    if (!profile) return;

    const { error } = await supabase.rpc('purchase_avatar_item', {
      p_item_type: itemType,
      p_item_id: itemId,
      p_cost: cost,
    });

    if (error) throw error;

    // Deduct gold locally on success
    setProfile(prev => prev ? { ...prev, gold_balance: prev.gold_balance - cost } : prev);
  }

  async function claimAchievement(achievementId: string, rewardGold: number, rewardItem?: { type: 'avatar' | 'flag'; itemId: string }) {
    if (!profile) return;

    const { data, error } = await supabase.rpc('claim_achievement', {
      p_achievement_id: achievementId,
      p_reward_amount: rewardGold,
    });

    if (error) {
      if (error.message.includes('already claimed')) {
        throw new Error('This achievement has already been claimed.');
      }
      throw error;
    }

    if (data && data.length > 0) {
      setProfile((prev) => prev ? { ...prev, gold_balance: data[0].new_balance } : prev);
    }

    // Unlock reward item if provided (no gold cost — it's a trophy reward)
    if (rewardItem) {
      const { error: unlockError } = await supabase.from('user_unlocked_items').insert(
        { user_id: profile.id, item_id: rewardItem.itemId, item_type: rewardItem.type }
      );
      // 23505 is PostgreSQL's unique_violation error code, which is fine since they already own it
      if (unlockError && unlockError.code !== '23505') {
        console.warn('Failed to insert unlocked item:', unlockError);
      }
    }
  }

  async function purchaseQuizUpgrade(newTurns: number, cost: number) {
    if (!profile) return;

    const { error } = await supabase.rpc('purchase_quiz_upgrade', {
      p_new_turns: newTurns,
      p_cost: cost,
    });

    if (error) {
      if (error.message.includes('already owned')) {
        throw new Error('You already own this upgrade.');
      }
      throw error;
    }

    setProfile(prev => prev ? { ...prev, gold_balance: prev.gold_balance - cost, max_quiz_turns: newTurns } : prev);
  }

  async function claimDailyReward(): Promise<number> {
    if (!profile) return 0;
    
    const clientTodayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

    const { data, error } = await supabase.rpc('claim_daily_reward', {
      client_today_date: clientTodayStr,
    });

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      const { success, new_balance, new_streak, reward_amount } = data[0];
      if (success) {
        setProfile(prev => prev ? { 
          ...prev, 
          gold_balance: new_balance, 
          login_streak: new_streak,
          last_reward_claim: new Date().toISOString()
        } : prev);
        setDailyRewardAvailable(false);
        return reward_amount;
      }
    }
    return 0;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  async function toggleUpgrade(id: string) {
    const newSet = new Set(disabledUpgrades);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setDisabledUpgrades(newSet);
    await AsyncStorage.setItem('@disabled_upgrades', JSON.stringify([...newSet]));
  }

  // Define effectiveMaxTurns
  const effectiveMaxTurns = React.useMemo(() => {
    let t = 10;
    if (profile?.max_quiz_turns) {
      if (!disabledUpgrades.has('upgrade_level_3') && profile.max_quiz_turns >= 30) t = 30;
      else if (!disabledUpgrades.has('upgrade_level_2') && profile.max_quiz_turns >= 20) t = 20;
    }
    return t;
  }, [profile?.max_quiz_turns, disabledUpgrades]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        needsUsername,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        setUsername: setUsernameAction,
        purchaseAvatarItem,
        claimAchievement,
        purchaseQuizUpgrade,
        disabledUpgrades,
        toggleUpgrade,
        effectiveMaxTurns,
        dailyRewardAvailable,
        setDailyRewardAvailable,
        claimDailyReward,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
