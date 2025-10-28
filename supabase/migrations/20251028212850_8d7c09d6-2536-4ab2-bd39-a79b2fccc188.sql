-- Make student-avatars bucket private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE name = 'student-avatars';

-- Note: RLS policies for storage will be added after authentication is implemented