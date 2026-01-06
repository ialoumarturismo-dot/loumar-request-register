-- Recreate sector_user policy for demands using the corrected function

DROP POLICY IF EXISTS "Sector users can read department demands" ON public.demands;

CREATE POLICY "Sector users can read department demands"
ON public.demands
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  (destination_department IS NOT NULL AND public.is_sector_user_in_department(auth.uid(), destination_department))
);

