-- Migration: Update RLS policies for demands table
-- This migration replaces the permissive policies with role-based access control

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can read demands" ON public.demands;
DROP POLICY IF EXISTS "Authenticated users can update demands" ON public.demands;

-- New RLS Policy: Admin can read all demands
CREATE POLICY "Admin can read all demands"
ON public.demands
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- New RLS Policy: Sector users can read demands from their departments
CREATE POLICY "Sector users can read department demands"
ON public.demands
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.user_departments ud ON p.id = ud.user_id
    WHERE p.id = auth.uid() 
      AND p.role = 'sector_user'
      AND ud.department = demands.destination_department
  )
);

-- New RLS Policy: Admin can update all demands
CREATE POLICY "Admin can update all demands"
ON public.demands
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Note: Sector users will update via RPC functions (set_demand_status, add_demand_comment)
-- Direct UPDATE is blocked for sector users to enforce field-level restrictions

-- Add foreign key constraint for assigned_to_user_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'demands_assigned_to_user_id_fkey'
  ) THEN
    ALTER TABLE public.demands
    ADD CONSTRAINT demands_assigned_to_user_id_fkey
    FOREIGN KEY (assigned_to_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

