-- Migration: Add notification preferences to profiles table
-- This migration adds individual notification toggle fields for each notification type

-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_demand_created BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_demand_assigned BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_manager_comment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_deadline_soon BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN public.profiles.notify_demand_created IS 'Receber notificações quando uma demanda é criada';
COMMENT ON COLUMN public.profiles.notify_demand_assigned IS 'Receber notificações quando uma demanda é atribuída';
COMMENT ON COLUMN public.profiles.notify_manager_comment IS 'Receber notificações quando um gestor comenta';
COMMENT ON COLUMN public.profiles.notify_deadline_soon IS 'Receber notificações quando o prazo está próximo';

