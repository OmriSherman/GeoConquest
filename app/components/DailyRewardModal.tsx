import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, AppState, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CHEST_AVATARS, CHEST_TIERS, ChestReward, ChestRewardKind, ChestState, Potion, PotionKind, REWARD_IMAGES, REWARD_KINDS, REWARD_NAMES, rewardImage, rewardName } from '../lib/dailyChest';
import { playPurchase, playTick, playVictory } from '../lib/audio';
import TopFallConfetti from './TopFallConfetti';
import { DEV_MODE } from '../lib/devMode';
import { t, useLocale } from '../lib/i18n';
import { XpIcon } from './XpIcon';
import { MYTHIC_REWARD_IMAGES } from '../lib/mythicChest';
import { loadPotionPreview, activatePotionPreview } from '../lib/potionPreview';

function tierName(name: string) {
  return t(`dailyChest.tiers.${name}`, { defaultValue: name });
}

function chestLabel(name: string) {
  return t('dailyChest.chestLabel', { tier: tierName(name), defaultValue: `${name} Chest` });
}

// Mythic chest potions (+200%) get their own name so they're told apart from regular ones.
function potionName(kind: ChestRewardKind, boost = 50) {
  if (boost >= 200 && (kind === 'xp_potion' || kind === 'gold_potion')) return t(kind === 'xp_potion' ? 'mythicChest.rewards.xpPotion' : 'mythicChest.rewards.goldPotion');
  return rewardDisplayName(kind);
}

function rewardDisplayName(kind: ChestRewardKind) {
  return t(`dailyChest.rewardNames.${kind}`, { defaultValue: REWARD_NAMES[kind] });
}

function quizCount(n: number) {
  return t('dailyChest.quizCount', { n, defaultValue: `${n} quizzes` });
}

export default function DailyRewardModal({ inventoryRequest = 0, onShopPotions }: { inventoryRequest?: number; onShopPotions?: () => void }) {
  useLocale();
  const { profile, claimDailyReward, unlockedItems } = useAuth();
  const [chest, setChest] = useState<ChestState | null>(null);
  const [visible, setVisible] = useState(false);
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const [oddsVisible, setOddsVisible] = useState(false);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [phase, setPhase] = useState<'ready' | 'opening' | 'revealed'>('ready');
  const [error, setError] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [potions, setPotions] = useState<Potion[]>([]);
  const [active, setActive] = useState<{ kind: PotionKind; remaining: number; boost_percent?: number }[]>([]);
  const [activating, setActivating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [previewTier, setPreviewTier] = useState<number | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewKind, setPreviewKind] = useState<ChestRewardKind>('gold');
  const [previewAvailable, setPreviewAvailable] = useState(true);
  const autoShown = useRef('');
  const opening = useRef(false);
  const activationLock = useRef(false);
  const mounted = useRef(true);
  const wobble = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const idle = useRef(new Animated.Value(0)).current;
  const isHighTier = (previewTier ?? reward?.tier ?? chest?.tier ?? 1) >= 4;
  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted.current = false; sub.remove(); wobble.stopAnimation(); reveal.stopAnimation(); };
  }, [wobble, reveal]);
  const loadPotions = useCallback(async () => {
    if (!profile?.id) return;
    if (DEV_MODE) {
      setInventoryError('');
      const preview = await loadPotionPreview(profile.id);
      setPotions(preview.bag.filter(p => p.quantity > 0));
      setActive(preview.active.filter(p => p.remaining > 0));
      return;
    }
    let [bag, boosts]: [any, any] = await Promise.all([
      supabase.from('user_potions').select('kind,duration,quantity,boost_percent').eq('user_id', profile.id).gt('quantity', 0).order('duration'),
      supabase.from('active_potions').select('kind,remaining,boost_percent').eq('user_id', profile.id).gt('remaining', 0),
    ]);
    if (bag.error || boosts.error) {
      [bag, boosts] = await Promise.all([
        supabase.from('user_potions').select('kind,duration,quantity').eq('user_id', profile.id).gt('quantity', 0).order('duration'),
        supabase.from('active_potions').select('kind,remaining').eq('user_id', profile.id).gt('remaining', 0),
      ]);
    }
    if (!mounted.current) return;
    if (bag.error || boosts.error) { setInventoryError('Could not load potions. Tap retry.'); return; }
    setInventoryError('');
    setPotions((bag.data ?? []) as Potion[]); setActive((boosts.data ?? []) as typeof active);
  }, [profile?.id]);
  useEffect(() => {
    if (inventoryRequest > 0) { setVisible(false); setInventoryVisible(true); void loadPotions(); }
  }, [inventoryRequest, loadPotions]);
  const load = useCallback(async () => {
    if (!profile?.id || opening.current) return;
    const { data, error: failure } = await supabase.rpc('get_daily_chest');
    if (!mounted.current || opening.current) return;
    if (failure || !data) { setError('Could not load your chest. Check your connection and retry.'); return; }
    const state = data as ChestState;
    setChest(state); setError('');
    if (state.available && autoShown.current !== `${profile.id}:${state.server_date}`) {
      autoShown.current = `${profile.id}:${state.server_date}`;
      setReward(null); setPhase('ready'); setVisible(true);
    }
  }, [profile?.id]);
  useFocusEffect(useCallback(() => {
    void load(); void loadPotions();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') { void load(); void loadPotions(); } });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 60000);
    return () => { sub.remove(); clearInterval(timer); };
  }, [load, loadPotions]));
  useEffect(() => {
    if (!visible || (phase !== 'ready' && !(phase === 'revealed' && isHighTier)) || reducedMotion) { idle.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(idle, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [visible, phase, reducedMotion, idle, isHighTier]);
  const openChest = async () => {
    const isPreview = __DEV__ && previewTier !== null;
    if (opening.current || (!isPreview && !chest?.available) || (isPreview && !previewAvailable)) return;
    opening.current = true; setPhase('opening'); setError(''); reveal.setValue(0);
    if (!reducedMotion) { playTick(); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }
    const animation = reducedMotion ? Promise.resolve() : new Promise<void>(resolve => {
      Animated.sequence([1, -1, 1, -1, 1, -1, 0].map(toValue =>
        Animated.timing(wobble, { toValue, duration: 120, useNativeDriver: true })
      )).start(() => resolve());
    });
    try {
      let state: ChestState;
      if (isPreview) {
        await animation;
        const selectedTier = CHEST_TIERS[previewTier - 1];
        const avatar = CHEST_AVATARS.find(a => a.tier <= previewTier) ?? CHEST_AVATARS[0];
        const previewReward: ChestReward = {
          kind: previewKind,
          quantity: previewKind === 'gold' ? selectedTier.gold * multiplier : previewKind === 'tickets' ? selectedTier.tickets * multiplier : 1,
          tier: previewTier,
          ...(previewKind === 'avatar' ? { avatar_id: avatar.id } : {}),
          ...(previewKind.includes('potion') ? { duration: selectedTier.duration, boost_percent: 50 } : {}),
        };
        state = { tier: previewTier, progress: previewProgress, last_claim_date: null, available: false, reward: previewReward, server_date: new Date().toISOString().slice(0, 10) };
      } else {
        const [claimedState] = await Promise.all([claimDailyReward(), animation]);
        state = claimedState;
      }
      if (!mounted.current) return;
      setChest(state);
      if (!state.reward) { setPhase('ready'); setError("Today's reward was already claimed. Your next chest opens tomorrow."); return; }
      setReward(state.reward); setPhase('revealed');
      playVictory(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility(`${rewardName(state.reward)} received. Quantity ${state.reward.quantity}.`);
      Animated.spring(reveal, { toValue: 1, speed: reducedMotion ? 100 : 13, bounciness: reducedMotion ? 0 : 9, useNativeDriver: true }).start();
      if (!isPreview) void loadPotions();
    } catch (e) {
      await animation;
      if (mounted.current) { setError(e instanceof Error ? e.message : 'Could not open chest. Try again.'); setPhase('ready'); }
    } finally { opening.current = false; wobble.setValue(0); }
  };
  const activate = async (potion: Potion) => {
    if (activationLock.current) return;
    activationLock.current = true; setActivating(true); setInventoryError('');
    try {
      if (DEV_MODE) {
        playPurchase(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await activatePotionPreview(profile!.id, potion);
        await loadPotions();
        return;
      }
      const { error: failure } = await supabase.rpc('activate_potion', { p_kind: potion.kind, p_duration: potion.duration });
      if (failure) setInventoryError(failure.message);
      else { playPurchase(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }
      await loadPotions();
    } catch (error) { setInventoryError(error instanceof Error ? error.message : 'Could not activate potion.'); }
    finally { activationLock.current = false; if (mounted.current) setActivating(false); }
  };
  if (!profile) return null;
  const isPreview = __DEV__ && previewTier !== null;
  const shownTier = previewTier ?? reward?.tier ?? chest?.tier ?? 1;
  const tierIndex = Math.max(0, Math.min(5, shownTier - 1));
  const tier = CHEST_TIERS[tierIndex];
  const multiplier = profile.is_conquerer ? 3 : 1;
  const eligibleAvatars = CHEST_AVATARS.filter(a => a.tier <= tierIndex + 1);
  const remainingAvatars = eligibleAvatars.filter(a => !unlockedItems.has(a.id));
  const close = () => { if (!opening.current) { setVisible(false); setOddsVisible(false); setPreviewTier(null); } };
  const progress = isPreview ? previewProgress : chest?.progress ?? 0;
  const daysPerUpgrade = profile.is_conquerer ? 2 : 4;
  const remainingDays = Math.max(0, daysPerUpgrade - progress);
  const nextChestText = t('dailyChest.nextChestTomorrow', { tier: tierName(tier.name) });
  const canOpen = isPreview ? previewAvailable : !!chest?.available;
  const selectPreview = (update: () => void) => { update(); setReward(null); setPhase('ready'); setError(''); };
  return <>
    <View style={styles.hub}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyChest.accessibility.openDailyChest')} style={styles.hubChest} onPress={() => { setReward(null); setPhase('ready'); setVisible(true); void load(); }}>
        <Image source={tier.closed} style={styles.hubImage} resizeMode="contain" />
        <View style={{ flex: 1 }}><Text style={styles.hubTitle}>{t('dailyChest.hubTitle')}</Text><Text style={[styles.small, { color: tier.color }]}>{error && !chest ? t('dailyChest.tapToRetry') : !chest ? t('dailyChest.loading') : chest.available ? `${tierName(tier.name)} · ${t('dailyChest.readyToOpen')}` : `${tierName(tier.name)} · ${t('dailyChest.claimedToday')}`}</Text></View>
        {chest?.available && <View style={[styles.dot, { backgroundColor: tier.color }]} />}
      </TouchableOpacity>
    </View>
    {active.length > 0 && (
      <View style={styles.activeSummaryRow}>
        {active.map((p, index) => (
          <React.Fragment key={`${p.kind}:${p.boost_percent}`}>
            {index > 0 && <Text style={styles.activeSummary}>/</Text>}
            <View style={styles.activeSummaryItem}>
              <Text style={styles.activeSummary}>+{p.boost_percent ?? 50}%</Text>
              {p.kind === 'xp_potion' ? <XpIcon size={12} /> : <Text style={styles.activeSummary}>{t('dailyChest.rewardNames.gold')}</Text>}
              <Text style={styles.activeSummary}>· {t('dailyChest.quizCount', { n: p.remaining })}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    )}
    {__DEV__ && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyChest.accessibility.openPreview')} style={styles.previewButton} onPress={() => { setPreviewTier(chest?.tier ?? 1); setPreviewProgress(chest?.progress ?? 0); setPreviewKind('gold'); setPreviewAvailable(true); setReward(null); setPhase('ready'); setError(''); setVisible(true); }}><Text style={styles.previewButtonText}>{t('dailyChest.developerPreview')}</Text></TouchableOpacity>}
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}><View style={[styles.card, { borderColor: tier.color }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}><Text style={[styles.eyebrow, { color: tier.color }]}>{t('dailyChest.eyebrow')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyChest.accessibility.closeDailyChest')} disabled={phase === 'opening'} onPress={close} style={styles.close}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <Text style={styles.title}>{phase === 'revealed' ? t('dailyChest.yoursToKeep') : chestLabel(tier.name)}</Text>
          <Text style={styles.subtitle}>{phase === 'revealed' ? t('dailyChest.revealedSubtitle') : isPreview ? t('dailyChest.previewSubtitle') : chest?.available ? t('dailyChest.availableSubtitle') : t('dailyChest.nextSubtitle')}</Text>
          {!isPreview && chest?.available && progress === 0 && tierIndex > 0 && <Text style={[styles.upgrade, { color: tier.color }]}>{t('dailyChest.chestUpgraded')}</Text>}
          {isPreview && <View style={styles.previewPanel}>
            <Text style={styles.previewTitle}>{t('dailyChest.devPreviewNoRewards')}</Text>
            <Text style={styles.previewLabel}>{t('dailyChest.previewTier')}</Text>
            <View style={styles.previewRow}>{CHEST_TIERS.map((t, i) => <TouchableOpacity key={t.name} onPress={() => selectPreview(() => setPreviewTier(i + 1))} style={[styles.previewChip, previewTier === i + 1 && { borderColor: t.color, backgroundColor: '#292439' }]}><Text style={[styles.previewChipText, previewTier === i + 1 && { color: t.color }]}>{tierName(t.name)}</Text></TouchableOpacity>)}</View>
            <Text style={styles.previewLabel}>{t('dailyChest.previewProgress')}</Text>
            <View style={styles.previewRow}>{Array.from({ length: daysPerUpgrade }, (_, value) => <TouchableOpacity key={value} onPress={() => selectPreview(() => setPreviewProgress(value))} style={[styles.previewChip, previewProgress === value && { borderColor: tier.color, backgroundColor: '#292439' }]}><Text style={[styles.previewChipText, previewProgress === value && { color: tier.color }]}>{value}/{daysPerUpgrade}</Text></TouchableOpacity>)}</View>
            <Text style={styles.previewLabel}>{t('dailyChest.previewOutcome')}</Text>
            <View style={styles.previewRow}>{REWARD_KINDS.map(kind => <TouchableOpacity key={kind} onPress={() => selectPreview(() => setPreviewKind(kind))} style={[styles.previewChip, previewKind === kind && { borderColor: tier.color, backgroundColor: '#292439' }]}><Text style={[styles.previewChipText, previewKind === kind && { color: tier.color }]}>{rewardDisplayName(kind)}</Text></TouchableOpacity>)}</View>
            <Text style={styles.previewLabel}>{t('dailyChest.previewState')}</Text>
            <View style={styles.previewRow}>{[[true, t('dailyChest.readyToOpen')], [false, t('dailyChest.claimedToday')]].map(([value, label]) => <TouchableOpacity key={label as string} onPress={() => selectPreview(() => setPreviewAvailable(value as boolean))} style={[styles.previewChip, previewAvailable === value && { borderColor: tier.color, backgroundColor: '#292439' }]}><Text style={[styles.previewChipText, previewAvailable === value && { color: tier.color }]}>{label as string}</Text></TouchableOpacity>)}</View>
          </View>}
          <View style={styles.stage}>
            <Animated.View style={[styles.halo, { backgroundColor: tier.color, opacity: idle.interpolate({ inputRange: [0, 1], outputRange: [isHighTier ? 0.14 : 0.09, isHighTier ? 0.3 : 0.2] }), transform: [{ scale: idle.interpolate({ inputRange: [0, 1], outputRange: [1, isHighTier ? 1.16 : 1.12] }) }] }]} />
            {phase !== 'revealed' ? <Animated.Image source={tier.closed} resizeMode="contain" style={[styles.chestImage, { transform: [{ translateY: idle.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] }) }, { scale: phase === 'opening' ? 1.08 : 1 }] }]} /> : <>
              <Image source={tier.open} resizeMode="contain" style={styles.openChest} />
              {reward && <Animated.View style={[styles.rewardHero, { opacity: reveal, transform: [{ scale: reveal }, { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [45, 0] }) }] }]}><Image source={rewardImage(reward)} style={styles.rewardRevealImage} resizeMode="contain" /></Animated.View>}
              {phase === 'revealed' && !reducedMotion && <TopFallConfetti />}
            </>}
          </View>
          {phase === 'revealed' && reward ? <View style={styles.rewardDetails}>
            <Text style={[styles.rewardTitle, { color: tier.color }]}>{reward.kind === 'gold' || reward.kind === 'tickets' ? `+${reward.quantity.toLocaleString()} ${rewardDisplayName(reward.kind)}` : reward.avatar_id ? rewardName(reward) : rewardDisplayName(reward.kind)}</Text>
            <Text style={styles.subtitle}>{reward.kind.includes('potion') ? t('dailyChest.rewardPotion', { boost: reward.boost_percent, n: reward.duration }) : reward.kind === 'avatar' ? t('dailyChest.rewardAvatar') : reward.duplicate_fallback ? t('dailyChest.rewardDuplicate') : t('dailyChest.rewardBalance')}</Text>
          </View> : <>
            <View style={styles.tierTrail}>{CHEST_TIERS.map((t, i) => <View key={t.name} style={[styles.tierStep, i === tierIndex && { backgroundColor: '#292439', borderColor: t.color }]}><Image source={t.closed} style={[styles.tierIcon, i > tierIndex && { opacity: 0.4 }]} resizeMode="contain" /><Text style={[styles.tierText, { color: i === tierIndex ? t.color : '#A7A4B9' }]}>{tierName(t.name)}</Text></View>)}</View>
            <Text style={styles.progressText}>{!chest?.available ? nextChestText : tierIndex === 5 ? t('dailyChest.maxTier') : t('dailyChest.daysToUpgrade', { n: remainingDays, day: remainingDays === 1 ? 'day' : 'days', tier: tierName(CHEST_TIERS[tierIndex + 1].name) })}</Text>
            {tierIndex < 5 && <View style={styles.progressTrack}>{Array.from({ length: daysPerUpgrade }, (_, i) => <View key={i} style={[styles.progressSegment, { backgroundColor: i < progress ? tier.color : '#302B42' }]} />)}</View>}
            <Text style={styles.rules}>{t('dailyChest.rules')}</Text>
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {phase === 'revealed' ? <TouchableOpacity accessibilityRole="button" style={[styles.primary, { backgroundColor: tier.color }]} onPress={close}><Text style={styles.primaryText}>{t('dailyChest.letsPlay')}</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: phase === 'opening' || !canOpen, busy: phase === 'opening' }} disabled={phase === 'opening'} style={[styles.primary, { backgroundColor: tier.color, opacity: phase === 'opening' || !canOpen ? 0.7 : 1 }]} onPress={() => canOpen ? void openChest() : isPreview ? undefined : chest ? close() : void load()}>
            {phase === 'opening' ? <View style={styles.row}><ActivityIndicator color="#20172B" /><Text style={styles.primaryText}>{t('dailyChest.opening')}</Text></View> : <Text style={styles.primaryText}>{!chest && !isPreview ? t('dailyChest.retry') : canOpen ? (isPreview ? t('dailyChest.previewChest') : t('dailyChest.openChest')) : t('dailyChest.comeBackTomorrow')}</Text>}
          </TouchableOpacity>}
          {phase !== 'opening' && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: oddsVisible }} style={styles.oddsButton} onPress={() => setOddsVisible(v => !v)}><Text style={styles.small}>{oddsVisible ? t('dailyChest.hideOdds') : t('dailyChest.viewOdds')}</Text></TouchableOpacity>}
          {oddsVisible && <View style={styles.odds}>
            <Text style={styles.oddsTitle}>{t('dailyChest.oneRewardPerChest')}</Text>
            {REWARD_KINDS.map((kind, i) => tier.odds[i] === 0 ? null : <View key={kind} style={styles.oddsRow}>
              {kind === 'avatar' ? <View style={styles.oddsQuestion}><Text style={styles.oddsQuestionText}>?</Text></View> : <Image source={REWARD_IMAGES[kind]} style={styles.oddsIcon} resizeMode="contain" />}<Text style={styles.oddsName}>{kind === 'gold' ? t('dailyChest.goldAmount', { n: tier.gold * multiplier }) : kind === 'tickets' ? t('dailyChest.ticketsAmount', { n: tier.tickets * multiplier }) : kind === 'avatar' ? t('dailyChest.randomAvatar') : t('dailyChest.potionWithDuration', { name: rewardDisplayName(kind), n: tier.duration })}</Text><Text style={[styles.oddsPercent, { color: tier.color }]}>{tier.odds[i]}%</Text>
            </View>)}
            {multiplier > 1 && <Text style={styles.rules}>{t('dailyChest.conquerorNote')}</Text>}
            <Text style={styles.rules}>{t('dailyChest.potionNote')}</Text>
            {tier.odds[4] > 0 && <><Text style={styles.oddsTitle}>{t('dailyChest.avatarCollectionTitle', { n: remainingAvatars.length })}</Text><View style={styles.avatarGrid}>{eligibleAvatars.map(a => <View key={a.id} style={styles.avatarItem}><Image source={a.image} accessibilityLabel={t('dailyChest.accessibility.hiddenAvatar')} style={styles.avatarIcon} resizeMode="contain" /></View>)}</View><Text style={styles.rules}>{t('dailyChest.avatarUnlockNote', { n: tier.gold * multiplier })}</Text></>}
          </View>}
        </ScrollView>
      </View></View>
    </Modal>
    <Modal visible={inventoryVisible} transparent animationType="fade" onRequestClose={() => setInventoryVisible(false)}>
      <View style={styles.overlay}><View style={[styles.card, { borderColor: '#9F8AE8' }]}><ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.eyebrow}>{t('dailyChest.yourPotions')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyChest.accessibility.closePotions')} style={styles.close} onPress={() => setInventoryVisible(false)}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
        <Text style={styles.title}>{t('dailyChest.pickYourBoost')}</Text><Text style={styles.subtitle}>{t('dailyChest.potionStackNote')}</Text>
        <Text style={styles.oddsTitle}>{t('dailyChest.activePotions')}</Text>
        {active.length === 0 && <Text style={styles.subtitle}>{t('dailyChest.noActivePotions')}</Text>}
        {active.map(p => <View key={`${p.kind}:${p.boost_percent}`} style={styles.inventoryRow}>
          <Image source={(p.boost_percent ?? 50) >= 200 ? MYTHIC_REWARD_IMAGES[p.kind] : REWARD_IMAGES[p.kind]} style={styles.inventoryIcon} resizeMode="contain" />
          <View style={{ flex: 1 }}><Text style={styles.hubTitle}>{potionName(p.kind, p.boost_percent)}</Text><Text style={styles.small}>{t('dailyChest.potionUsesLeft', { boost: p.boost_percent ?? 50, n: p.remaining })}</Text></View>
        </View>)}
        <Text style={styles.oddsTitle}>{t('dailyChest.storedPotions')}</Text>
        {potions.length === 0 && <View style={styles.empty}><Image source={REWARD_IMAGES.xp_potion} style={styles.rewardImage} resizeMode="contain" /><Text style={styles.subtitle}>{t('dailyChest.emptyPotions')}</Text></View>}
        {onShopPotions && <TouchableOpacity accessibilityRole="button" style={[styles.activateButton, { marginTop: 12 }]} onPress={() => { setInventoryVisible(false); onShopPotions(); }}><Text style={styles.primaryText}>{t('dailyChest.buyRegularPotions')}</Text></TouchableOpacity>}
        {potions.map(p => { const boost = p.boost_percent ?? 50; return <View key={`${p.kind}:${p.duration}`} style={styles.inventoryRow}>
          <Image source={boost >= 200 ? MYTHIC_REWARD_IMAGES[p.kind] : REWARD_IMAGES[p.kind]} style={styles.inventoryIcon} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={styles.hubTitle}>{potionName(p.kind, boost)} ×{p.quantity}</Text><Text style={styles.small}>+{boost}% · {quizCount(p.duration)}</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('dailyChest.accessibility.activatePotion', { name: potionName(p.kind, boost), n: p.duration })} disabled={activating} onPress={() => void activate(p)} style={[styles.activateButton, activating && { opacity: 0.45 }]}><Text style={styles.primaryText}>{t('dailyChest.use')}</Text></TouchableOpacity>
        </View>; })}
        {!!inventoryError && <TouchableOpacity accessibilityRole="button" onPress={() => { setInventoryError(''); void loadPotions(); }}><Text style={styles.error}>{inventoryError}</Text></TouchableOpacity>}
      </ScrollView></View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  hub: { flexDirection: 'row', backgroundColor: '#18172A', borderWidth: 1, borderColor: '#39324F', borderRadius: 18, marginBottom: 12 },
  hubChest: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 9 }, hubImage: { width: 60, height: 60 }, hubTitle: { color: '#F8F1E6', fontSize: 15, fontWeight: '800' },
  small: { color: '#C2BDD1', fontSize: 12, marginTop: 3 }, dot: { width: 8, height: 8, borderRadius: 4 },
  potionsButton: { minWidth: 78, padding: 10, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#39324F' }, potionSmall: { width: 30, height: 30 }, activeLabel: { fontSize: 8, fontWeight: '800', color: '#B4EEBD' },
  previewButton: { alignSelf: 'center', borderWidth: 1, borderColor: '#5D4F7D', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 }, previewButtonText: { color: '#CDBBFF', fontSize: 12, fontWeight: '800' },
  activeSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12, marginTop: 4 },
  activeSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4, direction: 'ltr' },
  activeSummary: { color: '#BAEFC4', fontSize: 12, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(5,4,14,0.9)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 40 }, card: { width: '100%', maxWidth: 440, maxHeight: '100%', borderRadius: 28, backgroundColor: '#161325', borderWidth: 1, overflow: 'hidden' },
  content: { padding: 22 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: '#C8B0FF' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 28, color: '#C2BDD1' },
  title: { fontSize: 30, fontWeight: '900', color: '#FFF6E8', letterSpacing: -0.8 }, subtitle: { color: '#BCB6CC', fontSize: 13, lineHeight: 20, marginTop: 7 }, upgrade: { textAlign: 'center', fontSize: 11, letterSpacing: 2, fontWeight: '800', marginTop: 14 },
  stage: { height: 216, position: 'relative', alignItems: 'center', justifyContent: 'center' }, halo: { position: 'absolute', width: 190, height: 170, borderRadius: 95 }, chestImage: { width: 210, height: 200 }, openChest: { position: 'absolute', bottom: 0, width: 210, height: 165, opacity: 0.75 }, rewardHero: { position: 'absolute', top: 5 }, rewardImage: { width: 126, height: 126 }, rewardRevealImage: { width: 92, height: 92 },
  rewardDetails: { alignItems: 'center', marginBottom: 20 }, rewardTitle: { fontSize: 27, fontWeight: '900', textAlign: 'center' }, tierTrail: { flexDirection: 'row', gap: 3 }, tierStep: { flex: 1, alignItems: 'center', paddingVertical: 7, borderWidth: 1, borderColor: 'transparent', borderRadius: 9 }, tierIcon: { width: 38, height: 36 }, tierText: { color: '#C2BDD1', fontSize: 9, textAlign: 'center', marginTop: 3 },
  previewPanel: { borderWidth: 1, borderColor: '#4B3C65', borderRadius: 14, backgroundColor: '#201A32', padding: 12, marginTop: 12 }, previewTitle: { color: '#CDBBFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, previewLabel: { color: '#AAA0C0', fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 6 }, previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, previewChip: { borderWidth: 1, borderColor: '#514761', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 }, previewChipText: { color: '#D8D0E4', fontSize: 11, fontWeight: '700' },
  progressText: { color: '#E7DCEF', fontSize: 12, textAlign: 'center', marginTop: 14, fontWeight: '700' }, progressTrack: { flexDirection: 'row', gap: 5, marginTop: 9 }, progressSegment: { flex: 1, height: 5, borderRadius: 3 }, rules: { color: '#ADA6BD', fontSize: 11, lineHeight: 17, marginTop: 10 },
  primary: { minHeight: 52, justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 15, marginTop: 18 }, primaryText: { color: '#24172B', fontSize: 15, fontWeight: '900' }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, error: { color: '#FFABAD', fontSize: 13, lineHeight: 19, marginTop: 12 },
  oddsButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, odds: { borderTopWidth: 1, borderTopColor: '#373044', paddingTop: 12 }, oddsTitle: { color: '#EEE5F5', fontSize: 12, fontWeight: '800', marginVertical: 8 }, oddsRow: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 7 }, oddsIcon: { width: 28, height: 28 }, oddsQuestion: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#8D7BB8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#292439' }, oddsQuestionText: { color: '#D7C7FF', fontSize: 18, fontWeight: '800' }, oddsName: { flex: 1, color: '#DCD3E6', fontSize: 12 }, oddsPercent: { fontWeight: '800', fontSize: 13 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, avatarItem: { width: 65, height: 58, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }, avatarIcon: { width: 52, height: 52, tintColor: '#554C68', opacity: 0.78 }, inventoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 }, inventoryIcon: { width: 50, height: 58 }, activateButton: { backgroundColor: '#C7AFF8', minHeight: 44, minWidth: 60, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, empty: { alignItems: 'center', paddingVertical: 28 },
});
