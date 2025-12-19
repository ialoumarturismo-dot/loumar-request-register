-- Add admin management fields to demands table
-- This migration adds fields for admin status, notes, priority, assignment, and resolution tracking

-- Add admin_status column (enum-like with check constraint)
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS admin_status TEXT DEFAULT 'Em análise';

-- Add constraint for admin_status
ALTER TABLE public.demands
DROP CONSTRAINT IF EXISTS demands_admin_status_check;

ALTER TABLE public.demands
ADD CONSTRAINT demands_admin_status_check 
CHECK (admin_status IN ('Em análise', 'Acatada', 'Resolvida', 'Descartada'));

-- Add admin_notes column for manager comments
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add priority_score column (0-100)
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50
CHECK (priority_score >= 0 AND priority_score <= 100);

-- Add assigned_to column for responsibility assignment
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Add resolved_at timestamp
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Create index for admin_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_demands_admin_status ON public.demands(admin_status);

-- Create index for priority_score for faster sorting
CREATE INDEX IF NOT EXISTS idx_demands_priority_score ON public.demands(priority_score DESC);

-- Update existing demands to have default admin_status
UPDATE public.demands
SET admin_status = 'Em análise'
WHERE admin_status IS NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN public.demands.admin_status IS 'Status administrativo da demanda: Em análise, Acatada, Resolvida, Descartada';
COMMENT ON COLUMN public.demands.admin_notes IS 'Notas e comentários do gestor sobre a demanda';
COMMENT ON COLUMN public.demands.priority_score IS 'Score de prioridade calculado (0-100)';
COMMENT ON COLUMN public.demands.assigned_to IS 'Nome do responsável pela análise/execução';
COMMENT ON COLUMN public.demands.resolved_at IS 'Data/hora em que a demanda foi resolvida';

