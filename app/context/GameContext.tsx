import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { Country, getCountryPrice } from '../types';
import { useAuth } from './AuthContext';
import { ACHIEVEMENTS_DATA } from '../lib/achievementsData';
import { useToast } from './ToastContext';

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
  addGold: (amount: number) => Promise<void>;
  purchaseCountry: (country: Country) => Promise<void>;
  isOwned: (cca2: string) => boolean;
  canAfford: (price: number) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  const [goldBalance, setGoldBalance] = useState(0);
  const [ownedCountries, setOwnedCountries] = useState<string[]>([]);
  const [loadingGame, setLoadingGame] = useState(true);
  const { showToast } = useToast();

  // Track which empire thresholds we've already toasted this session
  const toastedThresholds = useRef<Set<number>>(new Set());
  const prevOwnedCountRef = useRef(0);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setGoldBalance(0);
      setOwnedCountries([]);
      setLoadingGame(false);
      return;
    }
    loadGameData();
  }, [user]);

  // Sync gold balance from profile whenever profile changes
  useEffect(() => {
    if (profile) {
      setGoldBalance(profile.gold_balance);
    }
  }, [profile]);

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
        showToast({
          title: 'Quest Complete!',
          message: ach ? `${ach.title} — claim your reward in Quests!` : `${title} quest complete!`,
          icon: <Text style={{ fontSize: 20 }}>{ach?.icon || '🏅'}</Text>,
        });
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
        // Pre-seed already-crossed thresholds so we don't toast on load
        for (const threshold of Object.keys(EMPIRE_THRESHOLDS).map(Number)) {
          if (codes.length >= threshold) {
            toastedThresholds.current.add(threshold);
          }
        }
      }
    } finally {
      setLoadingGame(false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const addGold = useCallback(
    async (amount: number) => {
      if (!user) return;

      const newBalance = goldBalance + amount;

      const { error } = await supabase
        .from('profiles')
        .update({ gold_balance: newBalance })
        .eq('id', user.id);

      if (!error) {
        setGoldBalance(newBalance);
      }
    },
    [user, goldBalance]
  );

  const purchaseCountry = useCallback(
    async (country: Country) => {
      if (!user) return;
      const price = getCountryPrice(country.area);

      if (goldBalance < price) {
        throw new Error('Not enough gold');
      }
      if (ownedCountries.includes(country.cca2)) {
        throw new Error('Country already owned');
      }

      const newBalance = goldBalance - price;

      const [goldRes, purchaseRes] = await Promise.all([
        supabase.from('profiles').update({ gold_balance: newBalance }).eq('id', user.id),
        supabase
          .from('owned_countries')
          .insert({ user_id: user.id, country_code: country.cca2 }),
      ]);

      if (goldRes.error) throw goldRes.error;
      if (purchaseRes.error) throw purchaseRes.error;

      setGoldBalance(newBalance);
      setOwnedCountries(prev => [...prev, country.cca2]);
    },
    [user, goldBalance, ownedCountries]
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isOwned = useCallback(
    (cca2: string) => ownedCountries.includes(cca2),
    [ownedCountries]
  );

  const canAfford = useCallback(
    (price: number) => goldBalance >= price,
    [goldBalance]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GameContext.Provider
      value={{
        goldBalance, ownedCountries, loadingGame,
        addGold, purchaseCountry, isOwned, canAfford,
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
