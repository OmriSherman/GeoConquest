import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './locales/strings';

export const SUPPORTED = ['en', 'es', 'fr', 'hi', 'zh-Hans', 'he', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED)[number];

const RTL_LOCALES: ReadonlySet<string> = new Set(['ar', 'he']);

export function isLocaleRTL(locale: string = i18n.locale): boolean {
  return RTL_LOCALES.has(locale);
}

/** Call when locale is known to apply RTL layout direction. */
function applyRTL(locale: string) {
  const rtl = isLocaleRTL(locale);
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
  I18nManager.forceRTL(rtl);
}

export function isRTL(): boolean {
  return I18nManager.isRTL;
}

// Native names for the language picker.
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
  'zh-Hans': '中文',
  he: 'עברית',
  ar: 'العربية',
};

const STORAGE_KEY = '@settings/locale';

export const i18n = new I18n(translations);
i18n.defaultLocale = 'en';
i18n.enableFallback = true; // fall back to English for untranslated keys

function resolveDeviceLocale(): AppLocale {
  for (const l of getLocales()) {
    const code = l.languageCode?.toLowerCase();
    if (!code) continue;
    if (code === 'zh') return 'zh-Hans';
    if ((SUPPORTED as readonly string[]).includes(code)) return code as AppLocale;
  }
  return 'en';
}

// Set immediately at import so t() and country localization work before initI18n resolves.
const _initialLocale = resolveDeviceLocale();
i18n.locale = _initialLocale;
applyRTL(_initialLocale);

let _listeners: Array<() => void> = [];
function notify() { _listeners.forEach((fn) => fn()); }

/** Subscribe to locale changes; returns an unsubscribe fn. */
export function onLocaleChange(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((f) => f !== fn); };
}

/** Apply a stored locale override, if any. Called once on startup. */
export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored && stored !== i18n.locale && (SUPPORTED as readonly string[]).includes(stored)) {
    applyRTL(stored);
    i18n.locale = stored;
    notify();
  }
}

export function getLocale(): AppLocale {
  return i18n.locale as AppLocale;
}

export async function setLocale(locale: AppLocale): Promise<void> {
  applyRTL(locale);
  i18n.locale = locale;
  notify(); // update UI immediately
  AsyncStorage.setItem(STORAGE_KEY, locale).catch(() => {});
}

/** Re-renders the calling component whenever the locale changes. */
export function useLocale(): AppLocale {
  const [loc, setLoc] = useState<AppLocale>(getLocale());
  useEffect(() => onLocaleChange(() => setLoc(getLocale())), []);
  return loc;
}

export const t = (key: string, opts?: Record<string, unknown>): string => i18n.t(key, opts);
