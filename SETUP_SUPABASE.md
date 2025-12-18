# Setup do Supabase - Instruções

## 1. Criar/Configurar Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Crie um novo projeto ou use um existente
3. Anote as seguintes informações:
   - Project URL (ex: `https://xxxxx.supabase.co`)
   - anon public key (em Settings > API)
   - service_role key (em Settings > API - mantenha secreto!)

## 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

## 3. Executar SQL no Supabase Dashboard

1. No Supabase Dashboard, vá em SQL Editor
2. Execute o arquivo `b` completo
3. Verifique se a tabela `demands` foi criada (Table Editor)

## 4. Criar Bucket de Storage

1. No Supabase Dashboard, vá em Storage
2. Clique em "New bucket"
3. Nome: `demand-uploads`
4. **IMPORTANTE**: Marque como **Private** (não público)
5. Clique em "Create bucket"

### Políticas de Storage (opcional - se necessário para admin visualizar)

No SQL Editor, execute:

```sql
-- Permitir que usuários autenticados leiam arquivos do bucket
CREATE POLICY "Authenticated users can view uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'demand-uploads');
```

**Nota**: Uploads serão feitos via Server Action usando service_role (bypassa RLS), então não é necessário policy de INSERT.

## 5. Gerar Tipos TypeScript

### Opção A: Via Supabase CLI (Recomendado)

```bash
# Linkar projeto (se ainda não linkado)
supabase link --project-ref seu-project-ref

# Gerar tipos
```

### Opção B: Via Dashboard

1. No Supabase Dashboard, vá em Settings > API
2. Role até "TypeScript types"
3. Copie o conteúdo e cole em `types/database.ts`

## 6. Verificar Setup

- [ ] Tabela `demands` existe com todas as colunas
- [ ] RLS está ativo na tabela
- [ ] Policies de SELECT e UPDATE estão criadas
- [ ] Bucket `demand-uploads` existe e está privado
- [ ] Seed data aparece no Table Editor
- [ ] `.env.local` está configurado
- [ ] `types/database.ts` está preenchido
