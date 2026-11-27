-- Feature 5d: Conqueror is granted by the RevenueCat webhook (Edge Function revenuecat-webhook), not by the client.
--
-- STEP 1 (this file, safe to run now): adds apply_conqueror_event() (service role only) + feature.rc_webhook = 0.
--   The app keeps using activate_conqueror_subscription until you flip feature.rc_webhook to 1 in the dashboard.
-- STEP 2 (at the bottom, commented out): revoke the client's right to call activate_conqueror_subscription.
--   Run it only after the webhook is verified AND the app build that honours feature.rc_webhook is released.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS conqueror_expires_at timestamptz;

INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('feature.rc_webhook', 0, 'System', '1 = Conqueror is activated by the RevenueCat webhook (app waits for it). Flip only after the webhook works.', 0, 1)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_conqueror_event(p_user uuid, p_plan text, p_active boolean, p_expires timestamptz)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bonus_claimed boolean;
  v_current_plan text;
BEGIN
  IF p_plan NOT IN ('unlimited', 'monthly') THEN RAISE EXCEPTION 'Invalid conqueror plan'; END IF;
  SELECT COALESCE(conqueror_lifetime_bonus_claimed, FALSE), conqueror_plan INTO v_bonus_claimed, v_current_plan
  FROM public.profiles WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ignored', 'no such user'); END IF;

  PERFORM set_config('app.allow_conqueror_update', 'on', TRUE);
  IF p_active THEN
    IF p_plan = 'unlimited' THEN
      UPDATE public.profiles SET
        is_conquerer = TRUE, conqueror_plan = 'unlimited', conqueror_expires_at = NULL,
        tickets = COALESCE(tickets, 0) + CASE WHEN v_bonus_claimed THEN 0 ELSE 10 END,
        conqueror_lifetime_bonus_claimed = TRUE
      WHERE id = p_user;
    ELSE
      UPDATE public.profiles SET
        is_conquerer = TRUE,
        conqueror_plan = CASE WHEN conqueror_plan = 'unlimited' THEN 'unlimited' ELSE 'monthly' END,
        conqueror_expires_at = CASE WHEN conqueror_plan = 'unlimited' THEN NULL ELSE p_expires END
      WHERE id = p_user;
    END IF;
  ELSE
    -- Expiration of a subscription never removes a lifetime purchase.
    IF v_current_plan IS DISTINCT FROM 'unlimited' THEN
      UPDATE public.profiles SET is_conquerer = FALSE, conqueror_plan = NULL, conqueror_expires_at = p_expires WHERE id = p_user;
    END IF;
  END IF;
  RETURN jsonb_build_object('user', p_user, 'active', p_active, 'plan', p_plan);
END;
$function$;
REVOKE ALL ON FUNCTION public.apply_conqueror_event(uuid, text, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_conqueror_event(uuid, text, boolean, timestamptz) TO service_role;

-- STEP 2 (run LATER, see header):
-- REVOKE EXECUTE ON FUNCTION public.activate_conqueror_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
