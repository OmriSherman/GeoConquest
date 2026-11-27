-- Feature 5c: the server calculates quiz rewards and the Nightmare loss penalty.
-- RUN AFTER 20260928000000_server_priced_shop.sql.
--
--   submit_quiz_result(...)   Flags / Shapes / Capitals / Borders. The client only reports what it can't fake cheaply
--                             (score, total, difficulty, how many consecutive-answer combo steps, elapsed time);
--                             the server computes gold + XP from game_config (base values, difficulty multiplier,
--                             accuracy bonus), applies Conqueror and the ad boost, then the potions (existing
--                             quiz_results trigger, applied last), then the level-up gold. One call, idempotent per
--                             client_result_key. The full breakdown is stored in quiz_results.reward_breakdown.
--   nightmare_loss()          The server rolls the 1-10% penalty and deducts it; the app just plays the dice animation.
--   feature.server_quiz_rewards = 1  tells the app to use the server path (the app ignores it until this migration runs).
--
-- Still client-side (later): Trail, Millionaire, Gauntlet, Border Draw, Nightmare WIN prize, the ad boost flag itself.

ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS reward_breakdown jsonb;

INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('xp.levelup_gold_per_level',    20, 'XP',        'Gold bonus on level-up = new level x this', 0, 10000),
  ('conqueror.multiplier',          2, 'Conqueror', 'Gold and XP multiplier for Conqueror members', 1, 10),
  ('boost.multiplier',              2, 'Quizzes',   'Multiplier from the watch-an-ad next-quiz boost', 1, 10),
  ('nightmare.penalty_min_pct',     1, 'Quizzes',   'Nightmare loss: minimum % of gold lost', 0, 100),
  ('nightmare.penalty_max_pct',    10, 'Quizzes',   'Nightmare loss: maximum % of gold lost', 0, 100),
  ('quiz.min_seconds_per_question', 1, 'Quizzes',   'Anti-cheat: a result faster than this per question is rejected', 0, 60),
  ('feature.server_quiz_rewards',   1, 'System',    '1 = the app uses submit_quiz_result (do not set to 0 once players are on the new build)', 0, 1)
ON CONFLICT (key) DO NOTHING;

-- ── submit_quiz_result ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_quiz_result(
  p_key text, p_quiz_type text, p_difficulty text, p_score integer, p_total integer,
  p_combo_extra integer, p_elapsed integer, p_boost boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prof record;
  v_diff text := COALESCE(p_difficulty, 'medium');
  v_mult numeric;
  v_gold integer;
  v_xp integer;
  v_acc numeric;
  v_accm numeric := 1;
  v_cm numeric := 1;
  v_bm numeric := 1;
  v_base_eff_xp integer;
  v_boost_gold integer := 0;
  v_conq_gold integer := 0;
  v_lvl_gold integer := 0;
  v_xp_before bigint;
  v_lvl_before integer;
  v_lvl_after integer;
  v_potion_xp integer;
  v_potion_gold integer;
  v_potions jsonb;
  v_new_gold integer;
  v_new_xp bigint;
  v_out jsonb;
  v_dup record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 120 THEN RAISE EXCEPTION 'Invalid result key'; END IF;
  IF p_quiz_type NOT IN ('flag', 'shape', 'capitals', 'borders') THEN RAISE EXCEPTION 'Unsupported quiz type'; END IF;
  IF v_diff NOT IN ('easy', 'medium', 'hard') THEN RAISE EXCEPTION 'Invalid difficulty'; END IF;
  IF p_total IS NULL OR p_total < 1 OR p_total > 30 THEN RAISE EXCEPTION 'Invalid total'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > p_total THEN RAISE EXCEPTION 'Invalid score'; END IF;
  -- combo_extra = sum over correct answers of (streak - 1); at most 0+1+...+(score-1)
  IF p_combo_extra IS NULL OR p_combo_extra < 0 OR p_combo_extra > (p_score * (p_score - 1)) / 2 THEN
    RAISE EXCEPTION 'Invalid combo';
  END IF;
  IF p_elapsed IS NULL OR p_elapsed < p_total * cfg('quiz.min_seconds_per_question', 1) THEN
    RAISE EXCEPTION 'Quiz finished too fast';
  END IF;

  SELECT id, COALESCE(xp, 0) AS xp, COALESCE(is_conquerer, FALSE) AS conq INTO v_prof
  FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Retry of an already-settled result: replay the stored breakdown, credit nothing.
  SELECT reward_breakdown INTO v_dup FROM public.quiz_results WHERE user_id = v_uid AND client_result_key = p_key;
  IF FOUND THEN
    RETURN COALESCE(v_dup.reward_breakdown, '{}'::jsonb) || jsonb_build_object('duplicate', true);
  END IF;

  v_mult := cfg('quiz.mult.' || v_diff, 1);
  v_gold := round(cfg('quiz.gold.' || p_quiz_type, 0) * v_mult * (p_score + 0.1 * p_combo_extra))::integer;
  v_acc := p_score::numeric / p_total;
  IF v_acc = 1 THEN v_accm := cfg('xp.accuracy_bonus_100', 2);
  ELSIF v_acc > 0.85 THEN v_accm := cfg('xp.accuracy_bonus_85', 1.5);
  END IF;
  v_xp := round(round(p_score * cfg('quiz.xp.' || p_quiz_type, 5) * v_accm) * v_mult)::integer;

  IF v_prof.conq THEN v_cm := cfg('conqueror.multiplier', 2); END IF;
  IF COALESCE(p_boost, FALSE) THEN v_bm := cfg('boost.multiplier', 2); END IF;
  v_base_eff_xp := round(v_xp * v_bm * v_cm)::integer;
  IF v_gold > 0 THEN
    v_boost_gold := round(v_gold * (v_bm - 1))::integer;
    v_conq_gold := round(v_gold * (v_cm - 1))::integer;
  END IF;

  -- Result row. The existing BEFORE INSERT trigger applies potions LAST (on the base XP / base gold) and credits them.
  INSERT INTO public.quiz_results(user_id, quiz_type, score, gold_earned, total_questions, xp_earned, potion_base_xp, client_result_key, difficulty)
  VALUES (v_uid, p_quiz_type, p_score, v_gold, p_total, v_base_eff_xp, v_xp, p_key, v_diff)
  RETURNING potion_xp_bonus, potion_gold_bonus, potions_used INTO v_potion_xp, v_potion_gold, v_potions;
  IF NOT FOUND THEN RAISE EXCEPTION 'Result was not saved'; END IF;

  v_xp_before := v_prof.xp;
  v_lvl_before := public.level_from_xp(v_xp_before);
  v_lvl_after := public.level_from_xp(v_xp_before + v_base_eff_xp + COALESCE(v_potion_xp, 0));
  IF v_xp > 0 AND v_lvl_after > v_lvl_before THEN
    v_lvl_gold := (v_lvl_after * cfg('xp.levelup_gold_per_level', 20))::integer;
  END IF;

  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + v_base_eff_xp,
      gold_balance = gold_balance + v_gold + v_boost_gold + v_conq_gold + v_lvl_gold
  WHERE id = v_uid
  RETURNING gold_balance, xp INTO v_new_gold, v_new_xp;

  v_out := jsonb_build_object(
    'gold', v_gold, 'xp', v_xp, 'xp_credited', v_base_eff_xp,
    'boost_gold', v_boost_gold, 'conqueror_gold', v_conq_gold, 'level_up_gold', v_lvl_gold,
    'potion_xp', COALESCE(v_potion_xp, 0), 'potion_gold', COALESCE(v_potion_gold, 0), 'potions_used', COALESCE(v_potions, '[]'::jsonb),
    'level_before', v_lvl_before, 'level_after', v_lvl_after,
    'new_gold', v_new_gold, 'new_xp', v_new_xp, 'duplicate', false);
  UPDATE public.quiz_results SET reward_breakdown = v_out WHERE user_id = v_uid AND client_result_key = p_key;
  RETURN v_out;
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_quiz_result(text, text, text, integer, integer, integer, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_result(text, text, text, integer, integer, integer, integer, boolean) TO authenticated;

-- ── nightmare_loss: server rolls and takes the penalty ─────────────────────
CREATE OR REPLACE FUNCTION public.nightmare_loss()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_gold integer;
  v_min integer := cfg('nightmare.penalty_min_pct', 1)::integer;
  v_max integer := GREATEST(cfg('nightmare.penalty_max_pct', 10)::integer, cfg('nightmare.penalty_min_pct', 1)::integer);
  v_pct integer;
  v_toll integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT GREATEST(COALESCE(gold_balance, 0), 0) INTO v_gold FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  v_pct := v_min + floor(random() * (v_max - v_min + 1))::integer;
  v_toll := floor(v_gold * v_pct / 100.0)::integer;
  IF v_toll > 0 THEN UPDATE public.profiles SET gold_balance = gold_balance - v_toll WHERE id = v_uid; END IF;
  RETURN jsonb_build_object('pct', v_pct, 'toll', v_toll, 'new_gold', v_gold - v_toll);
END;
$function$;
REVOKE ALL ON FUNCTION public.nightmare_loss() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nightmare_loss() TO authenticated;

NOTIFY pgrst, 'reload schema';
