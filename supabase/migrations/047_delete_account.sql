-- Account deletion: removes all user data and the auth record.
-- Called by the client; runs as postgres (SECURITY DEFINER) so it can
-- reach auth.users.

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.quiz_results              WHERE user_id        = v_uid;
  DELETE FROM public.user_achievements         WHERE user_id        = v_uid;
  DELETE FROM public.user_unlocked_items       WHERE user_id        = v_uid;
  DELETE FROM public.owned_countries           WHERE user_id        = v_uid;
  DELETE FROM public.daily_leaderboard_rewards WHERE awarded_user_id = v_uid;
  DELETE FROM public.profiles                  WHERE id             = v_uid;
  DELETE FROM auth.users                       WHERE id             = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
