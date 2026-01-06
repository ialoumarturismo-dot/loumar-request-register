# Runbook de Validação - Feature: Setor Destino + RBAC + WhatsApp

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Aplicação das Migrations](#aplicação-das-migrations)
3. [Configuração Inicial](#configuração-inicial)
4. [Validação Passo a Passo](#validação-passo-a-passo)
5. [Checklist Final](#checklist-final)
6. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### ✅ Verificações Antes de Começar

- [ ] Migrations SQL criadas e revisadas
- [ ] Variáveis de ambiente configuradas no `.env.local`:
  - `WTS_BASE_URL`
  - `WTS_TOKEN`
  - `WTS_TEMPLATE_*` (4 templates)
  - `NEXT_PUBLIC_APP_URL`
  - `CRON_SECRET` (opcional para testes locais)
- [ ] Templates WhatsApp criados e aprovados na plataforma
- [ ] Acesso ao Supabase Dashboard
- [ ] Acesso ao painel da plataforma WhatsApp (flwchat)

---

## Aplicação das Migrations

### Passo 1: Acessar SQL Editor do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**

### Passo 2: Aplicar Migrations

**Opção A: Script Consolidado (Recomendado)**
- Abra o arquivo `supabase/apply_migrations.sql`
- Copie todo o conteúdo
- Cole no SQL Editor
- Clique em **Run** (ou `Cmd/Ctrl + Enter`)

**Opção B: Migrations Individuais**
Execute na ordem:
1. `20251222000000_add_destination_department_and_user_system.sql`
2. `20251222000001_create_demand_events_and_notifications.sql`
3. `20251222000002_update_rls_policies_for_demands.sql`
4. `20251222000003_create_rpc_functions_for_sector_users.sql`

### Passo 3: Verificar Aplicação

Execute no SQL Editor:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'user_departments', 'department_responsibles', 'demand_events', 'notifications')
ORDER BY table_name;

-- Verificar colunas adicionadas em demands
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'demands' 
  AND column_name IN ('destination_department', 'assigned_to_user_id', 'due_at');

-- Verificar funções RPC
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('set_demand_status', 'add_demand_comment');
```

**Resultado esperado:**
- 5 tabelas criadas
- 3 colunas adicionadas em `demands`
- 2 funções RPC criadas

---

## Configuração Inicial

### Passo 1: Criar Usuário Admin

**Método 1: Via Supabase Dashboard (Recomendado)**
1. Vá em **Authentication > Users**
2. Clique em **Add user > Create new user**
3. Preencha:
   - Email: `admin@exemplo.com`
   - Password: (senha segura)
   - **Auto Confirm User**: ✅ Marcar
4. Clique em **Create user**
5. Anote o **User ID** gerado

**Método 2: Via SQL (Alternativo)**
```sql
-- Substitua os valores abaixo
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@exemplo.com',
  crypt('sua_senha_aqui', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW()
) RETURNING id;
```

### Passo 2: Criar Perfil Admin

Execute no SQL Editor (substitua `USER_ID_AQUI` pelo ID do usuário criado):

```sql
-- Criar perfil admin
INSERT INTO public.profiles (id, display_name, role, whatsapp_opt_in)
VALUES (
  'USER_ID_AQUI',  -- Substitua pelo User ID do passo anterior
  'Administrador',
  'admin',
  false
);
```

### Passo 3: Regenerar Types do TypeScript

```bash
# No terminal, na raiz do projeto
./scripts/generate-types.sh csnydjoijlrgwlugrigi
# ou use o PROJECT_REF do .env.local
```

Verifique se `types/database.ts` foi atualizado com as novas tabelas.

---

## Validação Passo a Passo

### 🔐 Teste 1: Login e Acesso Admin

1. **Acesse a aplicação**: `http://localhost:3000` (ou URL de produção)
2. **Vá para `/login`**
3. **Faça login** com as credenciais do admin criado
4. **Verifique redirecionamento** para `/admin`
5. **Verifique header**: deve aparecer "Painel Administrativo" e botão "Usuários"

**✅ Resultado esperado:**
- Login bem-sucedido
- Redirecionamento para `/admin`
- Interface admin carregada

---

### 👥 Teste 2: Gerenciamento de Usuários

1. **Acesse `/admin/users`** (via botão no header ou URL direta)
2. **Clique em "Novo Usuário"**
3. **Preencha o formulário:**
   - Email: `manutencao@exemplo.com`
   - Nome: `João Manutenção`
   - Senha: `senha123`
   - Papel: `Usuário de Setor`
   - Departamentos: ✅ **Manutenção**
   - WhatsApp: `+5511999999999`
   - Receber notificações: ✅
4. **Clique em "Criar"**

**✅ Resultado esperado:**
- Toast de sucesso: "Usuário criado"
- Usuário aparece na lista
- Card mostra: nome, email, papel, departamento, WhatsApp

5. **Teste edição:**
   - Clique no ícone de editar no card do usuário
   - Altere o nome
   - Salve
   - Verifique atualização

**✅ Resultado esperado:**
- Modal de edição abre
- Alterações são salvas
- Toast de sucesso

---

### 📝 Teste 3: Criar Demanda com Setor Destino

1. **Acesse a página inicial** (`/`)
2. **Preencha o formulário:**
   - Nome: `Teste Validação`
   - Setor: `B2B`
   - Tipo: `Bug`
   - Sistema: `ERP (Sistemão)`
   - Impacto: `Alto`
   - Descrição: `Teste de validação da feature`
   - **Setor Destinatário**: `Manutenção` ⭐ (novo campo)
3. **Clique em "Enviar Demanda"**

**✅ Resultado esperado:**
- Toast de sucesso
- Formulário resetado
- Demanda criada no banco

**Verificação no banco:**
```sql
SELECT id, name, destination_department, assigned_to_user_id, status
FROM public.demands
WHERE name = 'Teste Validação'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Resultado esperado:**
- `destination_department` = `'Manutenção'`
- `assigned_to_user_id` = ID do usuário de Manutenção (se houver default)
- `status` = `'Recebido'`

---

### 🔔 Teste 4: Notificação WhatsApp (Criação)

**Pré-requisito:** Usuário de Manutenção criado com WhatsApp válido e `whatsapp_opt_in = true`

1. **Crie uma demanda** com `destination_department = 'Manutenção'`
2. **Verifique no banco:**
```sql
SELECT id, user_id, template_id, status, provider_message_id, error_message
FROM public.notifications
WHERE demand_id = 'ID_DA_DEMANDA_CRIADA'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Resultado esperado:**
- Registro em `notifications` com `status = 'sent'` ou `'queued'`
- `template_id` = ID do template `WTS_TEMPLATE_DEMAND_CREATED`
- `provider_message_id` preenchido (se enviado com sucesso)

3. **Verifique WhatsApp** do usuário de Manutenção
   - Deve receber mensagem do template `[KANBAN] NOVA DEMANDA`
   - Link deve apontar para `/admin?demandId=...`

**⚠️ Se falhar:**
- Verifique logs do servidor
- Verifique `error_message` na tabela `notifications`
- Confirme que `WTS_TOKEN` e `WTS_BASE_URL` estão corretos

---

### 🔐 Teste 5: Login como Usuário Restrito (Sector User)

1. **Faça logout** do admin
2. **Faça login** com credenciais do usuário de Manutenção criado
3. **Acesse `/admin`**

**✅ Resultado esperado:**
- Login bem-sucedido
- Redirecionamento para `/admin`
- **Apenas demandas com `destination_department = 'Manutenção'`** aparecem
- Filtros funcionam normalmente
- **Não aparece** botão "Usuários" no header (ou aparece mas sem acesso)

**Verificação no banco (simular tentativa de acesso):**
```sql
-- Como sector_user, tentar ler todas as demandas
-- RLS deve filtrar automaticamente
SELECT COUNT(*) as total_visible
FROM public.demands;
-- Deve retornar apenas demandas de Manutenção
```

---

### ✏️ Teste 6: Atualizar Status (Sector User)

1. **Como usuário de Manutenção**, acesse uma demanda atribuída a ele
2. **Clique no card** para abrir modal de detalhes
3. **Altere o Status Operacional** (dropdown no modal)
   - Exemplo: de "Recebido" para "Em execução"
4. **Salve**

**✅ Resultado esperado:**
- Toast de sucesso: "Atualizado"
- Status atualizado no banco
- Evento registrado na timeline

**Verificação:**
```sql
-- Verificar status atualizado
SELECT id, status, assigned_to_user_id
FROM public.demands
WHERE id = 'ID_DA_DEMANDA';

-- Verificar evento criado
SELECT event_type, body, author_user_id
FROM public.demand_events
WHERE demand_id = 'ID_DA_DEMANDA'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Resultado esperado:**
- `status` atualizado
- Evento `status_change` criado
- `author_user_id` = ID do usuário de Manutenção

---

### 💬 Teste 7: Adicionar Comentário (Sector User)

1. **Como usuário de Manutenção**, abra uma demanda atribuída
2. **Na seção "Adicionar Comentário"**, digite:
   - `"Aguardando peça de reposição. Previsão: 3 dias."`
3. **Clique em "Adicionar Comentário"**

**✅ Resultado esperado:**
- Toast de sucesso
- Comentário aparece na timeline (apenas para admin)
- Evento registrado no banco

**Verificação:**
```sql
SELECT event_type, body, visibility
FROM public.demand_events
WHERE demand_id = 'ID_DA_DEMANDA'
  AND event_type = 'comment'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Resultado esperado:**
- `event_type` = `'comment'`
- `body` = comentário digitado
- `visibility` = `'manager_only'`

**⚠️ Importante:** Sector user **não vê** a timeline (conforme requisito: "comentários visíveis apenas para gestor")

---

### 👨‍💼 Teste 8: Atribuir/Reassinar Demanda (Admin)

1. **Como admin**, acesse uma demanda
2. **No modal de detalhes**, na seção "Gestão administrativa"
3. **Altere o campo "Responsável"** (input de texto)
   - Digite: `João Manutenção`
4. **Salve alterações**

**✅ Resultado esperado:**
- Toast de sucesso
- `assigned_to` atualizado (campo texto)
- Evento `assignment_change` criado

**Melhoria futura:** Substituir input de texto por select com usuários reais via `assigned_to_user_id`

---

### 📅 Teste 9: Definir Prazo e Notificação

1. **Como admin**, abra uma demanda
2. **Na seção "Prazo de Conclusão"**
3. **Selecione data/hora** (ex.: 2 dias no futuro)
4. **Clique em "Salvar Prazo"**

**✅ Resultado esperado:**
- Toast de sucesso
- `due_at` atualizado no banco
- Evento `deadline_change` criado

**Verificação:**
```sql
SELECT id, due_at
FROM public.demands
WHERE id = 'ID_DA_DEMANDA';
```

**Teste de notificação (manual):**
```bash
# Chamar endpoint de cron manualmente (substitua CRON_SECRET)
curl -X GET \
  'http://localhost:3000/api/cron/deadlines' \
  -H 'Authorization: Bearer SEU_CRON_SECRET'
```

**✅ Resultado esperado:**
- JSON com `ok: true`
- `notificationsSent` > 0 (se houver demandas próximas do prazo)
- Notificações criadas na tabela `notifications`

---

### 💬 Teste 10: Comentário do Gestor (Gera WhatsApp)

1. **Como admin**, abra uma demanda **atribuída a um usuário**
2. **Na seção "Comentário ao Responsável"**
3. **Digite:** `"Por favor, priorize esta demanda. Cliente aguardando."`
4. **Clique em "Enviar Comentário"**

**✅ Resultado esperado:**
- Toast de sucesso: "Comentário enviado"
- Evento criado na timeline
- **WhatsApp enviado** ao responsável

**Verificação:**
```sql
-- Verificar evento
SELECT event_type, body
FROM public.demand_events
WHERE demand_id = 'ID_DA_DEMANDA'
  AND event_type = 'comment'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar notificação
SELECT template_id, status, provider_message_id
FROM public.notifications
WHERE demand_id = 'ID_DA_DEMANDA'
  AND template_id = 'WTS_TEMPLATE_MANAGER_COMMENT'
ORDER BY created_at DESC
LIMIT 1;
```

**✅ Resultado esperado:**
- Evento criado
- Notificação com `template_id` = `WTS_TEMPLATE_MANAGER_COMMENT`
- `status` = `'sent'` (se WhatsApp enviado)
- Responsável recebe mensagem no WhatsApp

---

### 🔍 Teste 11: Filtros e Visualização

1. **Como admin**, acesse `/admin`
2. **Teste filtros:**
   - **Setor Destinatário**: Selecione "Manutenção"
   - **Status Administrativo**: Selecione "Em análise"
   - **Busca**: Digite parte do nome de uma demanda
3. **Verifique resultados**

**✅ Resultado esperado:**
- Filtros aplicados corretamente
- Apenas demandas que correspondem aparecem
- Contadores atualizados

---

### 🚫 Teste 12: Segurança RLS (Sector User)

**Teste crítico:** Verificar que sector_user **não consegue** acessar demandas de outros setores

1. **Como sector_user de Manutenção**, tente acessar uma demanda de TI
2. **Verifique no console do navegador** (F12 > Network)
   - Requisições para `/api` ou server actions
   - Respostas devem retornar apenas demandas de Manutenção

**Teste direto no banco (simular):**
```sql
-- Fazer login como sector_user (via service_role para teste)
-- Tentar SELECT em demands
-- RLS deve filtrar automaticamente
```

**✅ Resultado esperado:**
- Sector user **não vê** demandas de TI
- RLS bloqueia acesso via API direta
- Apenas demandas do seu `destination_department` aparecem

---

### 📎 Teste 13: Proteção de Anexos

1. **Como sector_user**, tente acessar um anexo de uma demanda **não atribuída a ele**
2. **Verifique comportamento**

**✅ Resultado esperado:**
- Erro: "Demanda não encontrada ou sem permissão de acesso"
- Signed URL **não é gerada**

---

## Checklist Final

### ✅ Funcionalidades Core

- [ ] Migrations aplicadas sem erros
- [ ] Tabelas criadas corretamente
- [ ] RLS policies funcionando
- [ ] Funções RPC criadas e testadas

### ✅ Gerenciamento de Usuários

- [ ] Criar usuário admin funciona
- [ ] Criar usuário sector_user funciona
- [ ] Editar usuário funciona
- [ ] Listar usuários funciona
- [ ] Departamentos associados corretamente

### ✅ Demandas

- [ ] Criar demanda com `destination_department` funciona
- [ ] Roteamento automático funciona (se houver default)
- [ ] Filtros por `destination_department` funcionam
- [ ] Atribuição manual funciona (admin)

### ✅ Permissionamento

- [ ] Admin vê todas as demandas
- [ ] Sector_user vê apenas seu setor
- [ ] Sector_user não consegue acessar demandas de outros setores
- [ ] Sector_user só atualiza status de demandas atribuídas
- [ ] Sector_user só comenta em demandas atribuídas

### ✅ Timeline e Comentários

- [ ] Timeline aparece para admin
- [ ] Timeline **não aparece** para sector_user
- [ ] Comentários de sector_user são criados
- [ ] Comentários do gestor são criados
- [ ] Eventos de status_change são registrados
- [ ] Eventos de assignment_change são registrados

### ✅ WhatsApp

- [ ] Notificação de criação funciona
- [ ] Notificação de atribuição funciona
- [ ] Notificação de comentário do gestor funciona
- [ ] Notificação de deadline funciona (via cron)
- [ ] Registros em `notifications` são criados
- [ ] Dedupe_key evita duplicidade

### ✅ Prazo (Deadline)

- [ ] Definir prazo funciona (admin)
- [ ] Evento `deadline_change` é criado
- [ ] Cron endpoint funciona
- [ ] Notificações de deadline são enviadas

### ✅ UI/UX

- [ ] Formulário público tem campo "Setor Destinatário"
- [ ] Admin vê todos os campos
- [ ] Sector_user vê campos restritos
- [ ] Modal de detalhes adapta-se ao role
- [ ] Filtros funcionam
- [ ] Link "Usuários" aparece no header (admin)

---

## Troubleshooting

### ❌ Erro: "Perfil não encontrado"

**Causa:** Usuário criado no auth mas perfil não criado em `profiles`

**Solução:**
```sql
-- Criar perfil manualmente
INSERT INTO public.profiles (id, display_name, role)
VALUES ('USER_ID', 'Nome', 'admin');
```

---

### ❌ Erro: "RLS policy violation"

**Causa:** RLS bloqueando acesso legítimo

**Solução:**
1. Verifique se o usuário tem perfil em `profiles`
2. Verifique se `role` está correto
3. Verifique se `user_departments` está preenchido (para sector_user)

---

### ❌ WhatsApp não envia

**Causas possíveis:**
1. `WTS_TOKEN` incorreto
2. `WTS_BASE_URL` incorreto
3. Template ID incorreto
4. Telefone em formato inválido
5. `whatsapp_opt_in = false`

**Solução:**
1. Verifique variáveis de ambiente
2. Verifique logs do servidor
3. Verifique tabela `notifications` (campo `error_message`)
4. Teste token via curl:
```bash
curl -X GET \
  'https://api.flw.chat/chat/v1/template?Name=%5BKANBAN%5D' \
  -H 'Authorization: SEU_TOKEN'
```

---

### ❌ Sector_user não vê demandas

**Causa:** `user_departments` não configurado ou RLS incorreto

**Solução:**
```sql
-- Verificar departamentos do usuário
SELECT * FROM public.user_departments WHERE user_id = 'USER_ID';

-- Adicionar se faltar
INSERT INTO public.user_departments (user_id, department)
VALUES ('USER_ID', 'Manutenção');
```

---

### ❌ Funções RPC não funcionam

**Causa:** Permissões não concedidas ou função não criada

**Solução:**
```sql
-- Verificar se funções existem
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('set_demand_status', 'add_demand_comment');

-- Recriar se necessário (copiar do migration 4)
```

---

### ❌ Types TypeScript desatualizados

**Solução:**
```bash
# Regenerar types
./scripts/generate-types.sh csnydjoijlrgwlugrigi

# Ou usar PROJECT_REF do .env
./scripts/generate-types.sh $PROJECT_REF
```

---

## 📊 Métricas de Sucesso

Após validação completa, você deve ter:

- ✅ **5 novas tabelas** no banco
- ✅ **3 novos campos** em `demands`
- ✅ **2 funções RPC** criadas
- ✅ **4 templates WhatsApp** configurados
- ✅ **RLS policies** protegendo dados
- ✅ **Notificações** sendo enviadas
- ✅ **Timeline** funcionando
- ✅ **Permissionamento** funcionando corretamente

---

## 🎯 Próximos Passos (Opcional)

Após validação bem-sucedida:

1. **Configurar Cron Job** (Vercel Cron ou similar) para `/api/cron/deadlines`
2. **Melhorar UI de atribuição** (select com usuários reais ao invés de texto)
3. **Adicionar mais departamentos** (se necessário)
4. **Configurar monitoramento** de notificações falhadas
5. **Documentar** processos de criação de usuários para equipe

---

## 📞 Suporte

Em caso de problemas não resolvidos:

1. Verifique logs do servidor (Next.js)
2. Verifique logs do Supabase (Dashboard > Logs)
3. Verifique tabela `notifications` para erros de WhatsApp
4. Revise este runbook passo a passo

---

**Última atualização:** 2025-01-02
**Versão:** 1.0

