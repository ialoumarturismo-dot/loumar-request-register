# Escopo do MVP (Dia 1)

O MVP deve conter apenas o essencial para resolver o problema de centralização.

## Funcionalidades incluídas
- Formulário público sem autenticação
- Campos:
  - Nome do solicitante
  - Setor
  - Tipo da demanda (bug, melhoria, ideia, ajuste)
  - Sistema/área afetada
  - Impacto percebido
  - Descrição detalhada
  - Upload de print/evidência
- Persistência dos dados em banco estruturado
- Painel administrativo com:
  - Login
  - Listagem das demandas
  - Alteração de status (Recebido, Em análise, Em execução, Concluído)

## Funcionalidades fora do escopo
- IA de priorização
- Integração com ClickUp
- SLA automático
- Notificações complexas
- Multi-tenant

Qualquer item fora dessa lista não deve ser implementado no MVP.
