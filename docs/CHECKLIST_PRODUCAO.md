# Checklist de Produção - MVP Form Demandas

## ✅ Hardening e Segurança

- [x] `SUPABASE_SERVICE_ROLE_KEY` usado apenas em Server Actions
- [x] Nenhum componente client importa `admin.ts`
- [x] Validação de upload (tipo e tamanho)
- [x] Sanitização de filename
- [x] RLS ativo no banco
- [x] Autenticação obrigatória para rotas admin
- [x] Signed URL para anexos (expiração 5min)

## ✅ Funcionalidades

- [x] Formulário público funcional
- [x] Upload de anexos funcionando
- [x] Login admin funcionando
- [x] Listagem de demandas funcionando
- [x] Atualização de status funcionando
- [x] Visualização de anexos (signed URL)
- [x] Logout funcionando

## ✅ Deploy

- [ ] Repositório Git configurado e pushado
- [ ] Projeto criado na Vercel
- [ ] Variáveis de ambiente configuradas:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Deploy concluído sem erros

## ✅ Smoke Tests em Produção

### Teste Público:
- [ ] Acessar `/` funciona
- [ ] Criar demanda sem anexo funciona
- [ ] Criar demanda com anexo funciona
- [ ] Demanda aparece no Supabase Table Editor
- [ ] Arquivo aparece no Supabase Storage (quando anexado)

### Teste Admin:
- [ ] Acessar `/admin` sem login redireciona para `/login`
- [ ] Login funciona
- [ ] Demandas aparecem na listagem
- [ ] Alterar status funciona
- [ ] Status persiste após reload
- [ ] Botão "Abrir" anexo funciona (signed URL)

## 📝 Pendências Conhecidas

1. **Domínio customizado**: Configurar se necessário
2. **Monitoramento**: Configurar alertas básicos (opcional)
3. **Backup**: Configurar backup automático do Supabase (recomendado)
4. **Documentação**: Criar README.md com instruções de uso (opcional)
5. **Testes automatizados**: Adicionar testes E2E (futuro)

## 🎯 Próximos Passos (Fora do MVP)

- [ ] Adicionar filtros avançados na listagem
- [ ] Adicionar busca por texto
- [ ] Adicionar paginação (se muitas demandas)
- [ ] Adicionar exportação de relatórios
- [ ] Adicionar notificações por email
- [ ] Adicionar dashboard com métricas

