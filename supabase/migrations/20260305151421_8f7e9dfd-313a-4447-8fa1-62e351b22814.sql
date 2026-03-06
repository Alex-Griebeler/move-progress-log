-- Revoke direct access to Oura token functions from authenticated users
-- These should only be called from edge functions using the service role
REVOKE EXECUTE ON FUNCTION public.get_oura_access_token(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_oura_refresh_token(uuid) FROM authenticated;