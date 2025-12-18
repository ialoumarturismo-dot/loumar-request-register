#!/bin/bash

# Script para gerar tipos TypeScript do Supabase
# Uso: ./scripts/generate-types.sh [project-ref]

PROJECT_REF=${1:-""}

if [ -z "$PROJECT_REF" ]; then
  echo "Erro: Project ref é necessário"
  echo "Uso: ./scripts/generate-types.sh <project-ref>"
  echo ""
  echo "Para encontrar o project ref:"
  echo "1. Acesse https://supabase.com/dashboard"
  echo "2. Selecione seu projeto"
  echo "3. Vá em Settings > General"
  echo "4. O Reference ID é o project ref"
  exit 1
fi

echo "Linkando projeto Supabase..."
supabase link --project-ref "$PROJECT_REF"

echo "Gerando tipos TypeScript..."
supabase gen types typescript --linked > types/database.ts

echo "Tipos gerados com sucesso em types/database.ts"

