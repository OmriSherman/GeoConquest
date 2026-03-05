/**
 * ActivityTicker — scrolling marquee of recent global game events.
 *
 * On mount it fetches the 20 most recent country conquests.
 * It then subscribes to Supabase Realtime INSERT events on
 * owned_countries and prepends new events as they arrive.
 *
 * The whole bar scrolls horizontally in a loop using Animated.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchCountries } from '../lib/countryData';
import { cca2ToFlagEmoji } from '../types';

interface TickerEvent {
  id: string;
  message: string;
}

const SCROLL_SPEED_PX_PER_SEC = 55; // pixels per second
const ITEM_APPROX_WIDTH = 260;      // rough px width per message

// Only show conquests of countries that cost > 25,000 gold.
// price = ceil(area_km² / 100), so 25k gold ≈ area > 2,500,000 km²
// This gives us the ~9 mega-countries: Russia, Canada, USA, China, Brazil,
// Australia, India, Argentina, Kazakhstan.
const MIN_AREA_KM2 = 2_500_000;

export default function ActivityTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);
  const totalWidth = useRef(0);

  // ── helpers ────────────────────────────────────────────────────────────────

  const buildMessage = useCallback(
    (username: string, countryCode: string, countryName?: string, flagEmoji?: string): string => {
      const flag = flagEmoji ?? cca2ToFlagEmoji(countryCode);
      const name = countryName ?? countryCode;
      const verbs = ['conquered', 'annexed', 'claimed', 'captured', 'seized'];
      const verb = verbs[Math.floor(Math.random() * verbs.length)];
      return `${username} just ${verb} ${name}! ${flag}`;
    },
    [],
  );

  // ── fetch recent activity on mount ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [countries, { data: recent }] = await Promise.all([
          fetchCountries(),
          supabase
            .from('owned_countries')
            .select('id, user_id, country_code, created_at, profiles(username)')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (cancelled || !recent) return;

        const countryMap: Record<string, { name: string; area: number }> = {};
        for (const c of countries) countryMap[c.cca2] = { name: c.name, area: c.area ?? 0 };

        const items: TickerEvent[] = (recent as any[])
          .filter((row) => (countryMap[row.country_code]?.area ?? 0) > MIN_AREA_KM2)
          .map((row) => ({
            id: row.id,
            message: buildMessage(
              row.profiles?.username ?? 'Explorer',
              row.country_code,
              countryMap[row.country_code]?.name,
            ),
          }));

        if (!cancelled) setEvents(items);
      } catch {
        // silently ignore — ticker is non-critical
      }
    })();

    return () => { cancelled = true; };
  }, [buildMessage]);

  // ── subscribe to realtime inserts ──────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('activity_ticker')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'owned_countries' },
        async (payload) => {
          const row = payload.new as { user_id: string; country_code: string; id: string };

          // Fetch username for the new event
          const [{ data: profile }, countries] = await Promise.all([
            supabase.from('profiles').select('username').eq('id', row.user_id).single(),
            fetchCountries(),
          ]);

          const countryMap: Record<string, { name: string; area: number }> = {};
          for (const c of countries) countryMap[c.cca2] = { name: c.name, area: c.area ?? 0 };

          // Skip small countries — ticker is for big conquests only
          if ((countryMap[row.country_code]?.area ?? 0) <= MIN_AREA_KM2) return;

          const msg = buildMessage(
            profile?.username ?? 'Explorer',
            row.country_code,
            countryMap[row.country_code]?.name,
          );

          setEvents((prev) => [{ id: row.id, message: msg }, ...prev.slice(0, 29)]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [buildMessage]);

  // ── scrolling animation ────────────────────────────────────────────────────

  useEffect(() => {
    if (events.length === 0) return;

    const width = events.length * ITEM_APPROX_WIDTH;
    totalWidth.current = width;
    const duration = (width / SCROLL_SPEED_PX_PER_SEC) * 1000;

    loopRef.current?.stop();
    scrollAnim.setValue(0);

    loopRef.current = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -width,
        duration,
        useNativeDriver: true,
      }),
    );
    loopRef.current.start();

    return () => { loopRef.current?.stop(); };
  }, [events, scrollAnim]);

  // ── render ─────────────────────────────────────────────────────────────────

  if (events.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>LIVE</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.row, { transform: [{ translateX: scrollAnim }] }]}
        >
          {/* Duplicate list so the loop feels seamless */}
          {[...events, ...events].map((e, i) => (
            <Text key={`${e.id}-${i}`} style={styles.item}>
              {e.message}{'   ·   '}
            </Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a3e',
    overflow: 'hidden',
    height: 32,
  },
  labelWrap: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  label: {
    color: '#0a0a1a',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  track: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    color: '#ccc',
    fontSize: 12,
    paddingLeft: 12,
    width: ITEM_APPROX_WIDTH,
  },
});
