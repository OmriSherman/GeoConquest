-- Pay the top five daily leaderboard players.
-- #1: 3000 gold + 5 tickets
-- #2: 2000 gold + 4 tickets
-- #3: 1500 gold + 3 tickets
-- #4/#5: 1000 gold + 2 tickets
CREATE OR REPLACE FUNCTION public.award_daily_leaderboard_winner()
RETURNS TABLE(
  success boolean, reward_granted boolean, reward_date date, winner_user_id uuid,
  reward_rank integer, gold integer, tickets integer, bonus_day boolean, reason text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reward_date date := ((now() AT TIME ZONE 'UTC')::date - 1);
  v_day_start timestamptz := (v_reward_date::text || ' 00:00:00+00')::timestamptz;
  v_day_end timestamptz := ((v_reward_date + 1)::text || ' 00:00:00+00')::timestamptz;
  v_existing integer;
  v_award record;
  v_awarded integer := 0;
  v_gold integer;
  v_tickets integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, false, v_reward_date, null::uuid, null::integer, 0, 0, false, 'unauthorized';
    RETURN;
  END IF;

  SELECT count(*) INTO v_existing
    FROM public.daily_leaderboard_rewards WHERE reward_date = v_reward_date;
  IF v_existing > 0 THEN
    RETURN QUERY SELECT true, false, reward_date, awarded_user_id, reward_rank,
      gold_awarded, tickets_awarded, coalesce(bonus_day, false), 'already_awarded'
      FROM public.daily_leaderboard_rewards
      WHERE reward_date = v_reward_date ORDER BY reward_rank;
    RETURN;
  END IF;

  FOR v_award IN
    WITH quiz_rows AS (
      SELECT qr.user_id, qr.quiz_type, qr.score,
        greatest(coalesce(qr.total_questions,
          CASE WHEN qr.quiz_type = 'millionaire' THEN 15 ELSE 10 END), 1) AS total_q,
        nullif(to_jsonb(qr)->>'xp_earned', '')::integer AS stored_xp
      FROM public.quiz_results qr
      WHERE qr.played_at >= v_day_start AND qr.played_at < v_day_end
    ), totals AS (
      SELECT user_id, sum(
        CASE WHEN stored_xp IS NOT NULL THEN greatest(stored_xp, 0)
        WHEN quiz_type = 'millionaire' THEN CASE WHEN score >= 15 THEN 1000 ELSE 0 END
        WHEN quiz_type IN ('flag','shape','capitals','borders','trail') THEN
          round((score * CASE quiz_type WHEN 'flag' THEN 5 WHEN 'shape' THEN 7
            WHEN 'capitals' THEN 12 WHEN 'borders' THEN 15 WHEN 'trail' THEN 16 ELSE 0 END
            * CASE WHEN least(score::numeric / total_q, 1) = 1 THEN 2
                   WHEN score::numeric / total_q > 0.85 THEN 1.5 ELSE 1 END)::numeric)::integer
        ELSE 0 END
      )::integer AS daily_xp
      FROM quiz_rows GROUP BY user_id
    ), ranked AS (
      SELECT user_id, row_number() OVER (ORDER BY daily_xp DESC, user_id)::integer AS rank
      FROM totals WHERE daily_xp > 0
    )
    SELECT user_id, rank FROM ranked WHERE rank <= 5
  LOOP
    v_gold := CASE v_award.rank WHEN 1 THEN 3000 WHEN 2 THEN 2000 WHEN 3 THEN 1500 ELSE 1000 END;
    v_tickets := CASE v_award.rank WHEN 1 THEN 5 WHEN 2 THEN 4 WHEN 3 THEN 3 ELSE 2 END;

    INSERT INTO public.daily_leaderboard_rewards
      (reward_date, awarded_user_id, reward_rank, gold_awarded, tickets_awarded, bonus_day)
    VALUES (v_reward_date, v_award.user_id, v_award.rank, v_gold, v_tickets, false)
    ON CONFLICT ON CONSTRAINT daily_leaderboard_rewards_pkey DO NOTHING;

    IF FOUND THEN
      UPDATE public.profiles
         SET gold_balance = coalesce(gold_balance, 0) + v_gold,
             tickets = coalesce(tickets, 0) + v_tickets
       WHERE id = v_award.user_id;
      v_awarded := v_awarded + 1;
    END IF;
  END LOOP;

  IF v_awarded = 0 THEN
    RETURN QUERY SELECT true, false, v_reward_date, null::uuid, null::integer, 0, 0, false, 'no_daily_activity';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, true, reward_date, awarded_user_id, reward_rank,
    gold_awarded, tickets_awarded, coalesce(bonus_day, false), 'awarded'
    FROM public.daily_leaderboard_rewards
    WHERE reward_date = v_reward_date ORDER BY reward_rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_leaderboard_winner TO authenticated;
