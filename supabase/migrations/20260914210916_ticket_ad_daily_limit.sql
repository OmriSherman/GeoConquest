-- One shared ticket-ad allowance per account, resetting at midnight UTC.
CREATE TABLE private.ticket_ad_claims (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  claim_count integer NOT NULL CHECK (claim_count BETWEEN 0 AND 3)
);
REVOKE ALL ON private.ticket_ad_claims FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.ticket_ad_reward(p_claim boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'UTC')::date;
  used integer := 0;
  balance integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT coalesce(tickets,0) INTO balance FROM public.profiles WHERE id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  SELECT claim_count INTO used FROM private.ticket_ad_claims WHERE user_id=uid AND claim_date=today;
  used := coalesce(used,0);
  IF p_claim THEN
    IF used>=3 THEN RAISE EXCEPTION 'You have claimed all 3 ad tickets today. Come back tomorrow.'; END IF;
    used := used+1;
    INSERT INTO private.ticket_ad_claims(user_id,claim_date,claim_count) VALUES(uid,today,used)
    ON CONFLICT(user_id) DO UPDATE SET claim_date=excluded.claim_date,claim_count=excluded.claim_count;
    UPDATE public.profiles SET tickets=coalesce(tickets,0)+1 WHERE id=uid RETURNING tickets INTO balance;
  END IF;
  RETURN jsonb_build_object('remaining',3-used,'tickets',balance,'date',today);
END $$;
REVOKE ALL ON FUNCTION private.ticket_ad_reward(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.ticket_ad_reward(boolean) TO authenticated;
CREATE FUNCTION public.ticket_ad_reward(p_claim boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.ticket_ad_reward(p_claim) $$;
REVOKE ALL ON FUNCTION public.ticket_ad_reward(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ticket_ad_reward(boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
