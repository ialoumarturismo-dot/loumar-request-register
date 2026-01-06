# 🎯 Instruções Finais - Aplicar Migrations

## ⚡ Execução Rápida (3 Passos)

### 1️⃣ BACKUP (SQL Editor do Supabase Dashboard)

1. Acesse: https://supabase.com/dashboard/project/csnydjoijlrgwlugrigi
2. SQL Editor > New Query
3. Copie e execute: `scripts/backup_before_migration.sql`
4. ✅ Verifique: 3 tabelas de backup criadas

### 2️⃣ MIGRATIONS (SQL Editor do Supabase Dashboard)

1. No mesmo SQL Editor (ou nova query)
2. Copie e execute: `supabase/apply_migrations.sql`
3. ✅ Aguarde conclusão (pode levar alguns segundos)

### 3️⃣ VERIFICAÇÃO (SQL Editor do Supabase Dashboard)

1. No SQL Editor
2. Copie e execute: `scripts/verify_after_migration.sql`
3. ✅ Verifique: "✅ SUCESSO: Nenhum registro foi perdido!"

---

## 👤 Criar Admin User

### Opção A: Script Node.js (Automático)

```bash
node scripts/create-admin-user.js admin@exemplo.com senha123 Administrador
```

### Opção B: Manual (Dashboard + SQL)

1. **Dashboard:** Authentication > Users > Add user
   - Email: `admin@exemplo.com`
   - Password: (senha segura)
   - ✅ Auto Confirm User
   - Anote o **User ID**

2. **SQL Editor:** Execute (substitua USER_ID):
```sql
INSERT INTO public.profiles (id, display_name, role, whatsapp_opt_in)
VALUES ('USER_ID_AQUI', 'Administrador', 'admin', false);
```

---

## 🔄 Regenerar Types

```bash
./scripts/generate-types.sh csnydjoijlrgwlugrigi
```

---

## ✅ Validação Rápida

1. **Login:** `/login` com credenciais do admin
2. **Acessar:** `/admin` (deve funcionar)
3. **Criar usuário:** `/admin/users` > Novo Usuário
4. **Criar demanda:** `/` com setor destinatário

---

## 📚 Documentação Completa

- **APLICAR_MIGRATIONS.md** - Guia detalhado passo a passo
- **RUNBOOK_VALIDACAO.md** - Validação completa (13 testes)
- **RESUMO_EXECUTIVO.md** - Visão geral

---

**Pronto para aplicar!** 🚀

