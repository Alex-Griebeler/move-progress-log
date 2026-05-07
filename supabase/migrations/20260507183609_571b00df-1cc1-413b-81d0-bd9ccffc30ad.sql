-- Harden Oura token SECURITY DEFINER functions with ownership checks
CREATE OR REPLACE FUNCTION public.get_oura_access_token(p_student_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  secret_name TEXT;
  decrypted_token TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND (s.trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Access denied to Oura tokens for this student';
  END IF;

  secret_name := 'oura_access_' || p_student_id::text;
  SELECT decrypted_secret INTO decrypted_token
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN decrypted_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_oura_refresh_token(p_student_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  secret_name TEXT;
  decrypted_token TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND (s.trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Access denied to Oura tokens for this student';
  END IF;

  secret_name := 'oura_refresh_' || p_student_id::text;
  SELECT decrypted_secret INTO decrypted_token
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN decrypted_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.store_oura_tokens(
  p_student_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamp with time zone
) RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  access_secret_name TEXT;
  refresh_secret_name TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND (s.trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'Access denied to store Oura tokens for this student';
  END IF;

  access_secret_name := 'oura_access_' || p_student_id::text;
  refresh_secret_name := 'oura_refresh_' || p_student_id::text;

  DELETE FROM vault.secrets WHERE name = access_secret_name;
  DELETE FROM vault.secrets WHERE name = refresh_secret_name;

  PERFORM vault.create_secret(p_access_token, access_secret_name);
  PERFORM vault.create_secret(p_refresh_token, refresh_secret_name);

  UPDATE public.oura_connections
  SET token_expires_at = p_token_expires_at,
      updated_at = now()
  WHERE student_id = p_student_id;
END;
$function$;

-- Formally track health assessment tables (RLS already enabled in DB; reaffirm)
ALTER TABLE IF EXISTS public.anamnesis_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.functional_findings ENABLE ROW LEVEL SECURITY;