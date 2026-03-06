-- Make movement_pattern nullable for non-strength categories
ALTER TABLE exercises_library ALTER COLUMN movement_pattern DROP NOT NULL;

-- Clean existing data: set movement_pattern to NULL for non-strength exercises
UPDATE exercises_library SET movement_pattern = NULL WHERE category IS NOT NULL AND category != 'forca_hipertrofia';