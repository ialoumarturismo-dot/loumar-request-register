# 🚀 Guia: Aplicar Migrations com Backup e Verificação

## ⚠️ IMPORTANTE: Backup Antes de Tudo

Este guia garante que **nenhum dado será perdido** durante a aplicação das migrations.

---

## 📋 Passo a Passo

### PASSO 1: Criar Backup (OBRIGATÓRIO)

1. **Acesse Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Selecione seu projeto

2. **Abra SQL Editor:**
   - Menu lateral > **SQL Editor**
   - Clique em **New Query**

3. **Execute o script de backup:**
   - Abra o arquivo: `scripts/backup_before_migration.sql`
   - **Copie TODO o conteúdo**
   - Cole no SQL Editor
   - Clique em **Run** (ou `Cmd/Ctrl + Enter`)

4. **Verifique o resultado:**
   - Deve aparecer mensagens de sucesso
   - Tabelas de backup criadas:
     - `demands_backup_20250102`
     - `demands_structure_backup_20250102`
     - `demands_counts_backup_20250102`

**✅ Verificação:**
```sql
-- Execute para confirmar backup
SELECT COUNT(*) as backup_count FROM public.demands_backup_20250102;
SELECT COUNT(*) as original_count FROM public.demands;

-- Os dois números devem ser IGUAIS
```

---

### PASSO 2: Aplicar Migrations

1. **No mesmo SQL Editor (ou nova query):**
   - Abra o arquivo: `supabase/apply_migrations.sql`
   - **Copie TODO o conteúdo**
   - Cole no SQL Editor
   - Clique em **Run**

2. **Aguarde execução:**
   - Pode levar alguns segundos
   - Verifique se não há erros

3. **Se houver erro:**
   - **NÃO CONTINUE**
   - Verifique a mensagem de erro
   - Revise o script
   - Entre em contato se necessário

---

### PASSO 3: Verificar Integridade dos Dados

1. **No SQL Editor:**
   - Abra o arquivo: `scripts/verify_after_migration.sql`
   - **Copie TODO o conteúdo**
   - Cole no SQL Editor
   - Clique em **Run**

2. **Verifique os resultados:**
   - Deve aparecer: `✅ SUCESSO: Nenhum registro foi perdido!`
   - Contagem de registros deve ser igual ao backup
   - Todas as tabelas novas devem estar criadas

**✅ Verificação manual:**
```sql
-- Comparar contagens
SELECT 
  (SELECT COUNT(*) FROM public.demands) as atual,
  (SELECT COUNT(*) FROM public.demands_backup_20250102) as backup,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.demands) = (SELECT COUNT(*) FROM public.demands_backup_20250102)
    THEN '✅ OK - Nenhum dado perdido'
    ELSE '❌ ERRO - Dados perdidos!'
  END as status;
```

---

### PASSO 4: Criar Usuário Admin

#### 4.1: Criar usuário no Auth

1. **No Supabase Dashboard:**
   - Vá em **Authentication > Users**
   - Clique em **Add user** > **Create new user**
   - Preencha:
     - **Email:** `admin@exemplo.com` (ou seu email)
     - **Password:** (senha segura)
     - ✅ **Auto Confirm User** (IMPORTANTE!)
   - Clique em **Create user**

2. **Anote o User ID:**
   - Aparece na lista de usuários
   - Formato: UUID (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

#### 4.2: Criar perfil admin

1. **No SQL Editor:**
   - Abra o arquivo: `scripts/create_admin_user.sql`
   - **Substitua `'USER_ID_AQUI'`** pelo User ID anotado acima
   - Execute apenas a parte "OPÇÃO 2" (criar perfil)

**Exemplo:**
```sql
-- Substitua pelo User ID real
INSERT INTO public.profiles (id, display_name, role, whatsapp_opt_in, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- ⚠️ SEU USER ID AQUI
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
```

2. **Verificar criação:**
```sql
SELECT id, display_name, role FROM public.profiles WHERE role = 'admin';
```

---

### PASSO 5: Regenerar Types TypeScript

**No terminal (na raiz do projeto):**

```bash
./scripts/generate-types.sh csnydjoijlrgwlugrigi
```

**Ou manualmente:**
```bash
supabase link --project-ref csnydjoijlrgwlugrigi
supabase gen types typescript --linked > types/database.ts
```

**Verificar:**
- Arquivo `types/database.ts` deve ter sido atualizado
- Deve conter as novas tabelas: `profiles`, `user_departments`, `demand_events`, etc.

---

## ✅ Checklist Final

Após completar todos os passos, verifique:

- [ ] Backup criado (3 tabelas de backup existem)
- [ ] Migrations aplicadas sem erros
- [ ] Verificação de integridade: **nenhum dado perdido**
- [ ] Tabelas novas criadas (5 tabelas)
- [ ] Funções RPC criadas (2 funções)
- [ ] Usuário admin criado e perfil configurado
- [ ] Types TypeScript regenerados
- [ ] Login como admin funciona
- [ ] Acesso a `/admin` funciona

---

## 🔍 Verificações Adicionais

### Verificar estrutura completa:

```sql
-- Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar colunas novas em demands
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'demands'
  AND column_name IN ('destination_department', 'assigned_to_user_id', 'due_at');

-- Verificar funções RPC
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('set_demand_status', 'add_demand_comment');
```

### Verificar RLS Policies:

```sql
-- Policies de demands
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'demands';
```

---

## 🚨 Em Caso de Problemas

### Erro: "relation already exists"
- Algumas migrations já foram aplicadas parcialmente
- Execute apenas as partes que faltam
- Ou use `DROP TABLE IF EXISTS` antes de criar (cuidado!)

### Erro: "permission denied"
- Verifique se está usando o SQL Editor do Dashboard
- Não tente executar via client anon (use service_role ou Dashboard)

### Dados perdidos?
1. **NÃO ENTRE EM PÂNICO**
2. Verifique as tabelas de backup:
   ```sql
   SELECT * FROM public.demands_backup_20250102;
   ```
3. Se necessário, restaure:
   ```sql
   -- CUIDADO: Isso sobrescreve dados atuais!
   TRUNCATE public.demands;
   INSERT INTO public.demands SELECT * FROM public.demands_backup_20250102;
   ```

---

## 📞 Próximos Passos

Após aplicar migrations com sucesso:

1. **Testar login** como admin
2. **Criar usuário** de Manutenção via `/admin/users`
3. **Criar demanda** com setor destinatário
4. **Testar notificações** WhatsApp
5. **Seguir RUNBOOK_VALIDACAO.md** para validação completa

---

**Última atualização:** 2025-01-02
**Versão:** 1.0

