-- Fix ambiguous reward_date reference in award_daily_leaderboard_winner
-- and keep daily winner reward logic consistent with xp_earned.

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
      GREATEST(COALESCE(NULLIF(to_jsonb(qr)->>'total_questions', '')::integer, 10), 1) AS total_questions_dyn
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
            CASE WHEN qr.score >= 15 THEN 2000 ELSE 0 END
          WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders') THEN
            CASE
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) = 1 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 8
                    WHEN 'borders' THEN 10
                    ELSE 0
                  END)::numeric * 2
                )::integer
              WHEN LEAST(qr.score::numeric / qr.total_questions_dyn, 1) > 0.85 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 8
                    WHEN 'borders' THEN 10
                    ELSE 0
                  END)::numeric * 1.5
                )::integer
              ELSE
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 8
                    WHEN 'borders' THEN 10
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
