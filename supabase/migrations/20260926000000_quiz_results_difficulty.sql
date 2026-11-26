-- Quiz difficulty (Easy / Medium / Hard) is saved with every Flags / Shapes / Capitals / Borders result.
-- Needed later for daily quests ("score 85% on Hard") and weekly challenges.
-- The app keeps working if this hasn't run yet (it retries the insert without the column).
ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS difficulty text
  CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard'));
