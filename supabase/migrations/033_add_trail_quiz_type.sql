-- Add Trail Quiz to allowed quiz_results.quiz_type values

ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_quiz_type_check;

ALTER TABLE public.quiz_results
  ADD CONSTRAINT quiz_results_quiz_type_check
  CHECK (quiz_type IN ('flag', 'shape', 'borders', 'millionaire', 'capitals', 'nightmare', 'trail'));

