-- Feature 6: Compass Quiz.
-- RUN AFTER 20261001000000_conqueror_webhook.sql (needs the game_config + submit_quiz_result migrations).
-- Safe to run again (it overwrites the compass config values with the ones below).
--
--   * quiz_results accepts quiz_type 'compass'.
--   * game_config: quiz.gold.compass (50) and quiz.xp.compass (30) = the 100% (bullseye, within 5 deg) reward per round,
--     compass.w.good (0.6) = share for 5-10 deg, compass.w.close (0.3) = share for 10-30 deg, level.compass (60) = unlock level.
--   * submit_quiz_result pays 'compass'. The app reports score = rounds within 10 deg, and p_extra
--     {"bullseye": rounds within 5 deg, "partial": rounds within 30 deg only}. Combo counts rounds within 10 deg.
--       units = bullseye + good x compass.w.good + partial x compass.w.close
--       gold  = quiz.gold.compass x (units + 0.1 x combo_extra)
--       xp    = units x quiz.xp.compass x accuracy bonus (units / rounds: x1.5 above 85%, x2 when every round is a bullseye)
--     Only the function body changed vs 20260930000000 (compass branches); the signature is the same.

ALTER TABLE public.quiz_results DROP CONSTRAINT IF EXISTS quiz_results_quiz_type_check;
ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_quiz_type_check
  CHECK (quiz_type IN ('flag','shape','capitals','borders','millionaire','nightmare','trail','gauntlet','draw','compass'));

INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('quiz.gold.compass', 50,  'Quizzes', 'Compass Quiz: gold per bullseye round (within 5 deg) = 100%', 0, 100000),
  ('quiz.xp.compass',   30,  'Quizzes', 'Compass Quiz: XP per bullseye round (within 5 deg) = 100%', 0, 100000),
  ('compass.w.good',    0.6, 'Quizzes', 'Compass Quiz: share of the reward for 5-10 deg', 0, 1),
  ('compass.w.close',   0.3, 'Quizzes', 'Compass Quiz: share of the reward for 10-30 deg', 0, 1),
  ('level.compass',     60,  'Levels',  'Compass Quiz minimum level', 0, 1000)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.submit_quiz_result(
  p_key text, p_quiz_type text, p_difficulty text, p_score integer, p_total integer,
  p_combo_extra integer, p_elapsed integer, p_boost boolean DEFAULT false, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_prof record;
  v_std boolean := p_quiz_type IN ('flag', 'shape', 'capitals', 'borders');
  v_diff text;
  v_mult numeric := 1;
  v_gold integer := 0;
  v_xp integer := 0;
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
  v_lives integer;
  v_base integer;
  v_outcome text := p_extra->>'outcome';
  v_n integer;
  v_r text;
  v_cnt integer;
  v_sum integer := 0;
  v_good integer := 0;
  v_first boolean;
  v_bull integer := 0;     -- compass: rounds within 5 deg (bullseye, 100%)
  v_partial integer := 0;  -- compass: rounds within 30 deg but not 10 (close, quiz weight compass.w.close)
  v_units numeric;         -- reward units: score for normal modes; compass = bullseye + good x w.good + close x w.close
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 120 THEN RAISE EXCEPTION 'Invalid result key'; END IF;
  IF NOT v_std AND p_quiz_type NOT IN ('trail', 'millionaire', 'gauntlet', 'draw', 'nightmare', 'compass') THEN
    RAISE EXCEPTION 'Unsupported quiz type';
  END IF;
  v_diff := CASE WHEN v_std THEN COALESCE(p_difficulty, 'medium') END;
  IF v_std AND v_diff NOT IN ('easy', 'medium', 'hard') THEN RAISE EXCEPTION 'Invalid difficulty'; END IF;
  IF p_total IS NULL OR p_total < 1 OR p_total > 1000 THEN RAISE EXCEPTION 'Invalid total'; END IF;
  IF (v_std OR p_quiz_type IN ('trail', 'compass')) AND p_total > 30 THEN RAISE EXCEPTION 'Invalid total'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > p_total THEN RAISE EXCEPTION 'Invalid score'; END IF;
  IF NOT (v_std OR p_quiz_type = 'compass') THEN p_combo_extra := 0; END IF;
  v_units := p_score;
  IF p_quiz_type = 'compass' THEN
    -- p_score = rounds within 10 deg (bullseye + good); p_extra: {"bullseye": n, "partial": n}
    v_bull := COALESCE((p_extra->>'bullseye')::integer, 0);
    v_partial := COALESCE((p_extra->>'partial')::integer, 0);
    IF v_bull < 0 OR v_bull > p_score OR v_partial < 0 OR v_partial > p_total - p_score THEN RAISE EXCEPTION 'Invalid compass tiers'; END IF;
    v_units := v_bull + (p_score - v_bull) * cfg('compass.w.good', 0.6) + v_partial * cfg('compass.w.close', 0.3);
  END IF;
  IF p_combo_extra IS NULL OR p_combo_extra < 0 OR p_combo_extra > (p_score * (p_score - 1)) / 2 THEN
    RAISE EXCEPTION 'Invalid combo';
  END IF;
  IF p_elapsed IS NULL OR p_elapsed < GREATEST(p_score, 1) * cfg('quiz.min_seconds_per_question', 1) THEN
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

  v_acc := v_units / p_total;
  IF v_acc = 1 THEN v_accm := cfg('xp.accuracy_bonus_100', 2);
  ELSIF v_acc > 0.85 THEN v_accm := cfg('xp.accuracy_bonus_85', 1.5);
  END IF;

  -- ── per-mode gold + XP (before Conqueror / boost / potions) ──
  IF v_std THEN
    v_mult := cfg('quiz.mult.' || v_diff, 1);
    v_gold := round(cfg('quiz.gold.' || p_quiz_type, 0) * v_mult * (p_score + 0.1 * p_combo_extra))::integer;
    v_xp := round(round(p_score * cfg('quiz.xp.' || p_quiz_type, 5) * v_accm) * v_mult)::integer;

  ELSIF p_quiz_type = 'compass' THEN
    v_gold := round(cfg('quiz.gold.compass', 50) * (v_units + 0.1 * p_combo_extra))::integer;
    v_xp := round(v_units * cfg('quiz.xp.compass', 30) * v_accm)::integer;

  ELSIF p_quiz_type = 'trail' THEN
    v_lives := LEAST(GREATEST(COALESCE((p_extra->>'lives')::integer, 0), 0), 3);
    v_mult := cfg('trail.mult.' || v_lives, 1);
    v_base := round(cfg('quiz.gold.trail', 0) * p_score)::integer;
    v_gold := v_base + round(v_base * (v_mult - 1))::integer;
    v_xp := round(round(p_score * cfg('quiz.xp.trail', 5) * v_accm) * v_mult)::integer;

  ELSIF p_quiz_type = 'millionaire' THEN
    IF p_total <> 15 THEN RAISE EXCEPTION 'Invalid total'; END IF;
    IF v_outcome = 'win' THEN
      IF p_score <> 15 THEN RAISE EXCEPTION 'Invalid score'; END IF;
      v_gold := cfg('millionaire.ladder.15', 10000)::integer;
      v_xp := cfg('xp.millionaire_win', 1000)::integer;
    ELSIF v_outcome = 'walk' THEN
      IF p_score NOT IN (5, 10, 13) THEN RAISE EXCEPTION 'Cannot walk away here'; END IF;
      v_gold := cfg('millionaire.ladder.' || p_score, 0)::integer;
    ELSIF v_outcome = 'loss' THEN
      IF p_score >= 15 THEN RAISE EXCEPTION 'Invalid score'; END IF;
    ELSE
      RAISE EXCEPTION 'Invalid outcome';
    END IF;

  ELSIF p_quiz_type = 'gauntlet' THEN
    v_n := floor(LEAST(p_score, cfg('gauntlet.phase_max_score', 40)) / cfg('gauntlet.phase_step', 10))::integer;
    v_gold := (p_score * cfg('gauntlet.gold_per_level', 10) + cfg('gauntlet.phase_bonus', 100) * v_n * (v_n + 1) / 2)::integer;
    v_xp := (p_score * cfg('xp.gauntlet_per_correct', 25))::integer;

  ELSIF p_quiz_type = 'draw' THEN
    FOREACH v_r IN ARRAY ARRAY['perfect', 'great', 'good', 'close', 'miss'] LOOP
      v_cnt := COALESCE((p_extra->>v_r)::integer, 0);
      IF v_cnt < 0 THEN RAISE EXCEPTION 'Invalid ratings'; END IF;
      v_sum := v_sum + v_cnt;
      IF v_r IN ('perfect', 'great', 'good') THEN v_good := v_good + v_cnt; END IF;
      v_gold := v_gold + v_cnt * cfg('draw.gold.' || v_r, 0)::integer;
      v_xp := v_xp + v_cnt * round(cfg('draw.gold.' || v_r, 0) / 2.0)::integer;
    END LOOP;
    IF v_sum <> p_total OR v_good <> p_score THEN RAISE EXCEPTION 'Invalid ratings'; END IF;

  ELSIF p_quiz_type = 'nightmare' THEN
    IF v_outcome <> 'win' OR p_score <> p_total THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
    v_first := NOT EXISTS (SELECT 1 FROM public.quiz_results WHERE user_id = v_uid AND quiz_type = 'nightmare' AND score = total_questions);
    v_gold := (CASE WHEN v_first THEN cfg('nightmare.prize', 50000) ELSE cfg('nightmare.repeat_prize', 2000) END)::integer;
    v_xp := (CASE WHEN v_first THEN cfg('xp.nightmare_first_win', 20000) ELSE 0 END)::integer;
  END IF;

  IF v_prof.conq THEN v_cm := cfg('conqueror.multiplier', 2); END IF;
  IF COALESCE(p_boost, FALSE) AND (v_std OR p_quiz_type = 'trail') THEN v_bm := cfg('boost.multiplier', 2); END IF;
  v_base_eff_xp := round(v_xp * v_bm * v_cm)::integer;
  IF v_gold > 0 THEN
    v_boost_gold := round(v_gold * (v_bm - 1))::integer;
    IF p_quiz_type <> 'millionaire' THEN v_conq_gold := round(v_gold * (v_cm - 1))::integer; END IF;
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
REVOKE ALL ON FUNCTION public.submit_quiz_result(text, text, text, integer, integer, integer, integer, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_result(text, text, text, integer, integer, integer, integer, boolean, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
