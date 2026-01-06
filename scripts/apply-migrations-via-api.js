#!/usr/bin/env node

/**
 * Script para aplicar migrations via Supabase Management API
 * 
 * Requisitos:
 * - Variável SUPABASE_SERVICE_ROLE_KEY no .env.local
 * - Variável NEXT_PUBLIC_SUPABASE_URL no .env.local
 * 
 * Uso: node scripts/apply-migrations-via-api.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  console.error('   Certifique-se de que .env.local contém:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extrair project ref da URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Erro: Não foi possível extrair project ref da URL');
  process.exit(1);
}

const API_URL = `https://${projectRef}.supabase.co/rest/v1/rpc/exec_sql`;

function readSQLFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Erro ao ler arquivo ${filePath}:`, error.message);
    process.exit(1);
  }
}

function executeSQL(sql, description) {
  return new Promise((resolve, reject) => {
    const sqlEncoded = encodeURIComponent(sql);
    const url = `${API_URL}?sql=${sqlEncoded}`;

    const options = {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    // Nota: A API REST do Supabase não suporta execução SQL direta
    // Este script é um exemplo, mas a forma recomendada é via Dashboard SQL Editor
    console.warn('⚠️  A API REST do Supabase não suporta execução SQL direta.');
    console.warn('   Use o método via Dashboard SQL Editor (recomendado).');
    console.warn('   Veja: APLICAR_MIGRATIONS.md');
    
    reject(new Error('Use Dashboard SQL Editor ao invés de API'));
  });
}

async function main() {
  console.log('🚀 Aplicando migrations via Supabase...\n');
  console.log('⚠️  NOTA: Este script é apenas um exemplo.');
  console.log('   A forma RECOMENDADA é usar o SQL Editor do Dashboard.\n');
  console.log('   Veja o guia: APLICAR_MIGRATIONS.md\n');
  
  // Listar arquivos a executar
  const files = [
    { path: 'scripts/backup_before_migration.sql', desc: 'Backup' },
    { path: 'supabase/apply_migrations.sql', desc: 'Migrations' },
    { path: 'scripts/verify_after_migration.sql', desc: 'Verificação' },
  ];

  console.log('Arquivos a executar:');
  files.forEach(f => console.log(`  - ${f.path} (${f.desc})`));
  console.log('\n❌ Execução via API não é suportada.');
  console.log('✅ Use o SQL Editor do Dashboard (veja APLICAR_MIGRATIONS.md)');
  
  process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { executeSQL };

