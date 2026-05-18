-- The Gauntlet: infinite escalating quiz. One run = one map.
-- Scores are stored per week so we can show weekly + all-time leaderboards.

CREATE TABLE IF NOT EXISTS public.gauntlet_scores (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      integer     NOT NULL CHECK (score >= 0),
  week_start date        NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gauntlet_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gauntlet_insert_own" ON public.gauntlet_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gauntlet_select_all" ON public.gauntlet_scores
  FOR SELECT USING (true);

-- Weekly top scores (one row per user, their best score this week)
CREATE OR REPLACE FUNCTION public.get_gauntlet_leaderboard(limit_n integer DEFAULT 20)
RETURNS TABLE (user_id uuid, username text, avatar_emoji text, avatar_flag text, best_score integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    gs.user_id,
    p.username,
    p.avatar_emoji,
    p.avatar_flag,
    MAX(gs.score)::integer AS best_score
  FROM public.gauntlet_scores gs
  JOIN public.profiles p ON p.id = gs.user_id
  WHERE gs.week_start = date_trunc('week', now())::date
  GROUP BY gs.user_id, p.username, p.avatar_emoji, p.avatar_flag
  ORDER BY best_score DESC
  LIMIT limit_n;
$$;

GRANT EXECUTE ON FUNCTION public.get_gauntlet_leaderboard(integer) TO authenticated, anon;
