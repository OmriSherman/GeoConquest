-- Allow anyone to read user_achievements (needed for leaderboard profile modal)
CREATE POLICY "Public can view all achievements"
  ON public.user_achievements FOR SELECT
  USING (true);
