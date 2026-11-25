CREATE TABLE IF NOT EXISTS public.iap_purchase_receipts (
  transaction_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store text NOT NULL CHECK (store IN ('ios', 'android')),
  product_id text NOT NULL,
  granted_kind text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.iap_purchase_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.iap_purchase_receipts FROM PUBLIC, anon, authenticated;

CREATE POLICY iap_purchase_receipts_own_read
ON public.iap_purchase_receipts
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.grant_mythic_chest_purchase(
  p_transaction_id text,
  p_store text,
  p_product_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  uid uuid := auth.uid();
  inserted boolean := false;
  inserted_rows integer := 0;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN RAISE EXCEPTION 'Missing transaction id'; END IF;
  IF p_store NOT IN ('ios', 'android') THEN RAISE EXCEPTION 'Invalid store'; END IF;
  IF p_product_id <> 'mythic_chest_1' THEN RAISE EXCEPTION 'Invalid product'; END IF;

  INSERT INTO public.iap_purchase_receipts(transaction_id, user_id, store, product_id, granted_kind)
  VALUES (p_transaction_id, uid, p_store, p_product_id, 'mythic_chest')
  ON CONFLICT (transaction_id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  inserted := inserted_rows > 0;

  IF inserted THEN
    UPDATE public.profiles
    SET mythic_bonus_chests = coalesce(mythic_bonus_chests, 0) + 1,
        mythic_chests = coalesce(mythic_monthly_chests, 0) + coalesce(mythic_bonus_chests, 0) + 1
    WHERE id = uid;
  END IF;

  SELECT jsonb_build_object(
    'granted', inserted,
    'mythic_chests', coalesce(mythic_chests, 0),
    'mythic_monthly_chests', coalesce(mythic_monthly_chests, 0),
    'mythic_bonus_chests', coalesce(mythic_bonus_chests, 0),
    'mythic_monthly_opened', coalesce(mythic_monthly_opened, 0),
    'mythic_dust', coalesce(mythic_dust, 0)
  )
  INTO result
  FROM public.profiles
  WHERE id = uid;

  RETURN result;
END
$$;

REVOKE ALL ON FUNCTION public.grant_mythic_chest_purchase(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_mythic_chest_purchase(text, text, text) TO authenticated;
