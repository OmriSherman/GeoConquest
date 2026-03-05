-- 1. Create table for unlocked items
CREATE TABLE IF NOT EXISTS user_unlocked_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('avatar', 'flag')),
    item_id TEXT NOT NULL, -- e.g., the emoji itself
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- 2. Enable RLS
ALTER TABLE user_unlocked_items ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view their own unlocked items"
ON user_unlocked_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unlocked items"
ON user_unlocked_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Secure Purchase RPC
-- This function deducts gold and inserts the unlocked item in one transaction
CREATE OR REPLACE FUNCTION purchase_avatar_item(
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
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get current gold and lock the row for update
    SELECT gold_balance INTO v_current_gold
    FROM profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_gold IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- Check if user can afford it
    IF v_current_gold < p_cost THEN
        RAISE EXCEPTION 'Insufficient gold';
    END IF;

    -- Check if already unlocked
    IF EXISTS (
        SELECT 1 FROM user_unlocked_items
        WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id
    ) THEN
        RAISE EXCEPTION 'Item already unlocked';
    END IF;

    -- Deduct gold
    UPDATE profiles
    SET gold_balance = gold_balance - p_cost
    WHERE id = v_user_id;

    -- Insert unlock record
    INSERT INTO user_unlocked_items (user_id, item_type, item_id)
    VALUES (v_user_id, p_item_type, p_item_id);

    RETURN TRUE;
END;
$$;
