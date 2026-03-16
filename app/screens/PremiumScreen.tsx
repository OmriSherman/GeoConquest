import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

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

const FEATURES = [
  { icon: '🪙', title: 'Daily Gold Boost', desc: 'Earn 2× gold from every quiz and daily reward — forever.' },
  { icon: '🌍', title: 'Unlimited Conquest', desc: 'No daily cap on country claims. Conquer without limits.' },
  { icon: '⚡', title: 'Bonus Quiz Turns', desc: 'Start every quiz with 20 turns instead of 10.' },
  { icon: '👑', title: 'Commander Badge', desc: 'Exclusive crown badge displayed on the global leaderboard.' },
  { icon: '🎭', title: 'Monthly Avatar Drops', desc: 'New exclusive avatars released each month, yours to keep.' },
  { icon: '📊', title: 'Advanced Analytics', desc: 'Full history, regional accuracy maps, and personal records.' },
];

const COMPARE_ROWS: Array<{ label: string; free: string | boolean; pro: string | boolean }> = [
  { label: 'Daily Gold Multiplier', free: '1×', pro: '2×' },
  { label: 'Countries Per Day', free: '5', pro: 'Unlimited' },
  { label: 'Quiz Turns', free: '10', pro: '20' },
  { label: 'Leaderboard Badge', free: false, pro: true },
  { label: 'Exclusive Avatars', free: false, pro: true },
  { label: 'Advanced Analytics', free: false, pro: true },
  { label: 'Early Feature Access', free: false, pro: true },
  { label: 'Ad-Free Experience', free: false, pro: true },
];

const TESTIMONIALS = [
  {
    text: 'Went from rank #847 to top 50 in a month. The bonus turns are genuinely game-changing.',
    name: 'AtlasHunter_92',
    stars: 5,
  },
  {
    text: 'The 2× gold boost paid for itself in a week. I now own 80+ countries and I\'m not stopping.',
    name: 'MapMaster_Pro',
    stars: 5,
  },
  {
    text: 'Commander avatars are incredible. Worth it for the exclusives alone — I get compliments every match.',
    name: 'GeoConqueror',
    stars: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: 'When will I be charged?',
    a: 'Your 7-day free trial begins immediately. You\'ll only be charged after the trial ends — we send a reminder 24h before.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. Cancel with one tap from Settings at any time, no questions asked. You keep access until the end of your billing period.',
  },
  {
    q: 'Do I keep my items if I cancel?',
    a: 'Yes! Every country, avatar, and flag you\'ve purchased remains yours permanently, regardless of subscription status.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Apple Pay, Google Play Billing, and all major credit cards. All payments are processed securely via the App Store / Play Store.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PremiumScreen({ navigation }: { navigation?: any }) {
  const { profile } = useAuth();
  const { ownedCountries } = useGame();
  const insets = useSafeAreaInsets();
  const countdown = useCountdown(3 * 3600 + 47 * 60 + 22);

  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const countriesOwned = ownedCountries.length;
  const hookStat =
    countriesOwned >= 10
      ? `You've conquered ${countriesOwned} countries — impressive.`
      : countriesOwned > 0
      ? `You've conquered ${countriesOwned} ${countriesOwned === 1 ? 'country' : 'countries'} so far.`
      : "You're just starting your conquest.";

  return (
    <View style={styles.root}>
      {/* ── Urgency banner ─────────────────────────────────────────────────── */}
      <View style={[styles.urgencyBar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.urgencyText}>⚡ 50% off first month — expires in </Text>
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
          <Text style={styles.heroCrown}>👑</Text>
          <Text style={styles.heroTitle}>Become a{'\n'}World Commander</Text>
          <Text style={styles.heroSub}>
            Master geography. Dominate the leaderboard.{'\n'}Conquer the world without limits.
          </Text>
          <View style={styles.joinPill}>
            <Text style={styles.joinText}>🌍  Join 12,000+ Premium Explorers</Text>
          </View>
        </View>

        {/* ── Personal hook ──────────────────────────────────────────────── */}
        <View style={styles.hookCard}>
          <Text style={styles.hookText}>
            {hookStat}{' '}
            <Text style={styles.hookHighlight}>
              Commander-tier explorers own 3× more territory
            </Text>
            {' '}and climb the leaderboard 5× faster than free players.
          </Text>
        </View>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Everything in Commander</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Comparison ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Free vs Commander</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableCell, styles.tableLabelCol, styles.tableHeaderText]}>Feature</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderText]}>Free</Text>
            <Text style={[styles.tableCellCenter, styles.tableHeaderTextPro]}>Commander</Text>
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
          {/* Annual */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'annual' && styles.priceCardSelected]}
            onPress={() => setPlan('annual')}
            activeOpacity={0.85}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planPrice}>
              $39.99<Text style={styles.planPer}>/yr</Text>
            </Text>
            <Text style={styles.planBreakdown}>Just $0.77/week</Text>
            <View style={styles.savingBadge}>
              <Text style={styles.savingText}>SAVE 33%</Text>
            </View>
            <Text style={styles.planOldPrice}>Was $59.88/yr</Text>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[styles.priceCard, plan === 'monthly' && styles.priceCardSelected, styles.priceCardMonthly]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.85}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>
              $2.49<Text style={styles.planPer}>/mo</Text>
            </Text>
            <Text style={styles.planBreakdown}>First month 50% off</Text>
            <Text style={styles.planOldPrice}>Then $4.99/mo</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.trialNote}>7-day free trial · Cancel anytime · No card required to start</Text>

        {/* ── Trust signals ──────────────────────────────────────────────── */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark' as const, label: 'Secure Payment' },
            { icon: 'close-circle' as const, label: 'Cancel Anytime' },
            { icon: 'flash' as const, label: 'Instant Access' },
          ].map((t, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name={t.icon} size={18} color="#4D96FF" />
              <Text style={styles.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>What Commanders Say</Text>
        <View style={styles.starsRow}>
          <Text style={styles.starsGold}>★★★★★</Text>
          <Text style={styles.ratingLabel}>  4.9 / 5 from 2,000+ commanders</Text>
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
            Start free. No card required. Cancel before your trial ends and you won't be charged a thing.
          </Text>
        </View>
      </ScrollView>

      {/* ── Sticky CTA bar ─────────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity style={styles.ctaPrimary} activeOpacity={0.85}>
          <Text style={styles.ctaPrimaryLabel}>Start 7-Day Free Trial</Text>
          <Text style={styles.ctaPlanNote}>
            {plan === 'annual' ? 'Annual · $39.99/yr after trial' : 'Monthly · $2.49 first month'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSwitch}
          onPress={() => setPlan(plan === 'annual' ? 'monthly' : 'annual')}
          activeOpacity={0.7}
        >
          <Text style={styles.ctaSwitchText}>
            {plan === 'annual' ? 'Switch to Monthly instead' : 'Switch to Annual & Save 33%'}
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
    backgroundColor: '#1a0a00',
    borderBottomWidth: 1,
    borderBottomColor: '#FF8C00',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  urgencyText: { color: '#FFA500', fontSize: 13, fontWeight: '600' },
  urgencyTimer: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Close
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: -4,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  heroCrown: { fontSize: 56, marginBottom: 12 },
  heroTitle: {
    color: '#FFD700',
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
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  joinText: { color: '#ccc', fontSize: 13, fontWeight: '600' },

  // Hook
  hookCard: {
    backgroundColor: '#0e0e1f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD70033',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    padding: 16,
    marginBottom: 28,
  },
  hookText: { color: '#bbb', fontSize: 14, lineHeight: 21 },
  hookHighlight: { color: '#FFD700', fontWeight: '700' },

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
    backgroundColor: '#0e0e1f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    padding: 14,
  },
  featureIcon: { fontSize: 26, marginBottom: 8 },
  featureTitle: { color: '#FFD700', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
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
  tableHeaderTextPro: { color: '#FFD700', fontWeight: 'bold', fontSize: 11, textAlign: 'center', flex: 1 },
  tableFreeVal: { color: '#666', fontSize: 12 },
  tableProVal: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  checkYes: { color: '#6BCB77', fontSize: 14, fontWeight: 'bold' },
  checkPro: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  checkNo: { color: '#444', fontSize: 14 },

  // Pricing
  pricingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
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
    borderColor: '#FFD700',
    backgroundColor: '#141420',
    shadowColor: '#FFD700',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  priceCardMonthly: {
    marginTop: 16,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularText: { color: '#0a0a1a', fontSize: 9, fontWeight: 'bold' },
  planName: { color: '#aaa', fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  planPrice: { color: '#FFD700', fontSize: 26, fontWeight: 'bold' },
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
  planOldPrice: { color: '#555', fontSize: 11, marginTop: 4, textDecorationLine: 'line-through' },

  trialNote: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
  },

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
  starsGold: { color: '#FFD700', fontSize: 18 },
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
  testimonialName: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  testimonialStars: { color: '#FFD700', fontSize: 13 },

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
  finalTitle: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  finalSub: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Sticky CTA
  stickyBar: {
    backgroundColor: '#0e0e1f',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaPrimary: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  ctaPrimaryLabel: { color: '#0a0a1a', fontSize: 16, fontWeight: 'bold' },
  ctaPlanNote: { color: '#0a0a1a', fontSize: 11, opacity: 0.7, marginTop: 2 },
  ctaSwitch: { alignItems: 'center', paddingVertical: 4 },
  ctaSwitchText: { color: '#888', fontSize: 12 },
});
