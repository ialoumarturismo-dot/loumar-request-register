-- Script de Verificação APÓS aplicar migrations
-- Este script verifica se não houve perda de dados

-- ============================================================================
-- VERIFICAÇÃO 1: Contagem de registros
-- ============================================================================

DO $$
DECLARE
  original_count INTEGER;
  current_count INTEGER;
  backup_count INTEGER;
BEGIN
  -- Contar registros originais (backup)
  SELECT COUNT(*) INTO backup_count FROM public.demands_backup_20250102;
  
  -- Contar registros atuais
  SELECT COUNT(*) INTO current_count FROM public.demands;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE INTEGRIDADE DOS DADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros no backup: %', backup_count;
  RAISE NOTICE 'Registros atuais: %', current_count;
  RAISE NOTICE '';
  
  IF backup_count = current_count THEN
    RAISE NOTICE '✅ SUCESSO: Nenhum registro foi perdido!';
  ELSE
    RAISE WARNING '⚠️  ATENÇÃO: Diferença na contagem!';
    RAISE WARNING '   Backup: % registros', backup_count;
    RAISE WARNING '   Atual: % registros', current_count;
    RAISE WARNING '   Diferença: % registros', ABS(backup_count - current_count);
  END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO 2: Comparação campo a campo (amostra)
-- ============================================================================

-- Verificar se IDs principais foram preservados
SELECT 
  'IDs preservados' as check_type,
  COUNT(*) as matching_ids
FROM public.demands d
INNER JOIN public.demands_backup_20250102 b ON d.id = b.id;

-- Verificar campos críticos
SELECT 
  'Campos críticos preservados' as check_type,
  COUNT(*) as matching_records
FROM public.demands d
INNER JOIN public.demands_backup_20250102 b ON d.id = b.id
WHERE d.name = b.name
  AND d.description = b.description
  AND d.status = b.status
  AND d.created_at = b.created_at;

-- ============================================================================
-- VERIFICAÇÃO 3: Novos campos adicionados corretamente
-- ============================================================================

SELECT 
  'Novos campos adicionados' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'demands' AND column_name = 'destination_department'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'demands' AND column_name = 'assigned_to_user_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'demands' AND column_name = 'due_at'
    ) THEN '✅ Todos os campos novos foram adicionados'
    ELSE '❌ Algum campo novo está faltando'
  END as status;

-- ============================================================================
-- VERIFICAÇÃO 4: Valores padrão dos novos campos
-- ============================================================================

SELECT 
  'destination_department NULL' as field_check,
  COUNT(*) as count
FROM public.demands
WHERE destination_department IS NULL
UNION ALL
SELECT 
  'assigned_to_user_id NULL' as field_check,
  COUNT(*) as count
FROM public.demands
WHERE assigned_to_user_id IS NULL
UNION ALL
SELECT 
  'due_at NULL' as field_check,
  COUNT(*) as count
FROM public.demands
WHERE due_at IS NULL;

-- ============================================================================
-- VERIFICAÇÃO 5: Tabelas novas criadas
-- ============================================================================

SELECT 
  'Tabelas novas criadas' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_departments')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_responsibles')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'demand_events')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications')
    THEN '✅ Todas as tabelas novas foram criadas'
    ELSE '❌ Alguma tabela nova está faltando'
  END as status;

-- ============================================================================
-- VERIFICAÇÃO 6: Funções RPC criadas
-- ============================================================================

SELECT 
  'Funções RPC criadas' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'set_demand_status'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'add_demand_comment'
    )
    THEN '✅ Todas as funções RPC foram criadas'
    ELSE '❌ Alguma função RPC está faltando'
  END as status;

-- ============================================================================
-- VERIFICAÇÃO 7: RLS Policies atualizadas
-- ============================================================================

SELECT 
  'RLS Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'demands'
  AND policyname IN ('Admin can read all demands', 'Sector users can read department demands', 'Admin can update all demands');

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

DO $$
DECLARE
  total_demands INTEGER;
  backup_demands INTEGER;
  new_tables_count INTEGER;
  rpc_functions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_demands FROM public.demands;
  SELECT COUNT(*) INTO backup_demands FROM public.demands_backup_20250102;
  
  SELECT COUNT(*) INTO new_tables_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'user_departments', 'department_responsibles', 'demand_events', 'notifications');
  
  SELECT COUNT(*) INTO rpc_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('set_demand_status', 'add_demand_comment');
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA VERIFICAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demandas: % (backup: %)', total_demands, backup_demands;
  RAISE NOTICE 'Tabelas novas: %/5', new_tables_count;
  RAISE NOTICE 'Funções RPC: %/2', rpc_functions_count;
  RAISE NOTICE '';
  
  IF total_demands = backup_demands AND new_tables_count = 5 AND rpc_functions_count = 2 THEN
    RAISE NOTICE '✅ MIGRATION APLICADA COM SUCESSO!';
    RAISE NOTICE '   Nenhum dado foi perdido.';
    RAISE NOTICE '   Todas as estruturas foram criadas.';
  ELSE
    RAISE WARNING '⚠️  VERIFIQUE OS RESULTADOS ACIMA';
  END IF;
END $$;

