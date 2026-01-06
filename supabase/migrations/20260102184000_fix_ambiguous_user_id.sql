-- Fix ambiguous column reference "user_id" in is_sector_user_in_department function
-- The function parameter user_id conflicts with table column user_id

-- First drop the policy that depends on the function
DROP POLICY IF EXISTS "Sector users can read department demands" ON public.demands;

-- Then drop and recreate the function with proper aliases
DROP FUNCTION IF EXISTS public.is_sector_user_in_department(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.is_sector_user_in_department(
  p_user_id UUID,
  p_department_name TEXT
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
    WHERE p.id = p_user_id 
      AND p.role = 'sector_user'
      AND ud.department = p_department_name
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_sector_user_in_department(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_sector_user_in_department IS 'Check if user is sector_user in a specific department (bypasses RLS to avoid recursion)';

-- Recreate the policy to ensure it uses the corrected function
DROP POLICY IF EXISTS "Sector users can read department demands" ON public.demands;

CREATE POLICY "Sector users can read department demands"
ON public.demands
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  (destination_department IS NOT NULL AND public.is_sector_user_in_department(auth.uid(), destination_department))
);

