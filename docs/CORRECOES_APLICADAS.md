# ✅ Correções Aplicadas - RLS e Notificações

## 🔧 Problema 1: Ambiguidade de Coluna `user_id`

**Erro:** `column reference "user_id" is ambiguous`

**Causa:** A função `is_sector_user_in_department` tinha parâmetro `user_id` que conflitava com a coluna `user_id` da tabela `user_departments`.

**Solução:** 
- Renomeados parâmetros para `p_user_id` e `p_department_name`
- Recriada a função e a policy

**Migration:** `20260102184000_fix_ambiguous_user_id.sql`

---

## 🔧 Problema 2: Sector User Não Vê Demandas

**Problema:** Usuário de teste (sector_user) não conseguia ver demandas do seu departamento.

**Causa:** Policy de sector_user não estava funcionando corretamente após correção de ambiguidade.

**Solução:**
- Recriada policy `Sector users can read department demands`
- Policy agora usa função corrigida `is_sector_user_in_department`

**Migration:** `20260102185000_recreate_sector_user_policy.sql`

---

## 📋 Status das Notificações

### ✅ Funções Implementadas

1. **`sendDemandCreatedNotification`**
   - Disparada quando demanda é criada com `destination_department`
   - Notifica o responsável default do setor
   - Template: `WTS_TEMPLATE_DEMAND_CREATED`

2. **`sendDemandAssignedNotification`**
   - Disparada quando admin atribui/reassina demanda
   - Notifica o usuário atribuído
   - Template: `WTS_TEMPLATE_DEMAND_ASSIGNED`

3. **`sendManagerCommentNotification`**
   - Disparada quando admin adiciona comentário
   - Notifica o usuário responsável pela demanda
   - Template: `WTS_TEMPLATE_MANAGER_COMMENT`

4. **`sendDeadlineSoonNotification`**
   - Disparada pelo cron quando deadline está próximo
   - Notifica 24h e 6h antes do prazo
   - Template: `WTS_TEMPLATE_DEADLINE_SOON`

### ✅ Integração com Actions

- ✅ `createDemand` - Chama `sendDemandCreatedNotification`
- ✅ `assignDemand` - Chama `sendDemandAssignedNotification`
- ✅ `addManagerComment` - Chama `sendManagerCommentNotification`
- ✅ Cron `/api/cron/deadlines` - Chama `sendDeadlineSoonNotification`

### ⚙️ Configuração Necessária

Variáveis de ambiente no `.env.local`:

```env
# WhatsApp API
WTS_BASE_URL=https://api.flw.chat
WTS_TOKEN=seu_token_aqui

# Template IDs
WTS_TEMPLATE_DEMAND_CREATED=template_id_demanda_criada
WTS_TEMPLATE_DEMAND_ASSIGNED=template_id_demanda_atribuida
WTS_TEMPLATE_MANAGER_COMMENT=template_id_comentario_gestor
WTS_TEMPLATE_DEADLINE_SOON=template_id_prazo_proximo

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 🔄 Cron de Deadlines

**Endpoint:** `/api/cron/deadlines`

**Segurança:** Requer `cron_secret` no query string

**Uso:**
```bash
# Chamar manualmente para teste
curl "http://localhost:3001/api/cron/deadlines?cron_secret=SEU_SECRET"

# Configurar no seu serviço de cron (Vercel Cron, etc)
```

**Variável necessária:**
```env
CRON_SECRET=seu_secret_seguro_aqui
```

---

## ✅ Testes Realizados

### Teste 1: RLS Policies
- ✅ Admin pode ver todas as demandas
- ✅ Sector_user pode ver demandas do seu departamento
- ✅ Sem erro de ambiguidade
- ✅ Sem recursão infinita

### Teste 2: Notificações (Preparado)
- ✅ Funções implementadas
- ✅ Integração com actions
- ⏳ Aguardando configuração de templates e token

---

## 🎯 Próximos Passos

1. **Configurar variáveis de ambiente:**
   - Adicionar `WTS_TOKEN` e template IDs no `.env.local`

2. **Configurar templates no flwchat:**
   - Criar templates conforme documentação
   - Anotar template IDs

3. **Testar notificações:**
   - Criar demanda com setor destinatário
   - Verificar se notificação é enviada
   - Verificar logs no banco (`notifications` table)

4. **Configurar cron:**
   - Configurar serviço de cron (Vercel, etc)
   - Testar endpoint manualmente primeiro

---

## 📚 Documentação

- **flwchat API:** https://flwchat.readme.io/reference/post_v1-message-send
- **Notificações:** `app/actions/notifications.ts`
- **WhatsApp Client:** `lib/whatsapp/flwchat.ts`
- **Cron Endpoint:** `app/api/cron/deadlines/route.ts`

---

**Status:** ✅ Correções aplicadas, sistema funcional, notificações prontas para configurar

