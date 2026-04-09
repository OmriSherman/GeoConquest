import { Platform } from 'react-native';

let Ads: any = null;

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

export async function showRewardedAd(opts?: { adUnitId?: string }): Promise<{ rewarded: boolean }> {
  try {
    const mod = getAdsModule();
    if (!mod) return { rewarded: false };

    const AdEventType = mod.AdEventType;
    const RewardedAdEventType = mod.RewardedAdEventType;
    const RewardedAd = mod.RewardedAd;
    const TestIds = mod.TestIds;

    const unitId =
      opts?.adUnitId ??
      (__DEV__
        ? TestIds.REWARDED
        : Platform.select({
            android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID_ANDROID,
            ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID_IOS,
            default: undefined,
          }));
    if (!unitId) {
      console.warn('[Ads] Missing rewarded ad unit id for this platform.');
      return { rewarded: false };
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
      const cleanup = (result: { rewarded: boolean }) => {
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

      addSub(rewarded.addAdEventListener(AdEventType.LOADED, () => {
        rewarded.show().catch(() => cleanup({ rewarded: false }));
      }));

      addSub(rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        didEarnReward = true;
      }));

      addSub(rewarded.addAdEventListener(AdEventType.CLOSED, () => cleanup({ rewarded: didEarnReward })));
      addSub(rewarded.addAdEventListener(AdEventType.ERROR, () => cleanup({ rewarded: false })));

      timeoutId = setTimeout(() => cleanup({ rewarded: false }), 25000);
      rewarded.load();
    });
  } catch {
    return { rewarded: false };
  }
}
