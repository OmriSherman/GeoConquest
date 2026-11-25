import AsyncStorage from '@react-native-async-storage/async-storage';
import { Potion, PotionKind } from './dailyChest';

export type PotionEffect = { kind: PotionKind; boost_percent: number; remaining: number; bonus?: number };
type Preview = { bag: Potion[]; active: PotionEffect[]; results: Record<string, PotionEffect[]> };
const key = (id: string) => `@dev/potions/${id}`;
export async function loadPotionPreview(id: string): Promise<Preview> {
  const saved = await AsyncStorage.getItem(key(id));
  if (saved) return JSON.parse(saved);
  return { bag: [50, 200].flatMap(boost => (['xp_potion', 'gold_potion'] as const).map(kind => ({
    kind, boost_percent: boost, duration: boost === 200 ? 10 : 3, quantity: 3, remaining: 0,
  }))), active: [], results: {} };
}
export async function activatePotionPreview(id: string, potion: Potion) {
  const state = await loadPotionPreview(id);
  const owned = state.bag.find(p => p.kind === potion.kind && p.duration === potion.duration);
  if (!owned || owned.quantity <= 0) throw new Error('No potion available');
  const boost = owned.boost_percent ?? 50;
  const effect = state.active.find(p => p.kind === owned.kind && p.boost_percent === boost);
  if ((effect?.remaining ?? 0) + owned.duration > 50) throw new Error('This stack can hold up to 50 quiz uses');
  owned.quantity -= 1;
  if (effect) effect.remaining += owned.duration;
  else state.active.push({ kind: owned.kind, boost_percent: boost, remaining: owned.duration });
  await AsyncStorage.setItem(key(id), JSON.stringify(state));
}
export async function purchasePotionPreview(id: string, kind: PotionKind) {
  const state = await loadPotionPreview(id);
  const potion = state.bag.find(p => p.kind === kind && p.duration === 3 && p.boost_percent === 50);
  if (potion) potion.quantity += 1;
  else state.bag.push({ kind, duration: 3, boost_percent: 50, quantity: 1, remaining: 0 });
  await AsyncStorage.setItem(key(id), JSON.stringify(state));
}
export async function consumePotionPreview(id: string, resultKey: string, xp: number, gold: number) {
  const state = await loadPotionPreview(id);
  if (state.results[resultKey]) return state.results[resultKey];
  const used = state.active.filter(p => p.remaining > 0).map(p => {
    p.remaining -= 1;
    return { ...p, bonus: Math.floor(Math.max(0, p.kind === 'xp_potion' ? xp : gold) * p.boost_percent / 100) };
  });
  state.results = Object.fromEntries([...Object.entries(state.results).slice(-49), [resultKey, used]]);
  await AsyncStorage.setItem(key(id), JSON.stringify(state));
  return used;
}
