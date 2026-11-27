-- Feature 5a: game_config (economy numbers editable from the admin dashboard).
-- Everything numeric lives in one table. Players can READ; only the dashboard
-- (service-role key) can write. Every change is logged in game_config_history.
-- The app has built-in fallbacks for every key, so it keeps working if a row is missing.

CREATE TABLE IF NOT EXISTS public.game_config (
  key         text PRIMARY KEY,
  value       numeric NOT NULL,
  category    text NOT NULL,
  description text NOT NULL DEFAULT '',
  min_value   numeric,
  max_value   numeric,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_config_in_range CHECK (
    (min_value IS NULL OR value >= min_value) AND (max_value IS NULL OR value <= max_value)
  )
);

CREATE TABLE IF NOT EXISTS public.game_config_history (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  old_value  numeric,
  new_value  numeric NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_config_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "game_config public read" ON public.game_config;
CREATE POLICY "game_config public read" ON public.game_config FOR SELECT USING (true);
-- No write policies: only the service-role key (dashboard) bypasses RLS.
-- History is not readable by players (dashboard reads it with the service-role key).

CREATE OR REPLACE FUNCTION public.game_config_log() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.value IS DISTINCT FROM OLD.value THEN
    INSERT INTO public.game_config_history(key, old_value, new_value)
    VALUES (NEW.key, CASE WHEN TG_OP = 'UPDATE' THEN OLD.value END, NEW.value);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS game_config_log ON public.game_config;
CREATE TRIGGER game_config_log BEFORE INSERT OR UPDATE ON public.game_config
  FOR EACH ROW EXECUTE FUNCTION public.game_config_log();

-- Server-side reader used by the purchase / reward functions (phases 5b-5c).
-- Falls back to p_default so a missing row never breaks a purchase.
CREATE OR REPLACE FUNCTION public.cfg(p_key text, p_default numeric) RETURNS numeric
  LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT value FROM public.game_config WHERE key = p_key), p_default)
$$;
REVOKE ALL ON FUNCTION public.cfg(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cfg(text, numeric) TO authenticated, service_role;

-- Seed. ON CONFLICT DO NOTHING so re-running never overwrites dashboard edits.
INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  -- Quizzes
  ('quiz.gold.flag',     10, 'Quizzes', 'Base gold per correct answer, Flags', 0, 1000),
  ('quiz.gold.shape',    15, 'Quizzes', 'Base gold per correct answer, Shapes', 0, 1000),
  ('quiz.gold.capitals', 18, 'Quizzes', 'Base gold per correct answer, Capitals', 0, 1000),
  ('quiz.gold.borders',  20, 'Quizzes', 'Base gold per correct answer, Borders', 0, 1000),
  ('quiz.gold.trail',    20, 'Quizzes', 'Base gold per correct answer, Trail', 0, 1000),
  ('quiz.xp.flag',        5, 'Quizzes', 'Base XP per correct answer, Flags', 0, 500),
  ('quiz.xp.shape',       7, 'Quizzes', 'Base XP per correct answer, Shapes', 0, 500),
  ('quiz.xp.capitals',   12, 'Quizzes', 'Base XP per correct answer, Capitals', 0, 500),
  ('quiz.xp.borders',    15, 'Quizzes', 'Base XP per correct answer, Borders', 0, 500),
  ('quiz.xp.trail',      16, 'Quizzes', 'Base XP per correct answer, Trail', 0, 500),
  ('quiz.mult.easy',   0.75, 'Quizzes', 'Reward multiplier, Easy difficulty', 0.1, 5),
  ('quiz.mult.medium',    1, 'Quizzes', 'Reward multiplier, Medium difficulty', 0.1, 5),
  ('quiz.mult.hard',   1.25, 'Quizzes', 'Reward multiplier, Hard difficulty', 0.1, 5),
  -- Shop
  ('shop.ticket.price',          500, 'Shop', 'Gold price of one ticket', 1, 1000000),
  ('shop.ticket_pack.price',    2200, 'Shop', 'Gold price of the 5-ticket pack', 1, 1000000),
  ('shop.country.area_factor',  0.03, 'Shop', 'Country price = max(min, ceil(area * factor)). 0.01 = old price, 0.03 = x3', 0.001, 1),
  ('shop.country.min',           200, 'Shop', 'Cheapest a country can be (gold)', 1, 100000),
  ('shop.upgrade.capitals',     2000, 'Shop', 'Upgrade price: Capitals quiz', 1, 10000000),
  ('shop.upgrade.borders',      2000, 'Shop', 'Upgrade price: Borders quiz', 1, 10000000),
  ('shop.upgrade.nightmare',   66666, 'Shop', 'Upgrade price: Nightmare quiz', 1, 10000000),
  ('shop.upgrade.infinite_maps',50000,'Shop', 'Upgrade price: Infinite maps', 1, 10000000),
  ('shop.upgrade.millionaire_skip',30000,'Shop','Upgrade price: Millionaire skip', 1, 10000000),
  ('shop.upgrade.border_draw', 50000, 'Shop', 'Upgrade price: Border draw', 1, 10000000),
  ('shop.quiz_turns.20',        2000, 'Shop', 'Price of 20 quiz turns upgrade', 1, 10000000),
  ('shop.quiz_turns.30',        5000, 'Shop', 'Price of 30 quiz turns upgrade', 1, 10000000),
  -- Mythic chest odds (percent; should add up to 100)
  ('mythic.odds.gold_25000',   56, 'Mythic chest', 'Chance %: 25,000 gold', 0, 100),
  ('mythic.odds.gold_75000',   10, 'Mythic chest', 'Chance %: 75,000 gold', 0, 100),
  ('mythic.odds.gold_150000',   5, 'Mythic chest', 'Chance %: 150,000 gold', 0, 100),
  ('mythic.odds.xp',            3, 'Mythic chest', 'Chance %: 20,000 XP', 0, 100),
  ('mythic.odds.xp_potion',    12, 'Mythic chest', 'Chance %: Mythic XP potion', 0, 100),
  ('mythic.odds.gold_potion',  12, 'Mythic chest', 'Chance %: Mythic gold potion', 0, 100),
  ('mythic.odds.avatar',        2, 'Mythic chest', 'Chance %: unique Mythic avatar', 0, 100)
ON CONFLICT (key) DO NOTHING;
