-- Defense-in-depth for Oura token RPCs.
-- The functions are granted only to service_role today, but the function bodies
-- must also deny anonymous/null callers if a future grant changes accidentally.

CREATE OR REPLACE FUNCTION public.get_oura_access_token(p_student_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  secret_name TEXT;
  decrypted_token TEXT;
  caller_id uuid := auth.uid();
  caller_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF caller_role <> 'service_role' THEN
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'Access denied to Oura tokens for this student' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND (s.trainer_id = caller_id OR public.has_role(caller_id, 'admin'::app_role))
    ) THEN
      RAISE EXCEPTION 'Access denied to Oura tokens for this student' USING ERRCODE = '42501';
    END IF;
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
  caller_id uuid := auth.uid();
  caller_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF caller_role <> 'service_role' THEN
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'Access denied to Oura tokens for this student' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND (s.trainer_id = caller_id OR public.has_role(caller_id, 'admin'::app_role))
    ) THEN
      RAISE EXCEPTION 'Access denied to Oura tokens for this student' USING ERRCODE = '42501';
    END IF;
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
  caller_id uuid := auth.uid();
  caller_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF caller_role <> 'service_role' THEN
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'Access denied to store Oura tokens for this student' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = p_student_id
        AND (s.trainer_id = caller_id OR public.has_role(caller_id, 'admin'::app_role))
    ) THEN
      RAISE EXCEPTION 'Access denied to store Oura tokens for this student' USING ERRCODE = '42501';
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.get_oura_access_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.store_oura_tokens(uuid, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_oura_access_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_oura_tokens(uuid, text, text, timestamp with time zone) TO service_role;
