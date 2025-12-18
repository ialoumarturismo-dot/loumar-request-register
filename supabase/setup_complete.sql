-- ============================================
-- SETUP COMPLETO DO SUPABASE PARA MVP DEMANDAS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create demands table
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

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demands_status ON public.demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_created_at ON public.demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demands_demand_type ON public.demands(demand_type);

-- 4. Enable Row Level Security
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can read demands" ON public.demands;
DROP POLICY IF EXISTS "Authenticated users can update demands" ON public.demands;

-- 6. Policy: Allow authenticated users to SELECT
CREATE POLICY "Authenticated users can read demands"
ON public.demands
FOR SELECT
TO authenticated
USING (true);

-- 7. Policy: Allow authenticated users to UPDATE
CREATE POLICY "Authenticated users can update demands"
ON public.demands
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: INSERT will be done via Server Actions using service_role key (bypasses RLS)
-- Note: DELETE is not allowed (no policy created)

-- 8. Insert seed data for testing
INSERT INTO public.demands (
  name,
  department,
  demand_type,
  system_area,
  impact_level,
  description,
  status
) VALUES (
  'João Silva',
  'Financeiro',
  'Bug',
  'ERP',
  'Alto',
  'Erro ao gerar relatório de vendas do mês. Sistema retorna erro 500 ao tentar exportar.',
  'Recebido'
) ON CONFLICT DO NOTHING;

