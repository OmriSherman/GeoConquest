import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { useAlert } from '../context/AlertContext';
import GoldDisplay from '../components/GoldDisplay';

const GOLD_IMAGES = {
  gold_t1: require('../../assets/gold_t1.png'),
  gold_t2: require('../../assets/gold_t2.png'),
  gold_t3: require('../../assets/gold_t3.png'),
};

// ─── IAP Configuration ────────────────────────────────────────────────────────

const PRODUCT_IDS = Platform.select({
  ios: ['gold_t1', 'gold_t2', 'gold_t3'],
  android: ['gold_t1', 'gold_t2', 'gold_t3'],
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
    id: 'gold_t1',
    productId: 'gold_t1',
    gold: 20_000,
    price: '$2.99',
    emoji: '⚔️',
    title: "Warlord's Stash",
    subtitle: 'Build up your gold reserves',
  },
  {
    id: 'gold_t2',
    productId: 'gold_t2',
    gold: 140_000,
    price: '$12.99',
    emoji: '🏰',
    title: 'Forgotten Vault',
    subtitle: 'Expand your territory',
    popular: true,
  },
  {
    id: 'gold_t3',
    productId: 'gold_t3',
    gold: 500_000,
    price: '$31.99',
    emoji: '👑',
    title: 'Unclaimed Riches',
    subtitle: 'Premium collection for dedicated players',
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
    if (Platform.OS === 'android') {
      try {
        await IAP.flushFailedPurchasesCachedAsPendingAndroid?.();
      } catch {}
    }
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
    const products = await IAP.fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
    return (products || []).filter((p: any) => p?.type === 'in-app');
  } catch (err) {
    // console.log('[IAP] Failed to fetch products:', err);
    return [];
  }
}

async function purchaseProduct(productId: string): Promise<boolean> {
  if (!iapAvailable || !IAP) return false;
  try {
    await IAP.requestPurchase({
      type: 'in-app',
      request: {
        apple: { sku: productId },
        google: { skus: [productId] },
      },
    });
    return true;
  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED') return false;
    console.error('[IAP] Purchase error:', err);
    throw err;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoldShopScreen() {
  const { addGold } = useGame();
  const { showAlert } = useAlert();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [iapReady, setIapReady] = useState(false);

  useEffect(() => {
    let purchaseListener: any;
    let purchaseErrorListener: any;

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
              showAlert({
                title: 'Purchase Complete! 🎉',
                message: `You received ${pkg.gold.toLocaleString()} Gold!`,
              });
            }

          // Acknowledge/finish the purchase
          try {
            await IAP.finishTransaction({ purchase, isConsumable: true });
          } catch (ackErr) {
            console.warn('[IAP] Acknowledge error:', ackErr);
          }

          setPurchasing(null);
        });

        purchaseErrorListener = IAP.purchaseErrorListener((err: any) => {
          if (err?.code !== 'E_USER_CANCELLED') {
            showAlert({ title: 'Purchase Failed', message: err?.message ?? 'Please try again.' });
          }
          setPurchasing(null);
        });
      }
    })();

    return () => {
      purchaseListener?.remove?.();
      purchaseErrorListener?.remove?.();
      if (iapAvailable && IAP) {
        IAP.endConnection?.();
      }
    };
  }, [addGold, showAlert]);

  function getStorePrice(productId: string): string | null {
    const product = storeProducts.find((p: any) => p.productId === productId);
    return product?.localizedPrice ?? null;
  }

  async function handlePurchase(pkg: GoldPackage) {
    if (purchasing) return;

    if (!iapReady) {
      // IAP not available — show info
      showAlert({
        title: 'In-App Purchases',
        message:
          'In-app purchases are only available in production builds.\n\n' +
          'To test:\n' +
          '1. Build with EAS: npx eas build\n' +
          '2. Configure products in App Store Connect / Google Play Console\n\n' +
          `Package: ${pkg.title}\n` +
          `Gold: ${pkg.gold.toLocaleString()}\n` +
          `Price: ${pkg.price}`,
        messageAlign: 'left',
      });
      return;
    }

    showAlert({
      title: `Buy ${pkg.title}?`,
      message: `You'll receive ${pkg.gold.toLocaleString()} Gold for ${getStorePrice(pkg.productId) || pkg.price}`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          style: 'cta',
          onPress: async () => {
            setPurchasing(pkg.id);
            try {
              const started = await purchaseProduct(pkg.productId);
              if (!started) setPurchasing(null);
            } catch (err: any) {
              showAlert({ title: 'Purchase Failed', message: err.message ?? 'Please try again.' });
              setPurchasing(null);
            }
          },
        },
      ],
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gold Shop</Text>
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
                <Text style={styles.badgeText}>MOST POPULAR</Text>
              </View>
            )}
            {pkg.bestValue && (
              <View style={[styles.badge, styles.badgeBestValue]}>
                <Text style={styles.badgeText}>BEST VALUE</Text>
              </View>
            )}

            <View style={styles.cardContent}>
              <View style={styles.illustrationContainer}>
                <Image
                  source={GOLD_IMAGES[pkg.id as keyof typeof GOLD_IMAGES] || GOLD_IMAGES.gold_t1}
                  style={styles.illustrationImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{pkg.title}</Text>
                <Text style={styles.cardSubtitle}>{pkg.subtitle}</Text>
                <Text style={styles.goldAmount}>{pkg.gold.toLocaleString()} Gold</Text>
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
    alignItems: 'center',
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
    alignItems: 'stretch',
    padding: 10,
    gap: 8,
  },
  illustrationContainer: {
    width: 56,
    borderRadius: 12,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    overflow: 'hidden',
  },
  illustrationEmoji: { fontSize: 22 },
  illustrationImg: { width: 56, height: 92 },
  cardInfo: { flex: 2, gap: 2, justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  cardSubtitle: { color: '#888', fontSize: 11 },
  goldAmount: { color: '#FFD700', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  priceButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceButtonBestValue: { backgroundColor: '#FF6B35' },
  priceText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 14 },
  priceTextBestValue: { color: '#fff' },
  disclaimer: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
