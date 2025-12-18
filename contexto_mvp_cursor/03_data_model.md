# Modelo de Dados (Supabase)

## Tabela: demands

Campos:
- id (uuid, primary key)
- created_at (timestamp)
- name (text)
- department (text)
- demand_type (text)
- system_area (text)
- impact_level (text)
- description (text)
- attachment_url (text)
- status (text)

Status padrão ao criar:
- Recebido

## Storage
- Bucket: demand-uploads
- Upload público apenas via server actions
