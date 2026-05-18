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
  WITH country_areas(cca2, area_km2) AS (
    VALUES
      ('RU',17098242),('CA',9984670),('US',9833517),('CN',9596960),('BR',8515767),
      ('AU',7741220),('IN',3287590),('AR',2780400),('KZ',2724900),('DZ',2381741),
      ('CD',2344858),('SA',2149690),('MX',1964375),('ID',1904569),('SD',1861484),
      ('LY',1759540),('IR',1648195),('MN',1564110),('PE',1285216),('TD',1284000),
      ('NE',1267000),('AO',1246700),('ML',1240192),('ZA',1219090),('CO',1141748),
      ('ET',1104300),('BO',1098581),('MR',1030700),('EG',1002450),('TZ',945087),
      ('NG',923768),('VE',916445),('PK',881913),('NA',824292),('MZ',801590),
      ('TR',783562),('CL',756102),('ZM',752612),('MM',676578),('AF',652230),
      ('SO',637657),('CF',622984),('SS',619745),('UA',603550),('MG',587041),
      ('BW',581730),('KE',580367),('FR',551695),('YE',527968),('TH',513120),
      ('ES',505990),('TM',488100),('CM',475442),('PG',462840),('SE',450295),
      ('UZ',448978),('MA',446550),('IQ',438317),('PY',406752),('ZW',390757),
      ('JP',377930),('DE',357114),('CG',342000),('FI',338424),('VN',331212),
      ('MY',329613),('NO',323802),('CI',322463),('PL',312679),('OM',309500),
      ('IT',301336),('PH',300000),('EC',283561),('NZ',270467),('GN',245857),
      ('GB',242900),('UG',241038),('GH',238533),('RO',238397),('LA',236800),
      ('BY',207600),('GY',214969),('SY',185180),('SN',196722),('KG',199951),
      ('UY',176215),('TN',163610),('SR',163820),('BD',147570),('NP',147181),
      ('TJ',143100),('GR',131957),('NI',130373),('HN',112492),('AZ',86600),
      ('PT',92212),('AT',83871),('CH',41285),('PL',312679),('CZ',78866),
      ('HU',93028),('SK',49035),('HR',56594),('RS',77474),('BG',110879),
      ('MK',25713),('AL',28748),('BA',51197),('ME',13812)
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
      COALESCE(SUM(ca.area_km2), 0)::bigint AS owned_area
    FROM public.owned_countries oc
    LEFT JOIN country_areas ca ON ca.cca2 = oc.country_code
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
    ROUND(LEAST(100, (COALESCE(ct.owned_area, 0)::numeric / 150000000) * 100), 2),
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
