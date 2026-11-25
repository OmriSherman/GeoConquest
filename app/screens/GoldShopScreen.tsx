import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { t } from '../lib/i18n';
import GoldDisplay from '../components/GoldDisplay';
import { STORE_BILLING_NAME, STORE_CONSOLE_NAME } from '../lib/storeLinks';

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
    title: "Warlord's Stash",
    subtitle: 'Build up your gold reserves',
  },
  {
    id: 'gold_t2',
    productId: 'gold_t2',
    gold: 140_000,
    price: '$12.99',
    title: 'Forgotten Vault',
    subtitle: 'Expand your territory',
    popular: true,
  },
  {
    id: 'gold_t3',
    productId: 'gold_t3',
    gold: 500_000,
    price: '$29.99',
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
    const inApp = (products || []).filter((p: any) => p?.type === 'in-app');

    // Log any SKUs the store did not return so review/sandbox issues are diagnosable.
    const returnedIds = new Set(inApp.map((p: any) => p.id ?? p.productId));
    const missing = PRODUCT_IDS.filter((id) => !returnedIds.has(id));
    if (missing.length) {
      console.warn(`[IAP] Store did not return products: ${missing.join(', ')}. Check App Store Connect configuration & Paid Apps Agreement.`);
    }
    return inApp;
  } catch (err) {
    console.warn('[IAP] Failed to fetch products:', err);
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
  const { addGold } = useAuth();
  const { showAlert } = useAlert();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [iapReady, setIapReady] = useState(false);
  // ponytail: local overlay avoids nested-Modal issue on iOS (GoldShop is inside a Modal)
  const [confirmPkg, setConfirmPkg] = useState<GoldPackage | null>(null);

  // Keep latest callbacks in refs so the listener (registered once) never goes stale.
  const addGoldRef = useRef(addGold);
  const showAlertRef = useRef(showAlert);
  useEffect(() => { addGoldRef.current = addGold; }, [addGold]);
  useEffect(() => { showAlertRef.current = showAlert; }, [showAlert]);

  useEffect(() => {
    let purchaseListener: any;
    let purchaseErrorListener: any;

    (async () => {
      const ready = await initIAP();
      setIapReady(ready);

      if (ready && IAP) {
        const products = await getProducts();
        setStoreProducts(products);

        // Register listener exactly once — refs give access to latest callbacks.
        purchaseListener = IAP.purchaseUpdatedListener(async (purchase: any) => {
          try {
            const pkg = GOLD_PACKAGES.find(p => p.productId === purchase.productId);
            if (!pkg) throw new Error('Unknown purchase package.');

            await addGoldRef.current(pkg.gold);
            await IAP.finishTransaction({ purchase, isConsumable: true });
            showAlertRef.current({
              title: t('goldShop.purchaseSuccessTitle'),
              icon: (
                <Image
                  source={GOLD_IMAGES[pkg.id as keyof typeof GOLD_IMAGES] || GOLD_IMAGES.gold_t1}
                  style={{ width: 82, height: 82 }}
                  resizeMode="contain"
                />
              ),
              contentNode: (
                <View style={styles.purchaseSuccessBox}>
                  <Text style={styles.purchaseSuccessTitle}>{t('goldShop.goldAddedTitle', { amount: pkg.gold.toLocaleString() })}</Text>
                  <Text style={styles.purchaseSuccessText}>{t('goldShop.goldAddedSubtitle')}</Text>
                </View>
              ),
            });
          } catch (purchaseUpdateError: any) {
            console.warn('[IAP] Failed to deliver purchase:', purchaseUpdateError);
            showAlertRef.current({
              title: t('goldShop.purchaseFailedTitle'),
              message: t('goldShop.pendingDelivery'),
            });
          } finally {
            setPurchasing(null);
          }
        });

        purchaseErrorListener = IAP.purchaseErrorListener((err: any) => {
          if (err?.code !== 'E_USER_CANCELLED') {
            showAlertRef.current({ title: t('goldShop.purchaseFailedTitle'), message: err?.message ?? t('goldShop.purchaseFailed') });
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
  }, []); // empty — listener is registered once, refs stay current

  function getStorePrice(productId: string): string | null {
    // react-native-iap v14 products expose `id`/`displayPrice`
    // (older versions used `productId`/`localizedPrice`).
    const product = storeProducts.find((p: any) => (p.id ?? p.productId) === productId);
    return product?.displayPrice ?? product?.localizedPrice ?? null;
  }

  async function handlePurchase(pkg: GoldPackage) {
    if (purchasing) return;

    if (!iapReady) {
      // IAP not available — show info
      showAlert({
        title: t('goldShop.iapTitle'),
        message: t('goldShop.iapUnavailableBody', { store: STORE_CONSOLE_NAME, package: pkg.title, gold: pkg.gold.toLocaleString(), price: pkg.price }),
        messageAlign: 'left',
      });
      return;
    }

    // If the store is ready but never returned this product, a purchase attempt
    // would fail silently/confusingly. Tell the user instead of a no-op.
    const storePrice = getStorePrice(pkg.productId);
    if (storeProducts.length > 0 && storePrice === null) {
      showAlert({
        title: t('goldShop.tempUnavailableTitle'),
        message: t('goldShop.tempUnavailableBody'),
      });
      return;
    }

    setConfirmPkg(pkg);
  }

  async function handleConfirmBuy() {
    if (!confirmPkg) return;
    const pkg = confirmPkg;
    setConfirmPkg(null);
    setPurchasing(pkg.id);
    try {
      const started = await purchaseProduct(pkg.productId);
      if (!started) setPurchasing(null);
    } catch (err: any) {
      showAlert({ title: t('goldShop.purchaseFailedTitle'), message: err.message ?? t('goldShop.purchaseFailed') });
      setPurchasing(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('goldShop.title')}</Text>
          <Text style={styles.subtitle}>
            {iapReady ? t('goldShop.subtitle') : t('goldShop.previewMode')}
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
                <Text style={styles.badgeText}>{t('goldShop.mostPopular')}</Text>
              </View>
            )}
            {pkg.bestValue && (
              <View style={[styles.badge, styles.badgeBestValue]}>
                <Text style={styles.badgeText}>{t('goldShop.bestValue')}</Text>
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
                <Text style={styles.goldAmount}>{pkg.gold.toLocaleString()} {t('goldShop.gold')}</Text>
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
          ? `Purchases are processed securely via ${STORE_BILLING_NAME}.`
          : t('goldShop.devModeWarning')}
      </Text>
    </ScrollView>

    {/* Confirmation overlay — avoids nested-Modal issue on iOS */}
    {confirmPkg && (
      <View style={styles.overlayBackdrop}>
        <View style={styles.overlayCard}>
          <Image
            source={GOLD_IMAGES[confirmPkg.id as keyof typeof GOLD_IMAGES] || GOLD_IMAGES.gold_t1}
            style={{ width: 88, height: 88, marginBottom: 8 }}
            resizeMode="contain"
          />
          <Text style={styles.overlayTitle}>{t('goldShop.confirmTitle')}</Text>
          <View style={styles.purchaseSummary}>
            <Text style={styles.purchasePackageName}>{confirmPkg.title}</Text>
            <Text style={styles.purchasePackageSubtitle}>{confirmPkg.subtitle}</Text>
            <View style={styles.purchaseDivider} />
            <View style={styles.purchaseSummaryRow}>
              <Text style={styles.purchaseSummaryLabel}>{t('goldShop.youReceive')}</Text>
              <Text style={styles.purchaseSummaryValue}>{confirmPkg.gold.toLocaleString()} {t('goldShop.gold')}</Text>
            </View>
            <View style={styles.purchaseSummaryRow}>
              <Text style={styles.purchaseSummaryLabel}>{t('goldShop.price')}</Text>
              <Text style={styles.purchaseSummaryValue}>{getStorePrice(confirmPkg.productId) || confirmPkg.price}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.overlayBuyBtn} onPress={handleConfirmBuy} activeOpacity={0.85}>
            <Text style={styles.overlayBuyText}>{t('goldShop.buy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayCancelBtn} onPress={() => setConfirmPkg(null)} activeOpacity={0.7}>
            <Text style={styles.overlayCancelText}>{t('goldShop.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </View>
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
  purchaseSummary: {
    backgroundColor: '#15152a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    padding: 14,
    gap: 8,
  },
  purchasePackageName: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  purchasePackageSubtitle: { color: '#888', fontSize: 12, textAlign: 'center' },
  purchaseDivider: { height: 1, backgroundColor: '#2a2a4e', marginVertical: 4 },
  purchaseSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  purchaseSummaryLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  purchaseSummaryValue: { color: '#FFD700', fontSize: 14, fontWeight: '800' },
  purchaseSuccessBox: { alignItems: 'center', gap: 5 },
  purchaseSuccessTitle: { color: '#FFD700', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  purchaseSuccessText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  disclaimer: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 99,
  },
  overlayCard: {
    backgroundColor: '#0e0e1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    gap: 8,
  },
  overlayTitle: { color: '#FFD700', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  overlayBuyBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  overlayBuyText: { color: '#0a0a1a', fontWeight: '700', fontSize: 15 },
  overlayCancelBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  overlayCancelText: { color: '#666', fontSize: 13, fontWeight: '500' },
});
