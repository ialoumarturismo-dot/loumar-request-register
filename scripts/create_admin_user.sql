-- Script para criar usuário admin inicial
-- Execute este script APÓS aplicar as migrations e verificar integridade
-- 
-- IMPORTANTE: Este script cria o usuário via service_role (bypassa RLS)
-- Use apenas em ambiente controlado

-- ============================================================================
-- OPÇÃO 1: Criar via Supabase Dashboard (RECOMENDADO)
-- ============================================================================
-- 
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Vá em Authentication > Users
-- 3. Clique em "Add user" > "Create new user"
-- 4. Preencha:
--    - Email: admin@exemplo.com (ou seu email)
--    - Password: (senha segura)
--    - ✅ Auto Confirm User (IMPORTANTE!)
-- 5. Clique em "Create user"
-- 6. Anote o User ID gerado
-- 7. Execute a parte abaixo (OPÇÃO 2) para criar o perfil

-- ============================================================================
-- OPÇÃO 2: Criar perfil admin (após criar usuário no auth)
-- ============================================================================
-- 
-- Substitua 'USER_ID_AQUI' pelo User ID do usuário criado acima

-- Criar perfil admin
INSERT INTO public.profiles (id, display_name, role, whatsapp_opt_in, created_at, updated_at)
VALUES (
  'USER_ID_AQUI',  -- ⚠️ SUBSTITUA pelo User ID do usuário criado no auth
  'Administrador',
  'admin',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verificar criação
SELECT 
  id,
  display_name,
  role,
  whatsapp_phone,
  whatsapp_opt_in,
  created_at
FROM public.profiles
WHERE id = 'USER_ID_AQUI';  -- ⚠️ SUBSTITUA pelo User ID

-- ============================================================================
-- OPÇÃO 3: Script completo via service_role (AVANÇADO)
-- ============================================================================
-- 
-- ⚠️ ATENÇÃO: Este método requer service_role key e deve ser executado
-- via Supabase CLI ou API, não via SQL Editor normal (que usa anon key)
-- 
-- Use apenas se tiver acesso ao service_role key e souber o que está fazendo

-- NOTA: A criação de usuários no auth.users via SQL direto é complexa
-- e requer conhecimento profundo do sistema de auth do Supabase.
-- Recomendamos usar a OPÇÃO 1 (Dashboard) que é mais segura e simples.

-- ============================================================================
-- Verificação final
-- ============================================================================

-- Verificar se há admin criado
SELECT 
  COUNT(*) as admin_count,
  'Admins no sistema' as description
FROM public.profiles
WHERE role = 'admin';

-- Listar todos os perfis (apenas para verificação)
SELECT 
  id,
  display_name,
  role,
  whatsapp_opt_in,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

