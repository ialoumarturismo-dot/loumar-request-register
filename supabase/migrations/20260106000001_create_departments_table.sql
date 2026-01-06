-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for name lookup
CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read all departments
CREATE POLICY "Admins can read all departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Only admins can insert departments
CREATE POLICY "Admins can insert departments"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Only admins can update departments
CREATE POLICY "Admins can update departments"
ON public.departments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Only admins can delete departments
CREATE POLICY "Admins can delete departments"
ON public.departments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default departments
INSERT INTO public.departments (name) VALUES
  ('B2B'),
  ('Call Center'),
  ('Balcão (PDV)'),
  ('Suporte'),
  ('Concierge'),
  ('Financeiro'),
  ('Marketing'),
  ('Operacional'),
  ('Outro')
ON CONFLICT (name) DO NOTHING;

-- Comment
COMMENT ON TABLE public.departments IS 'Departamentos disponíveis para seleção nas demandas';

