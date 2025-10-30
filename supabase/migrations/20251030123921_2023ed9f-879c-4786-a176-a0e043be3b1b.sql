-- 1.1: Remove public policies from student-avatars bucket (security fix)
DROP POLICY IF EXISTS "Anyone can upload student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public access to view student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete student avatars" ON storage.objects;

-- 1.2: Fix orphaned prescriptions
-- Assign orphaned prescriptions to existing trainer
UPDATE workout_prescriptions
SET trainer_id = 'ba1a2309-4558-4ae4-bbaf-a55a2ccfe7dd'
WHERE trainer_id IS NULL;

-- Make trainer_id mandatory to prevent future orphaned data
ALTER TABLE workout_prescriptions
ALTER COLUMN trainer_id SET NOT NULL;

-- Update RLS policy to remove NULL permission
DROP POLICY IF EXISTS "Trainers manage own prescriptions" ON workout_prescriptions;

CREATE POLICY "Trainers manage own prescriptions" ON workout_prescriptions
FOR ALL
USING (auth.uid() = trainer_id);