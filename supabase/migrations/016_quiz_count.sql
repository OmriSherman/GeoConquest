-- Track total quizzes completed per user
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quiz_count integer NOT NULL DEFAULT 0;
