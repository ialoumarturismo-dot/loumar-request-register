-- Fix infinite recursion in RLS policies for profiles table
-- The issue: policies checking if user is admin by querying profiles table
-- Solution: Create SECURITY DEFINER function to check role without RLS

-- ============================================================================
-- Create helper function to check if user is admin (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_admin IS 'Check if user is admin (bypasses RLS to avoid recursion)';

-- ============================================================================
-- Fix profiles table RLS policies
-- ============================================================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

-- New policy: Admin can read all profiles (using helper function)
CREATE POLICY "Admin can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.is_admin()
);

-- New policy: Admin can update all profiles (using helper function)
CREATE POLICY "Admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- New policy: Admin can insert profiles (using helper function)
CREATE POLICY "Admin can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ============================================================================
-- Fix other tables that check admin role via profiles
-- ============================================================================

-- Fix user_departments policies
DROP POLICY IF EXISTS "Admin can read all user_departments" ON public.user_departments;
DROP POLICY IF EXISTS "Admin can manage user_departments" ON public.user_departments;

CREATE POLICY "Admin can read all user_departments"
ON public.user_departments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_admin()
);

CREATE POLICY "Admin can manage user_departments"
ON public.user_departments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Fix department_responsibles policies
DROP POLICY IF EXISTS "Admin can manage department_responsibles" ON public.department_responsibles;

CREATE POLICY "Admin can manage department_responsibles"
ON public.department_responsibles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Fix demand_events policies
DROP POLICY IF EXISTS "Admin can read all demand_events" ON public.demand_events;
DROP POLICY IF EXISTS "Admin can insert demand_events" ON public.demand_events;

CREATE POLICY "Admin can read all demand_events"
ON public.demand_events
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can insert demand_events"
ON public.demand_events
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND author_user_id = auth.uid());

-- Fix notifications policies
DROP POLICY IF EXISTS "Admin can read all notifications" ON public.notifications;

CREATE POLICY "Admin can read all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_admin()
);

-- Fix demands policies
DROP POLICY IF EXISTS "Admin can read all demands" ON public.demands;
DROP POLICY IF EXISTS "Admin can update all demands" ON public.demands;

CREATE POLICY "Admin can read all demands"
ON public.demands
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can update all demands"
ON public.demands
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

