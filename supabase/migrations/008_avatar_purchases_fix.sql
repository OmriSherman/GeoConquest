-- 1. Drop existing function to ensure we don't end up with overloaded signatures
DROP FUNCTION IF EXISTS public.purchase_avatar_item(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.purchase_avatar_item(TEXT, TEXT, NUMERIC);

-- 2. Re-create the secure Purchase RPC
-- We use p_cost as integer to perfectly match the JSON payload sent by the user
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

-- 3. Notify PostgREST to reload its schema cache
-- This forcefully solves the "could not find function in schema cache" error
NOTIFY pgrst, 'reload schema';
