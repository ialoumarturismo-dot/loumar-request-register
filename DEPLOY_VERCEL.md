# Deploy na Vercel - Guia Completo

## Pré-requisitos

1. Conta na Vercel (gratuita): https://vercel.com
2. Repositório Git (GitHub/GitLab/Bitbucket) com o código pushado
3. Projeto Supabase configurado e funcionando

## Passo 1: Preparar Repositório

```bash
# Verificar que todas as alterações estão commitadas
git status

# Se necessário, commitar alterações
git add .
git commit -m "feat: MVP completo - formulário público + painel admin"

# Push para o repositório remoto
git push origin main
```

## Passo 2: Criar Projeto na Vercel

1. Acesse https://vercel.com e faça login
2. Clique em "Add New..." > "Project"
3. Importe seu repositório Git
4. Configure:
   - **Framework Preset**: Next.js (auto-detect)
   - **Root Directory**: `./` (raiz)
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `.next` (padrão)
   - **Install Command**: `npm install` (padrão)

## Passo 3: Configurar Variáveis de Ambiente

Na Vercel, vá em **Settings > Environment Variables** e adicione:

### Para Production, Preview e Development:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

**Onde encontrar:**
- Acesse https://supabase.com/dashboard
- Selecione seu projeto
- Vá em Settings > API
- Copie:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (mantenha secreto!)

**IMPORTANTE:**
- Marque todas as variáveis para Production, Preview e Development
- A `SUPABASE_SERVICE_ROLE_KEY` é sensível - nunca exponha publicamente

## Passo 4: Deploy

1. Clique em "Deploy"
2. Aguarde o build completar (2-3 minutos)
3. Verifique se não há erros no build

## Passo 5: Verificar Deploy

Após o deploy, você receberá uma URL como:
- `https://seu-projeto.vercel.app`

### Testes Obrigatórios:

#### Teste Público:
1. Acesse `https://seu-projeto.vercel.app/`
2. Preencha o formulário e crie uma demanda
3. Teste com e sem anexo
4. Verifique no Supabase Table Editor se a demanda foi criada
5. Verifique no Supabase Storage se o arquivo foi uploadado (se anexou)

#### Teste Admin:
1. Acesse `https://seu-projeto.vercel.app/admin`
2. Deve redirecionar para `/login` (se não estiver logado)
3. Faça login com credenciais do admin
4. Verifique se as demandas aparecem na listagem
5. Altere o status de uma demanda
6. Recarregue a página e confirme que o status persistiu
7. Teste o botão "Abrir" em uma demanda com anexo

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se todas as variáveis foram configuradas na Vercel
- Confirme que estão marcadas para Production/Preview/Development
- Reinicie o deploy após adicionar variáveis

### Erro: "bucket not found"
- Confirme que o bucket `demand-uploads` existe no Supabase
- Verifique se o nome está exatamente `demand-uploads` (case-sensitive)

### Erro: "permission denied" no admin
- Verifique se o usuário admin foi criado no Supabase Auth
- Confirme que as políticas RLS estão corretas

### Build falha
- Verifique os logs de build na Vercel
- Confirme que `npm run build` funciona localmente
- Verifique se todas as dependências estão no `package.json`

## Domínio Customizado (Opcional)

1. Na Vercel, vá em Settings > Domains
2. Adicione seu domínio customizado
3. Configure DNS conforme instruções da Vercel

## Monitoramento

- **Logs**: Vercel > Deployments > [seu deploy] > Functions Logs
- **Analytics**: Vercel > Analytics (plano Pro)
- **Supabase Logs**: Dashboard > Logs

## Checklist Final

- [ ] Repositório pushado para Git
- [ ] Projeto criado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy concluído com sucesso
- [ ] Formulário público funcionando
- [ ] Login admin funcionando
- [ ] Listagem de demandas funcionando
- [ ] Atualização de status funcionando
- [ ] Visualização de anexos funcionando
- [ ] Smoke tests passando

