// Android-only store / legal links. Metro bundles this file ONLY into the
// Android build (it overrides storeLinks.ts on Android), so the Google Play
// references here never reach the iOS binary (App Store guideline 2.3.10).

export const ANDROID_PACKAGE = 'com.geoconquest.app';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Store listing URL. */
export const STORE_URL = PLAY_STORE_URL;

/** Human-readable store name for in-app copy. */
export const STORE_NAME = 'Google Play';

/** Where users manage/cancel subscriptions. */
export const STORE_BILLING_NAME = 'Google Play';

/** Developer console name (used in dev-only diagnostic messages). */
export const STORE_CONSOLE_NAME = 'Google Play Console';

// ─── Legal links (shared) ───────────────────────────────────────────────────────
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://omrisherman.github.io/privacy.html';
