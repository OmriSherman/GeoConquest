// Store / legal links.
//
// This base module is bundled on iOS and web. It intentionally contains NO
// third-party store references, so the iOS binary stays completely free of
// such platform strings (App Store guideline 2.3.10). Android-specific values
// live in `storeLinks.android.ts`, which Metro bundles only into Android.

export const APPLE_APP_ID = '6775380741';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APPLE_APP_ID}`;

/** Store listing URL. */
export const STORE_URL = APP_STORE_URL;

/** Human-readable store name for in-app copy. */
export const STORE_NAME = 'the App Store';

/** Where users manage/cancel subscriptions. */
export const STORE_BILLING_NAME = 'App Store';

/** Developer console name (used in dev-only diagnostic messages). */
export const STORE_CONSOLE_NAME = 'App Store Connect';

// ─── Legal links (required by App Store guideline 3.1.2(c)) ─────────────────────
// Apple's standard EULA (Terms of Use). If you switch to a custom EULA, replace this.
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const PRIVACY_URL = 'https://omrisherman.github.io/privacy.html';
