-- Add avatar_url column to students table
ALTER TABLE public.students 
ADD COLUMN avatar_url TEXT;

-- Create storage bucket for student avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-avatars',
  'student-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Public access to view student avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-avatars');

-- Allow anyone to upload avatars
CREATE POLICY "Anyone can upload student avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-avatars');

-- Allow anyone to update their own avatars
CREATE POLICY "Anyone can update student avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'student-avatars')
WITH CHECK (bucket_id = 'student-avatars');

-- Allow anyone to delete avatars
CREATE POLICY "Anyone can delete student avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-avatars');