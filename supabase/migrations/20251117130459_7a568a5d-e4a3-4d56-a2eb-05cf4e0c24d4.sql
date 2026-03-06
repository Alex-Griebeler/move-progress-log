-- ============================================
-- SECURITY FIX 1: Restrict rate_limit_attempts access
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_attempts;

-- Create a restrictive policy that blocks all direct user access
-- Only service role (via edge functions) can access this table
CREATE POLICY "Block all direct user access to rate limits"
ON public.rate_limit_attempts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Allow service role full access (this is implicit with SECURITY DEFINER functions)
-- Edge functions using service role key will bypass RLS entirely

-- ============================================
-- SECURITY FIX 2: Encrypt Oura OAuth tokens using Supabase Vault
-- ============================================

-- Enable vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- Create function to migrate existing tokens to vault
CREATE OR REPLACE FUNCTION public.migrate_oura_tokens_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  conn RECORD;
  secret_name TEXT;
BEGIN
  -- Loop through all active connections with tokens
  FOR conn IN 
    SELECT id, student_id, access_token, refresh_token 
    FROM public.oura_connections 
    WHERE access_token IS NOT NULL 
      AND refresh_token IS NOT NULL
      AND access_token != 'ENCRYPTED'
      AND refresh_token != 'ENCRYPTED'
  LOOP
    BEGIN
      -- Store access token in vault
      secret_name := 'oura_access_' || conn.student_id::text;
      PERFORM vault.create_secret(
        conn.access_token,
        secret_name,
        'Oura Ring access token for student ' || conn.student_id::text
      );
      
      -- Store refresh token in vault
      secret_name := 'oura_refresh_' || conn.student_id::text;
      PERFORM vault.create_secret(
        conn.refresh_token,
        secret_name,
        'Oura Ring refresh token for student ' || conn.student_id::text
      );
      
      -- Replace plain text with encrypted marker
      UPDATE public.oura_connections
      SET 
        access_token = 'ENCRYPTED',
        refresh_token = 'ENCRYPTED'
      WHERE id = conn.id;
      
      RAISE NOTICE 'Migrated tokens for student %', conn.student_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate tokens for student %: %', conn.student_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Token migration to vault completed';
END;
$$;

-- Create helper function to retrieve decrypted access token
CREATE OR REPLACE FUNCTION public.get_oura_access_token(p_student_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_name TEXT;
  decrypted_token TEXT;
BEGIN
  secret_name := 'oura_access_' || p_student_id::text;
  
  SELECT decrypted_secret INTO decrypted_token
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  RETURN decrypted_token;
END;
$$;

-- Create helper function to retrieve decrypted refresh token
CREATE OR REPLACE FUNCTION public.get_oura_refresh_token(p_student_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_name TEXT;
  decrypted_token TEXT;
BEGIN
  secret_name := 'oura_refresh_' || p_student_id::text;
  
  SELECT decrypted_secret INTO decrypted_token
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  RETURN decrypted_token;
END;
$$;

-- Create helper function to store new encrypted tokens
CREATE OR REPLACE FUNCTION public.store_oura_tokens(
  p_student_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  access_secret_name TEXT;
  refresh_secret_name TEXT;
  existing_connection uuid;
BEGIN
  access_secret_name := 'oura_access_' || p_student_id::text;
  refresh_secret_name := 'oura_refresh_' || p_student_id::text;
  
  -- Check if connection already exists
  SELECT id INTO existing_connection
  FROM public.oura_connections
  WHERE student_id = p_student_id;
  
  -- Delete old secrets if they exist
  DELETE FROM vault.secrets WHERE name = access_secret_name;
  DELETE FROM vault.secrets WHERE name = refresh_secret_name;
  
  -- Store new tokens in vault
  PERFORM vault.create_secret(
    p_access_token,
    access_secret_name,
    'Oura Ring access token for student ' || p_student_id::text
  );
  
  PERFORM vault.create_secret(
    p_refresh_token,
    refresh_secret_name,
    'Oura Ring refresh token for student ' || p_student_id::text
  );
  
  -- Update or insert connection record
  IF existing_connection IS NOT NULL THEN
    UPDATE public.oura_connections
    SET 
      access_token = 'ENCRYPTED',
      refresh_token = 'ENCRYPTED',
      token_expires_at = p_token_expires_at,
      last_sync_at = now(),
      is_active = true
    WHERE student_id = p_student_id;
  ELSE
    INSERT INTO public.oura_connections (
      student_id,
      access_token,
      refresh_token,
      token_expires_at,
      is_active
    ) VALUES (
      p_student_id,
      'ENCRYPTED',
      'ENCRYPTED',
      p_token_expires_at,
      true
    );
  END IF;
END;
$$;

-- Grant execute permissions to authenticated users for token retrieval functions
GRANT EXECUTE ON FUNCTION public.get_oura_access_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_oura_tokens(uuid, text, text, timestamp with time zone) TO authenticated;

-- Execute migration for existing tokens
SELECT public.migrate_oura_tokens_to_vault();

-- Add comment explaining the security enhancement
COMMENT ON TABLE public.oura_connections IS 'Oura Ring OAuth connections. Tokens are encrypted using Supabase Vault. Use get_oura_access_token() and get_oura_refresh_token() functions to retrieve decrypted tokens.';
COMMENT ON COLUMN public.oura_connections.access_token IS 'Encrypted marker. Actual token stored in Vault as oura_access_{student_id}';
COMMENT ON COLUMN public.oura_connections.refresh_token IS 'Encrypted marker. Actual token stored in Vault as oura_refresh_{student_id}';