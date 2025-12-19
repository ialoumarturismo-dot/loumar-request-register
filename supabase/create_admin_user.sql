-- Script para criar usuário admin inicial
-- Execute este script no SQL Editor do Supabase Dashboard

-- IMPORTANTE: Substitua os valores abaixo pelos seus dados
-- Este script cria um usuário com email e senha que você pode usar para login

-- Opção 1: Criar usuário via SQL (requer extensão pgcrypto)
-- Descomente e ajuste os valores abaixo:

/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@exemplo.com',  -- ALTERE AQUI: Seu email admin
  crypt('senha_segura_123', gen_salt('bf')),  -- ALTERE AQUI: Sua senha
  NOW(),
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
*/

-- Opção 2: RECOMENDADO - Criar usuário via Dashboard do Supabase
-- 
-- 1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em Authentication > Users
-- 4. Clique em "Add user" > "Create new user"
-- 5. Preencha:
--    - Email: admin@exemplo.com (ou o email que você quiser)
--    - Password: uma senha segura
--    - Auto Confirm User: Marque esta opção (importante!)
-- 6. Clique em "Create user"
--
-- Após criar, você poderá fazer login na aplicação com essas credenciais.

-- Opção 3: Criar usuário via API (usando service_role key)
-- Você pode usar o Supabase Admin API ou criar um script Node.js temporário

-- Exemplo de script Node.js (execute uma vez e depois delete):
/*
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'SUA_URL_AQUI';
const serviceRoleKey = 'SUA_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@exemplo.com',
    password: 'senha_segura_123',
    email_confirm: true, // Importante: confirma o email automaticamente
  });

  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Usuário criado:', data.user);
  }
}

createAdminUser();
*/

