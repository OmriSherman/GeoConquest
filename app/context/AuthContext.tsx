import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';

// ─── Offline cache helpers ────────────────────────────────────────────────────

export const PROFILE_CACHE_KEY = (uid: string) => `@geoquest/profile_cache_${uid}`;
const MUTATIONS_KEY = (uid: string) => `@geoquest/pending_mutations_${uid}`;
const NEXT_QUIZ_BOOST_KEY = (uid: string) => `@geoquest/next_quiz_boost_${uid}`;
const DAY_MS = 24 * 60 * 60 * 1000;

type PendingMutation =
  | { type: 'add_gold'; delta: number }
  | { type: 'add_xp'; delta: number }
  | { type: 'add_tickets'; delta: number }
  | { type: 'daily_reward_sync'; newStreak: number; claimedAt: string };

const QUEST_REWARD_AVATAR_TO_ACHIEVEMENT_IDS = ACHIEVEMENTS_DATA.reduce((map, achievement) => {
  const rewardItems = achievement.rewardItems ?? (achievement.rewardItem ? [achievement.rewardItem] : []);
  for (const rewardItem of rewardItems) {
    if (rewardItem.type !== 'avatar') continue;
    const existing = map.get(rewardItem.itemId) ?? [];
    map.set(rewardItem.itemId, [...existing, achievement.id]);
  }
  return map;
}, new Map<string, string[]>());

export async function enqueueMutation(userId: string, mutation: PendingMutation) {
  const key = MUTATIONS_KEY(userId);
  const raw = await AsyncStorage.getItem(key);
  const list: PendingMutation[] = raw ? JSON.parse(raw) : [];
  list.push(mutation);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

/** Called on reconnect. Applies queued offline mutations to the freshly-fetched DB profile. */
async function processPendingMutations(userId: string, fresh: Profile): Promise<Profile> {
  try {
    const key = MUTATIONS_KEY(userId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fresh;
    const list: PendingMutation[] = JSON.parse(raw);
    if (!list.length) return fresh;

    let goldDelta = 0, xpDelta = 0, ticketDelta = 0;
    let dailySync: { newStreak: number; claimedAt: string } | null = null;

    for (const m of list) {
      if (m.type === 'add_gold') goldDelta += m.delta;
      if (m.type === 'add_xp') xpDelta += m.delta;
      if (m.type === 'add_tickets') ticketDelta += m.delta;
      if (m.type === 'daily_reward_sync') dailySync = { newStreak: m.newStreak, claimedAt: m.claimedAt };
    }

    const payload: Record<string, unknown> = {};
    const updated = { ...fresh };

    if (goldDelta > 0) {
      updated.gold_balance = fresh.gold_balance + goldDelta;
      payload.gold_balance = updated.gold_balance;
    }
    if (xpDelta > 0) {
      updated.xp = (fresh.xp ?? 0) + xpDelta;
      payload.xp = updated.xp;
    }
    if (ticketDelta > 0) {
      updated.tickets = (fresh.tickets ?? 0) + ticketDelta;
      payload.tickets = updated.tickets;
    }
    if (dailySync && dailySync.newStreak > (fresh.login_streak ?? 0)) {
      updated.login_streak = dailySync.newStreak;
      updated.last_reward_claim = dailySync.claimedAt;
      payload.login_streak = updated.login_streak;
      payload.last_reward_claim = updated.last_reward_claim;
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
      if (error) return fresh; // keep queue intact if DB update failed
    }

    await AsyncStorage.removeItem(key);
    return updated;
  } catch {
    return fresh;
  }
}

function utcDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function shouldResetLoginStreak(lastRewardClaim?: string | null): boolean {
  if (!lastRewardClaim) return false;
  const claimDateKey = utcDateKey(new Date(lastRewardClaim));
  const yesterdayKey = utcDateKey(new Date(Date.now() - DAY_MS));
  // If last claim is older than yesterday, at least one full UTC day was missed.
  return claimDateKey < yesterdayKey;
}

function normalizeMissedDayStreak(profile: Profile): { normalized: Profile; changed: boolean } {
  if (!shouldResetLoginStreak(profile.last_reward_claim ?? null)) {
    return { normalized: profile, changed: false };
  }
  if ((profile.login_streak ?? 0) === 0) {
    return { normalized: profile, changed: false };
  }
  return {
    normalized: { ...profile, login_streak: 0 },
    changed: true,
  };
}

async function reconcileQuestRewardAvatarOwnership(userId: string, unlockedItemIds: Set<string>): Promise<Set<string>> {
  if (unlockedItemIds.size === 0 || QUEST_REWARD_AVATAR_TO_ACHIEVEMENT_IDS.size === 0) {
    return unlockedItemIds;
  }

  try {
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (achievementsError) {
      console.warn('[Auth] Failed to validate quest-reward avatars:', achievementsError.message);
      return unlockedItemIds;
    }

    const claimedAchievementIds = new Set((achievementsData ?? []).map((row: any) => row.achievement_id));
    const invalidQuestRewardAvatars = Array.from(unlockedItemIds).filter((itemId) => {
      const requiredAchievementIds = QUEST_REWARD_AVATAR_TO_ACHIEVEMENT_IDS.get(itemId);
      if (!requiredAchievementIds) return false;
      return !requiredAchievementIds.some((achievementId) => claimedAchievementIds.has(achievementId));
    });

    if (invalidQuestRewardAvatars.length === 0) return unlockedItemIds;

    const { error: deleteError } = await supabase
      .from('user_unlocked_items')
      .delete()
      .eq('user_id', userId)
      .in('item_id', invalidQuestRewardAvatars);

    if (deleteError) {
      console.warn('[Auth] Failed to remove invalid quest-reward avatars:', deleteError.message);
      return unlockedItemIds;
    }

    const cleanedSet = new Set(unlockedItemIds);
    invalidQuestRewardAvatars.forEach((itemId) => cleanedSet.delete(itemId));
    return cleanedSet;
  } catch (error) {
    console.warn('[Auth] Failed to reconcile quest-reward avatars:', error);
    return unlockedItemIds;
  }
}

// Required for OAuth session completion on iOS
WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  needsUsername: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string, avatarEmoji?: string, avatarFlag?: string, country?: string | null, referralCode?: string | null) => Promise<void>;
  purchaseAvatarItem: (itemType: 'avatar' | 'flag', itemId: string, cost: number) => Promise<void>;
  claimAchievement: (achievementId: string, rewardGold: number, rewardItems?: { type: 'avatar' | 'flag' | 'item'; itemId: string }[], rewardTickets?: number) => Promise<void>;
  purchaseQuizUpgrade: (newTurns: number, cost: number) => Promise<void>;
  disabledUpgrades: Set<string>;
  toggleUpgrade: (id: string) => Promise<void>;
  effectiveMaxTurns: number;
  dailyRewardAvailable: boolean;
  setDailyRewardAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  claimDailyReward: () => Promise<{ gold: number; tickets: number }>;
  addXP: (amount: number) => Promise<void>;
  addGold: (amount: number) => Promise<void>;
  incrementQuizCount: () => Promise<{ claimed: boolean; goldAwarded: number }>;
  shareReferralLink: () => Promise<void>;
  unlockedItems: Set<string>;
  refreshUnlockedItems: () => Promise<void>;
  refreshQuestStatus: () => Promise<void>;
  spendTicket: () => Promise<void>;
  addTickets: (amount: number) => Promise<void>;
  purchaseTicket: (cost: number) => Promise<void>;
  purchaseTickets: (amount: number, cost: number) => Promise<void>;
  purchaseConqueror: (plan: 'unlimited' | 'monthly') => Promise<void>;
  nextQuizBoostActive: boolean;
  setNextQuizBoostActive: (active: boolean) => Promise<void>;
  consumeNextQuizBoost: () => Promise<boolean>;
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
  const [unlockedItems, setUnlockedItems] = useState<Set<string>>(new Set());
  const [nextQuizBoostActive, setNextQuizBoostActiveState] = useState(false);

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

    // 1. Check active session immediately purely from storage
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (!currentSession) {
        setProfile(null);
        setNeedsUsername(false);
        setLoading(false);
      }
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          setProfile(null);
          setNeedsUsername(false);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 3. Independent effect: Whenever `session` changes to a valid user, fetch their profile
  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      
      const isGoogle = session.user.app_metadata?.provider === 'google';
      const userId = session.user.id;

      fetchProfile(userId)
        .then(() => { 
          // Detect country if it's the very first Google login and we don't have one
          if (isGoogle) return detectAndSetCountry(session.user); 
        })
        .catch((err) => console.warn('[Auth] Post-login profile error:', err))
        .finally(() => setLoading(false));
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setNextQuizBoostActiveState(false);
      return;
    }
    AsyncStorage.getItem(NEXT_QUIZ_BOOST_KEY(session.user.id))
      .then((raw) => setNextQuizBoostActiveState(raw === '1'))
      .catch(() => setNextQuizBoostActiveState(false));
  }, [session?.user?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const run = async () => {
      await consumeReferralBonusNotifications(true);
    };

    const initialTimer = setTimeout(run, 1200);
    const intervalId = setInterval(run, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [profile?.id]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function applyProfileToState(p: Profile) {
    setProfile(p);
    if (p.last_reward_claim) {
      const lastDate = new Date(p.last_reward_claim).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      setDailyRewardAvailable(lastDate < today);
    } else {
      setDailyRewardAvailable(true);
    }
    setNeedsUsername(!p.has_onboarded);
  }

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      // Apply any queued offline mutations onto the fresh DB values
      let p = await processPendingMutations(userId, data as Profile);

      // Reset streak immediately when a day was missed (don't wait for next claim call).
      const { normalized, changed } = normalizeMissedDayStreak(p);
      p = normalized;
      if (changed) {
        supabase
          .from('profiles')
          .update({ login_streak: 0 })
          .eq('id', userId)
          .then(({ error: streakError }) => {
            if (streakError) console.warn('[Auth] Failed to persist streak reset:', streakError.message);
          });
      }

      // Persist updated profile to cache
      AsyncStorage.setItem(PROFILE_CACHE_KEY(userId), JSON.stringify(p)).catch(() => {});

      applyProfileToState(p);

      // Load unlocked items into cache
      supabase.from('user_unlocked_items').select('item_id').eq('user_id', userId).then(async (res) => {
        if (!res.error && res.data) {
          const unlockedSet = new Set(res.data.map((r: { item_id: string }) => r.item_id));
          const reconciledSet = await reconcileQuestRewardAvatarOwnership(userId, unlockedSet);
          setUnlockedItems(reconciledSet);
        }
      });

    } else if (error?.code === 'PGRST116') {
      // Profile doesn't exist — needs onboarding
      setNeedsUsername(true);
      setDailyRewardAvailable(false);
    } else {
      // Network error or unexpected failure — try the local cache
      try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY(userId));
        if (raw) {
          applyProfileToState(JSON.parse(raw) as Profile);
        } else {
          setNeedsUsername(false);
          setDailyRewardAvailable(false);
        }
      } catch {
        setNeedsUsername(false);
        setDailyRewardAvailable(false);
      }
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
    return data;
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
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      // console.log('[Auth] signInWithOAuth result:', { url: data?.url, error });
      if (error) throw error;
      return;
    }

    // Native (iOS / Android)
    // Use the custom scheme directly to prevent Expo Go from intercepting `exp://` as an OTA update
    const redirectUri = 'geoconquest://auth/callback';
    console.log('[Auth] Native redirectUri:', redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
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
        const codeMatch = url.match(/[?&]code=([^&]+)/);
        if (codeMatch) {
          const code = codeMatch[1];
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) throw sessionError;
        } else {
          throw new Error('No authorization code found in redirect URL.');
        }
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
      if (profile?.id) {
        AsyncStorage.multiRemove([PROFILE_CACHE_KEY(profile.id), MUTATIONS_KEY(profile.id), NEXT_QUIZ_BOOST_KEY(profile.id)]).catch(() => {});
      }
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
    country?: string | null,
    referralCode?: string | null
  ) {
    if (!session?.user) return;
    const userId = session.user.id;
    const nextAvatar = avatarEmoji || 'png_explorer_male';

    // Hard guard: quest-reward avatars can only be equipped if unlocked.
    const requiredQuestAchievements = QUEST_REWARD_AVATAR_TO_ACHIEVEMENT_IDS.get(nextAvatar);
    if (requiredQuestAchievements && !unlockedItems.has(nextAvatar)) {
      throw new Error('This avatar is locked. Complete and claim its quest reward first.');
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    const updateData: any = {
      username,
      avatar_emoji: nextAvatar,
      avatar_flag: avatarFlag || '🏴‍☠️',
      email: session.user.email,
      has_onboarded: true,
    };
    if (country !== undefined) updateData.country = country;
    if (referralCode && referralCode.toLowerCase() !== username.trim().toLowerCase()) {
      updateData.referred_by = referralCode;
    }

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
      ...(prev || { id: userId, gold_balance: 500, created_at: new Date().toISOString(), has_onboarded: false }),
      username,
      avatar_emoji: nextAvatar,
      avatar_flag: avatarFlag || '🏴‍☠️',
      email: session.user.email,
      has_onboarded: true,
      country: country ?? prev?.country ?? null,
      referred_by: referralCode ?? prev?.referred_by ?? null,
      referral_bonus_claimed: prev?.referral_bonus_claimed ?? false,
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

    // Deduct gold locally + update unlock cache
    setProfile(prev => prev ? { ...prev, gold_balance: prev.gold_balance - cost } : prev);
    setUnlockedItems(prev => new Set([...prev, itemId]));
  }

  async function claimAchievement(achievementId: string, rewardGold: number, rewardItems?: { type: 'avatar' | 'flag' | 'item'; itemId: string }[], rewardTickets?: number) {
    if (!profile) return;

    const { data, error } = await supabase.rpc('claim_achievement', {
      p_achievement_id: achievementId,
      p_reward_amount: rewardGold,
    });

    const alreadyClaimed = !!error?.message?.includes('already claimed');

    if (error && !alreadyClaimed) {
      throw error;
    }

    // Only update gold balance if not already claimed (gold was already granted)
    if (!alreadyClaimed && data && data.length > 0) {
      setProfile((prev) => prev ? { ...prev, gold_balance: data[0].new_balance } : prev);
    }

    // Unlock reward items if provided — always attempt, insert is idempotent (23505 = already owned)
    for (const item of rewardItems ?? []) {
      const { error: unlockError } = await supabase.from('user_unlocked_items').insert(
        { user_id: profile.id, item_id: item.itemId, item_type: item.type }
      );
      if (unlockError && unlockError.code !== '23505') {
        throw new Error(`Reward item could not be unlocked: ${unlockError.message}`);
      }
      setUnlockedItems(prev => new Set([...prev, item.itemId]));
    }

    // Grant ticket rewards — skip if already claimed (tickets were already granted)
    if (!alreadyClaimed && rewardTickets && rewardTickets > 0) {
      const newTickets = (profile.tickets ?? 0) + rewardTickets;
      await supabase.from('profiles').update({ tickets: newTickets }).eq('id', profile.id);
      setProfile(prev => prev ? { ...prev, tickets: newTickets } : prev);
    }

    // If it was already claimed and items were all already owned too, surface the error
    if (alreadyClaimed && (rewardItems ?? []).length === 0) {
      throw new Error('This achievement has already been claimed.');
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

  // Gold and tickets per cycle day — mirrors REWARDS_CYCLE in DailyRewardModal.tsx
  const DAILY_GOLD_BY_DAY = [100, 150, 200, 250, 300, 400, 500];
  const DAILY_TICKETS_BY_DAY = [1, 1, 2, 2, 3, 3, 5];

  async function claimDailyReward(): Promise<{ gold: number; tickets: number }> {
    if (!profile) return { gold: 0, tickets: 0 };
    const rewardMultiplier = profile.is_conquerer ? 3 : 1;

    const { data, error } = await supabase.rpc('claim_daily_reward');

    // Network error (no DB error code) — claim locally and queue sync
    if (error && !error.code) {
      const prevStreak = shouldResetLoginStreak(profile.last_reward_claim ?? null)
        ? 0
        : (profile.login_streak ?? 0);
      const newStreak = prevStreak + 1;
      const cycleDay = ((newStreak - 1) % 7) + 1;
      const gold = DAILY_GOLD_BY_DAY[cycleDay - 1] * rewardMultiplier;
      const tickets = DAILY_TICKETS_BY_DAY[cycleDay - 1] * rewardMultiplier;
      const claimedAt = new Date().toISOString();
      const newGold = (profile.gold_balance ?? 0) + gold;
      const newTickets = (profile.tickets ?? 0) + tickets;

      setProfile(prev => prev ? {
        ...prev,
        gold_balance: newGold,
        login_streak: newStreak,
        last_reward_claim: claimedAt,
        tickets: newTickets,
      } : prev);
      setDailyRewardAvailable(false);

      // Update local cache so the offline state persists across restarts
      const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY(profile.id));
      if (raw) {
        const cached = JSON.parse(raw);
        AsyncStorage.setItem(PROFILE_CACHE_KEY(profile.id), JSON.stringify({
          ...cached, gold_balance: newGold, login_streak: newStreak,
          last_reward_claim: claimedAt, tickets: newTickets,
        })).catch(() => {});
      }

      // Queue mutations for when we go back online
      await enqueueMutation(profile.id, { type: 'add_gold', delta: gold });
      await enqueueMutation(profile.id, { type: 'add_tickets', delta: tickets });
      await enqueueMutation(profile.id, { type: 'daily_reward_sync', newStreak, claimedAt });

      return { gold, tickets };
    }

    if (error) throw error;

    if (data && data.length > 0) {
      const { success, new_balance, new_streak, reward_amount } = data[0];
      if (success) {
        const cycleDay = ((new_streak as number - 1) % 7) + 1;
        const baseTicketBonus = DAILY_TICKETS_BY_DAY[cycleDay - 1];
        const ticketBonus = baseTicketBonus * rewardMultiplier;
        const baseGoldReward = reward_amount as number;
        const totalGoldReward = baseGoldReward * rewardMultiplier;
        const extraGoldReward = totalGoldReward - baseGoldReward;
        const newGoldBalance = (new_balance as number) + extraGoldReward;
        const newTickets = (profile.tickets ?? 0) + ticketBonus;
        await supabase.from('profiles').update({ gold_balance: newGoldBalance, tickets: newTickets }).eq('id', profile.id);
        setProfile(prev => prev ? {
          ...prev,
          gold_balance: newGoldBalance,
          login_streak: new_streak,
          last_reward_claim: new Date().toISOString(),
          tickets: newTickets,
        } : prev);
        setDailyRewardAvailable(false);
        return { gold: totalGoldReward, tickets: ticketBonus };
      }
    }
    return { gold: 0, tickets: 0 };
  }

  async function addGold(amount: number) {
    const userId = profile?.id ?? session?.user?.id;
    if (!userId || amount === 0) return;

    // Optimistic local update
    setProfile(prev => prev ? { ...prev, gold_balance: Math.max(0, (prev.gold_balance ?? 0) + amount) } : prev);

    // Use server value as source of truth to avoid stale-client overwrites
    const { data: currentRow, error: readError } = await supabase
      .from('profiles')
      .select('gold_balance')
      .eq('id', userId)
      .single();

    if (readError) {
      if (profile?.id) {
        await enqueueMutation(profile.id, { type: 'add_gold', delta: amount });
      }
      return;
    }

    const currentGold = Number((currentRow as any)?.gold_balance ?? 0);
    const newBalance = Math.max(0, currentGold + amount);

    const { error } = await supabase
      .from('profiles')
      .update({ gold_balance: newBalance })
      .eq('id', userId);

    if (error) {
      if (profile?.id) {
        await enqueueMutation(profile.id, { type: 'add_gold', delta: amount });
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY(profile.id));
        if (raw) {
          const cached = JSON.parse(raw);
          AsyncStorage.setItem(PROFILE_CACHE_KEY(profile.id), JSON.stringify({ ...cached, gold_balance: newBalance })).catch(() => {});
        }
      }
      return;
    }

    setProfile(prev => prev ? { ...prev, gold_balance: newBalance } : prev);
  }

  async function spendTicket() {
    if (!profile) return;
    const newCount = Math.max(0, (profile.tickets ?? 0) - 1);
    await supabase.from('profiles').update({ tickets: newCount }).eq('id', profile.id);
    setProfile(prev => prev ? { ...prev, tickets: newCount } : prev);
  }

  async function addTickets(amount: number) {
    if (!profile || amount <= 0) return;
    const newCount = (profile.tickets ?? 0) + amount;
    await supabase.from('profiles').update({ tickets: newCount }).eq('id', profile.id);
    setProfile(prev => prev ? { ...prev, tickets: newCount } : prev);
  }

  async function purchaseTickets(amount: number, cost: number) {
    if (!profile) return;
    if ((profile.gold_balance ?? 0) < cost) throw new Error('Not enough gold.');
    const newGold = profile.gold_balance - cost;
    const newTickets = (profile.tickets ?? 0) + amount;
    const { error } = await supabase
      .from('profiles')
      .update({ gold_balance: newGold, tickets: newTickets })
      .eq('id', profile.id);
    if (error) throw error;
    setProfile(prev => prev ? { ...prev, gold_balance: newGold, tickets: newTickets } : prev);
  }

  async function purchaseTicket(cost: number) {
    if (!profile) return;
    if ((profile.gold_balance ?? 0) < cost) throw new Error('Not enough gold.');
    const newGold = profile.gold_balance - cost;
    const newTickets = (profile.tickets ?? 0) + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ gold_balance: newGold, tickets: newTickets })
      .eq('id', profile.id);
    if (error) throw error;
    setProfile(prev => prev ? { ...prev, gold_balance: newGold, tickets: newTickets } : prev);
  }

  async function purchaseConqueror(plan: 'unlimited' | 'monthly') {
    if (!profile) throw new Error('Not authenticated');

    try {
      // Call RPC to activate subscription
      const { data, error } = await supabase.rpc('activate_conqueror_subscription', {
        p_user_id: profile.id,
        p_plan: plan,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Failed to activate subscription');

      // Update profile locally
      const updates: any = { is_conquerer: true };
      const bonusGranted = !!data?.bonus_granted;
      if (plan === 'unlimited' && bonusGranted) {
        updates.gold_balance = (profile.gold_balance ?? 0) + 100000;
        updates.tickets = (profile.tickets ?? 0) + 30;
      }

      setProfile(prev => prev ? { ...prev, ...updates } : prev);
    } catch (err: any) {
      throw new Error(err.message ?? 'Failed to activate Conqueror subscription');
    }
  }

  async function refreshUnlockedItems() {
    if (!profile) return;
    const { data, error } = await supabase.from('user_unlocked_items').select('item_id').eq('user_id', profile.id);
    if (!error && data) {
      const unlockedSet = new Set(data.map((r: { item_id: string }) => r.item_id));
      const reconciledSet = await reconcileQuestRewardAvatarOwnership(profile.id, unlockedSet);
      setUnlockedItems(reconciledSet);
    }
  }

  async function refreshQuestStatus() {
    if (!profile) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('completed_speed_detective, completed_ground_invasion')
      .eq('id', profile.id)
      .single();
    if (!error && data) {
      setProfile(prev => prev ? {
        ...prev,
        completed_speed_detective: data.completed_speed_detective,
        completed_ground_invasion: data.completed_ground_invasion,
      } : prev);
    }
  }

  function referralPopupMessage(totalGold: number, rewardsCount: number): string {
    if (rewardsCount <= 1) {
      return `You received ${totalGold.toLocaleString()} gold from a referral reward.`;
    }
    return `You received ${totalGold.toLocaleString()} gold from ${rewardsCount} referral rewards.`;
  }

  async function syncReferralBonusGold(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('gold_balance, referral_bonus_claimed')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              gold_balance: Number((data as any).gold_balance ?? prev.gold_balance),
              referral_bonus_claimed: !!(data as any).referral_bonus_claimed,
            }
          : prev
      );
    }
  }

  async function consumeReferralBonusNotifications(showPopup: boolean): Promise<void> {
    const userId = profile?.id ?? session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase.rpc('consume_referral_bonus_notifications');
    if (error) return;

    const row = Array.isArray(data) ? data[0] : data;
    const totalGold = Number((row as any)?.total_gold ?? 0);
    const rewardsCount = Number((row as any)?.rewards_count ?? 0);

    if (rewardsCount <= 0 || totalGold <= 0) return;

    await syncReferralBonusGold(userId);

    if (showPopup) {
      Alert.alert('Referral Reward!', referralPopupMessage(totalGold, rewardsCount));
    }
  }

  async function claimReferralBonus(): Promise<{ claimed: boolean; goldAwarded: number }> {
    const { data, error } = await supabase.rpc('claim_referral_bonus');
    if (error) {
      console.warn('[Auth] Referral bonus RPC failed:', error.message);
      return { claimed: false, goldAwarded: 0 };
    }
    if (!data?.[0]?.success) {
      return { claimed: false, goldAwarded: 0 };
    }
    const goldAwarded = data[0].gold_awarded as number;
    setProfile(prev => prev ? {
      ...prev,
      gold_balance: prev.gold_balance + goldAwarded,
      referral_bonus_claimed: true,
    } : prev);
    return { claimed: true, goldAwarded };
  }

  async function incrementQuizCount(): Promise<{ claimed: boolean; goldAwarded: number }> {
    const userId = profile?.id ?? session?.user?.id;
    if (!userId) return { claimed: false, goldAwarded: 0 };

    let quizCount = profile?.quiz_count ?? 0;
    let referralBonusClaimed = !!profile?.referral_bonus_claimed;
    let referredBy = (profile as any)?.referred_by ?? null;

    const { data: latestProfile, error: latestProfileError } = await supabase
      .from('profiles')
      .select('quiz_count, referral_bonus_claimed, referred_by')
      .eq('id', userId)
      .single();

    if (!latestProfileError && latestProfile) {
      quizCount = Number((latestProfile as any).quiz_count ?? 0);
      referralBonusClaimed = !!(latestProfile as any).referral_bonus_claimed;
      referredBy = (latestProfile as any).referred_by ?? null;
    }

    const newCount = quizCount + 1;
    const { error } = await supabase
      .from('profiles')
      .update({ quiz_count: newCount })
      .eq('id', userId);
    if (error) {
      console.warn('[Auth] Failed to increment quiz_count:', error.message);
      if (!referralBonusClaimed && referredBy) {
        return claimReferralBonus();
      }
      return { claimed: false, goldAwarded: 0 };
    }

    setProfile(prev => prev ? { ...prev, quiz_count: newCount } : prev);
    if (!referralBonusClaimed && referredBy) {
      return claimReferralBonus();
    }
    return { claimed: false, goldAwarded: 0 };
  }

  async function shareReferralLink() {
    if (!profile?.username) return;
    const code = profile.username;
    const link = `geoconquest://refer?code=${encodeURIComponent(code)}`;
    try {
      await Share.share({
        message:
          `Join me on GeoConquest! Use code ${code} when you sign up — we both get 1500 gold! 🌍\n\n` +
          `Download on Google Play: https://play.google.com/store/apps/details?id=com.geoconquest.app\n\n` +
          `Already installed? ${link}`,
      });
    } catch {}
  }

  async function addXP(amount: number) {
    const userId = profile?.id ?? session?.user?.id;
    if (!userId || amount <= 0) return;

    // Optimistic local update
    setProfile(prev => prev ? { ...prev, xp: (prev.xp ?? 0) + amount } : prev);

    const { data: currentRow, error: readError } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    if (readError) {
      if (profile?.id) {
        await enqueueMutation(profile.id, { type: 'add_xp', delta: amount });
      }
      return;
    }

    const currentXp = Number((currentRow as any)?.xp ?? 0);
    const newXP = currentXp + amount;

    const { error } = await supabase
      .from('profiles')
      .update({ xp: newXP })
      .eq('id', userId);

    if (error) {
      if (profile?.id) {
        await enqueueMutation(profile.id, { type: 'add_xp', delta: amount });
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY(profile.id));
        if (raw) {
          const cached = JSON.parse(raw);
          AsyncStorage.setItem(PROFILE_CACHE_KEY(profile.id), JSON.stringify({ ...cached, xp: newXP })).catch(() => {});
        }
      }
      return;
    }

    setProfile(prev => prev ? { ...prev, xp: newXP } : prev);
  }

  async function setNextQuizBoostActive(active: boolean) {
    if (!session?.user?.id) return;
    const key = NEXT_QUIZ_BOOST_KEY(session.user.id);
    if (active) {
      await AsyncStorage.setItem(key, '1');
    } else {
      await AsyncStorage.removeItem(key);
    }
    setNextQuizBoostActiveState(active);
  }

  async function consumeNextQuizBoost(): Promise<boolean> {
    if (!nextQuizBoostActive) return false;
    await setNextQuizBoostActive(false);
    return true;
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
        addXP,
        addGold,
        incrementQuizCount,
        shareReferralLink,
        unlockedItems,
        refreshUnlockedItems,
        refreshQuestStatus,
        spendTicket,
        addTickets,
        purchaseTicket,
        purchaseTickets,
        purchaseConqueror,
        nextQuizBoostActive,
        setNextQuizBoostActive,
        consumeNextQuizBoost,
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
