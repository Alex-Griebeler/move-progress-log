-- Security hardening: Oura Vault function permissions + avatar storage policies

-- 1) Restrict Oura token functions to service_role only
REVOKE EXECUTE ON FUNCTION public.get_oura_access_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_oura_tokens(uuid, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_oura_access_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_oura_tokens(uuid, text, text, timestamp with time zone) TO service_role;

-- 2) Remove permissive avatar policies
DROP POLICY IF EXISTS "Public access to view student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers view student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers upload student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers delete student avatars" ON storage.objects;
DROP POLICY IF EXISTS "Trainers update student avatars" ON storage.objects;

-- 3) Create least-privilege avatar policies for private bucket
CREATE POLICY "Authenticated can upload avatars to private bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-avatars'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Trainers and admins can view allowed avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.avatar_url = storage.objects.name
        AND s.trainer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
);

CREATE POLICY "Owners or admins can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'student-avatars'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
);

CREATE POLICY "Owners or admins can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-avatars'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
);