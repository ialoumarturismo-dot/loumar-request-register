-- Script para aplicar todas as migrations da feature de setor destino + RBAC
-- Execute este script no SQL Editor do Supabase Dashboard na ordem apresentada

-- ============================================================================
-- MIGRATION 1: Adicionar campos de destino e atribuição
-- ============================================================================
-- Arquivo: 20251222000000_add_destination_department_and_user_system.sql

-- 1. Add new fields to demands table
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS destination_department TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID,
ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- Add constraint for destination_department
ALTER TABLE public.demands
DROP CONSTRAINT IF EXISTS demands_destination_department_check;

ALTER TABLE public.demands
ADD CONSTRAINT demands_destination_department_check 
CHECK (destination_department IS NULL OR destination_department IN ('Manutenção', 'TI'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_demands_destination_department ON public.demands(destination_department);
CREATE INDEX IF NOT EXISTS idx_demands_assigned_to_user_id ON public.demands(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_demands_due_at ON public.demands(due_at) WHERE due_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.demands.destination_department IS 'Setor destinatário da demanda (Manutenção, TI)';
COMMENT ON COLUMN public.demands.assigned_to_user_id IS 'ID do usuário responsável pela demanda';
COMMENT ON COLUMN public.demands.due_at IS 'Prazo de conclusão da demanda';

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sector_user',
  whatsapp_phone TEXT,
  whatsapp_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'sector_user'))
);

-- Create index for role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- RLS Policy: Admin can read all profiles
CREATE POLICY "Admin can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Admin can update all profiles
CREATE POLICY "Admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Admin can insert profiles
CREATE POLICY "Admin can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema com roles e dados de WhatsApp';

-- 3. Create user_departments table
CREATE TABLE IF NOT EXISTS public.user_departments (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, department),
  CONSTRAINT user_departments_department_check CHECK (department IN ('Manutenção', 'TI'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON public.user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department ON public.user_departments(department);

-- Enable RLS
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own departments
CREATE POLICY "Users can read own departments"
ON public.user_departments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admin can read all user_departments
CREATE POLICY "Admin can read all user_departments"
ON public.user_departments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Admin can manage user_departments
CREATE POLICY "Admin can manage user_departments"
ON public.user_departments
FOR ALL
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

-- Add comment
COMMENT ON TABLE public.user_departments IS 'Departamentos permitidos para cada usuário (Manutenção, TI)';

-- 4. Create department_responsibles table
CREATE TABLE IF NOT EXISTS public.department_responsibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT department_responsibles_department_check CHECK (department IN ('Manutenção', 'TI')),
  UNIQUE (department, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_department_responsibles_department ON public.department_responsibles(department);
CREATE INDEX IF NOT EXISTS idx_department_responsibles_user_id ON public.department_responsibles(user_id);
CREATE INDEX IF NOT EXISTS idx_department_responsibles_default ON public.department_responsibles(department, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.department_responsibles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can manage department_responsibles
CREATE POLICY "Admin can manage department_responsibles"
ON public.department_responsibles
FOR ALL
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

-- Add comment
COMMENT ON TABLE public.department_responsibles IS 'Responsáveis por departamento (roteamento automático de demandas)';

-- ============================================================================
-- MIGRATION 2: Criar tabelas de eventos e notificações
-- ============================================================================
-- Arquivo: 20251222000001_create_demand_events_and_notifications.sql

-- 1. Create demand_events table
CREATE TABLE IF NOT EXISTS public.demand_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  body TEXT,
  visibility TEXT NOT NULL DEFAULT 'manager_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT demand_events_event_type_check CHECK (event_type IN ('comment', 'status_change', 'assignment_change', 'deadline_change')),
  CONSTRAINT demand_events_visibility_check CHECK (visibility IN ('manager_only', 'internal', 'public'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demand_events_demand_id ON public.demand_events(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_events_author_user_id ON public.demand_events(author_user_id);
CREATE INDEX IF NOT EXISTS idx_demand_events_created_at ON public.demand_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_events_event_type ON public.demand_events(event_type);

-- Enable RLS
ALTER TABLE public.demand_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can read all events
CREATE POLICY "Admin can read all demand_events"
ON public.demand_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Sector users can insert events for assigned demands
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

-- RLS Policy: Admin can insert events
CREATE POLICY "Admin can insert demand_events"
ON public.demand_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  AND author_user_id = auth.uid()
);

-- Add comment
COMMENT ON TABLE public.demand_events IS 'Timeline de eventos/comentários das demandas (manager-only na primeira versão)';

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES public.demands(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  template_id TEXT NOT NULL,
  payload JSONB,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  dedupe_key TEXT UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  
  CONSTRAINT notifications_channel_check CHECK (channel IN ('whatsapp', 'email', 'sms')),
  CONSTRAINT notifications_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_demand_id ON public.notifications(demand_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admin can read all notifications
CREATE POLICY "Admin can read all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add comment
COMMENT ON TABLE public.notifications IS 'Auditoria de notificações WhatsApp (com dedupe_key para evitar duplicidade)';

-- ============================================================================
-- MIGRATION 3: Atualizar RLS policies de demands
-- ============================================================================
-- Arquivo: 20251222000002_update_rls_policies_for_demands.sql

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

-- Add foreign key constraint for assigned_to_user_id
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

-- ============================================================================
-- MIGRATION 4: Criar funções RPC para sector users
-- ============================================================================
-- Arquivo: 20251222000003_create_rpc_functions_for_sector_users.sql

-- Function: Set demand status (sector users only)
CREATE OR REPLACE FUNCTION public.set_demand_status(
  p_demand_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_assigned_to UUID;
  v_result JSONB;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Validate user is sector_user
  IF v_user_role != 'sector_user' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Apenas usuários de setor podem atualizar status operacional'
    );
  END IF;
  
  -- Get assigned user
  SELECT assigned_to_user_id INTO v_assigned_to
  FROM public.demands
  WHERE id = p_demand_id;
  
  -- Validate assignment
  IF v_assigned_to != auth.uid() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Demanda não atribuída a você'
    );
  END IF;
  
  -- Validate status
  IF p_new_status NOT IN ('Recebido', 'Em análise', 'Em execução', 'Concluído') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Status inválido'
    );
  END IF;
  
  -- Get old status for event
  DECLARE
    v_old_status TEXT;
  BEGIN
    SELECT status INTO v_old_status
    FROM public.demands
    WHERE id = p_demand_id;
    
    -- Update status
    UPDATE public.demands
    SET status = p_new_status
    WHERE id = p_demand_id;
    
    -- Log event
    INSERT INTO public.demand_events (
      demand_id,
      author_user_id,
      event_type,
      body,
      visibility
    ) VALUES (
      p_demand_id,
      auth.uid(),
      'status_change',
      'Status alterado de ' || COALESCE(v_old_status, 'N/A') || ' para ' || p_new_status,
      'manager_only'
    );
    
    RETURN jsonb_build_object('ok', true);
  END;
END;
$$;

-- Function: Add demand comment (sector users only)
CREATE OR REPLACE FUNCTION public.add_demand_comment(
  p_demand_id UUID,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_assigned_to UUID;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Validate user is sector_user
  IF v_user_role != 'sector_user' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Apenas usuários de setor podem adicionar comentários'
    );
  END IF;
  
  -- Get assigned user
  SELECT assigned_to_user_id INTO v_assigned_to
  FROM public.demands
  WHERE id = p_demand_id;
  
  -- Validate assignment
  IF v_assigned_to != auth.uid() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Demanda não atribuída a você'
    );
  END IF;
  
  -- Validate body
  IF p_body IS NULL OR TRIM(p_body) = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Comentário não pode estar vazio'
    );
  END IF;
  
  -- Insert event
  INSERT INTO public.demand_events (
    demand_id,
    author_user_id,
    event_type,
    body,
    visibility
  ) VALUES (
    p_demand_id,
    auth.uid(),
    'comment',
    p_body,
    'manager_only'
  );
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_demand_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_demand_comment(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.set_demand_status IS 'Permite usuários de setor atualizarem status operacional de demandas atribuídas a eles';
COMMENT ON FUNCTION public.add_demand_comment IS 'Permite usuários de setor adicionarem comentários (manager_only) em demandas atribuídas a eles';

-- ============================================================================
-- MIGRATION: Allow anyone to read departments for the demand form
-- ============================================================================
-- Arquivo: 20260114000000_allow_read_departments.sql
-- Permite que usuários anônimos e autenticados leiam a tabela departments
-- para que possam selecionar setores no formulário de demandas

-- Drop policy if it already exists (for idempotency)
DROP POLICY IF EXISTS "Anyone can read departments" ON public.departments;

CREATE POLICY "Anyone can read departments"
ON public.departments
FOR SELECT
TO anon, authenticated
USING (true);

