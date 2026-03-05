-- 010_daily_rewards.sql

-- Add daily reward tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reward_claim TIMESTAMPTZ;

-- Secure RPC for claiming a daily reward
CREATE OR REPLACE FUNCTION public.claim_daily_reward(client_today_date TEXT)
RETURNS TABLE (
  success BOOLEAN, 
  new_balance INTEGER,
  new_streak INTEGER,
  reward_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_claim TIMESTAMPTZ;
  v_current_streak INTEGER;
  v_current_balance INTEGER;
  v_last_claim_date DATE;
  v_today DATE;
  v_reward INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Parse the client-provided "today" date (e.g., '2023-10-27') to handle timezones gracefully
  v_today := client_today_date::DATE;

  SELECT last_reward_claim, login_streak, gold_balance
  INTO v_last_claim, v_current_streak, v_current_balance
  FROM public.profiles
  WHERE id = v_user_id;

  -- If claimed already today (using client's local date for fairness)
  IF v_last_claim IS NOT NULL THEN
    -- To keep it simple, we compare the date of last_claim at UTC with client local date.
    -- More robust: just check if v_last_claim AT TIME ZONE 'UTC' >= v_today
    v_last_claim_date := (v_last_claim AT TIME ZONE 'UTC')::DATE;
    IF v_last_claim_date >= v_today THEN
      -- Already claimed today (or in the future, weird timezone stuff)
      RETURN QUERY SELECT FALSE, v_current_balance, v_current_streak, 0;
      RETURN;
    END IF;

    -- Check if they missed a day
    IF v_last_claim_date < v_today - INTERVAL '1 day' THEN
      -- Streak broken
      v_current_streak := 0;
    END IF;
  END IF;

  -- Increment streak
  v_current_streak := v_current_streak + 1;

  -- Determine reward based on streak position (1-7 logic)
  -- 1: 500, 2: 1000, 3: 1500, 4: 2000, 5: 3000, 6: 4000, 7: 5000 + milestone
  -- For day 8+, it wraps around or keeps giving day 7 rewards. 
  -- We'll use a simple formula for the daily cycle:
  DECLARE
    cycle_day INTEGER := ((v_current_streak - 1) % 7) + 1;
  BEGIN
    CASE cycle_day
      WHEN 1 THEN v_reward := 500;
      WHEN 2 THEN v_reward := 1000;
      WHEN 3 THEN v_reward := 1500;
      WHEN 4 THEN v_reward := 2000;
      WHEN 5 THEN v_reward := 3000;
      WHEN 6 THEN v_reward := 4000;
      WHEN 7 THEN v_reward := 5000;
      ELSE v_reward := 500;
    END CASE;
  END;

  -- Apply updates
  UPDATE public.profiles
  SET 
    gold_balance = gold_balance + v_reward,
    login_streak = v_current_streak,
    last_reward_claim = now()
  WHERE id = v_user_id
  RETURNING gold_balance INTO v_current_balance;

  RETURN QUERY SELECT TRUE, v_current_balance, v_current_streak, v_reward;
END;
$$;
