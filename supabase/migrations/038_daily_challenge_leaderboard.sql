-- Extend get_daily_xp_leaderboard to support per-challenge-type ranking.
-- p_challenge_type: 'xp' | 'quizzes' | 'gold' | 'questions' | 'accuracy'

CREATE OR REPLACE FUNCTION public.get_daily_xp_leaderboard(
  p_limit        integer DEFAULT 500,
  p_challenge_type text   DEFAULT 'xp'
)
RETURNS TABLE(
  user_id            uuid,
  daily_xp           integer,
  metric_value       numeric,
  quiz_count         integer,
  gold_earned        integer,
  questions_answered integer,
  accuracy           numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT (now() AT TIME ZONE 'UTC')::date AS day_utc
  ),
  quiz_rows AS (
    SELECT
      qr.user_id,
      qr.score,
      GREATEST(COALESCE(qr.total_questions, 10), 1) AS total_q,
      COALESCE(qr.gold_earned, 0) AS gold,
      -- Reuse existing XP logic: prefer stored xp_earned, fall back to formula
      COALESCE(
        NULLIF(qr.xp_earned, 0),
        CASE qr.quiz_type
          WHEN 'millionaire' THEN CASE WHEN qr.score >= 15 THEN 2000 ELSE 0 END
          WHEN 'flag'      THEN (qr.score * 5)
          WHEN 'shape'     THEN (qr.score * 7)
          WHEN 'capitals'  THEN (qr.score * 8)
          WHEN 'borders'   THEN (qr.score * 10)
          WHEN 'trail'     THEN (qr.score * 16)
          ELSE 0
        END
      ) AS xp
    FROM public.quiz_results AS qr
    CROSS JOIN bounds AS b
    WHERE qr.played_at >= ((b.day_utc::text || ' 00:00:00+00')::timestamptz)
      AND qr.played_at <  (((b.day_utc + 1)::text || ' 00:00:00+00')::timestamptz)
  ),
  totals AS (
    SELECT
      qr.user_id,
      SUM(qr.xp)::integer                                              AS daily_xp,
      COUNT(*)::integer                                                 AS quiz_count,
      SUM(qr.gold)::integer                                             AS gold_earned,
      SUM(qr.total_q)::integer                                          AS questions_answered,
      CASE WHEN SUM(qr.total_q) > 0
        THEN ROUND(SUM(qr.score)::numeric / SUM(qr.total_q)::numeric * 100, 1)
        ELSE 0::numeric
      END                                                               AS accuracy
    FROM quiz_rows AS qr
    GROUP BY qr.user_id
  )
  SELECT
    t.user_id,
    t.daily_xp,
    CASE p_challenge_type
      WHEN 'xp'        THEN t.daily_xp::numeric
      WHEN 'quizzes'   THEN t.quiz_count::numeric
      WHEN 'gold'      THEN t.gold_earned::numeric
      WHEN 'questions' THEN t.questions_answered::numeric
      WHEN 'accuracy'  THEN t.accuracy
      ELSE                  t.daily_xp::numeric
    END                                                                 AS metric_value,
    t.quiz_count,
    t.gold_earned,
    t.questions_answered,
    t.accuracy
  FROM totals AS t
  WHERE t.quiz_count > 0
  ORDER BY metric_value DESC, t.daily_xp DESC, t.user_id ASC
  LIMIT GREATEST(1, COALESCE(p_limit, 500));
$$;

-- Grant covers both old (1-arg) and new (2-arg) call signatures
GRANT EXECUTE ON FUNCTION public.get_daily_xp_leaderboard(integer, text) TO authenticated;
