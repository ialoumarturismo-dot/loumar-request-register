-- Fix sector_user policy for demands that also queries profiles
-- This policy needs to use a helper function to avoid recursion

-- Create helper function to check if user is sector_user in a department
CREATE OR REPLACE FUNCTION public.is_sector_user_in_department(
  user_id UUID,
  department_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    INNER JOIN public.user_departments ud ON p.id = ud.user_id
    WHERE p.id = user_id 
      AND p.role = 'sector_user'
      AND ud.department = department_name
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_sector_user_in_department(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_sector_user_in_department IS 'Check if user is sector_user in a specific department (bypasses RLS to avoid recursion)';

-- Fix sector_user policy for demands
DROP POLICY IF EXISTS "Sector users can read department demands" ON public.demands;

CREATE POLICY "Sector users can read department demands"
ON public.demands
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  public.is_sector_user_in_department(auth.uid(), destination_department)
);

