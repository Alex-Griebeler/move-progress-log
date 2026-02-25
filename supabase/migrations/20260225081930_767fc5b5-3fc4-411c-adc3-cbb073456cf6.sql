
ALTER TABLE workout_prescriptions
  ADD COLUMN prescription_type text NOT NULL DEFAULT 'group';

ALTER TABLE prescription_exercises
  ADD COLUMN load text;
