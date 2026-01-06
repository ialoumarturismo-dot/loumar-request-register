#!/usr/bin/env node

/**
 * Script para criar usuário admin via Supabase Admin API
 * 
 * Requisitos:
 * - Variável SUPABASE_SERVICE_ROLE_KEY no .env.local
 * - Variável NEXT_PUBLIC_SUPABASE_URL no .env.local
 * 
 * Uso: node scripts/create-admin-user.js [email] [password] [displayName]
 */

// Carregar variáveis de ambiente do .env.local manualmente
const fs = require('fs');
const path = require('path');

// Função para carregar .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remover aspas se houver
        value = value.replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnvLocal();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  console.error('   Certifique-se de que .env.local contém:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Parâmetros do usuário
const email = process.argv[2] || 'admin@exemplo.com';
const password = process.argv[3] || 'admin123456';
const displayName = process.argv[4] || 'Administrador';

async function createAdminUser() {
  console.log('🚀 Criando usuário admin...\n');
  console.log(`Email: ${email}`);
  console.log(`Nome: ${displayName}\n`);

  // Criar cliente admin
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Criar usuário no auth
    console.log('1️⃣ Criando usuário no Authentication...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no auth:', authError.message);
      process.exit(1);
    }

    if (!authData.user) {
      console.error('❌ Erro: Usuário não foi criado');
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✅ Usuário criado no auth: ${userId}\n`);

    // 2. Criar perfil
    console.log('2️⃣ Criando perfil admin...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: displayName,
        role: 'admin',
        whatsapp_opt_in: false,
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError.message);
      console.error('   Tentando deletar usuário do auth...');
      await supabase.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log(`✅ Perfil criado: ${profileData.display_name} (${profileData.role})\n`);

    // 3. Verificar
    console.log('3️⃣ Verificando criação...');
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', userId)
      .single();

    if (verifyProfile) {
      console.log('✅ Verificação OK\n');
      console.log('========================================');
      console.log('✅ USUÁRIO ADMIN CRIADO COM SUCESSO!');
      console.log('========================================');
      console.log(`User ID: ${userId}`);
      console.log(`Email: ${email}`);
      console.log(`Nome: ${displayName}`);
      console.log(`Role: admin`);
      console.log('');
      console.log('Agora você pode fazer login com essas credenciais.');
    } else {
      console.error('❌ Erro na verificação');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };

