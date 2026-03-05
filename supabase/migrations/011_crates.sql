-- ─────────────────────────────────────────────────────────────────────────────
-- 011_crates.sql  —  Mystery Crate / Gacha system
--
-- RPC: open_crate(p_user_id, p_crate_type, p_item_id, p_item_type)
--
-- Flow:
--   1. Validate crate_type and item eligibility for that tier.
--   2. Deduct crate cost from gold_balance.
--   3. If item already owned → award compensation gold and return "duplicate".
--   4. Otherwise → insert into user_unlocked_items and return "new".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION open_crate(
  p_user_id   UUID,
  p_crate_type TEXT,   -- 'common' | 'legendary'
  p_item_id   TEXT,    -- emoji or svg key
  p_item_type TEXT     -- 'avatar' | 'flag'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost              INTEGER;
  v_compensation      INTEGER;
  v_current_gold      INTEGER;
  v_already_owned     BOOLEAN;

  -- Valid item pools per crate tier
  -- Common crate: lower-tier emoji avatars
  v_common_items TEXT[] := ARRAY[
    '🧛', '🧙‍♂️', '🤖', '🦸', '👽', '🥷', '👻'
  ];

  -- Legendary crate: elite emojis + all SVG avatars + all faction flags
  v_legendary_items TEXT[] := ARRAY[
    -- elite emoji avatars
    '🐉', '🧜‍♀️', '👑',
    -- cultural SVG avatars
    'svg_samurai', 'svg_pharaoh', 'svg_viking', 'svg_aztec',
    'svg_maharaja', 'svg_knight', 'svg_cowboy', 'svg_geisha',
    -- gaming SVG avatars
    'svg_witcher', 'svg_ciri', 'svg_dragonborn', 'svg_daedric',
    'svg_cyber_v', 'svg_netrunner', 'svg_outlaw', 'svg_gunslinger',
    'svg_vault_dweller', 'svg_power_armor',
    -- faction flags
    'flag_svg_nilfgaard', 'flag_svg_temeria',
    'flag_svg_stormcloak', 'flag_svg_imperial',
    'flag_svg_arasaka', 'flag_svg_militech',
    'flag_svg_vanderlinde', 'flag_svg_lawman',
    'flag_svg_vaulttec', 'flag_svg_brotherhood'
  ];
BEGIN
  -- ── 1. Validate crate type ──────────────────────────────────────────────────
  IF p_crate_type = 'common' THEN
    v_cost         := 1500;
    v_compensation := 400;
    IF NOT (p_item_id = ANY(v_common_items)) THEN
      RAISE EXCEPTION 'Item % is not valid for the common crate', p_item_id;
    END IF;

  ELSIF p_crate_type = 'legendary' THEN
    v_cost         := 5000;
    v_compensation := 1200;
    IF NOT (p_item_id = ANY(v_legendary_items)) THEN
      RAISE EXCEPTION 'Item % is not valid for the legendary crate', p_item_id;
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown crate type: %', p_crate_type;
  END IF;

  -- ── 2. Check and deduct gold ────────────────────────────────────────────────
  SELECT gold_balance INTO v_current_gold
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_gold IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  IF v_current_gold < v_cost THEN
    RAISE EXCEPTION 'Insufficient gold. Need % but have %', v_cost, v_current_gold;
  END IF;

  UPDATE profiles
  SET gold_balance = gold_balance - v_cost
  WHERE id = p_user_id;

  -- ── 3. Check ownership ──────────────────────────────────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM user_unlocked_items
    WHERE user_id = p_user_id AND item_id = p_item_id
  ) INTO v_already_owned;

  IF v_already_owned THEN
    -- Award compensation gold for duplicate
    UPDATE profiles
    SET gold_balance = gold_balance + v_compensation
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'result',       'duplicate',
      'item_id',      p_item_id,
      'item_type',    p_item_type,
      'compensation', v_compensation
    );
  END IF;

  -- ── 4. Award new item ───────────────────────────────────────────────────────
  INSERT INTO user_unlocked_items (user_id, item_id, item_type)
  VALUES (p_user_id, p_item_id, p_item_type)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  RETURN jsonb_build_object(
    'result',    'new',
    'item_id',   p_item_id,
    'item_type', p_item_type
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION open_crate(UUID, TEXT, TEXT, TEXT) TO authenticated;
