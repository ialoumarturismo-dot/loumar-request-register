-- Add priority field to demands table
-- Priority values: Urgente, Importante, Necessário, Interessante

ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS priority TEXT
CHECK (priority IS NULL OR priority IN ('Urgente', 'Importante', 'Necessário', 'Interessante'));

-- Set default value for existing rows
UPDATE public.demands
SET priority = 'Interessante'
WHERE priority IS NULL;

-- Create index for priority
CREATE INDEX IF NOT EXISTS idx_demands_priority ON public.demands(priority);

-- Add comment
COMMENT ON COLUMN public.demands.priority IS 'Prioridade editável pelo gestor: Urgente, Importante, Necessário, Interessante';

