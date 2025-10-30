-- Delete orphaned student records (without trainer_id)
DELETE FROM students WHERE trainer_id IS NULL;

-- Make trainer_id mandatory to prevent future orphans
ALTER TABLE students 
ALTER COLUMN trainer_id SET NOT NULL;