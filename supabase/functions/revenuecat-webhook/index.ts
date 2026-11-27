// RevenueCat -> Supabase: the ONLY thing that grants or removes Conqueror.
// Deploy:  supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secret:  supabase secrets set RC_WEBHOOK_AUTH=<the same value you put in RevenueCat's "Authorization header value">
// RevenueCat sends that value verbatim in the Authorization header of every event.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTITLEMENT = 'Conqueror';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Events after which the user HAS access (until expiration_at_ms, if there is one).
const GRANTING = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);
const REVOKING = new Set(['EXPIRATION']);
// CANCELLATION (auto-renew off), BILLING_ISSUE, TRANSFER, TEST etc. change nothing: access ends with EXPIRATION.

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function planFor(productId: string): 'unlimited' | 'monthly' {
  return /lifetime/i.test(productId) ? 'unlimited' : 'monthly'; // weekly / monthly / yearly are all "subscription"
}

Deno.serve(async (req) => {
  const expected = Deno.env.get('RC_WEBHOOK_AUTH');
  if (!expected || req.headers.get('Authorization') !== expected) return new Response('unauthorized', { status: 401 });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let ev: any;
  try { ev = (await req.json()).event; } catch { return new Response('bad json', { status: 400 }); }
  if (!ev?.type) return new Response('no event', { status: 400 });

  const entitlements: string[] = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : []);
  if (entitlements.length && !entitlements.includes(ENTITLEMENT)) return new Response('ignored: other entitlement');

  const candidates: string[] = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])];
  const userId = candidates.find((id) => typeof id === 'string' && UUID.test(id));
  if (!userId) return new Response('ignored: no supabase user id'); // anonymous RevenueCat id

  const expiresMs: number | null = ev.expiration_at_ms ?? null;
  let active: boolean;
  if (REVOKING.has(ev.type)) active = false;
  else if (GRANTING.has(ev.type)) active = expiresMs === null || expiresMs > Date.now();
  else return new Response('ignored: ' + ev.type);

  const { error } = await supabase.rpc('apply_conqueror_event', {
    p_user: userId,
    p_plan: planFor(String(ev.product_id ?? '')),
    p_active: active,
    p_expires: expiresMs ? new Date(expiresMs).toISOString() : null,
  });
  if (error) {
    console.error('apply_conqueror_event failed', error.message);
    return new Response('db error', { status: 500 }); // RevenueCat retries
  }
  return new Response('ok');
});
