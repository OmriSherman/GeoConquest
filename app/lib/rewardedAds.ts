import { Platform } from 'react-native';

let Ads: any = null;
let sdkInitialized = false;
let sdkInitializationPromise: Promise<boolean> | null = null;
type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export function getRewardedAdFailureHint(result: RewardedAdResult): string {
  if (result.rewarded) return '';
  const code = result.errorCode?.trim();
  if (code) return ` (code: ${code})`;
  const reason = result.reason?.trim();
  if (reason) return ` (reason: ${reason})`;
  return '';
}

function getAdsModule(): any | null {
  if (Ads) return Ads;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Ads = require('react-native-google-mobile-ads');
    return Ads;
  } catch {
    return null;
  }
}

function getMobileAdsInstance(mod: any): any | null {
  const mobileAdsExport = mod?.default ?? mod?.mobileAds ?? mod?.MobileAds;
  if (!mobileAdsExport) return null;
  try {
    return typeof mobileAdsExport === 'function' ? mobileAdsExport() : mobileAdsExport;
  } catch {
    return null;
  }
}

async function ensureInitialized(): Promise<boolean> {
  if (sdkInitialized) return true;
  if (sdkInitializationPromise) return sdkInitializationPromise;

  sdkInitializationPromise = (async () => {
    try {
      const mod = getAdsModule();
      if (!mod) return false;
      const mobileAds = getMobileAdsInstance(mod);
      if (!mobileAds || typeof mobileAds.initialize !== 'function') return false;
      await mobileAds.initialize();
      sdkInitialized = true;
      return true;
    } catch {
      return false;
    }
  })();

  try {
    const ok = await sdkInitializationPromise;
    if (!ok) {
      sdkInitializationPromise = null;
    }
    return ok;
  } catch {
    sdkInitializationPromise = null;
    return false;
  }
}

async function loadAndShowRewardedAd(unitId: string): Promise<RewardedAdResult> {
  const mod = getAdsModule();
  if (!mod) return { rewarded: false, reason: 'ads_module_unavailable' };

  const AdEventType = mod.AdEventType;
  const RewardedAdEventType = mod.RewardedAdEventType;
  const RewardedAd = mod.RewardedAd;
  if (!AdEventType || !RewardedAdEventType || !RewardedAd) {
    return { rewarded: false, reason: 'ads_exports_missing' };
  }

  const rewarded = RewardedAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });

  return await new Promise((resolve) => {
    let didEarnReward = false;
    let done = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const subs: Array<(() => void) | undefined> = [];
    const addSub = (unsub: any) => {
      if (typeof unsub === 'function') subs.push(unsub);
    };
    const cleanup = (result: RewardedAdResult) => {
      if (done) return;
      done = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      subs.forEach((fn) => {
        try { fn?.(); } catch {}
      });
      resolve(result);
    };

    addSub(rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show().catch((err: any) =>
        cleanup({
          rewarded: false,
          reason: 'show_error',
          errorMessage: String(err?.message ?? 'failed_to_show'),
        }),
      );
    }));

    addSub(rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      didEarnReward = true;
    }));

    addSub(rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      cleanup(didEarnReward ? { rewarded: true } : { rewarded: false, reason: 'closed_without_reward' });
    }));

    addSub(rewarded.addAdEventListener(AdEventType.ERROR, (err: any) => {
      cleanup({
        rewarded: false,
        reason: 'load_error',
        errorCode: err?.code ? String(err.code) : undefined,
        errorMessage: err?.message ? String(err.message) : undefined,
      });
    }));

    timeoutId = setTimeout(() => cleanup({ rewarded: false, reason: 'timeout' }), 30000);
    rewarded.load();
  });
}

export async function showRewardedAd(opts?: { adUnitId?: string }): Promise<RewardedAdResult> {
  try {
    const initialized = await ensureInitialized();
    if (!initialized) {
      console.warn('[Ads] Mobile Ads SDK failed to initialize.');
      return { rewarded: false, reason: 'sdk_init_failed' };
    }

    const mod = getAdsModule()!;
    const TestIds = mod.TestIds;
    const forceTestIds = process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_IDS === '1';

    const unitId =
      opts?.adUnitId ??
      (__DEV__ || forceTestIds
        ? TestIds.REWARDED
        : Platform.select({
            android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID_ANDROID,
            ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID_IOS,
            default: undefined,
          }));
    if (!unitId) {
      console.warn('[Ads] Missing rewarded ad unit id for this platform.');
      return { rewarded: false, reason: 'missing_ad_unit_id' };
    }

    const firstAttempt = await loadAndShowRewardedAd(unitId);
    if (firstAttempt.rewarded) return firstAttempt;

    // One automatic retry helps absorb transient "no fill"/network errors.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const secondAttempt = await loadAndShowRewardedAd(unitId);
    const finalResult = secondAttempt.rewarded ? secondAttempt : firstAttempt;
    if (!finalResult.rewarded) {
      console.warn(
        `[Ads] Rewarded unavailable. reason=${finalResult.reason ?? 'unknown'} code=${finalResult.errorCode ?? 'n/a'} message=${finalResult.errorMessage ?? 'n/a'}`,
      );
    }
    return finalResult;
  } catch (err: any) {
    console.warn(`[Ads] Unexpected rewarded ad error: ${String(err?.message ?? err)}`);
    return { rewarded: false, reason: 'unexpected_error' };
  }
}

// Warm up Mobile Ads SDK eagerly so first ad request doesn't race initialization.
void ensureInitialized();
