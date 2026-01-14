-- Allow anyone to read departments for the demand form
-- Existing admin-only policies remain for write operations.

-- Note: Policies are OR'ed, so adding this will allow reads for non-admins too.
-- Drop policy if it already exists (for idempotency)
DROP POLICY IF EXISTS "Anyone can read departments" ON public.departments;

CREATE POLICY "Anyone can read departments"
ON public.departments
FOR SELECT
TO anon, authenticated
USING (true);

