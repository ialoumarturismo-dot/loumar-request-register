-- Change attachment_url from TEXT to TEXT[] to support multiple attachments
-- First, create a new column for the array
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

-- Migrate existing data from attachment_url to attachment_urls
UPDATE public.demands
SET attachment_urls = CASE 
  WHEN attachment_url IS NOT NULL AND attachment_url != '' THEN ARRAY[attachment_url]
  ELSE '{}'::TEXT[]
END;

-- Drop the old column
ALTER TABLE public.demands
DROP COLUMN IF EXISTS attachment_url;

-- Rename the new column to attachment_urls (keeping it as is)
-- Add comment
COMMENT ON COLUMN public.demands.attachment_urls IS 'Array of attachment file paths in storage';

