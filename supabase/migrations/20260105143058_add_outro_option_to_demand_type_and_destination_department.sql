-- Migration: Adicionar opção 'Outro' aos campos demand_type e destination_department
-- Esta migration adiciona a opção 'Outro' às constraints CHECK existentes

-- 1. Atualizar constraint de demand_type para incluir 'Outro'
ALTER TABLE public.demands
DROP CONSTRAINT IF EXISTS demands_demand_type_check;

ALTER TABLE public.demands
ADD CONSTRAINT demands_demand_type_check 
CHECK (demand_type IN ('Bug', 'Melhoria', 'Ideia', 'Ajuste', 'Outro'));

-- 2. Atualizar constraint de destination_department para incluir 'Outro'
ALTER TABLE public.demands
DROP CONSTRAINT IF EXISTS demands_destination_department_check;

ALTER TABLE public.demands
ADD CONSTRAINT demands_destination_department_check 
CHECK (destination_department IS NULL OR destination_department IN ('Manutenção', 'TI', 'Outro'));

-- Atualizar comentários
COMMENT ON COLUMN public.demands.demand_type IS 'Tipo da demanda (Bug, Melhoria, Ideia, Ajuste, Outro)';
COMMENT ON COLUMN public.demands.destination_department IS 'Setor destinatário da demanda (Manutenção, TI, Outro)';

