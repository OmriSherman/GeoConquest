-- Align server-side fallback XP calculations with current quiz economy:
-- - Millionaire perfect run: 1000 XP (was 2000)
-- - Capitals/Borders per-correct values updated
-- - Trail quiz included in fallback XP formulas

CREATE OR REPLACE FUNCTION public.award_daily_leaderboard_winner()
RETURNS TABLE(
  success boolean,
  reward_granted boolean,
  reward_date date,
  winner_user_id uuid,
  gold integer,
  tickets integer,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_day_start timestamptz := ((v_today::text || ' 00:00:00+00')::timestamptz);
  v_day_end timestamptz := (((v_today + 1)::text || ' 00:00:00+00')::timestamptz);
  v_existing public.daily_leaderboard_rewards%ROWTYPE;
  v_winner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, v_today, NULL::uuid, 0, 0, 'unauthorized';
    RETURN;
  END IF;

  SELECT dlr.*
  INTO v_existing
  FROM public.daily_leaderboard_rewards AS dlr
  WHERE dlr.reward_date = v_today;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, FALSE, v_today, v_existing.awarded_user_id, v_existing.gold_awarded, v_existing.tickets_awarded, 'already_awarded';
    RETURN;
  END IF;

  WITH quiz_rows AS (
    SELECT
      qr.user_id,
      qr.quiz_type,
      qr.score,
      NULLIF(to_jsonb(qr)->>'xp_earned', '')::integer AS xp_earned_dyn,
      GREATEST(
        COALESCE(
          NULLIF(to_jsonb(qr)->>'total_questions', '')::integer,
          CASE WHEN qr.quiz_type = 'millionaire' THEN 15 ELSE 10 END
        ),
        1
      ) AS total_questions_dyn
    FROM public.quiz_results AS qr
    WHERE qr.played_at >= v_day_start
      AND qr.played_at < v_day_end
  ),
  totals AS (
    SELECT
      qr.user_id,
      SUM(
        CASE
          WHEN qr.xp_earned_dyn IS NOT NULL THEN GREATEST(qr.xp_earned_dyn, 0)
          WHEN qr.quiz_type = 'millionaire' THEN
            CASE WHEN qr.score >= 15 THEN 1000 ELSE 0 END
          WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders', 'trail') THEN
            CASE
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) = 1 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric * 2
                )::integer
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) > 0.85 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric * 1.5
                )::integer
              ELSE
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric
                )::integer
            END
          ELSE 0
        END
      )::integer AS daily_xp
    FROM quiz_rows AS qr
    GROUP BY qr.user_id
  )
  SELECT t.user_id
  INTO v_winner
  FROM totals AS t
  WHERE t.daily_xp > 0
  ORDER BY t.daily_xp DESC, t.user_id ASC
  LIMIT 1;

  IF v_winner IS NULL THEN
    RETURN QUERY SELECT TRUE, FALSE, v_today, NULL::uuid, 0, 0, 'no_daily_activity';
    RETURN;
  END IF;

  INSERT INTO public.daily_leaderboard_rewards
  VALUES (v_today, v_winner, 1000, 2, now())
  ON CONFLICT ON CONSTRAINT daily_leaderboard_rewards_pkey DO NOTHING;

  IF NOT FOUND THEN
    SELECT dlr.*
    INTO v_existing
    FROM public.daily_leaderboard_rewards AS dlr
    WHERE dlr.reward_date = v_today;

    RETURN QUERY SELECT TRUE, FALSE, v_today, v_existing.awarded_user_id, v_existing.gold_awarded, v_existing.tickets_awarded, 'already_awarded';
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    gold_balance = COALESCE(gold_balance, 0) + 1000,
    tickets = COALESCE(tickets, 0) + 2
  WHERE id = v_winner;

  RETURN QUERY SELECT TRUE, TRUE, v_today, v_winner, 1000, 2, 'awarded';
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_leaderboard_winner TO authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_xp_leaderboard(p_limit integer DEFAULT 500)
RETURNS TABLE(
  user_id uuid,
  daily_xp integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (now() AT TIME ZONE 'UTC')::date AS day_utc
  ),
  quiz_rows AS (
    SELECT
      qr.user_id,
      qr.quiz_type,
      qr.score,
      NULLIF(to_jsonb(qr)->>'xp_earned', '')::integer AS xp_earned_dyn,
      GREATEST(
        COALESCE(
          NULLIF(to_jsonb(qr)->>'total_questions', '')::integer,
          CASE WHEN qr.quiz_type = 'millionaire' THEN 15 ELSE 10 END
        ),
        1
      ) AS total_questions_dyn
    FROM public.quiz_results AS qr
    CROSS JOIN bounds AS b
    WHERE qr.played_at >= ((b.day_utc::text || ' 00:00:00+00')::timestamptz)
      AND qr.played_at < (((b.day_utc + 1)::text || ' 00:00:00+00')::timestamptz)
  ),
  totals AS (
    SELECT
      qr.user_id,
      SUM(
        CASE
          WHEN qr.xp_earned_dyn IS NOT NULL THEN GREATEST(qr.xp_earned_dyn, 0)
          WHEN qr.quiz_type = 'millionaire' THEN
            CASE WHEN qr.score >= 15 THEN 1000 ELSE 0 END
          WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders', 'trail') THEN
            CASE
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) = 1 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric * 2
                )::integer
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) > 0.85 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric * 1.5
                )::integer
              ELSE
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 12
                    WHEN 'borders' THEN 15
                    WHEN 'trail' THEN 20
                    ELSE 0
                  END)::numeric
                )::integer
            END
          ELSE 0
        END
      )::integer AS daily_xp
    FROM quiz_rows AS qr
    GROUP BY qr.user_id
  )
  SELECT t.user_id, t.daily_xp
  FROM totals AS t
  WHERE t.daily_xp > 0
  ORDER BY t.daily_xp DESC, t.user_id ASC
  LIMIT GREATEST(1, COALESCE(p_limit, 500));
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_xp_leaderboard(integer) TO authenticated;
