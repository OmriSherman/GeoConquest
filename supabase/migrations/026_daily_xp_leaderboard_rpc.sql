-- Daily XP leaderboard helper (UTC day), runs server-side to avoid client RLS limitations.

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
      GREATEST(COALESCE(NULLIF(to_jsonb(qr)->>'total_questions', '')::integer, 10), 1) AS total_questions_dyn
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
  SELECT t.user_id, t.daily_xp
  FROM totals AS t
  WHERE t.daily_xp > 0
  ORDER BY t.daily_xp DESC, t.user_id ASC
  LIMIT GREATEST(1, COALESCE(p_limit, 500));
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_xp_leaderboard(integer) TO authenticated;
