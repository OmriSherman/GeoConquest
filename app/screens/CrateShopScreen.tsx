/**
 * CrateShopScreen — Gacha / Mystery Crate unboxing experience.
 *
 * Two crate tiers:
 *   Common (1,500 gold)  — lower-tier emoji avatars
 *   Legendary (5,000 gold) — elite emojis + all SVG avatars + faction flags
 *
 * Opening flow:
 *   1. Tap "Open" → client picks a weighted-random item from the pool.
 *   2. Call open_crate RPC (server validates pool + deducts gold).
 *   3. Shake animation → reveal card with rarity glow.
 *   4. Confetti on new item; gold compensation message on duplicate.
 */

import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { playPurchase, playVictory, playReject } from '../lib/audio';
import AvatarDisplay from '../components/AvatarDisplay';

// ─── Item pools ───────────────────────────────────────────────────────────────

type ItemType = 'avatar' | 'flag';
type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface PoolItem {
  id: string;
  type: ItemType;
  rarity: Rarity;
  label: string;
}

const COMMON_POOL: PoolItem[] = [
  { id: '🧛',   type: 'avatar', rarity: 'common', label: 'Vampire'  },
  { id: '🧙‍♂️', type: 'avatar', rarity: 'common', label: 'Wizard'   },
  { id: '🤖',   type: 'avatar', rarity: 'rare',   label: 'Robot'    },
  { id: '🦸',   type: 'avatar', rarity: 'rare',   label: 'Hero'     },
  { id: '👽',   type: 'avatar', rarity: 'rare',   label: 'Alien'    },
  { id: '🥷',   type: 'avatar', rarity: 'epic',   label: 'Ninja'    },
  { id: '👻',   type: 'avatar', rarity: 'epic',   label: 'Ghost'    },
];

const LEGENDARY_POOL: PoolItem[] = [
  // Elite emoji
  { id: '🐉',   type: 'avatar', rarity: 'epic',      label: 'Dragon'       },
  { id: '🧜‍♀️', type: 'avatar', rarity: 'epic',      label: 'Mermaid'      },
  { id: '👑',   type: 'avatar', rarity: 'legendary',  label: 'Monarch'      },
  // Cultural SVGs
  { id: 'svg_samurai',      type: 'avatar', rarity: 'rare',      label: 'Samurai'       },
  { id: 'svg_pharaoh',      type: 'avatar', rarity: 'rare',      label: 'Pharaoh'       },
  { id: 'svg_viking',       type: 'avatar', rarity: 'rare',      label: 'Viking'        },
  { id: 'svg_aztec',        type: 'avatar', rarity: 'rare',      label: 'Aztec'         },
  { id: 'svg_maharaja',     type: 'avatar', rarity: 'rare',      label: 'Maharaja'      },
  { id: 'svg_knight',       type: 'avatar', rarity: 'common',    label: 'Knight'        },
  { id: 'svg_cowboy',       type: 'avatar', rarity: 'common',    label: 'Cowboy'        },
  { id: 'svg_geisha',       type: 'avatar', rarity: 'rare',      label: 'Geisha'        },
  // Gaming SVGs
  { id: 'svg_witcher',      type: 'avatar', rarity: 'epic',      label: 'Witcher'       },
  { id: 'svg_ciri',         type: 'avatar', rarity: 'epic',      label: 'Ciri'          },
  { id: 'svg_dragonborn',   type: 'avatar', rarity: 'epic',      label: 'Dragonborn'    },
  { id: 'svg_daedric',      type: 'avatar', rarity: 'legendary', label: 'Daedric'       },
  { id: 'svg_cyber_v',      type: 'avatar', rarity: 'epic',      label: 'V'             },
  { id: 'svg_netrunner',    type: 'avatar', rarity: 'rare',      label: 'Netrunner'     },
  { id: 'svg_outlaw',       type: 'avatar', rarity: 'rare',      label: 'Outlaw'        },
  { id: 'svg_gunslinger',   type: 'avatar', rarity: 'rare',      label: 'Gunslinger'    },
  { id: 'svg_vault_dweller',type: 'avatar', rarity: 'epic',      label: 'Vault Dweller' },
  { id: 'svg_power_armor',  type: 'avatar', rarity: 'legendary', label: 'Power Armor'   },
  // Faction flags
  { id: 'flag_svg_nilfgaard',   type: 'flag', rarity: 'rare',      label: 'Nilfgaard'    },
  { id: 'flag_svg_temeria',     type: 'flag', rarity: 'rare',      label: 'Temeria'      },
  { id: 'flag_svg_stormcloak',  type: 'flag', rarity: 'rare',      label: 'Stormcloaks'  },
  { id: 'flag_svg_imperial',    type: 'flag', rarity: 'rare',      label: 'Imperial'     },
  { id: 'flag_svg_arasaka',     type: 'flag', rarity: 'epic',      label: 'Arasaka'      },
  { id: 'flag_svg_militech',    type: 'flag', rarity: 'epic',      label: 'Militech'     },
  { id: 'flag_svg_vanderlinde', type: 'flag', rarity: 'rare',      label: 'Van der Linde'},
  { id: 'flag_svg_lawman',      type: 'flag', rarity: 'common',    label: 'Lawman'       },
  { id: 'flag_svg_vaulttec',    type: 'flag', rarity: 'epic',      label: 'Vault-Tec'    },
  { id: 'flag_svg_brotherhood', type: 'flag', rarity: 'legendary', label: 'Brotherhood'  },
];

// Rarity weights  common=50, rare=30, epic=15, legendary=5
const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50, rare: 30, epic: 15, legendary: 5,
};

function pickWeightedItem(pool: PoolItem[]): PoolItem {
  const totalWeight = pool.reduce((s, i) => s + RARITY_WEIGHTS[i.rarity], 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= RARITY_WEIGHTS[item.rarity];
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

// ─── Rarity styling ───────────────────────────────────────────────────────────

const RARITY_COLOR: Record<Rarity, string> = {
  common:    '#aaaaaa',
  rare:      '#4488ff',
  epic:      '#aa44ff',
  legendary: '#FFD700',
};

const RARITY_LABEL: Record<Rarity, string> = {
  common:    'Common',
  rare:      'Rare',
  epic:      'Epic',
  legendary: 'LEGENDARY',
};

// ─── Crate configs ────────────────────────────────────────────────────────────

interface CrateConfig {
  id: 'common' | 'legendary';
  label: string;
  emoji: string;
  cost: number;
  description: string;
  pool: PoolItem[];
  glowColor: string;
}

const CRATES: CrateConfig[] = [
  {
    id: 'common',
    label: 'Common Crate',
    emoji: '📦',
    cost: 1500,
    description: 'Contains premium emoji avatars. Chance at Ninja & Ghost.',
    pool: COMMON_POOL,
    glowColor: '#aaaaaa',
  },
  {
    id: 'legendary',
    label: 'Legendary Crate',
    emoji: '🎁',
    cost: 5000,
    description: 'All SVG avatars, elite emojis & faction flags. Chance at Legendary drops!',
    pool: LEGENDARY_POOL,
    glowColor: '#FFD700',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface RevealState {
  item: PoolItem;
  isDuplicate: boolean;
  compensation?: number;
}

export default function CrateShopScreen() {
  const { profile } = useAuth();
  const [opening, setOpening]     = useState(false);
  const [reveal, setReveal]       = useState<RevealState | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gold, setGold]           = useState(profile?.gold_balance ?? 0);

  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  // Keep local gold in sync with profile
  React.useEffect(() => {
    setGold(profile?.gold_balance ?? 0);
  }, [profile?.gold_balance]);

  function shakeAndReveal(onDone: () => void) {
    revealAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim,  { toValue:  10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim,  { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim,  { toValue:  8,  duration: 55,  useNativeDriver: true }),
      Animated.timing(shakeAnim,  { toValue:  -8, duration: 55,  useNativeDriver: true }),
      Animated.timing(shakeAnim,  { toValue:  5,  duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim,  { toValue:   0, duration: 50,  useNativeDriver: true }),
    ]).start(onDone);
  }

  async function openCrate(crate: CrateConfig) {
    if (!profile) return;
    if (gold < crate.cost) {
      playReject();
      Alert.alert('Not enough gold', `You need 💰 ${crate.cost.toLocaleString()} gold.`);
      return;
    }

    setOpening(true);
    setReveal(null);

    const picked = pickWeightedItem(crate.pool);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playPurchase();

    shakeAndReveal(async () => {
      try {
        const { data, error } = await supabase.rpc('open_crate', {
          p_user_id:   profile.id,
          p_crate_type: crate.id,
          p_item_id:   picked.id,
          p_item_type: picked.type,
        });

        if (error) throw error;

        const result = data as { result: 'new' | 'duplicate'; compensation?: number };

        setReveal({
          item: picked,
          isDuplicate: result.result === 'duplicate',
          compensation: result.compensation,
        });

        // Update local gold immediately
        setGold((prev) => prev - crate.cost + (result.compensation ?? 0));

        if (result.result === 'new') {
          setShowConfetti(true);
          playVictory();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => setShowConfetti(false), 4000);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }

        // Reveal fade-in
        Animated.timing(revealAnim, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }).start();

      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Failed to open crate');
      } finally {
        setOpening(false);
      }
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Gold balance */}
      <View style={styles.goldRow}>
        <Text style={styles.goldText}>💰 {gold.toLocaleString()}</Text>
      </View>

      <Text style={styles.heading}>Mystery Crates</Text>
      <Text style={styles.sub}>Open a crate for a random avatar or flag. Duplicates refund gold.</Text>

      {/* Crate cards */}
      {CRATES.map((crate) => (
        <View key={crate.id} style={[styles.crateCard, { borderColor: crate.glowColor }]}>
          <Animated.Text
            style={[styles.crateEmoji, { transform: [{ translateX: reveal ? 0 : shakeAnim }] }]}
          >
            {crate.emoji}
          </Animated.Text>
          <Text style={[styles.crateLabel, { color: crate.glowColor }]}>{crate.label}</Text>
          <Text style={styles.crateDesc}>{crate.description}</Text>
          <TouchableOpacity
            style={[styles.openBtn, { borderColor: crate.glowColor, opacity: opening ? 0.5 : 1 }]}
            onPress={() => openCrate(crate)}
            disabled={opening}
          >
            <Text style={[styles.openBtnText, { color: crate.glowColor }]}>
              Open — 💰 {crate.cost.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Reveal card */}
      {reveal && (
        <Animated.View style={[styles.revealCard, { opacity: revealAnim, borderColor: RARITY_COLOR[reveal.item.rarity] }]}>
          <Text style={[styles.rarityLabel, { color: RARITY_COLOR[reveal.item.rarity] }]}>
            {RARITY_LABEL[reveal.item.rarity]}
          </Text>

          <View style={styles.revealAvatar}>
            <AvatarDisplay
              avatarId={reveal.item.type === 'avatar' ? reveal.item.id : '🧑'}
              avatarFlag={reveal.item.type === 'flag' ? reveal.item.id : undefined}
              size={80}
            />
          </View>

          <Text style={styles.revealItemLabel}>{reveal.item.label}</Text>

          {reveal.isDuplicate ? (
            <View style={styles.duplicateBadge}>
              <Text style={styles.duplicateText}>
                Already owned — refunded 💰 {reveal.compensation?.toLocaleString()}
              </Text>
            </View>
          ) : (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>New item unlocked!</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Rarity odds */}
      <View style={styles.oddsCard}>
        <Text style={styles.oddsTitle}>Drop Rates</Text>
        {(Object.entries(RARITY_WEIGHTS) as [Rarity, number][]).map(([r, w]) => {
          const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
          const pct = ((w / total) * 100).toFixed(0);
          return (
            <View key={r} style={styles.oddsRow}>
              <Text style={[styles.oddsRarity, { color: RARITY_COLOR[r] }]}>{RARITY_LABEL[r]}</Text>
              <Text style={styles.oddsPct}>{pct}%</Text>
            </View>
          );
        })}
      </View>

      {showConfetti && (
        <ConfettiCannon
          count={100}
          origin={{ x: -10, y: 0 }}
          colors={['#FFD700', '#aa44ff', '#4488ff', '#ff4444', '#ffffff']}
          explosionSpeed={400}
          fallSpeed={2800}
          fadeOut
          autoStart
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  content:   { padding: 20, gap: 16, paddingBottom: 40 },

  goldRow:   { alignItems: 'flex-end' },
  goldText:  { color: '#FFD700', fontWeight: 'bold', fontSize: 16 },

  heading: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  sub:     { color: '#888', fontSize: 13 },

  crateCard: {
    backgroundColor: '#0d0d20',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
  },
  crateEmoji:  { fontSize: 60 },
  crateLabel:  { fontSize: 18, fontWeight: 'bold' },
  crateDesc:   { color: '#aaa', fontSize: 13, textAlign: 'center' },
  openBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  openBtnText: { fontWeight: 'bold', fontSize: 15 },

  revealCard: {
    backgroundColor: '#0d0d20',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
  },
  rarityLabel:    { fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' },
  revealAvatar:   { marginVertical: 8 },
  revealItemLabel:{ color: '#fff', fontSize: 20, fontWeight: 'bold' },
  duplicateBadge: { backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  duplicateText:  { color: '#aaa', fontSize: 13 },
  newBadge:       { backgroundColor: '#1a3a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newText:        { color: '#44ff88', fontWeight: 'bold', fontSize: 13 },

  oddsCard: {
    backgroundColor: '#0d0d20',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1a1a3e',
  },
  oddsTitle:  { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  oddsRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  oddsRarity: { fontSize: 13, fontWeight: '600' },
  oddsPct:    { color: '#ccc', fontSize: 13 },
});
