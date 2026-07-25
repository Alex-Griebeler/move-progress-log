DROP POLICY IF EXISTS "Authenticated can upload avatars to private bucket" ON storage.objects;

CREATE POLICY "Trainers upload avatars to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-avatars'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
);