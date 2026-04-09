-- Store accurate XP per quiz result and use it for daily leaderboard winner rewards

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS total_questions integer;

UPDATE public.quiz_results
SET total_questions = 10
WHERE total_questions IS NULL;

ALTER TABLE public.quiz_results
  ALTER COLUMN total_questions SET DEFAULT 10;

ALTER TABLE public.quiz_results
  ALTER COLUMN total_questions SET NOT NULL;

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS xp_earned integer;

-- Best-effort backfill for legacy rows where xp_earned was not recorded
UPDATE public.quiz_results qr
SET xp_earned = (
  CASE
    WHEN qr.quiz_type = 'millionaire' THEN
      CASE WHEN qr.score >= 15 THEN 2000 ELSE 0 END
    WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders') THEN
      (
        CASE
          WHEN LEAST(qr.score::numeric / GREATEST(qr.total_questions, 1), 1) = 1 THEN
            ROUND(
              (qr.score * CASE qr.quiz_type
                WHEN 'flag' THEN 5
                WHEN 'shape' THEN 7
                WHEN 'capitals' THEN 8
                WHEN 'borders' THEN 10
                ELSE 0
              END)::numeric * 2
            )
          WHEN LEAST(qr.score::numeric / GREATEST(qr.total_questions, 1), 1) > 0.85 THEN
            ROUND(
              (qr.score * CASE qr.quiz_type
                WHEN 'flag' THEN 5
                WHEN 'shape' THEN 7
                WHEN 'capitals' THEN 8
                WHEN 'borders' THEN 10
                ELSE 0
              END)::numeric * 1.5
            )
          ELSE
            ROUND(
              (qr.score * CASE qr.quiz_type
                WHEN 'flag' THEN 5
                WHEN 'shape' THEN 7
                WHEN 'capitals' THEN 8
                WHEN 'borders' THEN 10
                ELSE 0
              END)::numeric
            )
        END
      )::integer
    ELSE NULL
  END
)
WHERE qr.xp_earned IS NULL;

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

  SELECT *
  INTO v_existing
  FROM public.daily_leaderboard_rewards
  WHERE daily_leaderboard_rewards.reward_date = v_today;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, FALSE, v_today, v_existing.awarded_user_id, v_existing.gold_awarded, v_existing.tickets_awarded, 'already_awarded';
    RETURN;
  END IF;

  WITH totals AS (
    SELECT
      qr.user_id,
      SUM(
        CASE
          WHEN qr.xp_earned IS NOT NULL THEN GREATEST(qr.xp_earned, 0)
          WHEN qr.quiz_type = 'millionaire' THEN
            CASE WHEN qr.score >= 15 THEN 2000 ELSE 0 END
          WHEN qr.quiz_type IN ('flag', 'shape', 'capitals', 'borders') THEN
            CASE
              WHEN LEAST(qr.score::numeric / GREATEST(qr.total_questions, 1), 1) = 1 THEN
                ROUND(
                  (qr.score * CASE qr.quiz_type
                    WHEN 'flag' THEN 5
                    WHEN 'shape' THEN 7
                    WHEN 'capitals' THEN 8
                    WHEN 'borders' THEN 10
                    ELSE 0
                  END)::numeric * 2
                )::integer
              WHEN LEAST(qr.score::numeric / GREATEST(qr.total_questions, 1), 1) > 0.85 THEN
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
    FROM public.quiz_results qr
    WHERE qr.played_at >= v_day_start
      AND qr.played_at < v_day_end
    GROUP BY qr.user_id
  )
  SELECT t.user_id
  INTO v_winner
  FROM totals t
  WHERE t.daily_xp > 0
  ORDER BY t.daily_xp DESC, t.user_id ASC
  LIMIT 1;

  IF v_winner IS NULL THEN
    RETURN QUERY SELECT TRUE, FALSE, v_today, NULL::uuid, 0, 0, 'no_daily_activity';
    RETURN;
  END IF;

  INSERT INTO public.daily_leaderboard_rewards (reward_date, awarded_user_id, gold_awarded, tickets_awarded)
  VALUES (v_today, v_winner, 1000, 2)
  ON CONFLICT (reward_date) DO NOTHING;

  IF NOT FOUND THEN
    SELECT *
    INTO v_existing
    FROM public.daily_leaderboard_rewards
    WHERE daily_leaderboard_rewards.reward_date = v_today;
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
