-- Allow all supported quiz types to be stored in quiz_results

ALTER TABLE public.quiz_results
  DROP CONSTRAINT IF EXISTS quiz_results_quiz_type_check;

ALTER TABLE public.quiz_results
  ADD CONSTRAINT quiz_results_quiz_type_check
  CHECK (quiz_type IN ('flag', 'shape', 'borders', 'millionaire', 'capitals', 'nightmare'));
