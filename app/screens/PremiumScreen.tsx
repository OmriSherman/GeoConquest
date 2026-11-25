import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { t } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { ENTITLEMENT_ID, Purchases, restorePurchases } from '../lib/revenueCat';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Countdown timer ──────────────────────────────────────────────────────────

function useCountdown(totalSeconds: number) {
  const [remaining, setRemaining] = useState(totalSeconds);
  useEffect(() => {
    const id = setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURE_ICON_IMAGES: Record<string, any> = {
  gold_coin: require('../../assets/avatars/gold_coin.png'),
  '⚡': require('../../assets/avatars/lightning.png'),
  '👑': require('../../assets/avatars/crown.png'),
  '🏆': require('../../assets/avatars/trophy.png'),
  mythic: require('../../assets/avatars/mythic_closed.png'),
};

function getFeatures() {
  return [
    { icon: 'gold_coin', title: t('premium.feature1Title'), desc: t('premium.feature1Desc') },
    { icon: '🏆', title: t('premium.feature2Title'), desc: t('premium.feature2Desc') },
    { icon: '🎭', title: t('premium.feature4Title'), desc: t('premium.feature4Desc') },
    { icon: '⚡', title: t('premium.feature5Title'), desc: t('premium.feature5Desc') },
    { icon: '👑', title: t('premium.feature6Title'), desc: t('premium.feature6Desc') },
    { icon: 'mythic', title: t('premium.chestBenefitsTitle'), desc: t('premium.chestBenefitsDesc') },
  ];
}

function getCompareRows(): Array<{ label: string; free: string | boolean; pro: string | boolean }> {
  return [
    { label: t('premium.compare1'), free: '1×', pro: '3×' },
    { label: t('premium.dailyChestLevelUp'), free: '4 days', pro: '2 days' },
    { label: t('premium.compare2'), free: '1×', pro: '3×' },
    { label: t('premium.compare3'), free: false, pro: true },
    { label: t('premium.compare4'), free: false, pro: true },
    { label: t('premium.compare5'), free: false, pro: true },
    { label: t('premium.compare6'), free: '1×', pro: '2×' },
    { label: t('premium.compare7'), free: false, pro: true },
    { label: t('premium.compare8'), free: t('premium.flagOnly'), pro: t('premium.allQuizzes') },
  ];
}

const TESTIMONIALS = [
  {
    text: 'Went from rank #847 to top 50 in a month. The 2× gold boost is genuinely game-changing.',
    name: 'AtlasHunter_92',
    stars: 5,
  },
  {
    text: "The double tickets stack up fast. I now own 80+ countries and I'm not stopping.",
    name: 'MapMaster_Pro',
    stars: 5,
  },
  {
    text: 'Conqueror avatars are incredible. Worth it for the exclusives alone — I get compliments every match.',
    name: 'GeoConqueror',
    stars: 5,
  },
];

function getFaqItems() {
  return [
    { q: t('premium.faq1q'), a: t('premium.faq1a') },
    { q: t('premium.faq2q'), a: t('premium.faq2a') },
    { q: t('premium.faq3q'), a: t('premium.faq3a') },
    { q: t('premium.faq4q'), a: t('premium.faq4a') },
  ];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PremiumScreen({ navigation }: { navigation?: any }) {
  const { ownedCountries } = useGame();
  const { profile, purchaseConqueror } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const countdown = useCountdown(3 * 3600 + 47 * 60 + 22);

  const [plan, setPlan] = useState<'unlimited' | 'monthly'>('unlimited');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // RevenueCat packages keyed by plan
  const [rcPackages, setRcPackages] = useState<{ unlimited: any | null; monthly: any | null }>({
    unlimited: null,
    monthly: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const pkgs = offerings.current?.availablePackages ?? [];
        const lifetime = pkgs.find((p: any) => p.product?.identifier?.includes('lifetime'));
        const monthly = pkgs.find((p: any) =>
          p.product?.identifier?.includes('monthly') || p.packageType === 'MONTHLY'
        );
        setRcPackages({ unlimited: lifetime ?? null, monthly: monthly ?? null });
      } catch (err) {
        console.warn('[RevenueCat] Failed to fetch offerings:', err);
      }
    })();
  }, []);

  function planFromProductId(productId: string): 'unlimited' | 'yearly' | 'monthly' {
    if (productId.includes('lifetime')) return 'unlimited';
    if (productId.includes('year') || productId.includes('annual')) return 'yearly';
    return 'monthly';
  }

  // Live prices from RevenueCat, fallback to display strings
  const lifetimePrice = rcPackages.unlimited?.product?.priceString ?? '$39.99';
  const monthlyPrice = rcPackages.monthly?.product?.priceString ?? '$4.99';

  const countriesOwned = ownedCountries.length;
  const hookStat =
    countriesOwned >= 10
      ? `You've conquered ${countriesOwned} countries — impressive.`
      : countriesOwned > 0
      ? `You've conquered ${countriesOwned} ${countriesOwned === 1 ? 'country' : 'countries'} so far.`
      : "You're just starting your conquest.";

  async function handlePurchase() {
    if (purchasing || profile?.is_conquerer) return;

    const pkg = plan === 'unlimited' ? rcPackages.unlimited : rcPackages.monthly;
    if (!pkg) {
      showAlert({
        title: t('premium.plansLoading'),
        message: t('premium.plansLoadingBody'),
      });
      return;
    }

    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      if (!entitlement) {
        showAlert({ title: t('premium.purchaseIssue'), message: t('premium.purchaseIssueBody') });
        setPurchasing(false);
        return;
      }

      const purchasedPlan = planFromProductId(entitlement.productIdentifier ?? '');
      await purchaseConqueror(purchasedPlan);

      showAlert({
        variant: 'premium',
        title: t('premium.welcomeTitle'),
        titleNode: (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Image source={require('../../assets/avatars/star2.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
            <Text style={{ color: '#9B59B6', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>{t('premium.welcomeTitle')}</Text>
            <Image source={require('../../assets/avatars/star2.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
          </View>
        ),
        contentNode: purchasedPlan === 'unlimited' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#ddd', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              {t('premium.permanentConquerorBody')}
            </Text>
            <View style={{ gap: 8, alignSelf: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#ddd', fontSize: 16, fontWeight: '600' }}>- 10</Text>
                <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
              </View>
              <Text style={{ color: '#ddd', fontSize: 16, fontWeight: '600' }}>- 3 Mythic Chests</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: '#ddd', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            {t('premium.monthlyActiveBody')}
          </Text>
        ),
        buttons: [{ text: t('common.ok'), style: 'cta', onPress: () => navigation?.goBack?.() }],
      });
    } catch (err: any) {
      if (!err?.userCancelled && err?.code !== 'E_USER_CANCELLED') {
        showAlert({ title: t('shop.purchaseFailed'), message: err?.message ?? t('common.retry') });
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const customerInfo = await restorePurchases();
      const isActive = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      if (isActive) {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const restoredPlan = planFromProductId(entitlement.productIdentifier ?? '');
        await purchaseConqueror(restoredPlan);
        showAlert({
          title: t('premium.restoredTitle'),
          message: t('premium.restoredBody'),
          buttons: [{ text: t('premium.ok'), style: 'cta', onPress: () => navigation?.goBack?.() }],
        });
      } else {
        showAlert({ title: t('premium.nothingTitle'), message: t('premium.nothingBody') });
      }
    } catch (err: any) {
      showAlert({ title: t('premium.failedTitle'), message: err?.message ?? t('premium.failedBody') });
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Urgency banner ─────────────────────────────────────────────────── */}
      <View style={[styles.urgencyBar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.urgencyText}>{t('premium.urgencyBanner')}</Text>
        <Text style={styles.urgencyTimer}>{countdown}</Text>
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
          <Text style={styles.heroTitle}>{t('premium.heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('premium.heroSub')}</Text>
          <View style={styles.joinPill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image source={require('../../assets/avatars/globe.png')} style={{ width: 16, height: 16 }} resizeMode="contain" />
              <Text style={styles.joinText}>{t('premium.joinExplorers')}</Text>
            </View>
          </View>
          <View style={styles.heroOffer}>
            <Image source={require('../../assets/avatars/mythic_closed.png')} style={styles.heroOfferChest} resizeMode="contain" />
            <View style={styles.heroOfferCopy}>
              <Text style={styles.heroOfferKicker}>{plan === 'unlimited' ? 'THE COMPLETE CONQUEROR PATH' : 'KEEP YOUR MOMENTUM'}</Text>
              <Text style={styles.heroOfferTitle}>{plan === 'unlimited' ? 'Own the advantage for life' : 'Power up every month'}</Text>
              <Text style={styles.heroOfferSub}>{plan === 'unlimited' ? '10 tickets + 3 Mythic Chests included.' : '1 Mythic Chest every month, plus every core boost.'}</Text>
            </View>
            <Ionicons name="sparkles" size={18} color="#f6d365" />
          </View>
        </View>

        {/* ── Personal hook ──────────────────────────────────────────────── */}
        <View style={styles.hookCard}>
          <Text style={styles.hookText}>
            {hookStat}{' '}
            <Text style={styles.hookHighlight}>
              {t('premium.hookHighlight')}
            </Text>
            {' '}{t('premium.hookSuffix')}
          </Text>
        </View>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('premium.sectionEverything')}</Text>
        <View style={styles.featureGrid}>
          {getFeatures().map((f, i) => (
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
        <Text style={styles.sectionTitle}>{t('premium.sectionFreeVsPro')}</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableLabelCol, styles.tableHeaderText]}>{t('premium.featureHeader')}</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderText]}>{t('premium.freeHeader')}</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderTextPro]}>Conqueror</Text>
          </View>
          {getCompareRows().map((row, i) => (
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
        <Text style={styles.sectionTitle}>{t('premium.sectionChoosePlan')}</Text>
        <View style={styles.pricingRow}>
          {/* Lifetime */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'unlimited' && styles.priceCardSelected]}
            onPress={() => setPlan('unlimited')}
            activeOpacity={0.85}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>{t('premium.mostPopular')}</Text>
            </View>
            {plan === 'unlimited' && <View style={styles.selectedMark}><Ionicons name="checkmark" size={12} color="#20112f" /></View>}
            <Text style={styles.planName}>{t('premium.lifetime')}</Text>
            <Text style={styles.planPrice}>
              {lifetimePrice}<Text style={styles.planPer}> {t('premium.once')}</Text>
            </Text>
            <Text style={styles.planBreakdown}>{t('premium.lifetimeBreakdown')} · +3 Mythic Chests</Text>
            <View style={styles.savingBadge}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.savingText}>+10</Text>
                <Image source={require('../../assets/avatars/raffle_ticket.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
                <Text style={styles.savingText}>+3 Mythic</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'monthly' && styles.priceCardSelected, styles.priceCardMonthly]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.85}
          >
            {plan === 'monthly' && <View style={styles.selectedMark}><Ionicons name="checkmark" size={12} color="#20112f" /></View>}
            <Text style={styles.planName}>{t('premium.monthly')}</Text>
            <Text style={styles.planPrice}>
              {monthlyPrice}<Text style={styles.planPer}>{t('premium.monthlyPer')}</Text>
            </Text>
            <Text style={styles.planBreakdown}>{t('premium.monthlyIntroOffer')} · {t('premium.cancelAnytime')} · 1 Mythic Chest monthly</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.trialNote}>{t('premium.securePayment')}</Text>

        {/* ── Trust signals ──────────────────────────────────────────────── */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark' as const, label: t('premium.trustSecure') },
            { icon: 'infinite' as const, label: t('premium.trustLifetime') },
            { icon: 'flash' as const, label: t('premium.trustInstant') },
          ].map((item, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name={item.icon} size={18} color="#9B59B6" />
              <Text style={styles.trustText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('premium.sectionTestimonials')}</Text>
        <View style={styles.starsRow}>
          <Text style={styles.starsGold}>★★★★★</Text>
          <Text style={styles.ratingLabel}>  {t('premium.ratingLabel')}</Text>
        </View>
        {TESTIMONIALS.map((item, i) => (
          <View key={i} style={styles.testimonialCard}>
            <Text style={styles.testimonialQuote}>"{item.text}"</Text>
            <View style={styles.testimonialFooter}>
              <Text style={styles.testimonialName}>— {item.name}</Text>
              <Text style={styles.testimonialStars}>{'★'.repeat(item.stars)}</Text>
            </View>
          </View>
        ))}

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('premium.faq')}</Text>
        {getFaqItems().map((item, i) => (
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

        {/* ── Restore ────────────────────────────────────────────────────── */}
        <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
          <Text style={styles.restoreText}>{t('premium.restore')}</Text>
        </TouchableOpacity>

        {/* ── Final block ────────────────────────────────────────────────── */}
        <View style={styles.finalBlock}>
          <Text style={styles.finalTitle}>{t('premium.finalTitle')}</Text>
          <Text style={styles.finalSub}>
            {t('premium.finalSub')}
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
              ? t('premium.getLifetime')
              : t('premium.getMonthly')}
          </Text>
          <Text style={styles.ctaPlanNote}>
            {profile?.is_conquerer
              ? 'Enjoy your premium status'
              : plan === 'unlimited'
              ? `${lifetimePrice} · ${t('premium.lifetime')} · +10 Tickets + 3 Mythic Chests`
              : `${monthlyPrice}${t('premium.monthlyPer')} · ${t('premium.cancelAnytime')}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSwitch}
          onPress={() => setPlan(plan === 'unlimited' ? 'monthly' : 'unlimited')}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaSwitchText}>
            {plan === 'unlimited' ? `Switch to ${t('premium.monthly')} (${monthlyPrice}${t('premium.monthlyPer')})` : `Switch to ${t('premium.lifetime')} — ${lifetimePrice} ${t('premium.once')}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a1a' },

  urgencyBar: {
    backgroundColor: '#120820',
    borderBottomWidth: 1,
    borderBottomColor: '#7B2FBE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  urgencyText: { color: '#9B59B6', fontSize: 13, fontWeight: '600' },
  urgencyTimer: { color: '#9B59B6', fontSize: 13, fontWeight: 'bold' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  closeBtn: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: -4,
  },

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
  heroOffer: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 18, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f6d36566', backgroundColor: '#1b102b' },
  heroOfferChest: { width: 52, height: 48, marginRight: 8 },
  heroOfferCopy: { flex: 1 },
  heroOfferKicker: { color: '#f6d365', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 3 },
  heroOfferTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  heroOfferSub: { color: '#b9a8c6', fontSize: 10, marginTop: 3, lineHeight: 14 },

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

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },

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
  selectedMark: { position: 'absolute', right: 8, top: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f6d365', alignItems: 'center', justifyContent: 'center' },
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

  trialNote: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
  },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  trustItem: { alignItems: 'center', gap: 5 },
  trustText: { color: '#666', fontSize: 11 },

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

  restoreButton: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { color: '#555', fontSize: 12, textDecorationLine: 'underline' },

  finalBlock: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  finalTitle: { color: '#9B59B6', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  finalSub: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  stickyBar: {
    backgroundColor: '#0e0e1f',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingHorizontal: 16,
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
