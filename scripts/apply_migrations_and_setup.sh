#!/bin/bash

# Script para aplicar migrations e configurar ambiente
# Uso: ./scripts/apply_migrations_and_setup.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando processo de migration e setup..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado no Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você precisa fazer login no Supabase CLI primeiro${NC}"
    echo "Execute: supabase login"
    exit 1
fi

# Obter PROJECT_REF do .env.local ou pedir ao usuário
if [ -f .env.local ]; then
    PROJECT_REF=$(grep "PROJECT_REF=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}⚠️  PROJECT_REF não encontrado no .env.local${NC}"
    read -p "Digite o PROJECT_REF do Supabase: " PROJECT_REF
fi

echo -e "${GREEN}📦 Project Ref: ${PROJECT_REF}${NC}"
echo ""

# ============================================================================
# PASSO 1: Backup
# ============================================================================
echo -e "${YELLOW}📋 PASSO 1: Criando backup...${NC}"

# Aplicar script de backup via Supabase CLI
if supabase db execute --project-ref "$PROJECT_REF" --file scripts/backup_before_migration.sql; then
    echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao criar backup${NC}"
    echo "Você pode criar o backup manualmente via SQL Editor do Supabase Dashboard"
    read -p "Continuar mesmo assim? (s/N): " continue_backup
    if [ "$continue_backup" != "s" ] && [ "$continue_backup" != "S" ]; then
        exit 1
    fi
fi

echo ""

# ============================================================================
# PASSO 2: Aplicar Migrations
# ============================================================================
echo -e "${YELLOW}📋 PASSO 2: Aplicando migrations...${NC}"

if supabase db execute --project-ref "$PROJECT_REF" --file supabase/apply_migrations.sql; then
    echo -e "${GREEN}✅ Migrations aplicadas com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao aplicar migrations${NC}"
    exit 1
fi

echo ""

# ============================================================================
# PASSO 3: Verificar Integridade
# ============================================================================
echo -e "${YELLOW}📋 PASSO 3: Verificando integridade dos dados...${NC}"

if supabase db execute --project-ref "$PROJECT_REF" --file scripts/verify_after_migration.sql; then
    echo -e "${GREEN}✅ Verificação concluída!${NC}"
else
    echo -e "${RED}❌ Erro na verificação${NC}"
    echo "Execute o script verify_after_migration.sql manualmente no SQL Editor"
fi

echo ""

# ============================================================================
# PASSO 4: Regenerar Types
# ============================================================================
echo -e "${YELLOW}📋 PASSO 4: Regenerando types TypeScript...${NC}"

if ./scripts/generate-types.sh "$PROJECT_REF"; then
    echo -e "${GREEN}✅ Types regenerados com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao regenerar types${NC}"
    echo "Execute manualmente: ./scripts/generate-types.sh $PROJECT_REF"
fi

echo ""

# ============================================================================
# PASSO 5: Instruções para criar admin
# ============================================================================
echo -e "${YELLOW}📋 PASSO 5: Criar usuário admin${NC}"
echo ""
echo -e "${GREEN}✅ Migrations aplicadas com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Acesse: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "2. Vá em Authentication > Users"
echo "3. Crie um novo usuário (email + senha)"
echo "4. Anote o User ID gerado"
echo "5. Execute o script create_admin_user.sql no SQL Editor"
echo "   (substituindo USER_ID_AQUI pelo ID do usuário criado)"
echo ""
echo "Ou use o script: scripts/create_admin_user.sql"
echo ""

echo -e "${GREEN}🎉 Processo concluído!${NC}"

