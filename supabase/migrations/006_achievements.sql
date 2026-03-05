-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Secure RPC for claiming an achievement and awarding gold
CREATE OR REPLACE FUNCTION public.claim_achievement(
  p_achievement_id TEXT,
  p_reward_amount INTEGER
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Attempt to insert the achievement. If it already exists, this will fail due to the UNIQUE constraint.
  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (v_user_id, p_achievement_id);

  -- Award the gold
  UPDATE public.profiles
  SET gold_balance = gold_balance + p_reward_amount
  WHERE id = v_user_id
  RETURNING gold_balance INTO v_current_balance;

  RETURN QUERY SELECT TRUE, v_current_balance;
EXCEPTION
  WHEN unique_violation THEN
    -- They already claimed it
    RAISE EXCEPTION 'Achievement already claimed';
END;
$$;
