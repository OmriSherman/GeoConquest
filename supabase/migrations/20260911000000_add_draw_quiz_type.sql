-- Draw the Border results use the same quiz_results table as the other quizzes.
ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_quiz_type_check;

ALTER TABLE public.quiz_results
  ADD CONSTRAINT quiz_results_quiz_type_check
  CHECK (quiz_type IN ('flag', 'shape', 'borders', 'millionaire', 'capitals', 'nightmare', 'trail', 'draw'));
