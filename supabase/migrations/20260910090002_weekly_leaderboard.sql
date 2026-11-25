-- Weekly challenge leaderboard. Accuracy requires at least 10 quizzes.
CREATE OR REPLACE FUNCTION public.get_weekly_xp_leaderboard(
  p_limit integer DEFAULT 500, p_challenge_type text DEFAULT 'xp'
)
RETURNS TABLE(user_id uuid, weekly_xp integer, metric_value numeric, quiz_count integer, gold_earned integer, questions_answered integer, accuracy numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'UTC')::date AS week_start
  ), rows AS (
    SELECT qr.user_id, qr.score,
      greatest(coalesce(qr.total_questions, CASE WHEN qr.quiz_type='millionaire' THEN 15 ELSE 10 END), 1) AS total_q,
      greatest(coalesce(qr.gold_earned, 0), 0) AS gold,
      coalesce(nullif(qr.xp_earned, 0), CASE qr.quiz_type
        WHEN 'millionaire' THEN CASE WHEN qr.score >= 15 THEN 2000 ELSE 0 END
        WHEN 'flag' THEN qr.score * 5 WHEN 'shape' THEN qr.score * 7
        WHEN 'capitals' THEN qr.score * 8 WHEN 'borders' THEN qr.score * 10
        WHEN 'trail' THEN qr.score * 16 ELSE 0 END) AS xp
    FROM public.quiz_results qr CROSS JOIN bounds b
    WHERE qr.played_at >= (b.week_start::text || ' 00:00:00+00')::timestamptz
      AND qr.played_at < ((b.week_start + 7)::text || ' 00:00:00+00')::timestamptz
  ), totals AS (
    SELECT user_id, sum(xp)::integer AS weekly_xp, count(*)::integer AS quiz_count,
      sum(gold)::integer AS gold_earned, sum(score)::integer AS questions_answered,
      round(sum(score)::numeric / nullif(sum(total_q), 0) * 100, 1) AS accuracy
    FROM rows GROUP BY user_id
  )
  SELECT user_id, weekly_xp,
    CASE p_challenge_type WHEN 'quizzes' THEN quiz_count::numeric
      WHEN 'gold' THEN gold_earned::numeric WHEN 'questions' THEN questions_answered::numeric
      WHEN 'accuracy' THEN accuracy ELSE weekly_xp::numeric END AS metric_value,
    quiz_count, gold_earned, questions_answered, accuracy
  FROM totals
  WHERE quiz_count > 0 AND (p_challenge_type <> 'accuracy' OR quiz_count >= 10)
  ORDER BY metric_value DESC, weekly_xp DESC, user_id
  LIMIT greatest(1, coalesce(p_limit, 500));
$$;
GRANT EXECUTE ON FUNCTION public.get_weekly_xp_leaderboard(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_weekly_leaderboard_rewards()
RETURNS TABLE(success boolean, reward_granted boolean, reward_date date, winner_user_id uuid, reward_rank integer, gold integer, tickets integer, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_end date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  v_start date := v_end - 7;
  a record; g integer; t integer; awarded integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN QUERY SELECT false,false,v_start,null::uuid,null::integer,0,0,'unauthorized'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM daily_leaderboard_rewards WHERE reward_date = v_start AND reward_rank BETWEEN 101 AND 105) THEN
    RETURN QUERY SELECT true,false,v_start,awarded_user_id,reward_rank,gold_awarded,tickets_awarded,'already_awarded'
      FROM daily_leaderboard_rewards WHERE reward_date=v_start AND reward_rank BETWEEN 101 AND 105 ORDER BY reward_rank; RETURN;
  END IF;
  FOR a IN
    WITH q AS (
      SELECT user_id, coalesce(nullif(xp_earned,0), CASE quiz_type WHEN 'millionaire' THEN CASE WHEN score>=15 THEN 1000 ELSE 0 END
        WHEN 'flag' THEN score*5 WHEN 'shape' THEN score*7 WHEN 'capitals' THEN score*12 WHEN 'borders' THEN score*15 WHEN 'trail' THEN score*16 ELSE 0 END) AS xp
      FROM quiz_results WHERE played_at >= (v_start::text||' 00:00:00+00')::timestamptz AND played_at < (v_end::text||' 00:00:00+00')::timestamptz
    ), ranked AS (SELECT user_id, row_number() OVER (ORDER BY sum(xp) DESC, user_id)::integer AS rank FROM q GROUP BY user_id)
    SELECT user_id, rank FROM ranked WHERE rank <= 5
  LOOP
    g := CASE a.rank WHEN 1 THEN 9000 WHEN 2 THEN 6000 WHEN 3 THEN 4500 ELSE 3000 END;
    t := CASE a.rank WHEN 1 THEN 15 WHEN 2 THEN 12 WHEN 3 THEN 9 ELSE 6 END;
    INSERT INTO daily_leaderboard_rewards(reward_date,awarded_user_id,reward_rank,gold_awarded,tickets_awarded,bonus_day)
      VALUES(v_start,a.user_id,100+a.rank,g,t,false) ON CONFLICT DO NOTHING;
    IF FOUND THEN UPDATE profiles SET gold_balance=coalesce(gold_balance,0)+g,tickets=coalesce(tickets,0)+t WHERE id=a.user_id; awarded:=awarded+1; END IF;
  END LOOP;
  IF awarded=0 THEN RETURN QUERY SELECT true,false,v_start,null::uuid,null::integer,0,0,'no_weekly_activity'; RETURN; END IF;
  RETURN QUERY SELECT true,true,v_start,awarded_user_id,reward_rank,gold_awarded,tickets_awarded,'awarded'
    FROM daily_leaderboard_rewards WHERE reward_date=v_start AND reward_rank BETWEEN 101 AND 105 ORDER BY reward_rank;
END; $$;
GRANT EXECUTE ON FUNCTION public.award_weekly_leaderboard_rewards() TO authenticated;
