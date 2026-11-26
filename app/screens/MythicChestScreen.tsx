import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ImageSourcePropType, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { DEV_MODE } from '../lib/devMode';
import { supabase } from '../lib/supabase';
import { playTick, playVictory } from '../lib/audio';
import TopFallConfetti from '../components/TopFallConfetti';
import MythicSilhouette from '../components/MythicSilhouette';
import { CHOICE_REWARDS, MYTHIC_AVATARS, MYTHIC_DROP_RATES, MYTHIC_DUST_IMAGE, MYTHIC_REWARD_IMAGES, MythicChestState, MythicReward, rewardImage } from '../lib/mythicChest';
import { t, useLocale } from '../lib/i18n';
import { XpAmount, XpIcon } from '../components/XpIcon';

const CLOSED = require('../../assets/avatars/mythic_closed.png') as ImageSourcePropType;
const OPEN = require('../../assets/avatars/mythic_open.png') as ImageSourcePropType;
const MYTHIC_CHEST_PRODUCT_ID = 'mythic_chest_1';
const MYTHIC_CHEST_FALLBACK_PRICE = '$1.99';
let IAP: any = null;
const SPARKS = ['✦', '✧', '✦', '·', '✧', '✦', '·', '✧'];
const IDLE_PARTICLES = [
  { left: '13%', top: '57%', color: '#f6d365', size: 5, delay: 0 },
  { left: '22%', top: '28%', color: '#c084fc', size: 4, delay: 260 },
  { left: '35%', top: '16%', color: '#67e8f9', size: 3, delay: 520 },
  { left: '67%', top: '19%', color: '#f6d365', size: 4, delay: 780 },
  { left: '82%', top: '38%', color: '#c084fc', size: 5, delay: 1040 },
  { left: '89%', top: '63%', color: '#67e8f9', size: 3, delay: 1300 },
  { left: '72%', top: '77%', color: '#f6d365', size: 4, delay: 1560 },
  { left: '26%', top: '78%', color: '#c084fc', size: 3, delay: 1820 },
  { left: '8%', top: '35%', color: '#ffffff', size: 3, delay: 2080 },
  { left: '93%', top: '28%', color: '#ffffff', size: 3, delay: 2340 },
];

function Firework({ index }: { index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.delay(index * 180), Animated.timing(progress, { toValue: 1, duration: 1150, useNativeDriver: true }), Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: true })])); a.start(); return () => a.stop(); }, [index, progress]);
  const angle = index * Math.PI / 4;
  return <Animated.Text pointerEvents="none" style={[styles.firework, { left: `${45 + Math.cos(angle) * 35}%`, top: `${45 + Math.sin(angle) * 35}%`, opacity: progress.interpolate({ inputRange: [0, .2, 1], outputRange: [0, 1, 0] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.2, 1.8] }) }] }]}>{SPARKS[index]}</Animated.Text>;
}

function IdleParticle({ particle }: { particle: typeof IDLE_PARTICLES[number] }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  const rise = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(rise, { toValue: -18, duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.18, duration: 780, useNativeDriver: true }),
        Animated.timing(rise, { toValue: 10, duration: 320, useNativeDriver: true }),
      ]),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, particle.delay, rise]);
  return <Animated.View pointerEvents="none" style={[styles.idleParticle, { left: particle.left as any, top: particle.top as any, width: particle.size, height: particle.size, borderRadius: particle.size, backgroundColor: particle.color, opacity, transform: [{ translateY: rise }] }]} />;
}

function RewardIcon({ rewardKey }: { rewardKey: string }) {
  const image = rewardKey === 'gold_150000' ? require('../../assets/avatars/royal_open.png') : rewardKey === 'avatar' ? undefined : MYTHIC_REWARD_IMAGES[rewardKey];
  if (rewardKey === 'avatar') return <MythicSilhouette size={30} />;
  if (image) return <Image source={image} style={styles.oddsIcon} resizeMode="contain" />;
  return <View style={styles.missingRewardIcon}>{rewardKey === 'xp' ? <XpIcon size={18} /> : <Text style={styles.missingRewardIconText}>?</Text>}</View>;
}

function localizedAvatarName(id: string, fallback: string) {
  return t(`mythicChest.avatars.${id}`, { defaultValue: fallback });
}

function localizedRewardLabel(reward: MythicReward) {
  if (reward.avatar_id) {
    const avatar = MYTHIC_AVATARS.find(a => a.id === reward.avatar_id);
    return localizedAvatarName(reward.avatar_id, avatar?.name ?? t('mythicChest.rewards.avatar'));
  }
  if (reward.kind === 'gold') return t('mythicChest.rewards.gold', { amount: reward.quantity.toLocaleString() });
  if (reward.kind === 'xp') return t('mythicChest.rewards.xp', { amount: reward.quantity.toLocaleString() });
  return reward.kind === 'xp_potion' ? t('mythicChest.rewards.xpPotion') : t('mythicChest.rewards.goldPotion');
}

function localizedDropLabel(key: string, fallback: string) {
  return t(`mythicChest.dropRates.${key}`, { defaultValue: fallback });
}

export default function MythicChestScreen({ navigation }: { navigation: any }) {
  useLocale();
  const { profile, refreshProfile, unlockedItems } = useAuth();
  const { showAlert } = useAlert();
  const showRewardInfo = (key: string) => {
    const item = MYTHIC_DROP_RATES.find(item => item.key === key);
    const message = key === 'dust'
      ? 'Every Mythic Chest gives 1 Mythic Dust in addition to its reward. Collect 10 Dust and exchange them for a reward of your choice, including a Mythic avatar you do not own.'
      : key === 'xp_potion'
      ? 'Adds 200% of base XP for 10 completed quizzes. Stored in your Potions until you activate it.'
      : key === 'gold_potion'
      ? 'Adds 200% of base gold for 10 completed quizzes. Stored in your Potions until you activate it.'
      : key === 'avatar'
      ? 'Unlocks a unique Mythic avatar you do not own. Equip it from the shop.'
      : key === 'xp'
      ? 'Adds 20,000 XP to your level progress. Chest XP does not award level-up gold.'
      : 'Gold is added to your balance. Spend it on countries, upgrades, avatars, and tickets.';
    showAlert({ title: key === 'dust' ? 'Mythic Dust' : localizedDropLabel(key, item?.label ?? key), message,
      icon: key === 'dust' ? <Image source={MYTHIC_DUST_IMAGE} style={{ width: 48, height: 48 }} /> : <RewardIcon rewardKey={key} /> });
  };
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<MythicChestState>({ mythic_chests: profile?.mythic_chests ?? 0, mythic_monthly_chests: profile?.is_conquerer ? 1 : 0, mythic_bonus_chests: 0, mythic_monthly_opened: 0, mythic_dust: 0 });
  const [phase, setPhase] = useState<'ready' | 'opening' | 'revealed'>('ready');
  const [reward, setReward] = useState<MythicReward | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [oddsOpen, setOddsOpen] = useState(true);
  const [devPreviewOpen, setDevPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iapReady, setIapReady] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [storePrice, setStorePrice] = useState(MYTHIC_CHEST_FALLBACK_PRICE);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const rewardPop = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;
  const opened = phase !== 'ready';
  const load = useCallback(async () => {
    if (DEV_MODE) { setState(s => ({ ...s, mythic_chests: Math.max(s.mythic_chests, profile?.mythic_chests ?? 7) })); return; }
    const { data, error: rpcError } = await supabase.rpc('get_mythic_chest');
    if (!rpcError && data) setState(data as MythicChestState); else if (rpcError) setError(rpcError.message);
  }, [profile?.mythic_chests]);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); load(); }, [load]);
  useEffect(() => {
    if (DEV_MODE) return;
    let mounted = true;
    let purchaseListener: any;
    let purchaseErrorListener: any;
    (async () => {
      try {
        IAP = require('react-native-iap');
        await IAP.initConnection();
        if (Platform.OS === 'android') await IAP.flushFailedPurchasesCachedAsPendingAndroid?.().catch(() => {});
        const products = await IAP.fetchProducts({ skus: [MYTHIC_CHEST_PRODUCT_ID], type: 'in-app' });
        const product = (products ?? []).find((p: any) => (p.id ?? p.productId) === MYTHIC_CHEST_PRODUCT_ID);
        if (mounted && product) setStorePrice(product.displayPrice ?? product.localizedPrice ?? MYTHIC_CHEST_FALLBACK_PRICE);
        if (mounted) setIapReady(true);
        purchaseListener = IAP.purchaseUpdatedListener(async (purchase: any) => {
          const productId = purchase.productId ?? purchase.id;
          if (productId !== MYTHIC_CHEST_PRODUCT_ID) return;
          try {
            const transactionId = String(purchase.transactionId ?? purchase.purchaseToken ?? purchase.transactionReceipt ?? '');
            if (!transactionId) throw new Error(t('mythicChest.purchaseMissingTransaction'));
            const { data, error: rpcError } = await supabase.rpc('grant_mythic_chest_purchase', {
              p_transaction_id: transactionId,
              p_store: Platform.OS === 'ios' ? 'ios' : 'android',
              p_product_id: MYTHIC_CHEST_PRODUCT_ID,
            });
            if (rpcError || !data) throw rpcError ?? new Error(t('mythicChest.purchaseGrantFailed'));
            await IAP.finishTransaction({ purchase, isConsumable: true });
            if (mounted) {
              setState(s => ({ ...s, ...(data as MythicChestState) }));
              setPhase('ready');
              setError(null);
              showAlert({ title: t('mythicChest.purchaseSuccessTitle'), message: t('mythicChest.purchaseSuccessBody') });
            }
            await refreshProfile().catch(() => {});
          } catch (purchaseError: any) {
            if (mounted) setError(purchaseError?.message ?? t('mythicChest.purchaseGrantFailed'));
          } finally {
            if (mounted) setPurchasing(false);
          }
        });
        purchaseErrorListener = IAP.purchaseErrorListener((purchaseError: any) => {
          if (purchaseError?.code !== 'E_USER_CANCELLED' && mounted) setError(purchaseError?.message ?? t('mythicChest.purchaseFailed'));
          if (mounted) setPurchasing(false);
        });
      } catch (initError) {
        if (mounted) setIapReady(false);
      }
    })();
    return () => {
      mounted = false;
      purchaseListener?.remove?.();
      purchaseErrorListener?.remove?.();
      IAP?.endConnection?.();
    };
  }, [refreshProfile, showAlert]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(auraPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(auraPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [auraPulse]);
  const reveal = useCallback((nextReward: MythicReward) => {
    setReward(nextReward); setPhase('revealed'); rewardPop.setValue(reducedMotion ? 1 : 0); playVictory(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); AccessibilityInfo.announceForAccessibility(t('mythicChest.accessibility.rewardReceived', { reward: localizedRewardLabel(nextReward) }));
    Animated.parallel([Animated.spring(scale, { toValue: 1.08, friction: 4, tension: 70, useNativeDriver: true }), Animated.sequence([Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }), Animated.timing(flash, { toValue: 0, duration: 700, useNativeDriver: true })])]).start(() => Animated.parallel([Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }), Animated.spring(rewardPop, { toValue: 1, speed: reducedMotion ? 100 : 12, bounciness: reducedMotion ? 0 : 12, useNativeDriver: true })]).start());
  }, [flash, reducedMotion, rewardPop, scale]);
  const previewReward = (key: string, avatarId?: string) => {
    const kind = avatarId ? 'avatar' : key === 'xp' ? 'xp' : /^gold_\d+$/.test(key) ? 'gold' : key as MythicReward['kind'];
    const quantity = key === 'gold_150000' ? 150000 : key === 'gold_75000' ? 75000 : key === 'gold_25000' ? 25000 : key === 'xp' ? 20000 : 1;
    setReward({ kind, quantity, avatar_id: avatarId });
    scale.setValue(1);
    rewardPop.setValue(1);
    setPhase('revealed');
  };
  const openChest = async () => {
    if (phase === 'opening' || state.mythic_chests <= 0) return;
    if (phase === 'revealed') { rewardPop.setValue(0); scale.setValue(1); setReward(null); }
    setError(null); setPhase('opening'); playTick();
    try {
      const { data, error: rpcError } = DEV_MODE ? { data: { reward: { kind: 'avatar', quantity: 1, avatar_id: 'png_conquest_frog' }, dust_awarded: 1, mythic_dust: state.mythic_dust + 1 }, error: null } : await supabase.rpc('claim_mythic_chest');
      if (rpcError || !data) throw rpcError ?? new Error(t('mythicChest.errors.open'));
      setState(s => ({ ...s, ...data, mythic_chests: DEV_MODE ? s.mythic_chests : data.mythic_chests }));
      if (!reducedMotion) {
        await new Promise<void>(resolve => Animated.sequence([
          Animated.timing(scale, { toValue: 1.04, duration: 180, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.96, duration: 140, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.09, duration: 220, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.98, duration: 140, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.04, duration: 180, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 240, useNativeDriver: true }),
        ]).start(() => resolve()));
      }
      reveal(data.reward as MythicReward); if (!DEV_MODE) await refreshProfile().catch(() => {});
    } catch (e) { setPhase('ready'); setError(e instanceof Error ? e.message : t('mythicChest.errors.open')); }
  };
  const chooseReward = async (key: string, avatarId?: string) => {
    setError(null);
    try {
      const { data, error: rpcError } = DEV_MODE ? { data: { reward: { kind: avatarId ? 'avatar' : key === 'xp' ? 'xp' : /^gold_\d+$/.test(key) ? 'gold' : key, quantity: key === 'gold_150000' ? 150000 : key === 'gold_75000' ? 75000 : key === 'gold_25000' ? 25000 : key === 'xp' ? 20000 : 1, avatar_id: avatarId } }, error: null } : await supabase.rpc('claim_mythic_choice', { p_kind: key, p_avatar: avatarId ?? null });
      if (rpcError || !data) throw rpcError ?? new Error(t('mythicChest.errors.choice'));
      setChoiceOpen(false); setState(s => ({ ...s, ...data })); reveal(data.reward as MythicReward); if (!DEV_MODE) await refreshProfile().catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : t('mythicChest.errors.choice')); }
  };
  const buyMythicChest = async () => {
    if (purchasing) return;
    if (DEV_MODE) {
      setState(s => ({ ...s, mythic_chests: s.mythic_chests + 1, mythic_bonus_chests: s.mythic_bonus_chests + 1 }));
      showAlert({ title: t('mythicChest.purchasePreviewTitle'), message: t('mythicChest.purchasePreviewBody') });
      return;
    }
    if (!iapReady || !IAP) {
      showAlert({ title: t('mythicChest.purchaseUnavailableTitle'), message: t('mythicChest.purchaseUnavailableBody') });
      return;
    }
    setPurchasing(true);
    setError(null);
    try {
      await IAP.requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku: MYTHIC_CHEST_PRODUCT_ID },
          google: { skus: [MYTHIC_CHEST_PRODUCT_ID] },
        },
      });
    } catch (purchaseError: any) {
      if (purchaseError?.code !== 'E_USER_CANCELLED') setError(purchaseError?.message ?? t('mythicChest.purchaseFailed'));
      setPurchasing(false);
    }
  };
  const unownedMythicAvatars = MYTHIC_AVATARS.filter(avatar => !unlockedItems.has(avatar.id));
  const monthlyProgress = Math.min(1, state.mythic_monthly_opened);
  const chestImage = opened ? OPEN : CLOSED;
  return <SafeAreaView style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.close} accessibilityLabel={t('common.cancel')}><Text style={styles.closeText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>{t('mythicChest.header')}</Text><View style={styles.close} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>{t('mythicChest.eyebrow')}</Text><Text style={styles.title}>{t('mythicChest.title')}</Text><Text style={styles.subtitle}>{t('mythicChest.subtitle')}</Text>
      <View style={styles.valueRow} accessibilityLabel={t('mythicChest.benefitsLabel')}>
        <View style={styles.valuePill}><Text style={styles.valueIcon}>✦</Text><Text style={styles.valueLabel}>{t('mythicChest.benefitAvatars')}</Text></View>
        <View style={styles.valuePill}><Text style={styles.valueIcon}>◆</Text><Text style={styles.valueLabel}>{t('mythicChest.benefitDust')}</Text></View>
        <View style={styles.valuePill}><Text style={styles.valueIcon}>✧</Text><Text style={styles.valueLabel}>{t('mythicChest.benefitChoice')}</Text></View>
      </View>
      <View style={styles.stage}><Animated.View style={[styles.aura, { opacity: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.9] }), transform: [{ scale: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) }] }]} /><View style={styles.auraCore} />{IDLE_PARTICLES.map((particle, index) => <IdleParticle key={index} particle={particle} />)}{phase === 'revealed' && reward ? <><Animated.Image source={OPEN} style={[styles.openChest, { transform: [{ scale }] }]} resizeMode="contain" /><Animated.View style={[styles.rewardGlow, { opacity: rewardPop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }), transform: [{ scale: rewardPop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }] }]} /><Animated.View style={[styles.rewardHero, { opacity: rewardPop, transform: [{ scale: rewardPop }, { translateY: rewardPop.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}><Image source={rewardImage(reward)} style={styles.rewardRevealImage} resizeMode="contain" /></Animated.View></> : <Animated.Image source={chestImage} style={[styles.chest, { transform: [{ scale }] }]} resizeMode="contain" />}{opened && <><Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />{Array.from({ length: 8 }, (_, i) => <Firework key={i} index={i} />)}<TopFallConfetti /></>}</View>
      {phase === 'revealed' && reward && <View style={styles.rewardCard}><Text style={styles.rewardKicker}>{t('mythicChest.rewardUnlocked')}</Text>{reward.kind === 'xp' ? <XpAmount amount={reward.quantity.toLocaleString()} iconSize={24} textStyle={styles.rewardTitle} /> : <Text style={styles.rewardTitle}>{localizedRewardLabel(reward)}</Text>}<Text style={styles.rewardSub}>{reward.kind === 'xp' ? t('mythicChest.rewardAppliedXp') : reward.kind.includes('potion') ? t('mythicChest.rewardPotionStored') : t('mythicChest.rewardAdded')}</Text><View style={styles.dustAwardRow}><Image source={MYTHIC_DUST_IMAGE} style={styles.dustIcon} /><Text style={styles.dustAwardText}>{t('mythicChest.dustAward')}</Text></View></View>}
      <View style={styles.statsCard}><View style={styles.statRow}><Text style={styles.statLabel}>{t('mythicChest.chestsAvailable')}</Text><Text style={styles.statValue}>{state.mythic_chests}</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${monthlyProgress * 100}%` }]} /></View><View style={styles.statRow}><Text style={styles.statHint}>{t('mythicChest.monthlyOpened')}</Text><Text style={styles.statHint}>{state.mythic_monthly_opened} / 1</Text></View><View style={styles.dustRow}><Text style={styles.dustLabel}>{t('mythicChest.dust')}</Text><Text style={styles.dustValue}>{state.mythic_dust} / 10</Text></View><View style={styles.progressTrack}><View style={[styles.dustFill, { width: `${Math.min(100, state.mythic_dust * 10)}%` }]} /></View></View>
      <TouchableOpacity style={[styles.primary, (state.mythic_chests <= 0 || phase === 'opening') && styles.disabled]} onPress={openChest} activeOpacity={.85}><Text style={styles.primaryText}>{phase === 'opening' ? t('mythicChest.opening') : phase === 'revealed' && state.mythic_chests > 0 ? t('mythicChest.openAnother') : phase === 'revealed' ? t('mythicChest.rewardClaimed') : state.mythic_chests > 0 ? t('mythicChest.openChest') : t('mythicChest.noChests')}</Text></TouchableOpacity>
      {state.mythic_dust >= 10 && <TouchableOpacity style={styles.choiceButton} onPress={() => setChoiceOpen(true)}><Text style={styles.choiceText}>{t('mythicChest.openGuaranteed')}</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mythicChest.purchaseAccessibility')} style={[styles.purchaseCard, purchasing && styles.disabled]} disabled={purchasing} onPress={buyMythicChest} activeOpacity={0.88}>
        <View style={styles.purchaseTop}>
          <Image source={CLOSED} style={styles.purchaseChest} resizeMode="contain" />
          <View style={styles.purchaseCopy}>
            <Text style={styles.purchaseEyebrow}>{t('mythicChest.purchaseEyebrow')}</Text>
            <Text style={styles.purchaseTitle}>{t('mythicChest.purchaseTitle')}</Text>
            <Text style={styles.purchaseSub}>{t('mythicChest.purchaseSub')}</Text>
          </View>
          <View style={styles.priceBadge}><Text style={styles.priceAmount}>{storePrice}</Text><Text style={styles.priceNote}>{t('mythicChest.oneTime')}</Text></View>
        </View>
        <View style={styles.purchaseCta}><Text style={styles.purchaseCtaText}>{purchasing ? t('mythicChest.purchaseProcessing') : t('mythicChest.purchaseCta')}</Text><Text style={styles.purchaseArrow}>›</Text></View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.oddsToggle} onPress={() => setOddsOpen(v => !v)}><Text style={styles.oddsToggleText}>{oddsOpen ? t('mythicChest.hideRates') : t('mythicChest.viewRates')}  {oddsOpen ? '⌃' : '⌄'}</Text></TouchableOpacity>
      {oddsOpen && <View style={styles.oddsCard}>
        <Text style={styles.cardTitle}>{t('mythicChest.dropRatesTitle')}</Text>
        {MYTHIC_DROP_RATES.map(item => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`About ${localizedDropLabel(item.key, item.label)}`} style={[styles.oddsRow, { alignItems: 'center', gap: 10 }]} key={item.key} onPress={() => showRewardInfo(item.key)}>
          <View style={styles.oddsSideCell}><RewardIcon rewardKey={item.key} /></View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            {/^gold_\d+$/.test(item.key) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, direction: 'ltr' }}>
                <Text style={styles.oddsLabel}>{Number(item.key.slice(5)).toLocaleString()}</Text>
                <Image source={MYTHIC_REWARD_IMAGES.gold_25000} style={{ width: 18, height: 18 }} resizeMode="contain" />
              </View>
            ) : item.key === 'xp' ? (
              <XpAmount amount="20,000" iconSize={14} textStyle={styles.oddsLabel} />
            ) : (
              <Text style={[styles.oddsLabel, { textAlign: 'center' }]}>{localizedDropLabel(item.key, item.label)}</Text>
            )}
          </View>
          <View style={styles.oddsSideCell}><Text style={styles.oddsRate}>{item.rate}%</Text></View>
        </TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('mythicChest.aboutDust')} style={styles.guaranteeRow} onPress={() => showRewardInfo('dust')}><Image source={MYTHIC_DUST_IMAGE} style={styles.guaranteeIcon} /><Text style={styles.guaranteeText}>{t('mythicChest.dustGuaranteed')} ⓘ</Text></TouchableOpacity>
      </View>}
      {DEV_MODE && <>
        <TouchableOpacity style={styles.devButton} onPress={() => setDevPreviewOpen(v => !v)}><Text style={styles.devText}>{devPreviewOpen ? t('mythicChest.hidePreview') : t('mythicChest.devPreview')}</Text></TouchableOpacity>
        {devPreviewOpen && <View style={styles.devGallery}>
          <Text style={styles.devGalleryTitle}>{t('mythicChest.previewRewards')}</Text>
          <View style={styles.devGrid}>{CHOICE_REWARDS.map(item => <TouchableOpacity key={item.key} style={styles.devReward} onPress={() => previewReward(item.key)}><RewardIcon rewardKey={item.key} /><Text style={styles.devRewardText}>{localizedDropLabel(item.key, item.label)}</Text></TouchableOpacity>)}</View>
          <Text style={styles.devGalleryTitle}>{t('mythicChest.uniqueAvatars')}</Text>
          <View style={styles.devGrid}>{MYTHIC_AVATARS.map(avatar => <TouchableOpacity key={avatar.id} style={styles.devReward} onPress={() => previewReward('avatar', avatar.id)}><Image source={avatar.image} style={styles.devAvatarImage} /><Text style={styles.devRewardText}>{localizedAvatarName(avatar.id, avatar.name)}</Text></TouchableOpacity>)}</View>
        </View>}
      </>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
    {choiceOpen && <View style={styles.choiceOverlay}><View style={styles.choiceSheet}><Text style={styles.choiceTitle}>{t('mythicChest.chooseReward')}</Text><Text style={styles.choiceSub}>{t('mythicChest.consumeDust')}</Text>{CHOICE_REWARDS.map(item => <TouchableOpacity style={styles.choiceRow} key={item.key} onPress={() => chooseReward(item.key)}><RewardIcon rewardKey={item.key} /><Text style={styles.choiceRowText}>{localizedDropLabel(item.key, item.label)}</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>)}{unownedMythicAvatars.length > 0 && <><Text style={styles.avatarHeading}>{t('mythicChest.uniqueAvatars')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{unownedMythicAvatars.map(avatar => <TouchableOpacity key={avatar.id} style={styles.avatarChoice} onPress={() => chooseReward('avatar', avatar.id)}><Image source={avatar.image} style={styles.avatarImage} /><Text style={styles.avatarName}>{localizedAvatarName(avatar.id, avatar.name)}</Text></TouchableOpacity>)}</ScrollView></>}<TouchableOpacity onPress={() => setChoiceOpen(false)}><Text style={styles.cancel}>{t('common.cancel').toUpperCase()}</Text></TouchableOpacity></View></View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  valueRow: { width: '100%', flexDirection: 'row', gap: 7, marginTop: 16, marginBottom: 3 },
  valuePill: { flex: 1, minHeight: 60, borderRadius: 12, borderWidth: 1, borderColor: '#4e3675', backgroundColor: '#120d20', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  valueIcon: { color: '#f6d365', fontSize: 14, marginBottom: 3 },
  valueLabel: { color: '#cdbde0', fontSize: 8, fontWeight: '900', letterSpacing: .55, textAlign: 'center', lineHeight: 11 },
  purchaseCard: { width: '100%', marginTop: 12, padding: 13, borderRadius: 17, borderWidth: 1, borderColor: '#f6d365', backgroundColor: '#241535', shadowColor: '#f6d365', shadowOpacity: .2, shadowRadius: 14, elevation: 5 },
  purchaseTop: { flexDirection: 'row', alignItems: 'center' },
  purchaseChest: { width: 56, height: 48, marginRight: 6 },
  purchaseCopy: { flex: 1, paddingRight: 6 },
  purchaseEyebrow: { color: '#f6d365', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  purchaseTitle: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 3, lineHeight: 17 },
  purchaseSub: { color: '#c9b6d8', fontSize: 10, marginTop: 2 },
  priceBadge: { alignItems: 'flex-end' },
  priceAmount: { color: '#ffe9a8', fontSize: 18, fontWeight: '900' },
  priceNote: { color: '#a992b9', fontSize: 9, marginTop: 1 },
  purchaseCta: { marginTop: 10, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f6d365', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  purchaseCtaText: { color: '#241535', fontSize: 12, fontWeight: '900', letterSpacing: .4 },
  purchaseArrow: { color: '#241535', fontSize: 20, lineHeight: 16 },
  oddsSideCell: { width: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  openChest: { position: 'absolute', bottom: 0, width: 290, height: 220 },
  rewardGlow: { position: 'absolute', top: 44, width: 145, height: 145, borderRadius: 80, backgroundColor: '#f6d36555', shadowColor: '#f6d365', shadowOpacity: 1, shadowRadius: 34, elevation: 22, zIndex: 5 },
  rewardHero: { position: 'absolute', top: 58, zIndex: 6 },
  rewardRevealImage: { width: 108, height: 108 },
  auraCore: { position: 'absolute', width: 170, height: 120, borderRadius: 100, backgroundColor: '#f6d36520', shadowColor: '#f6d365', shadowOpacity: .9, shadowRadius: 28, elevation: 15 },
  idleParticle: { position: 'absolute', shadowColor: '#fff', shadowOpacity: .95, shadowRadius: 7, elevation: 8, zIndex: 2 },
  oddsIcon: { width: 30, height: 30 },
  missingRewardIcon: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#8d7bb8', backgroundColor: '#292439', alignItems: 'center', justifyContent: 'center' },
  missingRewardIconText: { color: '#d7c7ff', fontSize: 10, fontWeight: '900' },
  dustAwardRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  dustIcon: { width: 28, height: 28 },
  dustAwardText: { color: '#e6c6ff', fontWeight: '900' },
  guaranteeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 11 },
  guaranteeIcon: { width: 25, height: 25 },
  guaranteeText: { color: '#f6d365', fontSize: 11, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  screen: { flex: 1, backgroundColor: '#080615' }, header: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, close: { width: 42, alignItems: 'center' }, closeText: { color: '#d7c6ff', fontSize: 38, lineHeight: 38 }, headerTitle: { flex: 1, color: '#f3dcff', textAlign: 'center', fontSize: 14, fontWeight: '900', letterSpacing: 2 }, content: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 36 }, eyebrow: { color: '#d8a8ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 8 }, title: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 7 }, subtitle: { color: '#a49bb5', fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 19 }, stage: { width: '100%', height: 270, alignItems: 'center', justifyContent: 'center', marginTop: 2, overflow: 'hidden' }, aura: { position: 'absolute', width: 225, height: 165, borderRadius: 120, backgroundColor: '#6d27b822', shadowColor: '#c084fc', shadowOpacity: 1, shadowRadius: 45, elevation: 20 }, chest: { width: 290, height: 250 }, flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 4 }, firework: { position: 'absolute', color: '#fff3a3', fontSize: 25, textShadowColor: '#d8a8ff', textShadowRadius: 13, zIndex: 5 }, rewardCard: { width: '100%', alignItems: 'center', backgroundColor: '#21143a', borderColor: '#c084fc', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 }, rewardKicker: { color: '#f6d365', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, rewardImage: { width: 82, height: 82, marginVertical: 4 }, rewardTitle: { color: '#fff', fontSize: 21, fontWeight: '900' }, rewardSub: { color: '#baaacb', fontSize: 12, textAlign: 'center', marginTop: 5 }, dustAward: { color: '#e6c6ff', fontWeight: '900', marginTop: 11 }, statsCard: { width: '100%', backgroundColor: '#151026', borderColor: '#4e3675', borderWidth: 1, borderRadius: 16, padding: 15 }, statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, statLabel: { color: '#b8a9cc', fontSize: 10, fontWeight: '900', letterSpacing: .8 }, statValue: { color: '#f1caff', fontSize: 18, fontWeight: '900' }, progressTrack: { height: 8, backgroundColor: '#2a1c40', borderRadius: 8, overflow: 'hidden', marginTop: 9 }, progressFill: { height: '100%', backgroundColor: '#c084fc' }, statHint: { color: '#8f849e', fontSize: 11, marginTop: 7 }, dustRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, dustLabel: { color: '#f6d365', fontSize: 10, fontWeight: '900', letterSpacing: .8 }, dustValue: { color: '#ffe9a8', fontWeight: '900' }, dustFill: { height: '100%', backgroundColor: '#f6d365' }, primary: { width: '100%', backgroundColor: '#8b3fd1', borderColor: '#e3a8ff', borderWidth: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }, disabled: { opacity: .48 }, choiceButton: { width: '100%', padding: 13, marginTop: 10, alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#f6d365', backgroundColor: '#4a3214' }, choiceText: { color: '#ffe9a8', fontWeight: '900', fontSize: 12 }, oddsToggle: { padding: 13 }, oddsToggleText: { color: '#c9a9ec', fontSize: 11, fontWeight: '900', letterSpacing: .6 }, oddsCard: { width: '100%', backgroundColor: '#111020', borderRadius: 14, padding: 15, borderColor: '#30264b', borderWidth: 1 }, cardTitle: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }, oddsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomColor: '#261e38', borderBottomWidth: 1 }, oddsLabel: { color: '#bdb1ca', fontSize: 12 }, oddsRate: { color: '#f1caff', fontWeight: '900' }, guarantee: { color: '#f6d365', fontSize: 11, fontWeight: '800', marginTop: 11 }, devButton: { marginTop: 14, padding: 9, borderRadius: 10, borderWidth: 1, borderColor: '#5e4a79' }, devText: { color: '#b9a6ce', fontSize: 10, fontWeight: '800' }, devGallery: { width: '100%', marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#120d20', borderWidth: 1, borderColor: '#4e3675' }, devGalleryTitle: { color: '#f6d365', fontSize: 10, fontWeight: '900', marginBottom: 7, marginTop: 5 }, devGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, devReward: { width: '31%', minHeight: 74, alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 9, backgroundColor: '#24183a', borderWidth: 1, borderColor: '#5e4a79' }, devRewardText: { color: '#d8ccea', fontSize: 9, textAlign: 'center', marginTop: 3 }, devAvatarImage: { width: 42, height: 42 }, error: { color: '#ff9a9a', textAlign: 'center', fontSize: 12, marginTop: 12 }, choiceOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000b', justifyContent: 'flex-end', zIndex: 20 }, choiceSheet: { backgroundColor: '#171027', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, borderColor: '#7544a1', borderWidth: 1 }, choiceTitle: { color: '#fff', fontSize: 21, fontWeight: '900' }, choiceSub: { color: '#a49bb5', fontSize: 12, marginTop: 4, marginBottom: 13 }, choiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, backgroundColor: '#24183a', borderRadius: 10, marginTop: 7 }, choiceRowText: { color: '#f8edff', fontWeight: '800' }, arrow: { color: '#c084fc', fontSize: 24 }, avatarHeading: { color: '#f6d365', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 17, marginBottom: 7 }, avatarChoice: { width: 84, marginRight: 9, alignItems: 'center' }, avatarImage: { width: 64, height: 64 }, avatarName: { color: '#c6b8d2', fontSize: 9, textAlign: 'center', marginTop: 3 }, cancel: { color: '#bcaecc', textAlign: 'center', fontSize: 12, fontWeight: '900', marginTop: 18 },
});
