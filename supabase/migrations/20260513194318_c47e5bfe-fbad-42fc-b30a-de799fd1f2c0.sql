ALTER TABLE public.questionnaire_responses
  ADD COLUMN IF NOT EXISTS training_available_days text[],
  ADD COLUMN IF NOT EXISTS external_training_resources text[],
  ADD COLUMN IF NOT EXISTS primary_adherence_barrier text,
  ADD COLUMN IF NOT EXISTS uses_medications boolean,
  ADD COLUMN IF NOT EXISTS medications_continuous text,
  ADD COLUMN IF NOT EXISTS injury_surgery_history text;