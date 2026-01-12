# Fase 3 - Instruções de Setup

## ✅ Código Implementado

Todos os arquivos necessários foram criados/atualizados:

1. ✅ `lib/supabase/admin.ts` - Cliente admin com service_role
2. ✅ `app/actions/demands.ts` - Server Action completa com upload
3. ✅ `components/forms/demand-form.tsx` - Formulário conectado ao Server Action

## 📋 Próximos Passos (Execute na Ordem)

### 1. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

**Onde encontrar:**
- Acesse https://supabase.com/dashboard
- Selecione seu projeto
- Vá em Settings > API
- Copie Project URL e as keys

### 2. Linkar Projeto Supabase (via CLI)

```bash
# Substitua <PROJECT_REF> pelo Reference ID do seu projeto
supabase link --project-ref <PROJECT_REF>
```

**Para encontrar o PROJECT_REF:**
- No Dashboard do Supabase, vá em Settings > General
- O "Reference ID" é o project-ref

### 3. Aplicar Migrações

**Opção A: Via CLI (Recomendado)**
```bash
supabase db push
```

**Opção B: Via Dashboard (Manual)**
1. No Supabase Dashboard, vá em SQL Editor
2. Execute o conteúdo de `supabase/setup_complete.sql`
3. Verifique se a tabela `demands` foi criada

### 4. Criar Bucket de Storage

1. No Supabase Dashboard, vá em Storage
2. Clique em "New bucket"
3. Nome: `demand-uploads`
4. **IMPORTANTE**: Marque como **Private** (não público)
5. Clique em "Create bucket"

### 5. (Opcional) Gerar Tipos TypeScript Atualizados

Se quiser tipos gerados automaticamente do Supabase:

```bash
supabase gen types typescript --linked > types/database.ts
```

**Nota:** Já existe um arquivo `types/database.ts` com tipos manuais que funcionam.

### 6. Testar o Formulário

```bash
npm run dev
```

1. Acesse http://localhost:3000
2. Preencha o formulário
3. Teste com e sem arquivo anexado
4. Verifique no Supabase:
   - Table Editor: nova linha em `demands`
   - Storage: arquivo no bucket `demand-uploads` (se anexou)

## ✅ Checklist de Validação

- [ ] `.env.local` configurado com todas as variáveis
- [ ] Projeto linkado via CLI (`supabase link`)
- [ ] Migrações aplicadas (tabela `demands` existe)
- [ ] Bucket `demand-uploads` criado como Private
- [ ] Formulário público funciona e cria demandas
- [ ] Upload de arquivo funciona
- [ ] Dados aparecem no Supabase Table Editor
- [ ] Arquivos aparecem no Storage

## 🐛 Troubleshooting

**Erro: "Missing Supabase environment variables"**
- Verifique se `.env.local` existe e tem todas as variáveis
- Reinicie o dev server após criar/editar `.env.local`

**Erro: "bucket not found"**
- Certifique-se de que o bucket `demand-uploads` foi criado
- Verifique se o nome está exatamente `demand-uploads` (case-sensitive)

**Erro: "permission denied"**
- Verifique se o `SUPABASE_SERVICE_ROLE_KEY` está correto
- Service role key deve ter acesso completo (bypassa RLS)

**Erro ao fazer upload**
- Verifique tamanho do arquivo (máx 5MB)
- Verifique tipo do arquivo (apenas imagens)
- Verifique se o bucket está criado e é privado

