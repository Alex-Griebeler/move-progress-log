-- Drop existing problematic policies on user_roles
DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create simple SELECT policy: users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create management policy: admins can manage all roles
-- Uses direct subquery instead of has_role() to avoid recursion
CREATE POLICY "Admins manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::app_role
  )
);