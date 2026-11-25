-- Pre-computed leaderboard snapshot refreshed every 15 min by pg_cron.
-- Client reads from this single flat table instead of joining profiles +
-- owned_countries + user_unlocked_items on every leaderboard open.

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshot (
  user_id      uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username     text        NOT NULL DEFAULT '',
  avatar_emoji text        NOT NULL DEFAULT 'png_explorer_male',
  avatar_flag  text        NOT NULL DEFAULT '🏳️',
  is_conquerer boolean     NOT NULL DEFAULT false,
  xp           integer     NOT NULL DEFAULT 0,
  quiz_count   integer     NOT NULL DEFAULT 0,
  avatar_count integer     NOT NULL DEFAULT 0,
  owned_count  integer     NOT NULL DEFAULT 0,
  owned_area   bigint      NOT NULL DEFAULT 0,
  conquest_pct numeric(6,2) NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboard_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read leaderboard snapshot"
  ON public.leaderboard_snapshot FOR SELECT TO authenticated USING (true);

-- ── Refresh function ──────────────────────────────────────────────────────────
-- Country areas (km²) for the top ~100 countries by land area.
-- This covers > 99 % of all purchasable land in GeoConquest.
-- Countries not in this list contribute 0 km² to owned_area (negligible).

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leaderboard_snapshot (
    user_id, username, avatar_emoji, avatar_flag, is_conquerer,
    xp, quiz_count, avatar_count, owned_count, owned_area, conquest_pct, refreshed_at
  )
  WITH total_land AS (
    SELECT GREATEST(COALESCE(SUM(area), 1), 1)::numeric AS total_area
    FROM public.countries
  ),
  avatar_counts AS (
    SELECT user_id, COUNT(*)::integer AS cnt
    FROM public.user_unlocked_items
    WHERE item_type = 'avatar'
    GROUP BY user_id
  ),
  country_totals AS (
    SELECT
      oc.user_id,
      COUNT(*)::integer               AS owned_count,
      COALESCE(SUM(c.area), 0)::bigint AS owned_area
    FROM public.owned_countries oc
    LEFT JOIN public.countries c ON c.cca2 = oc.country_code
    GROUP BY oc.user_id
  )
  SELECT
    p.id,
    COALESCE(p.username, ''),
    COALESCE(p.avatar_emoji, 'png_explorer_male'),
    COALESCE(p.avatar_flag, '🏳️'),
    COALESCE(p.is_conquerer, false),
    COALESCE(p.xp, 0),
    COALESCE(p.quiz_count, 0),
    COALESCE(ac.cnt, 0),
    COALESCE(ct.owned_count, 0),
    COALESCE(ct.owned_area, 0),
    ROUND(LEAST(100, (COALESCE(ct.owned_area, 0)::numeric / (SELECT total_area FROM total_land)) * 100), 2),
    now()
  FROM public.profiles p
  LEFT JOIN avatar_counts ac    ON ac.user_id = p.id
  LEFT JOIN country_totals ct   ON ct.user_id = p.id
  ON CONFLICT (user_id) DO UPDATE SET
    username     = EXCLUDED.username,
    avatar_emoji = EXCLUDED.avatar_emoji,
    avatar_flag  = EXCLUDED.avatar_flag,
    is_conquerer = EXCLUDED.is_conquerer,
    xp           = EXCLUDED.xp,
    quiz_count   = EXCLUDED.quiz_count,
    avatar_count = EXCLUDED.avatar_count,
    owned_count  = EXCLUDED.owned_count,
    owned_area   = EXCLUDED.owned_area,
    conquest_pct = EXCLUDED.conquest_pct,
    refreshed_at = EXCLUDED.refreshed_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_snapshot() TO authenticated;

-- Populate immediately so the table is not empty after migration
SELECT public.refresh_leaderboard_snapshot();

-- ── pg_cron schedule ──────────────────────────────────────────────────────────
-- Requires the pg_cron extension.
-- Enable it in: Supabase Dashboard → Database → Extensions → pg_cron
-- Then run this manually once (or uncomment and apply as a separate step):
--
-- SELECT cron.schedule(
--   'refresh-leaderboard-snapshot',
--   '*/15 * * * *',
--   $$ SELECT public.refresh_leaderboard_snapshot(); $$
-- );
