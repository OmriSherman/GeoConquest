-- 012_email_auth_fix.sql
-- Fixes email/password signup by:
-- 1. Adding missing has_onboarded and email columns to profiles
-- 2. Making the handle_new_user trigger resilient so it never blocks auth

-- ─── 1. Add missing profile columns ─────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Mark all existing users who have a username set as already onboarded
-- (they went through the flow before this column existed)
UPDATE public.profiles
SET has_onboarded = TRUE
WHERE username IS NOT NULL AND username != '';

-- ─── 2. Replace trigger with resilient version ───────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _locale  TEXT;
  _country TEXT;
BEGIN
  BEGIN
    _locale := new.raw_user_meta_data->>'locale';

    IF _locale IS NOT NULL AND length(_locale) >= 5 AND position('-' IN _locale) > 0 THEN
      _country := upper(split_part(_locale, '-', 2));
    ELSE
      _country := NULL;
    END IF;

    INSERT INTO public.profiles (id, username, country, email)
    VALUES (
      new.id,
      coalesce(
        new.raw_user_meta_data->>'username',
        split_part(coalesce(new.email, ''), '@', 1),
        'Player'
      ),
      _country,
      new.email
    )
    ON CONFLICT (id) DO UPDATE SET
      country = coalesce(profiles.country, excluded.country),
      email   = coalesce(profiles.email,   excluded.email);

  EXCEPTION WHEN OTHERS THEN
    -- Never let a trigger failure block account creation
    NULL;
  END;

  RETURN new;
END;
$$;

-- Recreate trigger (drop first to avoid stale version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 3. Reload PostgREST schema cache ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
