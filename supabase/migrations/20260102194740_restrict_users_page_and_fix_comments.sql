-- 1. Permitir que sector_user leia todos os comentários (demand_events) das demandas atribuídas a ele
-- 2. Manter restrição de escrita apenas para admin

-- Drop existing policy
DROP POLICY IF EXISTS "Sector users can insert manager_only events" ON public.demand_events;

-- Policy: Sector users can read demand_events for assigned demands
CREATE POLICY "Sector users can read assigned demand events"
ON public.demand_events
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = demand_events.demand_id
      AND d.assigned_to_user_id = auth.uid()
  )
);

-- Policy: Sector users can still insert comments (via RPC function)
-- This is already handled by the RPC function add_demand_comment
-- But we need a policy for direct inserts if needed
CREATE POLICY "Sector users can insert manager_only events"
ON public.demand_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sector_user'
  )
  AND EXISTS (
    SELECT 1 FROM public.demands
    WHERE id = demand_id AND assigned_to_user_id = auth.uid()
  )
  AND visibility = 'manager_only'
  AND author_user_id = auth.uid()
);

