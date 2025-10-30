-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;

-- Keep only the simple SELECT policy for users to see their own roles
-- This is enough for the has_role() function to work since it uses SECURITY DEFINER

-- For INSERT/UPDATE/DELETE on user_roles, we'll rely on the application layer
-- or create a security definer function to manage roles instead of using RLS policies