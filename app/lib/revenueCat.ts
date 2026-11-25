import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';

const API_KEY = Platform.select({
  android: 'goog_MeqgFfXMWfRKNKAxpdGQCLTGzCy',
  ios: 'appl_yqTKtraJKZNmSmcDCYrbCpkBvQF',
  default: 'appl_yqTKtraJKZNmSmcDCYrbCpkBvQF',
})!;
export const ENTITLEMENT_ID = 'Conqueror';

let initialized = false;

export async function initRevenueCat(): Promise<void> {
  if (initialized) return;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: API_KEY });
    initialized = true;
  } catch (err) {
    console.warn('[RevenueCat] Init failed:', err);
  }
}

export async function identifyUser(userId: string): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (err) {
    console.warn('[RevenueCat] Identify failed:', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  if (!initialized) return;
  try {
    await Purchases.logOut();
  } catch {}
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!initialized) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!initialized) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// ponytail: presentCustomerCenter lives in react-native-purchases-ui, called directly from screens
export { Purchases };
