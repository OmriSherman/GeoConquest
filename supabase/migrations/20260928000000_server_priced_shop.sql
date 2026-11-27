-- Feature 5b: the server prices everything itself (from game_config) and checks level requirements.
-- RUN AFTER 20260927000000_game_config.sql and 20260927000001_game_config_content.sql.
--
--   * level_from_xp(xp)           server copy of the app's level curve (xpToNextLevel = round(100 * n^0.807))
--   * purchase_avatar_item        price + level requirement come from game_config; client p_cost only used for an item
--                                 that has no config row (legacy, tolerant). Quest-only / Conqueror gating unchanged.
--   * purchase_country            price = max(shop.country.min, ceil(area * shop.country.area_factor))
--   * purchase_countries (NEW)    bulk buy, server prices, one transaction
--   * purchase_quiz_upgrade       price from shop.quiz_turns.N, level gate for the 30-turn upgrade
--   * purchase_tickets (NEW)      1 ticket or the 5-pack, server prices
--   * claim_quest (NEW)           reward gold + tickets from game_config; level / countries-owned / area quests are verified
--   * claim_achievement           same server reward + verification (old clients); client-sent amount ignored
-- Not yet closed (phase 5c / later): direct UPDATE of profiles.gold_balance / xp, direct INSERT into owned_countries,
-- apply_profile_currency_delta (used for quiz rewards until they move server-side).

CREATE SCHEMA IF NOT EXISTS private;

-- ── level helper ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.level_from_xp(p_xp bigint) RETURNS integer
  LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE lvl integer := 1; rem bigint := GREATEST(COALESCE(p_xp, 0), 0); need integer;
BEGIN
  LOOP
    need := round(100 * power(lvl::double precision, 0.807::double precision))::integer;
    EXIT WHEN rem < need;
    rem := rem - need;
    lvl := lvl + 1;
  END LOOP;
  RETURN lvl;
END $$;

-- ── emoji flag prices (country flags are 1000 in the shop) ──────────────────
DELETE FROM public.game_config WHERE key = 'flag.country.price';
INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('avatar.price.🏳️', 300, 'Avatars & flags', 'White Flag flag price', 0, 10000000),
  ('avatar.price.🏴', 300, 'Avatars & flags', 'Black Flag flag price', 0, 10000000),
  ('avatar.price.🚩', 500, 'Avatars & flags', 'Red Flag flag price', 0, 10000000),
  ('avatar.price.🏁', 500, 'Avatars & flags', 'Checkered Flag flag price', 0, 10000000),
  ('avatar.price.🎌', 500, 'Avatars & flags', 'Crossed Flags flag price', 0, 10000000),
  ('avatar.price.🏴‍☠️', 1000, 'Avatars & flags', 'Pirate Flag flag price', 0, 10000000),
  ('avatar.price.🏳️‍🌈', 1000, 'Avatars & flags', 'Rainbow Pride flag price', 0, 10000000),
  ('avatar.price.🏳️‍⚧️', 1000, 'Avatars & flags', 'Transgender Pride flag price', 0, 10000000),
  ('avatar.price.🏴󠁧󠁢󠁥󠁮󠁧󠁿', 1000, 'Avatars & flags', 'England flag price', 0, 10000000),
  ('avatar.price.🏴󠁧󠁢󠁳󠁣󠁴󠁿', 1000, 'Avatars & flags', 'Scotland flag price', 0, 10000000),
  ('avatar.price.🏴󠁧󠁢󠁷󠁬󠁳󠁿', 1000, 'Avatars & flags', 'Wales flag price', 0, 10000000),
  ('avatar.price.🇩🇿', 1000, 'Avatars & flags', 'Algeria flag price', 0, 10000000),
  ('avatar.price.🇦🇴', 1000, 'Avatars & flags', 'Angola flag price', 0, 10000000),
  ('avatar.price.🇧🇯', 1000, 'Avatars & flags', 'Benin flag price', 0, 10000000),
  ('avatar.price.🇧🇼', 1000, 'Avatars & flags', 'Botswana flag price', 0, 10000000),
  ('avatar.price.🇧🇫', 1000, 'Avatars & flags', 'Burkina Faso flag price', 0, 10000000),
  ('avatar.price.🇧🇮', 1000, 'Avatars & flags', 'Burundi flag price', 0, 10000000),
  ('avatar.price.🇨🇻', 1000, 'Avatars & flags', 'Cabo Verde flag price', 0, 10000000),
  ('avatar.price.🇨🇲', 1000, 'Avatars & flags', 'Cameroon flag price', 0, 10000000),
  ('avatar.price.🇨🇫', 1000, 'Avatars & flags', 'Central African Rep. flag price', 0, 10000000),
  ('avatar.price.🇹🇩', 1000, 'Avatars & flags', 'Chad flag price', 0, 10000000),
  ('avatar.price.🇰🇲', 1000, 'Avatars & flags', 'Comoros flag price', 0, 10000000),
  ('avatar.price.🇨🇩', 1000, 'Avatars & flags', 'DR Congo flag price', 0, 10000000),
  ('avatar.price.🇨🇬', 1000, 'Avatars & flags', 'Congo flag price', 0, 10000000),
  ('avatar.price.🇩🇯', 1000, 'Avatars & flags', 'Djibouti flag price', 0, 10000000),
  ('avatar.price.🇪🇬', 1000, 'Avatars & flags', 'Egypt flag price', 0, 10000000),
  ('avatar.price.🇬🇶', 1000, 'Avatars & flags', 'Equatorial Guinea flag price', 0, 10000000),
  ('avatar.price.🇪🇷', 1000, 'Avatars & flags', 'Eritrea flag price', 0, 10000000),
  ('avatar.price.🇸🇿', 1000, 'Avatars & flags', 'Eswatini flag price', 0, 10000000),
  ('avatar.price.🇪🇹', 1000, 'Avatars & flags', 'Ethiopia flag price', 0, 10000000),
  ('avatar.price.🇬🇦', 1000, 'Avatars & flags', 'Gabon flag price', 0, 10000000),
  ('avatar.price.🇬🇲', 1000, 'Avatars & flags', 'Gambia flag price', 0, 10000000),
  ('avatar.price.🇬🇭', 1000, 'Avatars & flags', 'Ghana flag price', 0, 10000000),
  ('avatar.price.🇬🇳', 1000, 'Avatars & flags', 'Guinea flag price', 0, 10000000),
  ('avatar.price.🇬🇼', 1000, 'Avatars & flags', 'Guinea-Bissau flag price', 0, 10000000),
  ('avatar.price.🇨🇮', 1000, 'Avatars & flags', 'Ivory Coast flag price', 0, 10000000),
  ('avatar.price.🇰🇪', 1000, 'Avatars & flags', 'Kenya flag price', 0, 10000000),
  ('avatar.price.🇱🇸', 1000, 'Avatars & flags', 'Lesotho flag price', 0, 10000000),
  ('avatar.price.🇱🇷', 1000, 'Avatars & flags', 'Liberia flag price', 0, 10000000),
  ('avatar.price.🇱🇾', 1000, 'Avatars & flags', 'Libya flag price', 0, 10000000),
  ('avatar.price.🇲🇬', 1000, 'Avatars & flags', 'Madagascar flag price', 0, 10000000),
  ('avatar.price.🇲🇼', 1000, 'Avatars & flags', 'Malawi flag price', 0, 10000000),
  ('avatar.price.🇲🇱', 1000, 'Avatars & flags', 'Mali flag price', 0, 10000000),
  ('avatar.price.🇲🇷', 1000, 'Avatars & flags', 'Mauritania flag price', 0, 10000000),
  ('avatar.price.🇲🇺', 1000, 'Avatars & flags', 'Mauritius flag price', 0, 10000000),
  ('avatar.price.🇲🇦', 1000, 'Avatars & flags', 'Morocco flag price', 0, 10000000),
  ('avatar.price.🇲🇿', 1000, 'Avatars & flags', 'Mozambique flag price', 0, 10000000),
  ('avatar.price.🇳🇦', 1000, 'Avatars & flags', 'Namibia flag price', 0, 10000000),
  ('avatar.price.🇳🇪', 1000, 'Avatars & flags', 'Niger flag price', 0, 10000000),
  ('avatar.price.🇳🇬', 1000, 'Avatars & flags', 'Nigeria flag price', 0, 10000000),
  ('avatar.price.🇷🇼', 1000, 'Avatars & flags', 'Rwanda flag price', 0, 10000000),
  ('avatar.price.🇸🇹', 1000, 'Avatars & flags', 'São Tomé & Príncipe flag price', 0, 10000000),
  ('avatar.price.🇸🇳', 1000, 'Avatars & flags', 'Senegal flag price', 0, 10000000),
  ('avatar.price.🇸🇨', 1000, 'Avatars & flags', 'Seychelles flag price', 0, 10000000),
  ('avatar.price.🇸🇱', 1000, 'Avatars & flags', 'Sierra Leone flag price', 0, 10000000),
  ('avatar.price.🇸🇴', 1000, 'Avatars & flags', 'Somalia flag price', 0, 10000000),
  ('avatar.price.🇿🇦', 1000, 'Avatars & flags', 'South Africa flag price', 0, 10000000),
  ('avatar.price.🇸🇸', 1000, 'Avatars & flags', 'South Sudan flag price', 0, 10000000),
  ('avatar.price.🇸🇩', 1000, 'Avatars & flags', 'Sudan flag price', 0, 10000000),
  ('avatar.price.🇹🇿', 1000, 'Avatars & flags', 'Tanzania flag price', 0, 10000000),
  ('avatar.price.🇹🇬', 1000, 'Avatars & flags', 'Togo flag price', 0, 10000000),
  ('avatar.price.🇹🇳', 1000, 'Avatars & flags', 'Tunisia flag price', 0, 10000000),
  ('avatar.price.🇺🇬', 1000, 'Avatars & flags', 'Uganda flag price', 0, 10000000),
  ('avatar.price.🇿🇲', 1000, 'Avatars & flags', 'Zambia flag price', 0, 10000000),
  ('avatar.price.🇿🇼', 1000, 'Avatars & flags', 'Zimbabwe flag price', 0, 10000000),
  ('avatar.price.🇦🇫', 1000, 'Avatars & flags', 'Afghanistan flag price', 0, 10000000),
  ('avatar.price.🇦🇲', 1000, 'Avatars & flags', 'Armenia flag price', 0, 10000000),
  ('avatar.price.🇦🇿', 1000, 'Avatars & flags', 'Azerbaijan flag price', 0, 10000000),
  ('avatar.price.🇧🇭', 1000, 'Avatars & flags', 'Bahrain flag price', 0, 10000000),
  ('avatar.price.🇧🇩', 1000, 'Avatars & flags', 'Bangladesh flag price', 0, 10000000),
  ('avatar.price.🇧🇹', 1000, 'Avatars & flags', 'Bhutan flag price', 0, 10000000),
  ('avatar.price.🇧🇳', 1000, 'Avatars & flags', 'Brunei flag price', 0, 10000000),
  ('avatar.price.🇰🇭', 1000, 'Avatars & flags', 'Cambodia flag price', 0, 10000000),
  ('avatar.price.🇨🇳', 1000, 'Avatars & flags', 'China flag price', 0, 10000000),
  ('avatar.price.🇨🇾', 1000, 'Avatars & flags', 'Cyprus flag price', 0, 10000000),
  ('avatar.price.🇬🇪', 1000, 'Avatars & flags', 'Georgia flag price', 0, 10000000),
  ('avatar.price.🇮🇳', 1000, 'Avatars & flags', 'India flag price', 0, 10000000),
  ('avatar.price.🇮🇩', 1000, 'Avatars & flags', 'Indonesia flag price', 0, 10000000),
  ('avatar.price.🇮🇷', 1000, 'Avatars & flags', 'Iran flag price', 0, 10000000),
  ('avatar.price.🇮🇶', 1000, 'Avatars & flags', 'Iraq flag price', 0, 10000000),
  ('avatar.price.🇮🇱', 1000, 'Avatars & flags', 'Israel flag price', 0, 10000000),
  ('avatar.price.🇯🇵', 1000, 'Avatars & flags', 'Japan flag price', 0, 10000000),
  ('avatar.price.🇯🇴', 1000, 'Avatars & flags', 'Jordan flag price', 0, 10000000),
  ('avatar.price.🇰🇿', 1000, 'Avatars & flags', 'Kazakhstan flag price', 0, 10000000),
  ('avatar.price.🇰🇼', 1000, 'Avatars & flags', 'Kuwait flag price', 0, 10000000),
  ('avatar.price.🇰🇬', 1000, 'Avatars & flags', 'Kyrgyzstan flag price', 0, 10000000),
  ('avatar.price.🇱🇦', 1000, 'Avatars & flags', 'Laos flag price', 0, 10000000),
  ('avatar.price.🇱🇧', 1000, 'Avatars & flags', 'Lebanon flag price', 0, 10000000),
  ('avatar.price.🇲🇾', 1000, 'Avatars & flags', 'Malaysia flag price', 0, 10000000),
  ('avatar.price.🇲🇻', 1000, 'Avatars & flags', 'Maldives flag price', 0, 10000000),
  ('avatar.price.🇲🇳', 1000, 'Avatars & flags', 'Mongolia flag price', 0, 10000000),
  ('avatar.price.🇲🇲', 1000, 'Avatars & flags', 'Myanmar flag price', 0, 10000000),
  ('avatar.price.🇳🇵', 1000, 'Avatars & flags', 'Nepal flag price', 0, 10000000),
  ('avatar.price.🇰🇵', 1000, 'Avatars & flags', 'North Korea flag price', 0, 10000000),
  ('avatar.price.🇴🇲', 1000, 'Avatars & flags', 'Oman flag price', 0, 10000000),
  ('avatar.price.🇵🇰', 1000, 'Avatars & flags', 'Pakistan flag price', 0, 10000000),
  ('avatar.price.🇵🇸', 1000, 'Avatars & flags', 'Palestine flag price', 0, 10000000),
  ('avatar.price.🇵🇭', 1000, 'Avatars & flags', 'Philippines flag price', 0, 10000000),
  ('avatar.price.🇶🇦', 1000, 'Avatars & flags', 'Qatar flag price', 0, 10000000),
  ('avatar.price.🇸🇦', 1000, 'Avatars & flags', 'Saudi Arabia flag price', 0, 10000000),
  ('avatar.price.🇸🇬', 1000, 'Avatars & flags', 'Singapore flag price', 0, 10000000),
  ('avatar.price.🇰🇷', 1000, 'Avatars & flags', 'South Korea flag price', 0, 10000000),
  ('avatar.price.🇱🇰', 1000, 'Avatars & flags', 'Sri Lanka flag price', 0, 10000000),
  ('avatar.price.🇸🇾', 1000, 'Avatars & flags', 'Syria flag price', 0, 10000000),
  ('avatar.price.🇹🇼', 1000, 'Avatars & flags', 'Taiwan flag price', 0, 10000000),
  ('avatar.price.🇹🇯', 1000, 'Avatars & flags', 'Tajikistan flag price', 0, 10000000),
  ('avatar.price.🇹🇭', 1000, 'Avatars & flags', 'Thailand flag price', 0, 10000000),
  ('avatar.price.🇹🇱', 1000, 'Avatars & flags', 'Timor-Leste flag price', 0, 10000000),
  ('avatar.price.🇹🇷', 1000, 'Avatars & flags', 'Turkey flag price', 0, 10000000),
  ('avatar.price.🇹🇲', 1000, 'Avatars & flags', 'Turkmenistan flag price', 0, 10000000),
  ('avatar.price.🇦🇪', 1000, 'Avatars & flags', 'UAE flag price', 0, 10000000),
  ('avatar.price.🇺🇿', 1000, 'Avatars & flags', 'Uzbekistan flag price', 0, 10000000),
  ('avatar.price.🇻🇳', 1000, 'Avatars & flags', 'Vietnam flag price', 0, 10000000),
  ('avatar.price.🇾🇪', 1000, 'Avatars & flags', 'Yemen flag price', 0, 10000000),
  ('avatar.price.🇦🇱', 1000, 'Avatars & flags', 'Albania flag price', 0, 10000000),
  ('avatar.price.🇦🇩', 1000, 'Avatars & flags', 'Andorra flag price', 0, 10000000),
  ('avatar.price.🇦🇹', 1000, 'Avatars & flags', 'Austria flag price', 0, 10000000),
  ('avatar.price.🇧🇾', 1000, 'Avatars & flags', 'Belarus flag price', 0, 10000000),
  ('avatar.price.🇧🇪', 1000, 'Avatars & flags', 'Belgium flag price', 0, 10000000),
  ('avatar.price.🇧🇦', 1000, 'Avatars & flags', 'Bosnia & Herzegovina flag price', 0, 10000000),
  ('avatar.price.🇧🇬', 1000, 'Avatars & flags', 'Bulgaria flag price', 0, 10000000),
  ('avatar.price.🇭🇷', 1000, 'Avatars & flags', 'Croatia flag price', 0, 10000000),
  ('avatar.price.🇨🇿', 1000, 'Avatars & flags', 'Czech Republic flag price', 0, 10000000),
  ('avatar.price.🇩🇰', 1000, 'Avatars & flags', 'Denmark flag price', 0, 10000000),
  ('avatar.price.🇪🇪', 1000, 'Avatars & flags', 'Estonia flag price', 0, 10000000),
  ('avatar.price.🇫🇮', 1000, 'Avatars & flags', 'Finland flag price', 0, 10000000),
  ('avatar.price.🇫🇷', 1000, 'Avatars & flags', 'France flag price', 0, 10000000),
  ('avatar.price.🇩🇪', 1000, 'Avatars & flags', 'Germany flag price', 0, 10000000),
  ('avatar.price.🇬🇷', 1000, 'Avatars & flags', 'Greece flag price', 0, 10000000),
  ('avatar.price.🇭🇺', 1000, 'Avatars & flags', 'Hungary flag price', 0, 10000000),
  ('avatar.price.🇮🇸', 1000, 'Avatars & flags', 'Iceland flag price', 0, 10000000),
  ('avatar.price.🇮🇪', 1000, 'Avatars & flags', 'Ireland flag price', 0, 10000000),
  ('avatar.price.🇮🇹', 1000, 'Avatars & flags', 'Italy flag price', 0, 10000000),
  ('avatar.price.🇽🇰', 1000, 'Avatars & flags', 'Kosovo flag price', 0, 10000000),
  ('avatar.price.🇱🇻', 1000, 'Avatars & flags', 'Latvia flag price', 0, 10000000),
  ('avatar.price.🇱🇮', 1000, 'Avatars & flags', 'Liechtenstein flag price', 0, 10000000),
  ('avatar.price.🇱🇹', 1000, 'Avatars & flags', 'Lithuania flag price', 0, 10000000),
  ('avatar.price.🇱🇺', 1000, 'Avatars & flags', 'Luxembourg flag price', 0, 10000000),
  ('avatar.price.🇲🇹', 1000, 'Avatars & flags', 'Malta flag price', 0, 10000000),
  ('avatar.price.🇲🇩', 1000, 'Avatars & flags', 'Moldova flag price', 0, 10000000),
  ('avatar.price.🇲🇨', 1000, 'Avatars & flags', 'Monaco flag price', 0, 10000000),
  ('avatar.price.🇲🇪', 1000, 'Avatars & flags', 'Montenegro flag price', 0, 10000000),
  ('avatar.price.🇳🇱', 1000, 'Avatars & flags', 'Netherlands flag price', 0, 10000000),
  ('avatar.price.🇲🇰', 1000, 'Avatars & flags', 'North Macedonia flag price', 0, 10000000),
  ('avatar.price.🇳🇴', 1000, 'Avatars & flags', 'Norway flag price', 0, 10000000),
  ('avatar.price.🇵🇱', 1000, 'Avatars & flags', 'Poland flag price', 0, 10000000),
  ('avatar.price.🇵🇹', 1000, 'Avatars & flags', 'Portugal flag price', 0, 10000000),
  ('avatar.price.🇷🇴', 1000, 'Avatars & flags', 'Romania flag price', 0, 10000000),
  ('avatar.price.🇷🇺', 1000, 'Avatars & flags', 'Russia flag price', 0, 10000000),
  ('avatar.price.🇸🇲', 1000, 'Avatars & flags', 'San Marino flag price', 0, 10000000),
  ('avatar.price.🇷🇸', 1000, 'Avatars & flags', 'Serbia flag price', 0, 10000000),
  ('avatar.price.🇸🇰', 1000, 'Avatars & flags', 'Slovakia flag price', 0, 10000000),
  ('avatar.price.🇸🇮', 1000, 'Avatars & flags', 'Slovenia flag price', 0, 10000000),
  ('avatar.price.🇪🇸', 1000, 'Avatars & flags', 'Spain flag price', 0, 10000000),
  ('avatar.price.🇸🇪', 1000, 'Avatars & flags', 'Sweden flag price', 0, 10000000),
  ('avatar.price.🇨🇭', 1000, 'Avatars & flags', 'Switzerland flag price', 0, 10000000),
  ('avatar.price.🇺🇦', 1000, 'Avatars & flags', 'Ukraine flag price', 0, 10000000),
  ('avatar.price.🇬🇧', 1000, 'Avatars & flags', 'United Kingdom flag price', 0, 10000000),
  ('avatar.price.🇻🇦', 1000, 'Avatars & flags', 'Vatican City flag price', 0, 10000000),
  ('avatar.price.🇦🇬', 1000, 'Avatars & flags', 'Antigua & Barbuda flag price', 0, 10000000),
  ('avatar.price.🇦🇷', 1000, 'Avatars & flags', 'Argentina flag price', 0, 10000000),
  ('avatar.price.🇧🇸', 1000, 'Avatars & flags', 'Bahamas flag price', 0, 10000000),
  ('avatar.price.🇧🇧', 1000, 'Avatars & flags', 'Barbados flag price', 0, 10000000),
  ('avatar.price.🇧🇿', 1000, 'Avatars & flags', 'Belize flag price', 0, 10000000),
  ('avatar.price.🇧🇴', 1000, 'Avatars & flags', 'Bolivia flag price', 0, 10000000),
  ('avatar.price.🇧🇷', 1000, 'Avatars & flags', 'Brazil flag price', 0, 10000000),
  ('avatar.price.🇨🇦', 1000, 'Avatars & flags', 'Canada flag price', 0, 10000000),
  ('avatar.price.🇨🇱', 1000, 'Avatars & flags', 'Chile flag price', 0, 10000000),
  ('avatar.price.🇨🇴', 1000, 'Avatars & flags', 'Colombia flag price', 0, 10000000),
  ('avatar.price.🇨🇷', 1000, 'Avatars & flags', 'Costa Rica flag price', 0, 10000000),
  ('avatar.price.🇨🇺', 1000, 'Avatars & flags', 'Cuba flag price', 0, 10000000),
  ('avatar.price.🇩🇲', 1000, 'Avatars & flags', 'Dominica flag price', 0, 10000000),
  ('avatar.price.🇩🇴', 1000, 'Avatars & flags', 'Dominican Republic flag price', 0, 10000000),
  ('avatar.price.🇪🇨', 1000, 'Avatars & flags', 'Ecuador flag price', 0, 10000000),
  ('avatar.price.🇸🇻', 1000, 'Avatars & flags', 'El Salvador flag price', 0, 10000000),
  ('avatar.price.🇬🇩', 1000, 'Avatars & flags', 'Grenada flag price', 0, 10000000),
  ('avatar.price.🇬🇹', 1000, 'Avatars & flags', 'Guatemala flag price', 0, 10000000),
  ('avatar.price.🇬🇾', 1000, 'Avatars & flags', 'Guyana flag price', 0, 10000000),
  ('avatar.price.🇭🇹', 1000, 'Avatars & flags', 'Haiti flag price', 0, 10000000),
  ('avatar.price.🇭🇳', 1000, 'Avatars & flags', 'Honduras flag price', 0, 10000000),
  ('avatar.price.🇯🇲', 1000, 'Avatars & flags', 'Jamaica flag price', 0, 10000000),
  ('avatar.price.🇲🇽', 1000, 'Avatars & flags', 'Mexico flag price', 0, 10000000),
  ('avatar.price.🇳🇮', 1000, 'Avatars & flags', 'Nicaragua flag price', 0, 10000000),
  ('avatar.price.🇵🇦', 1000, 'Avatars & flags', 'Panama flag price', 0, 10000000),
  ('avatar.price.🇵🇾', 1000, 'Avatars & flags', 'Paraguay flag price', 0, 10000000),
  ('avatar.price.🇵🇪', 1000, 'Avatars & flags', 'Peru flag price', 0, 10000000),
  ('avatar.price.🇰🇳', 1000, 'Avatars & flags', 'St. Kitts & Nevis flag price', 0, 10000000),
  ('avatar.price.🇱🇨', 1000, 'Avatars & flags', 'St. Lucia flag price', 0, 10000000),
  ('avatar.price.🇻🇨', 1000, 'Avatars & flags', 'St. Vincent flag price', 0, 10000000),
  ('avatar.price.🇸🇷', 1000, 'Avatars & flags', 'Suriname flag price', 0, 10000000),
  ('avatar.price.🇹🇹', 1000, 'Avatars & flags', 'Trinidad & Tobago flag price', 0, 10000000),
  ('avatar.price.🇺🇸', 1000, 'Avatars & flags', 'USA flag price', 0, 10000000),
  ('avatar.price.🇺🇾', 1000, 'Avatars & flags', 'Uruguay flag price', 0, 10000000),
  ('avatar.price.🇻🇪', 1000, 'Avatars & flags', 'Venezuela flag price', 0, 10000000),
  ('avatar.price.🇦🇺', 1000, 'Avatars & flags', 'Australia flag price', 0, 10000000),
  ('avatar.price.🇫🇯', 1000, 'Avatars & flags', 'Fiji flag price', 0, 10000000),
  ('avatar.price.🇰🇮', 1000, 'Avatars & flags', 'Kiribati flag price', 0, 10000000),
  ('avatar.price.🇲🇭', 1000, 'Avatars & flags', 'Marshall Islands flag price', 0, 10000000),
  ('avatar.price.🇫🇲', 1000, 'Avatars & flags', 'Micronesia flag price', 0, 10000000),
  ('avatar.price.🇳🇷', 1000, 'Avatars & flags', 'Nauru flag price', 0, 10000000),
  ('avatar.price.🇳🇿', 1000, 'Avatars & flags', 'New Zealand flag price', 0, 10000000),
  ('avatar.price.🇵🇼', 1000, 'Avatars & flags', 'Palau flag price', 0, 10000000),
  ('avatar.price.🇵🇬', 1000, 'Avatars & flags', 'Papua New Guinea flag price', 0, 10000000),
  ('avatar.price.🇼🇸', 1000, 'Avatars & flags', 'Samoa flag price', 0, 10000000),
  ('avatar.price.🇸🇧', 1000, 'Avatars & flags', 'Solomon Islands flag price', 0, 10000000),
  ('avatar.price.🇹🇴', 1000, 'Avatars & flags', 'Tonga flag price', 0, 10000000),
  ('avatar.price.🇹🇻', 1000, 'Avatars & flags', 'Tuvalu flag price', 0, 10000000),
  ('avatar.price.🇻🇺', 1000, 'Avatars & flags', 'Vanuatu flag price', 0, 10000000),
  ('avatar.price.🇦🇨', 1000, 'Avatars & flags', 'Ascension Island flag price', 0, 10000000),
  ('avatar.price.🇸🇭', 1000, 'Avatars & flags', 'St. Helena flag price', 0, 10000000),
  ('avatar.price.🇹🇦', 1000, 'Avatars & flags', 'Tristan da Cunha flag price', 0, 10000000),
  ('avatar.price.🇾🇹', 1000, 'Avatars & flags', 'Mayotte flag price', 0, 10000000),
  ('avatar.price.🇷🇪', 1000, 'Avatars & flags', 'Réunion flag price', 0, 10000000),
  ('avatar.price.🇪🇭', 1000, 'Avatars & flags', 'Western Sahara flag price', 0, 10000000),
  ('avatar.price.🇦🇽', 1000, 'Avatars & flags', 'Åland Islands flag price', 0, 10000000),
  ('avatar.price.🇫🇴', 1000, 'Avatars & flags', 'Faroe Islands flag price', 0, 10000000),
  ('avatar.price.🇬🇬', 1000, 'Avatars & flags', 'Guernsey flag price', 0, 10000000),
  ('avatar.price.🇬🇮', 1000, 'Avatars & flags', 'Gibraltar flag price', 0, 10000000),
  ('avatar.price.🇮🇨', 1000, 'Avatars & flags', 'Canary Islands flag price', 0, 10000000),
  ('avatar.price.🇮🇲', 1000, 'Avatars & flags', 'Isle of Man flag price', 0, 10000000),
  ('avatar.price.🇯🇪', 1000, 'Avatars & flags', 'Jersey flag price', 0, 10000000),
  ('avatar.price.🇸🇯', 1000, 'Avatars & flags', 'Svalbard & Jan Mayen flag price', 0, 10000000),
  ('avatar.price.🇪🇦', 1000, 'Avatars & flags', 'Ceuta & Melilla flag price', 0, 10000000),
  ('avatar.price.🇩🇬', 1000, 'Avatars & flags', 'Diego Garcia flag price', 0, 10000000),
  ('avatar.price.🇪🇺', 1200, 'Avatars & flags', 'European Union flag price', 0, 10000000),
  ('avatar.price.🇭🇰', 1000, 'Avatars & flags', 'Hong Kong SAR flag price', 0, 10000000),
  ('avatar.price.🇲🇴', 1000, 'Avatars & flags', 'Macao SAR flag price', 0, 10000000),
  ('avatar.price.🇹🇱', 1000, 'Avatars & flags', 'Timor-Leste flag price', 0, 10000000),
  ('avatar.price.🇮🇴', 1000, 'Avatars & flags', 'British Indian Ocean Territory flag price', 0, 10000000),
  ('avatar.price.🇨🇨', 1000, 'Avatars & flags', 'Cocos (Keeling) Islands flag price', 0, 10000000),
  ('avatar.price.🇨🇽', 1000, 'Avatars & flags', 'Christmas Island flag price', 0, 10000000),
  ('avatar.price.🇳🇫', 1000, 'Avatars & flags', 'Norfolk Island flag price', 0, 10000000),
  ('avatar.price.🇳🇨', 1000, 'Avatars & flags', 'New Caledonia flag price', 0, 10000000),
  ('avatar.price.🇵🇫', 1000, 'Avatars & flags', 'French Polynesia flag price', 0, 10000000),
  ('avatar.price.🇼🇫', 1000, 'Avatars & flags', 'Wallis & Futuna flag price', 0, 10000000),
  ('avatar.price.🇳🇺', 1000, 'Avatars & flags', 'Niue flag price', 0, 10000000),
  ('avatar.price.🇹🇰', 1000, 'Avatars & flags', 'Tokelau flag price', 0, 10000000),
  ('avatar.price.🇵🇳', 1000, 'Avatars & flags', 'Pitcairn Islands flag price', 0, 10000000),
  ('avatar.price.🇨🇰', 1000, 'Avatars & flags', 'Cook Islands flag price', 0, 10000000),
  ('avatar.price.🇬🇺', 1000, 'Avatars & flags', 'Guam flag price', 0, 10000000),
  ('avatar.price.🇲🇵', 1000, 'Avatars & flags', 'Northern Mariana Islands flag price', 0, 10000000),
  ('avatar.price.🇦🇸', 1000, 'Avatars & flags', 'American Samoa flag price', 0, 10000000),
  ('avatar.price.🇭🇲', 1000, 'Avatars & flags', 'Heard & McDonald Islands flag price', 0, 10000000),
  ('avatar.price.🇬🇸', 1000, 'Avatars & flags', 'South Georgia & South Sandwich Islands flag price', 0, 10000000),
  ('avatar.price.🇹🇫', 1000, 'Avatars & flags', 'French Southern Territories flag price', 0, 10000000),
  ('avatar.price.🇧🇻', 1000, 'Avatars & flags', 'Bouvet Island flag price', 0, 10000000),
  ('avatar.price.🇺🇲', 1000, 'Avatars & flags', 'US Outlying Islands flag price', 0, 10000000),
  ('avatar.price.🇵🇷', 1000, 'Avatars & flags', 'Puerto Rico flag price', 0, 10000000),
  ('avatar.price.🇻🇮', 1000, 'Avatars & flags', 'US Virgin Islands flag price', 0, 10000000),
  ('avatar.price.🇻🇬', 1000, 'Avatars & flags', 'British Virgin Islands flag price', 0, 10000000),
  ('avatar.price.🇰🇾', 1000, 'Avatars & flags', 'Cayman Islands flag price', 0, 10000000),
  ('avatar.price.🇧🇲', 1000, 'Avatars & flags', 'Bermuda flag price', 0, 10000000),
  ('avatar.price.🇦🇮', 1000, 'Avatars & flags', 'Anguilla flag price', 0, 10000000),
  ('avatar.price.🇲🇸', 1000, 'Avatars & flags', 'Montserrat flag price', 0, 10000000),
  ('avatar.price.🇹🇨', 1000, 'Avatars & flags', 'Turks & Caicos Islands flag price', 0, 10000000),
  ('avatar.price.🇦🇼', 1000, 'Avatars & flags', 'Aruba flag price', 0, 10000000),
  ('avatar.price.🇨🇼', 1000, 'Avatars & flags', 'Curaçao flag price', 0, 10000000),
  ('avatar.price.🇸🇽', 1000, 'Avatars & flags', 'Sint Maarten flag price', 0, 10000000),
  ('avatar.price.🇧🇶', 1000, 'Avatars & flags', 'Caribbean Netherlands flag price', 0, 10000000),
  ('avatar.price.🇧🇱', 1000, 'Avatars & flags', 'St. Barthélemy flag price', 0, 10000000),
  ('avatar.price.🇲🇫', 1000, 'Avatars & flags', 'St. Martin flag price', 0, 10000000),
  ('avatar.price.🇬🇵', 1000, 'Avatars & flags', 'Guadeloupe flag price', 0, 10000000),
  ('avatar.price.🇲🇶', 1000, 'Avatars & flags', 'Martinique flag price', 0, 10000000),
  ('avatar.price.🇬🇫', 1000, 'Avatars & flags', 'French Guiana flag price', 0, 10000000),
  ('avatar.price.🇵🇲', 1000, 'Avatars & flags', 'St. Pierre & Miquelon flag price', 0, 10000000),
  ('avatar.price.🇫🇰', 1000, 'Avatars & flags', 'Falkland Islands flag price', 0, 10000000),
  ('avatar.price.🇬🇱', 1000, 'Avatars & flags', 'Greenland flag price', 0, 10000000),
  ('avatar.price.🇨🇵', 1000, 'Avatars & flags', 'Clipperton Island flag price', 0, 10000000),
  ('avatar.price.🇺🇳', 1500, 'Avatars & flags', 'United Nations flag price', 0, 10000000)
ON CONFLICT (key) DO NOTHING;

-- Avatars the first seed missed (different spacing in the source file).
INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('avatar.price.png_piga', 3500, 'Avatars & flags', 'Piga price', 0, 10000000),
  ('avatar.price.png_cheezus', 10000, 'Avatars & flags', 'Cheezus price', 0, 10000000),
  ('avatar.level.png_cheezus', 50, 'Levels', 'Cheezus minimum level', 0, 1000),
  ('avatar.price.png_lich', 10000, 'Avatars & flags', 'The Lich price', 0, 10000000),
  ('avatar.level.png_lich', 50, 'Levels', 'The Lich minimum level', 0, 1000),
  ('avatar.price.png_eagle', 2000, 'Avatars & flags', 'Eagle price', 0, 10000000),
  ('avatar.price.png_skull', 5000, 'Avatars & flags', 'Skull price', 0, 10000000),
  ('avatar.level.png_skull', 10, 'Levels', 'Skull minimum level', 0, 1000),
  ('avatar.price.png_demon', 5000, 'Avatars & flags', 'Demon price', 0, 10000000),
  ('avatar.price.png_lmao', 1500, 'Avatars & flags', 'Lmao price', 0, 10000000),
  ('avatar.price.png_lmfao', 5000, 'Avatars & flags', 'Lmfao price', 0, 10000000),
  ('avatar.level.png_lmfao', 25, 'Levels', 'Lmfao minimum level', 0, 1000),
  ('avatar.price.png_pirate', 1500, 'Avatars & flags', 'Pirate price', 0, 10000000),
  ('avatar.price.png_viking', 1500, 'Avatars & flags', 'Viking price', 0, 10000000),
  ('avatar.price.png_knight', 2000, 'Avatars & flags', 'Knight price', 0, 10000000),
  ('avatar.price.png_astronaut', 2000, 'Avatars & flags', 'Astronaut price', 0, 10000000),
  ('avatar.price.png_alien_grey', 1200, 'Avatars & flags', 'Alien Grey price', 0, 10000000),
  ('avatar.price.png_npc', 5000, 'Avatars & flags', 'NPC price', 0, 10000000),
  ('avatar.level.png_npc', 30, 'Levels', 'NPC minimum level', 0, 1000),
  ('avatar.price.png_doge', 50000, 'Avatars & flags', 'Doge price', 0, 10000000),
  ('avatar.level.png_doge', 30, 'Levels', 'Doge minimum level', 0, 1000),
  ('avatar.price.png_voodoo_doll', 2000, 'Avatars & flags', 'Voodoo Doll price', 0, 10000000),
  ('avatar.level.png_voodoo_doll', 10, 'Levels', 'Voodoo Doll minimum level', 0, 1000),
  ('avatar.price.png_soul_jar', 1000, 'Avatars & flags', 'Soul Jar price', 0, 10000000),
  ('avatar.level.png_soul_jar', 10, 'Levels', 'Soul Jar minimum level', 0, 1000),
  ('avatar.price.png_apple_a_day', 1000, 'Avatars & flags', 'Apple A Day price', 0, 10000000),
  ('avatar.price.png_vhs_demon', 3500, 'Avatars & flags', 'Old days price', 0, 10000000),
  ('avatar.price.png_possessed_cart', 700, 'Avatars & flags', 'Zombie Cart price', 0, 10000000),
  ('avatar.price.png_glitched_jester', 1000, 'Avatars & flags', 'Funnynator price', 0, 10000000),
  ('avatar.price.png_doomscroll_skull', 4000, 'Avatars & flags', 'Doomscroll price', 0, 10000000),
  ('avatar.level.png_doomscroll_skull', 80, 'Levels', 'Doomscroll minimum level', 0, 1000),
  ('avatar.price.png_wifi_parasite', 750, 'Avatars & flags', 'WiFi Parasite price', 0, 10000000),
  ('avatar.price.png_cry_laugh_mask', 300, 'Avatars & flags', 'Twin Mask price', 0, 10000000),
  ('avatar.price.png_tax_ghost', 3000, 'Avatars & flags', 'Tax Ghost price', 0, 10000000),
  ('avatar.price.png_suspicious_duck', 3500, 'Avatars & flags', 'Sussy Ducka price', 0, 10000000),
  ('avatar.price.png_sleepy_wizard', 4400, 'Avatars & flags', 'Tired AF price', 0, 10000000),
  ('avatar.price.png_cursed_usb_idol', 4000, 'Avatars & flags', 'USBoo price', 0, 10000000),
  ('avatar.level.png_cursed_usb_idol', 12, 'Levels', 'USBoo minimum level', 0, 1000),
  ('avatar.price.png_cat_knight', 6000, 'Avatars & flags', 'Azazel price', 0, 10000000),
  ('avatar.level.png_cat_knight', 40, 'Levels', 'Azazel minimum level', 0, 1000),
  ('avatar.price.png_bear_berserker', 2000, 'Avatars & flags', 'Bear Berserker price', 0, 10000000),
  ('avatar.level.png_bear_berserker', 30, 'Levels', 'Bear Berserker minimum level', 0, 1000),
  ('avatar.price.png_siege_lord', 10000, 'Avatars & flags', 'Siege Lord price', 0, 10000000),
  ('avatar.level.png_siege_lord', 120, 'Levels', 'Siege Lord minimum level', 0, 1000),
  ('avatar.price.png_sorceress', 10000, 'Avatars & flags', 'Sorceress price', 0, 10000000),
  ('avatar.level.png_sorceress', 90, 'Levels', 'Sorceress minimum level', 0, 1000),
  ('avatar.price.png_farewell', 4000, 'Avatars & flags', 'Farewell price', 0, 10000000),
  ('avatar.level.png_farewell', 45, 'Levels', 'Farewell minimum level', 0, 1000),
  ('avatar.price.png_cold_judgment', 12000, 'Avatars & flags', 'Cold Judgment price', 0, 10000000),
  ('avatar.level.png_cold_judgment', 140, 'Levels', 'Cold Judgment minimum level', 0, 1000),
  ('avatar.price.png_meme_emperor', 6500, 'Avatars & flags', 'Meme Emperor price', 0, 10000000),
  ('avatar.price.png_surprised_explorer', 5500, 'Avatars & flags', 'Surprised Explorer price', 0, 10000000),
  ('avatar.price.png_wojak_wanderer', 5000, 'Avatars & flags', 'Wojak Wanderer price', 0, 10000000)
ON CONFLICT (key) DO NOTHING;

-- Quests the first seed missed (comment line inside their block).
INSERT INTO public.game_config(key, value, category, description, min_value, max_value) VALUES
  ('quest.nightmare_complete.gold', 25000, 'Quests', 'Nightmare complete: gold reward', 0, 100000000),
  ('quest.true_conqueror.gold', 500000, 'Quests', 'There is only one.: gold reward', 0, 100000000),
  ('quest.never_enough.gold', 1000000, 'Quests', 'Never Enough: gold reward', 0, 100000000)
ON CONFLICT (key) DO NOTHING;

-- ── purchase_avatar_item ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_avatar_item(p_item_type text, p_item_id text, p_cost integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_xp BIGINT;
  v_is_conquerer BOOLEAN;
  v_expected_cost INTEGER;
  v_price INTEGER;
  v_level_req INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_item_type NOT IN ('avatar', 'flag') THEN RAISE EXCEPTION 'Invalid item type'; END IF;
  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_angry_man','png_osi_boi','png_freegle','png_euro_bro','png_triboi',
    'png_divine_high_king','png_divine_high_queen','png_world_ender',
    'png_rotten_crown','png_meme_relic_frog'
  ]) THEN RAISE EXCEPTION 'Quest reward items cannot be purchased'; END IF;

  -- 1) price + level from game_config
  IF p_item_type = 'flag' AND p_item_id LIKE 'upgrade\_%' THEN
    SELECT value::integer INTO v_expected_cost FROM public.game_config WHERE key = 'shop.upgrade.' || substr(p_item_id, 9);
    v_level_req := CASE p_item_id
      WHEN 'upgrade_nightmare'     THEN cfg('level.dark_scroll', 33)
      WHEN 'upgrade_infinite_maps' THEN cfg('level.infinite_maps', 100)
      ELSE 0 END;
  ELSE
    SELECT value::integer INTO v_expected_cost FROM public.game_config WHERE key = 'avatar.price.' || p_item_id;
    v_level_req := cfg('avatar.level.' || p_item_id, 0);
  END IF;

  -- 2) fall back to the older server-side tables if there is no config row
  IF v_expected_cost IS NULL AND p_item_type = 'avatar' THEN
    SELECT price INTO v_expected_cost FROM public.daily_chest_avatars WHERE avatar_id = p_item_id;
  END IF;
  IF v_expected_cost IS NULL AND p_item_type = 'flag' THEN
    v_expected_cost := CASE p_item_id
      WHEN 'upgrade_capitals'         THEN 2000
      WHEN 'upgrade_borders'          THEN 2000
      WHEN 'upgrade_nightmare'        THEN 66666
      WHEN 'upgrade_infinite_maps'    THEN 50000
      WHEN 'upgrade_millionaire_skip' THEN 30000
      WHEN 'upgrade_border_draw'      THEN 50000
    END;
  END IF;

  -- 3) last resort (unlisted item): trust a positive client price, as before
  IF v_expected_cost IS NULL THEN
    IF p_cost IS NULL OR p_cost <= 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;
    v_price := p_cost;
  ELSE
    v_price := v_expected_cost;
  END IF;
  IF v_price <= 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;

  SELECT gold_balance, COALESCE(xp, 0), COALESCE(is_conquerer, FALSE) INTO v_current_gold, v_xp, v_is_conquerer
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF v_level_req > 0 AND public.level_from_xp(v_xp) < v_level_req THEN
    RAISE EXCEPTION 'Level % required', v_level_req;
  END IF;
  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_nana','png_piga','png_demon','png_apple_a_day','png_glitched_jester'
  ]) AND NOT v_is_conquerer THEN RAISE EXCEPTION 'Conqueror subscription required for this avatar'; END IF;
  IF v_current_gold < v_price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Item already unlocked';
  END IF;

  UPDATE public.profiles SET gold_balance = gold_balance - v_price WHERE id = v_user_id;
  PERFORM set_config('app.avatar_shop_grant', 'on', true);
  INSERT INTO public.user_unlocked_items(user_id, item_type, item_id) VALUES (v_user_id, p_item_type, p_item_id);
  PERFORM set_config('app.avatar_shop_grant', 'off', true);
  RETURN TRUE;
END;
$function$;

-- ── purchase_country (price from config) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_country(p_country_code text, p_cost integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_new_balance INTEGER;
  v_area DOUBLE PRECISION;
  v_price INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT area INTO v_area FROM public.countries WHERE cca2 = p_country_code;
  IF v_area IS NULL THEN RAISE EXCEPTION 'Unknown country'; END IF;
  v_price := GREATEST(cfg('shop.country.min', 20), CEIL(v_area * cfg('shop.country.area_factor', 0.01)))::INTEGER;

  SELECT gold_balance INTO v_current_gold FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.owned_countries WHERE user_id = v_user_id AND country_code = p_country_code) THEN
    RAISE EXCEPTION 'Country already owned';
  END IF;
  IF v_current_gold < v_price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;

  v_new_balance := v_current_gold - v_price;
  UPDATE public.profiles SET gold_balance = v_new_balance WHERE id = v_user_id;
  INSERT INTO public.owned_countries (user_id, country_code) VALUES (v_user_id, p_country_code);
  RETURN v_new_balance;
END;
$function$;

-- ── purchase_countries (bulk, NEW) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_countries(p_codes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_gold INTEGER;
  v_total INTEGER;
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT gold_balance INTO v_gold FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  CREATE TEMP TABLE _buy ON COMMIT DROP AS
    SELECT c.cca2, GREATEST(cfg('shop.country.min', 20), CEIL(c.area * cfg('shop.country.area_factor', 0.01)))::INTEGER AS price
    FROM public.countries c
    WHERE c.cca2 = ANY (p_codes)
      AND NOT EXISTS (SELECT 1 FROM public.owned_countries o WHERE o.user_id = v_user_id AND o.country_code = c.cca2);
  SELECT COALESCE(SUM(price), 0), COUNT(*) INTO v_total, v_count FROM _buy;
  IF v_count = 0 THEN RAISE EXCEPTION 'Nothing to buy'; END IF;
  IF v_gold < v_total THEN RAISE EXCEPTION 'Insufficient gold'; END IF;

  UPDATE public.profiles SET gold_balance = gold_balance - v_total WHERE id = v_user_id;
  INSERT INTO public.owned_countries (user_id, country_code) SELECT v_user_id, cca2 FROM _buy;
  RETURN jsonb_build_object('count', v_count, 'total', v_total, 'balance', v_gold - v_total);
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_countries(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_countries(text[]) TO authenticated;

-- ── purchase_quiz_upgrade (price + level from config) ───────────────────────
CREATE OR REPLACE FUNCTION public.purchase_quiz_upgrade(p_new_turns integer, p_cost integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_current_turns INTEGER;
  v_xp BIGINT;
  v_price INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_new_turns NOT IN (20, 30) THEN RAISE EXCEPTION 'Unknown upgrade'; END IF;
  v_price := cfg('shop.quiz_turns.' || p_new_turns, CASE p_new_turns WHEN 20 THEN 2000 ELSE 5000 END)::INTEGER;

  SELECT gold_balance, max_quiz_turns, COALESCE(xp, 0) INTO v_current_gold, v_current_turns, v_xp
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF p_new_turns = 30 AND public.level_from_xp(v_xp) < cfg('level.expedition30', 25) THEN
    RAISE EXCEPTION 'Level % required', cfg('level.expedition30', 25)::INTEGER;
  END IF;
  IF v_current_turns >= p_new_turns THEN RAISE EXCEPTION 'Upgrade already owned or surpassed'; END IF;
  IF v_current_gold < v_price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;

  UPDATE public.profiles
  SET gold_balance = gold_balance - v_price, max_quiz_turns = p_new_turns
  WHERE id = v_user_id;
  RETURN TRUE;
END;
$function$;

-- ── purchase_tickets (NEW) ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_tickets(p_amount integer)
 RETURNS TABLE(new_gold integer, new_tickets integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_price INTEGER;
  v_gold INTEGER;
  v_tickets INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_price := CASE p_amount
    WHEN 1 THEN cfg('shop.ticket.price', 500)
    WHEN 5 THEN cfg('shop.ticket_pack.price', 2200)
  END::INTEGER;
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'Unknown ticket pack'; END IF;

  SELECT COALESCE(gold_balance, 0), COALESCE(tickets, 0) INTO v_gold, v_tickets
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_gold < v_price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;

  UPDATE public.profiles SET gold_balance = v_gold - v_price, tickets = v_tickets + p_amount WHERE id = v_user_id;
  RETURN QUERY SELECT v_gold - v_price, v_tickets + p_amount;
END;
$function$;
REVOKE ALL ON FUNCTION public.purchase_tickets(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_tickets(integer) TO authenticated;

-- ── quest verification shared by claim_quest and claim_achievement ─────────
CREATE OR REPLACE FUNCTION private.assert_quest_done(p_user uuid, p_id text) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_target numeric := (SELECT value FROM public.game_config WHERE key = 'quest.' || p_id || '.target');
        v_have numeric;
BEGIN
  -- item quests: must really own the items
  IF p_id = 'true_conqueror' AND (SELECT COUNT(*) FROM public.user_unlocked_items WHERE user_id = p_user AND item_id IN ('png_divine_high_king','png_divine_high_queen','png_beast_mark')) < 3 THEN RAISE EXCEPTION 'Quest not completed'; END IF;
  IF p_id = 'never_enough' AND (SELECT COUNT(*) FROM public.user_unlocked_items WHERE user_id = p_user AND item_id IN ('png_divine_high_king','png_cosmic_armor')) < 2 THEN RAISE EXCEPTION 'Quest not completed'; END IF;
  IF v_target IS NULL THEN RETURN; END IF;  -- quest kinds the server cannot measure yet (quiz stats, regions, ...)
  IF p_id LIKE 'level\_%' THEN
    SELECT public.level_from_xp(COALESCE(xp, 0)) INTO v_have FROM public.profiles WHERE id = p_user;
  ELSIF p_id = 'first_blood' OR p_id LIKE 'empire\_%' OR p_id = 'complete_the_world' THEN
    SELECT COUNT(*) INTO v_have FROM public.owned_countries WHERE user_id = p_user;
  ELSIF p_id LIKE 'area\_%' THEN
    SELECT COALESCE(SUM(c.area), 0) INTO v_have FROM public.owned_countries o JOIN public.countries c ON c.cca2 = o.country_code WHERE o.user_id = p_user;
  ELSE
    RETURN;
  END IF;
  IF COALESCE(v_have, 0) < v_target THEN RAISE EXCEPTION 'Quest not completed'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.assert_quest_done(uuid, text) FROM PUBLIC;

-- ── claim_quest (NEW): gold + tickets in one server call ───────────────────
CREATE OR REPLACE FUNCTION public.claim_quest(p_achievement_id text)
 RETURNS TABLE(success boolean, new_balance integer, new_tickets integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_gold INTEGER;
  v_tickets INTEGER;
  v_bal INTEGER;
  v_tix INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_config WHERE key IN ('quest.' || p_achievement_id || '.gold', 'quest.' || p_achievement_id || '.tickets')) THEN
    RAISE EXCEPTION 'Quest not configured';
  END IF;
  v_gold := cfg('quest.' || p_achievement_id || '.gold', 0)::INTEGER;
  v_tickets := cfg('quest.' || p_achievement_id || '.tickets', 0)::INTEGER;
  PERFORM private.assert_quest_done(v_user_id, p_achievement_id);

  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_user_id, p_achievement_id);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Achievement already claimed';
  END;
  UPDATE public.profiles SET gold_balance = gold_balance + v_gold, tickets = COALESCE(tickets, 0) + v_tickets
  WHERE id = v_user_id RETURNING gold_balance, tickets INTO v_bal, v_tix;
  RETURN QUERY SELECT TRUE, v_bal, v_tix;
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_quest(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_quest(text) TO authenticated;

-- ── claim_achievement (old clients): same signature, server decides the reward ─
CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id text, p_reward_amount integer)
 RETURNS TABLE(success boolean, new_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_gold INTEGER;
  v_bal INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.game_config WHERE key IN ('quest.' || p_achievement_id || '.gold', 'quest.' || p_achievement_id || '.tickets')) THEN
    RAISE EXCEPTION 'Quest not configured';
  END IF;
  v_gold := cfg('quest.' || p_achievement_id || '.gold', 0)::INTEGER;  -- p_reward_amount is ignored
  PERFORM private.assert_quest_done(v_user_id, p_achievement_id);
  BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (v_user_id, p_achievement_id);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Achievement already claimed';
  END;
  UPDATE public.profiles SET gold_balance = gold_balance + v_gold WHERE id = v_user_id RETURNING gold_balance INTO v_bal;
  RETURN QUERY SELECT TRUE, v_bal;
END;
$function$;
