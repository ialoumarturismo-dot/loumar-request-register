-- Migration: Add destination department, user assignment, and deadline fields
-- This migration adds support for destination departments (Manutenção, TI),
-- user-based assignment, and deadline tracking

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

-- RLS Policy: Admin can read all profiles (will be updated after admin role is set)
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

-- 4. Create department_responsibles table (for routing/scaling)
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

