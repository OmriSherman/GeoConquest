-- Migration 007: Add Quiz Upgrades
-- Adds a max_quiz_turns column to profiles and an RPC to securely purchase upgrades.

-- 1. Add column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS max_quiz_turns INTEGER DEFAULT 10;

-- 2. Create RPC for purchasing upgrades
CREATE OR REPLACE FUNCTION public.purchase_quiz_upgrade(
  p_new_turns INTEGER,
  p_cost INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_current_turns INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock profile row for update
  SELECT gold_balance, max_quiz_turns INTO v_current_gold, v_current_turns
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_gold IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Verify they don't already have this or a higher upgrade
  IF v_current_turns >= p_new_turns THEN
    RAISE EXCEPTION 'Upgrade already owned or surpassed';
  END IF;

  -- Check affordability
  IF v_current_gold < p_cost THEN
    RAISE EXCEPTION 'Insufficient gold';
  END IF;

  -- Deduct gold and apply upgrade
  UPDATE public.profiles
  SET gold_balance = gold_balance - p_cost,
      max_quiz_turns = p_new_turns
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;
