-- Always reward top 3 daily — fixed gold/ticket amounts per rank.
-- Rank 1: 5000 gold + 5 tickets
-- Rank 2: 2000 gold + 2 tickets
-- Rank 3:  500 gold + 1 ticket

DROP FUNCTION IF EXISTS public.award_daily_leaderboard_winner();

CREATE OR REPLACE FUNCTION public.award_daily_leaderboard_winner()
RETURNS TABLE(
  success       boolean,
  reward_granted boolean,
  reward_date   date,
  winner_user_id uuid,
  reward_rank   integer,
  gold          integer,
  tickets       integer,
  bonus_day     boolean,
  reason        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward_date date        := ((now() AT TIME ZONE 'UTC')::date - 1);
  v_day_start   timestamptz := (v_reward_date::text || ' 00:00:00+00')::timestamptz;
  v_day_end     timestamptz := ((v_reward_date + 1)::text || ' 00:00:00+00')::timestamptz;
  v_existing    integer;
  v_award       record;
  v_awarded     integer := 0;
  v_gold        integer;
  v_tickets     integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, v_reward_date, NULL::uuid, NULL::integer, 0, 0, FALSE, 'unauthorized';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM public.daily_leaderboard_rewards dlr
  WHERE dlr.reward_date = v_reward_date;

  -- Already processed today — return existing records so client can show popup
  IF v_existing > 0 THEN
    RETURN QUERY
      SELECT TRUE, FALSE,
             dlr.reward_date, dlr.awarded_user_id, dlr.reward_rank,
             dlr.gold_awarded, dlr.tickets_awarded,
             COALESCE(dlr.bonus_day, FALSE), 'already_awarded'
      FROM public.daily_leaderboard_rewards dlr
      WHERE dlr.reward_date = v_reward_date
      ORDER BY dlr.reward_rank;
    RETURN;
  END IF;

  -- Compute yesterday's top 3 by XP earned
  FOR v_award IN
    WITH quiz_rows AS (
      SELECT
        qr.user_id,
        qr.quiz_type,
        qr.score,
        NULLIF(to_jsonb(qr)->>'xp_earned', '')::integer AS xp_earned_dyn,
        GREATEST(
          COALESCE(NULLIF(to_jsonb(qr)->>'total_questions', '')::integer,
                   CASE WHEN qr.quiz_type = 'millionaire' THEN 15 ELSE 10 END),
          1
        ) AS total_q
      FROM public.quiz_results qr
      WHERE qr.played_at >= v_day_start AND qr.played_at < v_day_end
    ),
    totals AS (
      SELECT
        qr.user_id,
        SUM(
          CASE
            WHEN qr.xp_earned_dyn IS NOT NULL THEN GREATEST(qr.xp_earned_dyn, 0)
            WHEN qr.quiz_type = 'millionaire' THEN
              CASE WHEN qr.score >= 15 THEN 1000 ELSE 0 END
            WHEN qr.quiz_type IN ('flag','shape','capitals','borders','trail') THEN
              CASE
                WHEN LEAST(qr.score::numeric / qr.total_q, 1) = 1 THEN
                  ROUND((qr.score * CASE qr.quiz_type
                    WHEN 'flag'     THEN 5  WHEN 'shape'    THEN 7
                    WHEN 'capitals' THEN 12 WHEN 'borders'  THEN 15
                    WHEN 'trail'    THEN 16 ELSE 0 END)::numeric * 2)::integer
                WHEN LEAST(qr.score::numeric / qr.total_q, 1) > 0.85 THEN
                  ROUND((qr.score * CASE qr.quiz_type
                    WHEN 'flag'     THEN 5  WHEN 'shape'    THEN 7
                    WHEN 'capitals' THEN 12 WHEN 'borders'  THEN 15
                    WHEN 'trail'    THEN 16 ELSE 0 END)::numeric * 1.5)::integer
                ELSE
                  ROUND((qr.score * CASE qr.quiz_type
                    WHEN 'flag'     THEN 5  WHEN 'shape'    THEN 7
                    WHEN 'capitals' THEN 12 WHEN 'borders'  THEN 15
                    WHEN 'trail'    THEN 16 ELSE 0 END)::numeric)::integer
              END
            ELSE 0
          END
        )::integer AS daily_xp
      FROM quiz_rows qr
      GROUP BY qr.user_id
    ),
    ranked AS (
      SELECT
        t.user_id,
        (ROW_NUMBER() OVER (ORDER BY t.daily_xp DESC, t.user_id ASC))::integer AS rank
      FROM totals t
      WHERE t.daily_xp > 0
      LIMIT 3
    )
    SELECT ranked.user_id, ranked.rank FROM ranked
  LOOP
    v_gold    := CASE v_award.rank WHEN 1 THEN 5000 WHEN 2 THEN 2000 WHEN 3 THEN 500  ELSE 0 END;
    v_tickets := CASE v_award.rank WHEN 1 THEN 5    WHEN 2 THEN 2    WHEN 3 THEN 1    ELSE 0 END;

    INSERT INTO public.daily_leaderboard_rewards
      (reward_date, awarded_user_id, reward_rank, gold_awarded, tickets_awarded, bonus_day)
    VALUES
      (v_reward_date, v_award.user_id, v_award.rank, v_gold, v_tickets, FALSE)
    ON CONFLICT ON CONSTRAINT daily_leaderboard_rewards_pkey DO NOTHING;

    IF FOUND THEN
      UPDATE public.profiles p
      SET
        gold_balance = COALESCE(p.gold_balance, 0) + v_gold,
        tickets      = COALESCE(p.tickets, 0)      + v_tickets
      WHERE p.id = v_award.user_id;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  IF v_awarded = 0 THEN
    RETURN QUERY SELECT TRUE, FALSE, v_reward_date, NULL::uuid, NULL::integer, 0, 0, FALSE, 'no_daily_activity';
    RETURN;
  END IF;

  RETURN QUERY
    SELECT TRUE, TRUE,
           dlr.reward_date, dlr.awarded_user_id, dlr.reward_rank,
           dlr.gold_awarded, dlr.tickets_awarded,
           COALESCE(dlr.bonus_day, FALSE), 'awarded'
    FROM public.daily_leaderboard_rewards dlr
    WHERE dlr.reward_date = v_reward_date
    ORDER BY dlr.reward_rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_leaderboard_winner TO authenticated;
