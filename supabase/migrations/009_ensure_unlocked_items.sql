-- Idempotent migration: ensures user_unlocked_items table and purchase RPC exist.
-- Safe to run even if migrations 005/008 were already applied.

-- 1. Create table (no-op if it already exists)
CREATE TABLE IF NOT EXISTS user_unlocked_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('avatar', 'flag')),
    item_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- 2. Enable RLS (safe to re-run)
ALTER TABLE user_unlocked_items ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (use IF NOT EXISTS to avoid duplicate errors)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_unlocked_items'
          AND policyname = 'Users can view their own unlocked items'
    ) THEN
        CREATE POLICY "Users can view their own unlocked items"
        ON user_unlocked_items FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_unlocked_items'
          AND policyname = 'Users can insert their own unlocked items'
    ) THEN
        CREATE POLICY "Users can insert their own unlocked items"
        ON user_unlocked_items FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. Re-create the purchase RPC (CREATE OR REPLACE is idempotent)
DROP FUNCTION IF EXISTS public.purchase_avatar_item(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.purchase_avatar_item(TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.purchase_avatar_item(
    p_item_type TEXT,
    p_item_id TEXT,
    p_cost INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_gold INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT gold_balance INTO v_current_gold
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_gold IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    IF v_current_gold < p_cost THEN
        RAISE EXCEPTION 'Insufficient gold';
    END IF;

    IF EXISTS (
        SELECT 1 FROM user_unlocked_items
        WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'Item already unlocked';
    END IF;

    UPDATE profiles
    SET gold_balance = gold_balance - p_cost
    WHERE id = v_user_id;

    INSERT INTO user_unlocked_items (user_id, item_type, item_id)
    VALUES (v_user_id, p_item_type, p_item_id);

    RETURN TRUE;
END;
$$;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
