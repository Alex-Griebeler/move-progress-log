-- Phase 1: Add 9 new columns to exercises_library
ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS boyle_score integer,
  ADD COLUMN IF NOT EXISTS axial_load integer,
  ADD COLUMN IF NOT EXISTS lumbar_demand integer,
  ADD COLUMN IF NOT EXISTS technical_complexity integer,
  ADD COLUMN IF NOT EXISTS metabolic_potential integer,
  ADD COLUMN IF NOT EXISTS knee_dominance integer,
  ADD COLUMN IF NOT EXISTS hip_dominance integer,
  ADD COLUMN IF NOT EXISTS primary_muscles text[],
  ADD COLUMN IF NOT EXISTS emphasis text;

-- Migrate numeric_level (1-9) → boyle_score (1-5) for existing exercises
UPDATE exercises_library
SET boyle_score = CASE
  WHEN numeric_level <= 2 THEN 1
  WHEN numeric_level <= 4 THEN 2
  WHEN numeric_level <= 6 THEN 3
  WHEN numeric_level <= 8 THEN 4
  WHEN numeric_level = 9 THEN 5
END
WHERE numeric_level IS NOT NULL AND boyle_score IS NULL;