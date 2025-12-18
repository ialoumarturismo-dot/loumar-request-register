-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create demands table
CREATE TABLE IF NOT EXISTS public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  demand_type TEXT NOT NULL,
  system_area TEXT NOT NULL,
  impact_level TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'Recebido',
  
  -- Constraints
  CONSTRAINT demands_demand_type_check CHECK (demand_type IN ('Bug', 'Melhoria', 'Ideia', 'Ajuste')),
  CONSTRAINT demands_impact_level_check CHECK (impact_level IN ('Bloqueante', 'Alto', 'Médio', 'Baixo')),
  CONSTRAINT demands_status_check CHECK (status IN ('Recebido', 'Em análise', 'Em execução', 'Concluído'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demands_status ON public.demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_created_at ON public.demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demands_demand_type ON public.demands(demand_type);

-- Enable Row Level Security
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to SELECT
CREATE POLICY "Authenticated users can read demands"
ON public.demands
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to UPDATE
CREATE POLICY "Authenticated users can update demands"
ON public.demands
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: INSERT will be done via Server Actions using service_role key (bypasses RLS)
-- Note: DELETE is not allowed (no policy created)

