UPDATE storage.buckets SET public = false WHERE name = 'student-avatars';

-- Add RLS policy for authenticated users to read avatars
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-avatars');

-- Allow trainers to upload avatars
CREATE POLICY "Trainers can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-avatars');

-- Allow trainers to update avatars
CREATE POLICY "Trainers can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-avatars');