-- Add reference_links column to demands table
-- This column stores an array of URLs as text references
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS reference_links TEXT[] DEFAULT '{}';

-- Add comment to document the column
COMMENT ON COLUMN public.demands.reference_links IS 'Array of reference URLs (e.g., session links, documentation links)';

