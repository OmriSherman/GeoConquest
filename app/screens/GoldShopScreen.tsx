import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect, Circle, Path, Polygon } from 'react-native-svg';
import { useGame } from '../context/GameContext';
import GoldDisplay from '../components/GoldDisplay';

// ─── IAP Configuration ────────────────────────────────────────────────────────

const PRODUCT_IDS = Platform.select({
  ios: ['geoquest_gold_10k', 'geoquest_gold_100k', 'geoquest_gold_300k'],
  android: ['geoquest_gold_10k', 'geoquest_gold_100k', 'geoquest_gold_300k'],
  default: [],
})!;

interface GoldPackage {
  id: string;
  productId: string;
  gold: number;
  price: string; // fallback price (used if IAP unavailable)
  emoji: string;
  title: string;
  subtitle: string;
  popular?: boolean;
  bestValue?: boolean;
}

const GOLD_PACKAGES: GoldPackage[] = [
  {
    id: 'gold_10k',
    productId: 'geoquest_gold_10k',
    gold: 10_000,
    price: '$1.99',
    emoji: '⚔️',
    title: "Warlord's Stash",
    subtitle: 'Fuel your first conquests',
  },
  {
    id: 'gold_100k',
    productId: 'geoquest_gold_100k',
    gold: 100_000,
    price: '$17.99',
    emoji: '🏰',
    title: 'War Chest',
    subtitle: 'Dominate the world stage',
    popular: true,
  },
  {
    id: 'gold_300k',
    productId: 'geoquest_gold_300k',
    gold: 300_000,
    price: '$49.99',
    emoji: '👑',
    title: 'Empire Maker',
    subtitle: 'Conquer everything. Become legend.',
    bestValue: true,
  },
];

// ─── IAP Module (lazy loaded, fails gracefully in Expo Go) ────────────────────

let IAP: any = null;
let iapAvailable = false;

async function initIAP(): Promise<boolean> {
  try {
    IAP = require('react-native-iap');
    await IAP.initConnection();
    iapAvailable = true;
    return true;
  } catch (err) {
    // console.log('[IAP] Not available (Expo Go or simulator):', err);
    iapAvailable = false;
    return false;
  }
}

async function getProducts() {
  if (!iapAvailable || !IAP) return [];
  try {
    const products = await IAP.getProducts({ skus: PRODUCT_IDS });
    return products;
  } catch (err) {
    // console.log('[IAP] Failed to fetch products:', err);
    return [];
  }
}

async function purchaseProduct(productId: string): Promise<boolean> {
  if (!iapAvailable || !IAP) return false;
  try {
    await IAP.requestPurchase({ sku: productId });
    return true;
  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED') return false;
    console.error('[IAP] Purchase error:', err);
    throw err;
  }
}

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function WarlordsStashIllustration() {
  return (
    <Svg width="64" height="64" viewBox="0 0 64 64">
      {/* Coin pile - bottom layer */}
      <Rect x="8" y="46" width="48" height="12" rx="6" fill="#8B6914" />
      <Rect x="8" y="46" width="48" height="6" rx="6" fill="#FFD700" opacity={0.9} />
      {/* Coin pile - top layer */}
      <Rect x="16" y="38" width="32" height="12" rx="6" fill="#A07018" />
      <Rect x="16" y="38" width="32" height="6" rx="6" fill="#FFC200" opacity={0.85} />
      {/* Sword blade */}
      <Rect x="30" y="6" width="4" height="36" rx="2" fill="#D0D0D0" />
      <Rect x="30" y="6" width="4" height="16" rx="2" fill="#E8E8E8" />
      {/* Sword tip */}
      <Polygon points="30,6 34,6 32,2" fill="#E8E8E8" />
      {/* Crossguard */}
      <Rect x="20" y="32" width="24" height="5" rx="2.5" fill="#7B4F2E" />
      <Circle cx="20" cy="34.5" r="3" fill="#B8860B" />
      <Circle cx="44" cy="34.5" r="3" fill="#B8860B" />
      {/* Handle */}
      <Rect x="30.5" y="37" width="3" height="9" rx="1.5" fill="#5a3010" />
      {/* Blood groove highlight */}
      <Rect x="31.5" y="8" width="1" height="24" rx="0.5" fill="#B0B0B0" opacity={0.6} />
      {/* Sparkles */}
      <Circle cx="54" cy="10" r="2" fill="#FFE44D" opacity={0.9} />
      <Circle cx="10" cy="16" r="1.5" fill="#fff" opacity={0.7} />
      <Circle cx="56" cy="24" r="1.5" fill="#FFE44D" opacity={0.6} />
    </Svg>
  );
}

function WarChestIllustration() {
  return (
    <Svg width="64" height="64" viewBox="0 0 64 64">
      {/* Shadow */}
      <Rect x="10" y="57" width="44" height="4" rx="2" fill="#000" opacity={0.3} />
      {/* Chest body - dark iron */}
      <Rect x="6" y="36" width="52" height="22" rx="4" fill="#222" />
      {/* Horizontal iron band */}
      <Rect x="6" y="43" width="52" height="5" fill="#1a1a1a" />
      {/* Vertical iron bands */}
      <Rect x="24" y="36" width="5" height="22" fill="#1a1a1a" />
      <Rect x="35" y="36" width="5" height="22" fill="#1a1a1a" />
      {/* Rivet details */}
      <Circle cx="10" cy="39" r="2" fill="#555" />
      <Circle cx="54" cy="39" r="2" fill="#555" />
      <Circle cx="10" cy="55" r="2" fill="#555" />
      <Circle cx="54" cy="55" r="2" fill="#555" />
      <Circle cx="32" cy="39" r="2" fill="#555" />
      <Circle cx="32" cy="55" r="2" fill="#555" />
      {/* Lid - dark iron */}
      <Path d="M6 36 Q6 20 32 20 Q58 20 58 36 Z" fill="#1e1e1e" />
      <Path d="M6 36 Q6 28 32 28 Q58 28 58 36 Z" fill="#2a2a2a" />
      {/* Lid band */}
      <Path d="M6 33 Q32 31 58 33" stroke="#1a1a1a" strokeWidth="4" fill="none" />
      {/* Gold lock - only accent */}
      <Rect x="27" y="39" width="10" height="9" rx="3" fill="#8B6914" />
      <Rect x="29" y="37" width="6" height="5" rx="3" fill="none" stroke="#FFD700" strokeWidth="2.5" />
      <Circle cx="32" cy="43.5" r="1.5" fill="#FFD700" />
      {/* Gold edge highlight on lid seam */}
      <Rect x="6" y="35" width="52" height="2" rx="1" fill="#FFD700" opacity={0.35} />
      {/* Subtle gold glow leaking from inside */}
      <Circle cx="50" cy="26" r="2" fill="#FFD700" opacity={0.5} />
      <Circle cx="14" cy="24" r="1.5" fill="#FFD700" opacity={0.35} />
    </Svg>
  );
}

function EmpireMakerIllustration() {
  return (
    <Svg width="64" height="64" viewBox="0 0 64 64">
      {/* Globe */}
      <Circle cx="32" cy="42" r="20" fill="#0a1628" />
      <Circle cx="32" cy="42" r="20" fill="none" stroke="#1a4a8a" strokeWidth="1.5" />
      {/* Globe latitude lines */}
      <Path d="M12 42 Q32 32 52 42" stroke="#1a4a8a" strokeWidth="1" fill="none" />
      <Path d="M12 42 Q32 52 52 42" stroke="#1a4a8a" strokeWidth="1" fill="none" />
      {/* Globe meridian */}
      <Path d="M32 22 L32 62" stroke="#1a4a8a" strokeWidth="1" />
      {/* Continent shapes */}
      <Path d="M14 36 Q20 30 26 36 Q22 44 16 42 Z" fill="#2a7a3a" opacity={0.85} />
      <Path d="M36 30 Q46 26 50 36 Q46 46 38 42 Q34 37 36 30 Z" fill="#2a7a3a" opacity={0.85} />
      <Path d="M28 50 Q32 47 36 50 Q34 55 30 55 Z" fill="#2a7a3a" opacity={0.7} />
      {/* Crown */}
      <Polygon points="18,24 18,12 24,18 32,10 40,18 46,12 46,24" fill="#8B6914" />
      <Polygon points="18,24 18,12 24,18 32,10 40,18 46,12 46,24" fill="#FFD700" opacity={0.9} />
      {/* Crown band */}
      <Rect x="16" y="20" width="32" height="6" rx="2" fill="#FFD700" />
      <Rect x="16" y="20" width="32" height="3" rx="2" fill="#FFE44D" opacity={0.5} />
      {/* Crown gems */}
      <Circle cx="32" cy="14" r="3" fill="#CC2222" />
      <Circle cx="21" cy="21" r="2.5" fill="#1144CC" />
      <Circle cx="43" cy="21" r="2.5" fill="#116622" />
      {/* Gem highlights */}
      <Circle cx="31" cy="13" r="1" fill="#FF8888" opacity={0.7} />
      {/* Sparkles */}
      <Circle cx="58" cy="22" r="2" fill="#FFE44D" opacity={0.9} />
      <Circle cx="6" cy="28" r="1.5" fill="#fff" opacity={0.7} />
      <Circle cx="56" cy="10" r="1.5" fill="#FFE44D" opacity={0.6} />
    </Svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoldShopScreen() {
  const { addGold } = useGame();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [iapReady, setIapReady] = useState(false);

  useEffect(() => {
    let purchaseListener: any;

    (async () => {
      const ready = await initIAP();
      setIapReady(ready);

      if (ready && IAP) {
        const products = await getProducts();
        setStoreProducts(products);
        // console.log('[IAP] Products:', products.map((p: any) => p.productId));

        // Listen for completed purchases
        purchaseListener = IAP.purchaseUpdatedListener(async (purchase: any) => {
          // console.log('[IAP] Purchase received:', purchase.productId);

          // Find matching package and add gold
          const pkg = GOLD_PACKAGES.find(p => p.productId === purchase.productId);
          if (pkg) {
            addGold(pkg.gold);
            Alert.alert(
              'Purchase Complete! 🎉',
              `You received 🪙 ${pkg.gold.toLocaleString()} Gold!`
            );
          }

          // Acknowledge/finish the purchase
          try {
            if (Platform.OS === 'ios') {
              await IAP.finishTransaction({ purchase, isConsumable: true });
            } else {
              await IAP.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            }
          } catch (ackErr) {
            console.warn('[IAP] Acknowledge error:', ackErr);
          }

          setPurchasing(null);
        });
      }
    })();

    return () => {
      purchaseListener?.remove?.();
      if (iapAvailable && IAP) {
        IAP.endConnection?.();
      }
    };
  }, []);

  function getStorePrice(productId: string): string | null {
    const product = storeProducts.find((p: any) => p.productId === productId);
    return product?.localizedPrice ?? null;
  }

  async function handlePurchase(pkg: GoldPackage) {
    if (purchasing) return;

    if (!iapReady) {
      // IAP not available — show info
      Alert.alert(
        'In-App Purchases',
        'In-app purchases are only available in production builds.\n\n' +
        'To test:\n' +
        '1. Build with EAS: npx eas build\n' +
        '2. Configure products in App Store Connect / Google Play Console\n\n' +
        `Package: ${pkg.title}\n` +
        `Gold: 🪙 ${pkg.gold.toLocaleString()}\n` +
        `Price: ${pkg.price}`,
      );
      return;
    }

    Alert.alert(
      `Buy ${pkg.title}?`,
      `You'll receive 🪙 ${pkg.gold.toLocaleString()} Gold for ${getStorePrice(pkg.productId) || pkg.price}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setPurchasing(pkg.id);
            try {
              await purchaseProduct(pkg.productId);
            } catch (err: any) {
              Alert.alert('Purchase Failed', err.message ?? 'Please try again.');
              setPurchasing(null);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>💎 Gold Shop</Text>
          <Text style={styles.subtitle}>
            {iapReady ? 'Supercharge your conquest' : 'Preview — build with EAS to purchase'}
          </Text>
        </View>
        <GoldDisplay />
      </View>

      {GOLD_PACKAGES.map((pkg) => {
        const storePrice = getStorePrice(pkg.productId);
        const displayPrice = storePrice || pkg.price;

        return (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.card,
              pkg.popular && styles.cardPopular,
              pkg.bestValue && styles.cardBestValue,
            ]}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing === pkg.id}
            activeOpacity={0.85}
          >
            {pkg.popular && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⭐ MOST POPULAR</Text>
              </View>
            )}
            {pkg.bestValue && (
              <View style={[styles.badge, styles.badgeBestValue]}>
                <Text style={styles.badgeText}>👑 BEST VALUE</Text>
              </View>
            )}

            <View style={styles.cardContent}>
              <View style={styles.illustrationContainer}>
                {pkg.id === 'gold_10k' && <WarlordsStashIllustration />}
                {pkg.id === 'gold_100k' && <WarChestIllustration />}
                {pkg.id === 'gold_300k' && <EmpireMakerIllustration />}
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{pkg.title}</Text>
                <Text style={styles.cardSubtitle}>{pkg.subtitle}</Text>
                <Text style={styles.goldAmount}>🪙 {pkg.gold.toLocaleString()}</Text>
              </View>

              <View style={[
                styles.priceButton,
                pkg.bestValue && styles.priceButtonBestValue,
              ]}>
                <Text style={[
                  styles.priceText,
                  pkg.bestValue && styles.priceTextBestValue,
                ]}>
                  {purchasing === pkg.id ? '...' : displayPrice}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.disclaimer}>
        {iapReady
          ? 'Purchases are processed securely via Apple/Google.'
          : '⚠️ Running in development mode. Build with EAS for real purchases.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  content: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
  },
  cardPopular: { borderColor: '#FFD700', borderWidth: 2 },
  cardBestValue: { borderColor: '#FF6B35', borderWidth: 2 },
  badge: {
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeBestValue: { backgroundColor: '#FF6B35' },
  badgeText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 12 },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  illustrationContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  cardSubtitle: { color: '#888', fontSize: 12 },
  goldAmount: { color: '#FFD700', fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  priceButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  priceButtonBestValue: { backgroundColor: '#FF6B35' },
  priceText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 15 },
  priceTextBestValue: { color: '#fff' },
  disclaimer: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
