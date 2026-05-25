import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── IAP Configuration ────────────────────────────────────────────────────────

const SUBSCRIPTION_IDS = Platform.select({
  ios: ['membership_lifetime', 'geoconquest_conqueror_monthly'],
  android: ['membership_lifetime', 'geoconquest_conqueror_monthly'],
  default: [],
})!;

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
    iapAvailable = false;
    return false;
  }
}

async function requestSubscription(sku: string): Promise<boolean> {
  if (!iapAvailable || !IAP) return false;
  try {
    if (sku === 'membership_lifetime') {
      await IAP.requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku },
          google: { skus: [sku] },
        },
      });
      return true;
    }

    let subscriptionOffers: Array<{ sku: string; offerToken: string }> | undefined;

    if (Platform.OS === 'android') {
      const subs = await IAP.fetchProducts({ skus: [sku], type: 'subs' });
      const sub = subs?.find((p: any) => p?.id === sku) ?? subs?.[0];
      const offerToken =
        (sub as any)?.subscriptionOfferDetailsAndroid?.[0]?.offerToken;

      if (!offerToken) {
        throw new Error('Missing subscription offer token. Ensure your base plan/offer is active in Play Console, then try again.');
      }
      subscriptionOffers = [{ sku, offerToken }];
    }

    await IAP.requestPurchase({
      type: 'subs',
      request: {
        apple: { sku },
        google: { skus: [sku], subscriptionOffers },
      },
    });
    return true;
  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED') return false;
    throw err;
  }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURE_ICON_IMAGES: Record<string, any> = {
  gold_coin: require('../../assets/avatars/gold_coin.png'),
  ancient_map: require('../../assets/avatars/ancient_map.png'),
  '⚡': require('../../assets/avatars/lightning.png'),
  '👑': require('../../assets/avatars/crown.png'),
  '🏆': require('../../assets/avatars/trophy.png'),
};

const FEATURES = [
  { icon: 'gold_coin', title: 'Daily Triple Rewards', desc: 'Earn 3× gold and 3× tickets from daily login rewards.' },
  { icon: 'ancient_map', title: 'Unlimited Maps', desc: 'Maps are never required. Play any quiz, any time, without limits.' },
  { icon: '🎭', title: 'Unique Avatars', desc: 'Exclusive Conqueror avatars not available anywhere else.' },
  { icon: '⚡', title: 'Unique Quests', desc: 'Access to exclusive quest content and rewards only for Conquerors.' },
  { icon: '👑', title: 'Conqueror Badge', desc: 'Exclusive crown badge displayed on the global leaderboard.' },
  { icon: '🏆', title: 'Big Game Bonus', desc: 'Earn 2× gold during special in-game events and competitions.' },
];

const COMPARE_ROWS: Array<{ label: string; free: string | boolean; pro: string | boolean }> = [
  { label: 'Daily Login Gold Multiplier', free: '1×', pro: '3×' },
  { label: 'Daily Login Ticket Multiplier', free: '1×', pro: '3×' },
  { label: 'Leaderboard Badge', free: false, pro: true },
  { label: 'Unique Avatars', free: false, pro: true },
  { label: 'Unique Quests', free: false, pro: true },
  { label: 'Early Feature Access', free: false, pro: true },
  { label: 'Map Requirement', free: '3 per day', pro: 'Never' },
];

const TESTIMONIALS = [
  {
    text: 'Went from rank #847 to top 50 in a month. The 2× gold boost is genuinely game-changing.',
    name: 'AtlasHunter_92',
    stars: 5,
  },
  {
    text: 'The double tickets stack up fast. I now own 80+ countries and I\'m not stopping.',
    name: 'MapMaster_Pro',
    stars: 5,
  },
  {
    text: 'Conqueror avatars are incredible. Worth it for the exclusives alone — I get compliments every match.',
    name: 'GeoConqueror',
    stars: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: 'How does the Lifetime plan work?',
    a: 'It\'s a one-time payment of $39.99 — no subscription, no renewals. You get permanent Conqueror access plus 100,000 gold and 30 tickets credited instantly.',
  },
  {
    q: 'Can I cancel my Monthly plan?',
    a: 'Yes. Cancel with one tap from your App Store / Google Play subscription settings at any time. You keep Conqueror access until the end of your billing period.',
  },
  {
    q: 'Do I keep my items if I cancel?',
    a: 'Yes! Every country, avatar, and flag you\'ve purchased remains yours permanently, regardless of subscription status.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'All payments are processed securely via the App Store or Google Play Billing — no direct card details are ever stored by us.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PremiumScreen({ navigation }: { navigation?: any }) {
  const { ownedCountries } = useGame();
  const { profile, purchaseConqueror } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<'unlimited' | 'monthly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [iapReady, setIapReady] = useState(false);

  // Initialize IAP and listen for purchase updates
  useEffect(() => {
    let purchaseListener: any;
    let purchaseErrorListener: any;

    (async () => {
      const ready = await initIAP();
      setIapReady(ready);

      if (ready && IAP) {
        // Listen for completed subscriptions
        purchaseListener = IAP.purchaseUpdatedListener(async (purchase: any) => {
          // console.log('[IAP] Subscription received:', purchase.productId);

          // Determine plan from product ID
          const purchasedPlan = purchase.productId.includes('monthly') ? 'monthly' : 'unlimited';

          try {
            // Activate conqueror on backend
            await purchaseConqueror(purchasedPlan);

            // Acknowledge the purchase
            try {
              await IAP.finishTransaction({ purchase, isConsumable: false });
            } catch (ackErr) {
              console.warn('[IAP] Acknowledge error:', ackErr);
            }

            showAlert({
              variant: 'premium',
              title: 'Welcome Conqueror',
              titleNode: (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Image
                    source={require('../../assets/avatars/star2.png')}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: '#9B59B6', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
                    Welcome Conqueror
                  </Text>
                  <Image
                    source={require('../../assets/avatars/star2.png')}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                  />
                </View>
              ),
              contentNode:
                purchasedPlan === 'unlimited' ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#ddd', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
                      You are now a permanent conqueror - the world is at your feet! Also you got:
                    </Text>

                    <View style={{ gap: 8, alignSelf: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#ddd', fontSize: 16, fontWeight: '600' }}>- 100,000</Text>
                        <Image
                          source={require('../../assets/avatars/gold_coin.png')}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#ddd', fontSize: 16, fontWeight: '600' }}>- 30</Text>
                        <Image
                          source={require('../../assets/avatars/raffle_ticket.png')}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={{ color: '#ddd', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
                      Your monthly Conqueror subscription is active!
                    </Text>
                  </View>
                ),
              buttons: [{ text: 'Awesome!', style: 'cta', onPress: () => navigation?.goBack?.() }],
            });
          } catch (err: any) {
            showAlert({ title: 'Error', message: err.message ?? 'Failed to activate Conqueror status' });
          } finally {
            setPurchasing(false);
          }
        });

        purchaseErrorListener = IAP.purchaseErrorListener((err: any) => {
          if (err?.code !== 'E_USER_CANCELLED') {
            showAlert({ title: 'Purchase Failed', message: err?.message ?? 'Please try again.' });
          }
          setPurchasing(false);
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
  }, [purchaseConqueror, navigation, showAlert]);

  const countriesOwned = ownedCountries.length;
  const hookStat =
    countriesOwned >= 10
      ? `You've conquered ${countriesOwned} countries — impressive.`
      : countriesOwned > 0
      ? `You've conquered ${countriesOwned} ${countriesOwned === 1 ? 'country' : 'countries'} so far.`
      : "You're just starting your conquest.";

  async function handlePurchase() {
    if (purchasing || profile?.is_conquerer) return;

    setPurchasing(true);
    try {
      if (!iapReady) {
        // IAP not available — show development message
        showAlert({
          title: 'In-App Purchases',
          message:
            'In-app subscriptions are only available in production builds.\n\n' +
            'To test:\n' +
            '1. Build with EAS: npx eas build\n' +
            '2. Configure subscriptions in App Store Connect / Google Play Console\n\n' +
            `Plan: ${plan === 'unlimited' ? 'Lifetime' : 'Monthly'}\n` +
            `Price: ${plan === 'unlimited' ? '$39.99 once' : '$1.99 first month, then $3.99/mo'}`,
          messageAlign: 'left',
          buttons: [{ text: 'OK', onPress: () => setPurchasing(false) }],
        });
        return;
      }

      const productId = plan === 'unlimited'
        ? 'membership_lifetime'
        : 'geoconquest_conqueror_monthly';

      showAlert({
        variant: 'premium',
        icon: (
          <Image
            source={require('../../assets/avatars/conqueror.png')}
            style={{ width: 92, height: 92 }}
            resizeMode="contain"
          />
        ),
        title: 'Confirm Purchase',
        contentNode: (
          <View style={styles.purchaseSummary}>
            <Text style={styles.purchasePlanName}>
              {plan === 'unlimited' ? 'Lifetime Conqueror' : 'Monthly Conqueror'}
            </Text>
            <Text style={styles.purchasePlanSubtitle}>
              {plan === 'unlimited' ? 'Permanent access, no renewals' : 'Renews monthly through the store'}
            </Text>
            <View style={styles.purchaseDivider} />
            <View style={styles.purchaseSummaryRow}>
              <Text style={styles.purchaseSummaryLabel}>Price</Text>
              <Text style={styles.purchaseSummaryValue}>
                {plan === 'unlimited' ? '$39.99 once' : '$1.99 first month'}
              </Text>
            </View>
            {plan === 'unlimited' && (
              <View style={styles.purchaseSummaryRow}>
                <Text style={styles.purchaseSummaryLabel}>Bonus</Text>
                <Text style={styles.purchaseSummaryValue}>100K Gold + 30 Tickets</Text>
              </View>
            )}
            <Text style={styles.purchaseStoreNote}>Payment is handled securely by Apple/Google.</Text>
          </View>
        ),
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => setPurchasing(false) },
          {
            text: 'Buy',
            style: 'cta',
            onPress: async () => {
              try {
                const started = await requestSubscription(productId);
                if (!started) setPurchasing(false);
                // Purchase listener will handle activation
              } catch (err: any) {
                showAlert({ title: 'Purchase Failed', message: err.message ?? 'Please try again.' });
                setPurchasing(false);
              }
            },
          },
        ],
      });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message ?? 'Something went wrong.' });
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Intro offer banner ─────────────────────────────────────────────── */}
      <View style={[styles.urgencyBar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.urgencyText}>Monthly plan — first month just </Text>
        <Text style={styles.urgencyTimer}>$1.99</Text>
        <Text style={styles.urgencyText}> · cancel anytime</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Close button ───────────────────────────────────────────────── */}
        {navigation && (
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#888" />
          </TouchableOpacity>
        )}

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/avatars/conqueror.png')}
            style={styles.heroConqueror}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Become a{'\n'}World Conqueror</Text>
          <Text style={styles.heroSub}>
            Master geography. Dominate the leaderboard.{'\n'}Conquer the world without limits.
          </Text>
          <View style={styles.joinPill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={require('../../assets/avatars/globe.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.joinText}>Join Conquerors Worldwide</Text>
            </View>
          </View>
        </View>

        {/* ── Personal hook ──────────────────────────────────────────────── */}
        <View style={styles.hookCard}>
          <Text style={styles.hookText}>
            {hookStat}{' '}
            <Text style={styles.hookHighlight}>
              Conqueror-tier explorers own 3× more territory
            </Text>
            {' '}and climb the leaderboard 5× faster than free players.
          </Text>
        </View>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Everything in Conqueror</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              {FEATURE_ICON_IMAGES[f.icon]
                ? <Image source={FEATURE_ICON_IMAGES[f.icon]} style={{ width: 26, height: 26, marginBottom: 8 }} resizeMode="contain" />
                : <Text style={styles.featureIcon}>{f.icon}</Text>
              }
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Comparison ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Free vs Conqueror</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableLabelCol, styles.tableHeaderText]}>Feature</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderText]}>Free</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderTextPro]}>Conqueror</Text>
          </View>
          {COMPARE_ROWS.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableLabelCol]}>{row.label}</Text>
              <View style={styles.tableCellCenterView}>
                {typeof row.free === 'boolean' ? (
                  <Text style={row.free ? styles.checkYes : styles.checkNo}>{row.free ? '✓' : '✕'}</Text>
                ) : (
                  <Text style={styles.tableFreeVal}>{row.free}</Text>
                )}
              </View>
              <View style={styles.tableCellCenterView}>
                {typeof row.pro === 'boolean' ? (
                  <Text style={row.pro ? styles.checkPro : styles.checkNo}>{row.pro ? '✓' : '✕'}</Text>
                ) : (
                  <Text style={styles.tableProVal}>{row.pro}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        <View style={styles.pricingRow}>
          {/* Monthly — shown first, MOST POPULAR */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'monthly' && styles.priceCardSelected]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.85}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>BEST VALUE</Text>
            </View>
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>
              $1.99<Text style={styles.planPer}>/mo</Text>
            </Text>
            <Text style={styles.planBreakdown}>First month intro price</Text>
            <Text style={styles.planOldPrice}>Then $3.99/mo · cancel anytime</Text>
          </TouchableOpacity>

          {/* Lifetime */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'unlimited' && styles.priceCardSelected]}
            onPress={() => setPlan('unlimited')}
            activeOpacity={0.85}
          >
            <Text style={styles.planName}>Lifetime</Text>
            <Text style={styles.planPrice}>
              $39.99<Text style={styles.planPer}> once</Text>
            </Text>
            <Text style={styles.planBreakdown}>One-time · no renewals</Text>
            <View style={styles.savingBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.savingText}>+100K</Text>
                <Image source={require('../../assets/avatars/gold_coin.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.savingText}>+30</Text>
                <Image
                  source={require('../../assets/avatars/raffle_ticket.png')}
                  style={{ width: 14, height: 14 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.trialNote}>Processed securely via App Store / Google Play</Text>

        {/* ── Trust signals ──────────────────────────────────────────────── */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark' as const, label: 'Secure Payment' },
            { icon: 'infinite' as const, label: 'Lifetime Access' },
            { icon: 'flash' as const, label: 'Instant Access' },
          ].map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name={t.icon} size={18} color="#9B59B6" />
              <Text style={styles.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>What Conquerors Say</Text>
        <View style={styles.starsRow}>
          <Text style={styles.starsGold}>★★★★★</Text>
          <Text style={styles.ratingLabel}>  Rated 5 stars by our Conquerors</Text>
        </View>
        {TESTIMONIALS.map((t, i) => (
          <View key={i} style={styles.testimonialCard}>
            <Text style={styles.testimonialQuote}>"{t.text}"</Text>
            <View style={styles.testimonialFooter}>
              <Text style={styles.testimonialName}>— {t.name}</Text>
              <Text style={styles.testimonialStars}>{'★'.repeat(t.stars)}</Text>
            </View>
          </View>
        ))}

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>FAQ</Text>
        {FAQ_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqItem}
            onPress={() => setOpenFaq(openFaq === i ? null : i)}
            activeOpacity={0.8}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color="#888" />
            </View>
            {openFaq === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        {/* ── Final block ────────────────────────────────────────────────── */}
        <View style={styles.finalBlock}>
          <Text style={styles.finalTitle}>Ready to conquer the world?</Text>
          <Text style={styles.finalSub}>
            Join 1,200 Conquerors and claim your spot on the global leaderboard.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky CTA bar ─────────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity
          style={[styles.ctaPrimary, (purchasing || profile?.is_conquerer) && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || profile?.is_conquerer}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaPrimaryLabel}>
            {profile?.is_conquerer
              ? '✓ Conqueror Active'
              : purchasing
              ? 'Processing...'
              : plan === 'unlimited'
              ? 'Get Lifetime Access'
              : 'Start Monthly'}
          </Text>
          <Text style={styles.ctaPlanNote}>
            {profile?.is_conquerer
              ? 'Enjoy your premium status'
              : !iapReady
              ? 'Build with EAS to enable purchases'
              : plan === 'unlimited'
              ? '$39.99 · Lifetime · +100K Gold + 30 Tickets'
              : '$1.99 first month, then $3.99/mo'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSwitch}
          onPress={() => setPlan(plan === 'unlimited' ? 'monthly' : 'unlimited')}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaSwitchText}>
            {plan === 'monthly' ? 'Or go Lifetime — $39.99 once, no renewals' : 'Switch to Monthly — $1.99 first month'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a1a' },

  // Urgency
  urgencyBar: {
    backgroundColor: '#120820',
    borderBottomWidth: 1,
    borderBottomColor: '#7B2FBE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  urgencyText: { color: '#9B59B6', fontSize: 13, fontWeight: '600' },
  urgencyTimer: { color: '#9B59B6', fontSize: 13, fontWeight: 'bold' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },

  // Close
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: -4,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  heroConqueror: { width: 220, height: 270, marginBottom: 8 },
  heroTitle: {
    color: '#9B59B6',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  heroSub: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  joinPill: {
    backgroundColor: '#1a0a2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7B2FBE',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  joinText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  // Hook
  hookCard: {
    backgroundColor: '#120820',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7B2FBE33',
    borderLeftWidth: 3,
    borderLeftColor: '#7B2FBE',
    padding: 16,
    marginBottom: 28,
  },
  hookText: { color: '#bbb', fontSize: 14, lineHeight: 21 },
  hookHighlight: { color: '#9B59B6', fontWeight: '700' },

  // Section title
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  // Features grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  featureCard: {
    width: (SCREEN_W - 42) / 2,
    backgroundColor: '#120820',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7B2FBE',
    padding: 14,
  },
  featureIcon: { fontSize: 26, marginBottom: 8 },
  featureTitle: { color: '#9B59B6', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  featureDesc: { color: '#888', fontSize: 12, lineHeight: 17 },

  // Comparison table
  table: {
    backgroundColor: '#0e0e1f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
    marginBottom: 32,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: '#111122' },
  tableHeaderRow: {
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  tableCell: { flex: 1.5, fontSize: 12 },
  tableLabelCol: { color: '#aaa' },
  tableCellCenter: { flex: 1, textAlign: 'center', fontSize: 12 },
  tableCellCenterView: { flex: 1, alignItems: 'center' },
  tableHeaderText: { color: '#888', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  tableHeaderTextPro: { color: '#9B59B6', fontWeight: 'bold', fontSize: 11, textAlign: 'center', flex: 1 },
  tableFreeVal: { color: '#666', fontSize: 12 },
  tableProVal: { color: '#9B59B6', fontSize: 12, fontWeight: '600' },
  checkYes: { color: '#6BCB77', fontSize: 14, fontWeight: 'bold' },
  checkPro: { color: '#9B59B6', fontSize: 14, fontWeight: 'bold' },
  checkNo: { color: '#444', fontSize: 14 },

  // Pricing
  pricingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    marginTop: 16,
    alignItems: 'stretch',
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#0e0e1f',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2a2a4e',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  priceCardSelected: {
    borderColor: '#7B2FBE',
    backgroundColor: '#120820',
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  priceCardMonthly: {},
  popularBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#7B2FBE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  planName: { color: '#aaa', fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  planPrice: { color: '#9B59B6', fontSize: 26, fontWeight: 'bold' },
  planPer: { fontSize: 14, fontWeight: 'normal', color: '#888' },
  planBreakdown: { color: '#6BCB77', fontSize: 11, fontWeight: '600', marginTop: 4 },
  savingBadge: {
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6BCB77',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  savingText: { color: '#6BCB77', fontSize: 10, fontWeight: 'bold' },
  planOldPrice: { color: '#888', fontSize: 11, marginTop: 4 },

  trialNote: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
  },
  purchaseSummary: {
    backgroundColor: '#160d24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#432160',
    padding: 14,
    gap: 8,
  },
  purchasePlanName: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  purchasePlanSubtitle: { color: '#9f8ab8', fontSize: 12, textAlign: 'center' },
  purchaseDivider: { height: 1, backgroundColor: '#432160', marginVertical: 4 },
  purchaseSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  purchaseSummaryLabel: { color: '#9f8ab8', fontSize: 13, fontWeight: '600' },
  purchaseSummaryValue: { color: '#c084fc', fontSize: 14, fontWeight: '800' },
  purchaseStoreNote: { color: '#777', fontSize: 11, textAlign: 'center', marginTop: 4 },

  // Trust
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  trustItem: { alignItems: 'center', gap: 5 },
  trustText: { color: '#666', fontSize: 11 },

  // Testimonials
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsGold: { color: '#9B59B6', fontSize: 18 },
  ratingLabel: { color: '#888', fontSize: 12 },
  testimonialCard: {
    backgroundColor: '#0e0e1f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    padding: 16,
    marginBottom: 10,
  },
  testimonialQuote: { color: '#ccc', fontSize: 13, lineHeight: 19, marginBottom: 10, fontStyle: 'italic' },
  testimonialFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testimonialName: { color: '#9B59B6', fontSize: 12, fontWeight: '600' },
  testimonialStars: { color: '#9B59B6', fontSize: 13 },

  // FAQ
  faqItem: {
    backgroundColor: '#0e0e1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    padding: 14,
    marginBottom: 8,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { color: '#ddd', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  faqA: { color: '#888', fontSize: 13, lineHeight: 19, marginTop: 10 },

  // Final block
  finalBlock: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  finalTitle: { color: '#9B59B6', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  finalSub: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Sticky CTA
  stickyBar: {
    backgroundColor: '#0e0e1f',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  ctaPrimary: {
    backgroundColor: '#7B2FBE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#9B59B6',
  },
  ctaPrimaryLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ctaPlanNote: { color: '#ddd', fontSize: 11, opacity: 0.8, marginTop: 2 },
  ctaDisabled: { opacity: 0.6 },
  ctaSwitch: { alignItems: 'center', paddingVertical: 4 },
  ctaSwitchText: { color: '#888', fontSize: 12 },
});
