-- Script de Backup ANTES de aplicar migrations
-- Este backup cria tabelas temporárias com os dados atuais

-- ============================================================================
-- BACKUP: Tabela demands (dados existentes)
-- ============================================================================

-- Criar tabela de backup
CREATE TABLE IF NOT EXISTS public.demands_backup_20250102 AS
SELECT * FROM public.demands;

-- Verificar contagem
DO $$
DECLARE
  original_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM public.demands;
  SELECT COUNT(*) INTO backup_count FROM public.demands_backup_20250102;
  
  RAISE NOTICE 'Backup criado: % registros originais, % registros no backup', original_count, backup_count;
  
  IF original_count != backup_count THEN
    RAISE EXCEPTION 'ERRO: Contagem de registros não confere!';
  END IF;
END $$;

-- ============================================================================
-- BACKUP: Verificar estrutura atual (para referência)
-- ============================================================================

-- Salvar estrutura atual da tabela demands
CREATE TABLE IF NOT EXISTS public.demands_structure_backup_20250102 AS
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'demands'
ORDER BY ordinal_position;

-- ============================================================================
-- BACKUP: Contagem de registros por status (para validação pós-migration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.demands_counts_backup_20250102 AS
SELECT 
  status,
  admin_status,
  COUNT(*) as count
FROM public.demands
GROUP BY status, admin_status
ORDER BY status, admin_status;

-- ============================================================================
-- Verificação de integridade
-- ============================================================================

-- Verificar se há demandas com dados críticos
SELECT 
  'Total de demandas' as metric,
  COUNT(*) as value
FROM public.demands
UNION ALL
SELECT 
  'Demandas com anexos' as metric,
  COUNT(*) as value
FROM public.demands
WHERE attachment_urls IS NOT NULL AND array_length(attachment_urls, 1) > 0
UNION ALL
SELECT 
  'Demandas com links' as metric,
  COUNT(*) as value
FROM public.demands
WHERE reference_links IS NOT NULL AND array_length(reference_links, 1) > 0
UNION ALL
SELECT 
  'Demandas resolvidas' as metric,
  COUNT(*) as value
FROM public.demands
WHERE admin_status = 'Resolvida';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Backup concluído com sucesso!';
  RAISE NOTICE 'Tabelas de backup criadas:';
  RAISE NOTICE '  - demands_backup_20250102';
  RAISE NOTICE '  - demands_structure_backup_20250102';
  RAISE NOTICE '  - demands_counts_backup_20250102';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora você pode aplicar apply_migrations.sql com segurança.';
END $$;

