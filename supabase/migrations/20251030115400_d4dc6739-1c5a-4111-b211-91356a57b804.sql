-- Consolidate duplicate Paola Griebeler records
-- First update all foreign key references, then delete duplicates

-- Update student_invites to point to the consolidated record
UPDATE student_invites
SET created_student_id = '13a75202-1586-42e8-a83b-7127412476e2'
WHERE created_student_id IN (
  SELECT id 
  FROM students 
  WHERE trainer_id IS NOT NULL 
  AND LOWER(TRIM(name)) = 'paola griebeler'
  AND id != '13a75202-1586-42e8-a83b-7127412476e2'
);

-- Update oura_connections to point to the consolidated record
UPDATE oura_connections
SET student_id = '13a75202-1586-42e8-a83b-7127412476e2'
WHERE student_id IN (
  SELECT id 
  FROM students 
  WHERE trainer_id IS NOT NULL 
  AND LOWER(TRIM(name)) = 'paola griebeler'
  AND id != '13a75202-1586-42e8-a83b-7127412476e2'
);

-- Update the consolidated record with the most complete data
UPDATE students 
SET 
  birth_date = COALESCE(birth_date, '1982-01-04'),
  objectives = COALESCE(objectives, 'Hipertrofia e emagrecimento'),
  updated_at = now()
WHERE id = '13a75202-1586-42e8-a83b-7127412476e2';

-- Delete duplicate records
DELETE FROM students 
WHERE trainer_id IS NOT NULL
AND LOWER(TRIM(name)) = 'paola griebeler'
AND id != '13a75202-1586-42e8-a83b-7127412476e2';