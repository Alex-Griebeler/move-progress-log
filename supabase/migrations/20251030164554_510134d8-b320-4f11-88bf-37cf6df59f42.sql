-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'trainer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can manage all roles
CREATE POLICY "Admins manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create trainer_access_permissions table
CREATE TABLE public.trainer_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  can_view_prescriptions BOOLEAN DEFAULT true,
  can_edit_prescriptions BOOLEAN DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(admin_id, trainer_id)
);

-- Enable RLS on trainer_access_permissions
ALTER TABLE public.trainer_access_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins manage permissions
CREATE POLICY "Admins manage permissions"
ON public.trainer_access_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Trainers view their permissions
CREATE POLICY "Trainers view own permissions"
ON public.trainer_access_permissions
FOR SELECT
USING (auth.uid() = trainer_id);

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to check trainer access
CREATE OR REPLACE FUNCTION public.can_access_trainer(_viewer_id UUID, _trainer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _trainer_id OR
    public.has_role(_viewer_id, 'admin') OR
    EXISTS (
      SELECT 1
      FROM public.trainer_access_permissions
      WHERE trainer_id = _viewer_id 
        AND admin_id = _trainer_id
        AND can_view_prescriptions = true
    )
$$;

-- Update workout_prescriptions RLS policy
DROP POLICY IF EXISTS "Trainers manage own prescriptions" ON public.workout_prescriptions;

CREATE POLICY "Access based on roles and permissions"
ON public.workout_prescriptions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = trainer_id OR
  EXISTS (
    SELECT 1
    FROM public.trainer_access_permissions
    WHERE trainer_id = auth.uid()
      AND admin_id = workout_prescriptions.trainer_id
      AND can_view_prescriptions = true
  )
);

CREATE POLICY "Trainers manage own prescriptions"
ON public.workout_prescriptions
FOR INSERT
WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers update own prescriptions"
ON public.workout_prescriptions
FOR UPDATE
USING (
  auth.uid() = trainer_id OR
  (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1
      FROM public.trainer_access_permissions
      WHERE trainer_id = auth.uid()
        AND admin_id = workout_prescriptions.trainer_id
        AND can_edit_prescriptions = true
    )
  )
);

CREATE POLICY "Trainers delete own prescriptions"
ON public.workout_prescriptions
FOR DELETE
USING (
  auth.uid() = trainer_id OR
  public.has_role(auth.uid(), 'admin')
);