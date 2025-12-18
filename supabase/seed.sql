-- Seed data for testing
INSERT INTO public.demands (
  name,
  department,
  demand_type,
  system_area,
  impact_level,
  description,
  status
) VALUES (
  'João Silva',
  'Financeiro',
  'Bug',
  'ERP',
  'Alto',
  'Erro ao gerar relatório de vendas do mês. Sistema retorna erro 500 ao tentar exportar.',
  'Recebido'
);

