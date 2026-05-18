import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Country, getCountryPrice } from '../types';
import { useAuth } from './AuthContext';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';

const OWNED_KEY = (uid: string) => `@geoquest/owned_countries_${uid}`;

// Empire thresholds that trigger a quest-complete toast
const EMPIRE_THRESHOLDS: Record<number, string> = {
  1: 'First Conquest',
  5: 'Growing Empire',
  10: 'Imperial Ambitions',
  25: 'World Power',
  50: 'Global Hegemon',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameContextValue {
  goldBalance: number;
  ownedCountries: string[]; // array of cca2 codes
  loadingGame: boolean;
  questToast: string | null;
  questHighlightId: string | null;
  addGold: (amount: number) => Promise<void>;
  purchaseCountry: (country: Country) => Promise<void>;
  isOwned: (cca2: string) => boolean;
  canAfford: (price: number) => boolean;
  clearQuestToast: () => void;
  triggerQuestToast: (message: string, achievementId?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, addGold: updateGoldBalance } = useAuth();
  const goldBalance = profile?.gold_balance ?? 0;

  const [ownedCountries, setOwnedCountries] = useState<string[]>([]);
  const [loadingGame, setLoadingGame] = useState(true);
  const [questToast, setQuestToast] = useState<string | null>(null);
  const [questHighlightId, setQuestHighlightId] = useState<string | null>(null);
  const clearQuestToast = useCallback(() => { setQuestToast(null); setQuestHighlightId(null); }, []);
  const triggerQuestToast = useCallback((message: string, achievementId?: string) => {
    setQuestToast(message);
    setQuestHighlightId(achievementId ?? null);
  }, []);

  // Track which empire thresholds we've already toasted this session
  const toastedThresholds = useRef<Set<number>>(new Set());
  const prevOwnedCountRef = useRef(0);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setOwnedCountries([]);
      setLoadingGame(false);
      return;
    }
    loadGameData();
  }, [user]);

  // Check empire thresholds whenever ownedCountries grows
  useEffect(() => {
    const newCount = ownedCountries.length;
    const prevCount = prevOwnedCountRef.current;
    prevOwnedCountRef.current = newCount;

    if (newCount <= prevCount) return; // no new purchase

    for (const [threshold, title] of Object.entries(EMPIRE_THRESHOLDS)) {
      const t = Number(threshold);
      if (newCount >= t && !toastedThresholds.current.has(t)) {
        toastedThresholds.current.add(t);
        const ach = ACHIEVEMENTS_DATA.find(a => a.title === title);
        triggerQuestToast(
          ach ? `${ach.title} — claim your reward in Quests!` : `${title} quest complete!`,
          ach?.id,
        );
        break;
      }
    }
  }, [ownedCountries.length]);

  async function loadGameData() {
    if (!user) return;
    setLoadingGame(true);
    try {
      const { data: owned, error } = await supabase
        .from('owned_countries')
        .select('country_code')
        .eq('user_id', user.id);

      if (!error && owned) {
        const codes = owned.map((r: { country_code: string }) => r.country_code);
        setOwnedCountries(codes);
        // Cache for offline use
        AsyncStorage.setItem(OWNED_KEY(user.id), JSON.stringify(codes)).catch(() => {});
        // Pre-seed already-crossed thresholds so we don't toast on load
        for (const threshold of Object.keys(EMPIRE_THRESHOLDS).map(Number)) {
          if (codes.length >= threshold) {
            toastedThresholds.current.add(threshold);
          }
        }
      } else {
        throw error ?? new Error('Failed to load owned countries');
      }
    } catch {
      // Network failure — load from cache
      try {
        const raw = await AsyncStorage.getItem(OWNED_KEY(user.id));
        if (raw) {
          const codes: string[] = JSON.parse(raw);
          setOwnedCountries(codes);
          for (const threshold of Object.keys(EMPIRE_THRESHOLDS).map(Number)) {
            if (codes.length >= threshold) toastedThresholds.current.add(threshold);
          }
        }
      } catch {}
    } finally {
      setLoadingGame(false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const addGold = useCallback(
    async (amount: number) => {
      await updateGoldBalance(amount);
    },
    [updateGoldBalance]
  );

  const purchaseCountry = useCallback(
    async (country: Country) => {
      if (!user || !profile) return;
      const price = getCountryPrice(country.area);
      const currentGold = profile.gold_balance ?? 0;

      if (currentGold < price) {
        throw new Error('Not enough gold');
      }
      if (ownedCountries.includes(country.cca2)) {
        throw new Error('Country already owned');
      }

      await updateGoldBalance(-price);

      const purchaseRes = await supabase
        .from('owned_countries')
        .insert({ user_id: user.id, country_code: country.cca2 });

      if (purchaseRes.error) {
        try {
          await updateGoldBalance(price);
        } catch (refundError) {
          console.warn('[Game] Failed to refund gold after country purchase error:', refundError);
        }
        throw purchaseRes.error;
      }

      setOwnedCountries(prev => {
        if (prev.includes(country.cca2)) return prev;
        const next = [...prev, country.cca2];
        AsyncStorage.setItem(OWNED_KEY(user.id), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [user, profile, ownedCountries, updateGoldBalance]
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isOwned = useCallback(
    (cca2: string) => ownedCountries.includes(cca2),
    [ownedCountries]
  );

  const canAfford = useCallback(
    (price: number) => (profile?.gold_balance ?? 0) >= price,
    [profile?.gold_balance]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GameContext.Provider
      value={{
        goldBalance, ownedCountries, loadingGame,
        addGold, purchaseCountry, isOwned, canAfford,
        questToast, questHighlightId, clearQuestToast, triggerQuestToast,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
