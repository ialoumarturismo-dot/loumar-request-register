-- Migration: Create demand_events (timeline) and notifications tables
-- This migration adds support for demand timeline/events and WhatsApp notification tracking

-- 1. Create demand_events table (timeline)
CREATE TABLE IF NOT EXISTS public.demand_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  body TEXT,
  visibility TEXT NOT NULL DEFAULT 'manager_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT demand_events_event_type_check CHECK (event_type IN ('comment', 'status_change', 'assignment_change', 'deadline_change')),
  CONSTRAINT demand_events_visibility_check CHECK (visibility IN ('manager_only', 'internal', 'public'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_demand_events_demand_id ON public.demand_events(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_events_author_user_id ON public.demand_events(author_user_id);
CREATE INDEX IF NOT EXISTS idx_demand_events_created_at ON public.demand_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_events_event_type ON public.demand_events(event_type);

-- Enable RLS
ALTER TABLE public.demand_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can read all events
CREATE POLICY "Admin can read all demand_events"
ON public.demand_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Sector users can insert events for assigned demands (manager_only visibility)
CREATE POLICY "Sector users can insert manager_only events"
ON public.demand_events
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be sector_user
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sector_user'
  )
  -- Demand must be assigned to this user
  AND EXISTS (
    SELECT 1 FROM public.demands
    WHERE id = demand_id AND assigned_to_user_id = auth.uid()
  )
  -- Visibility must be manager_only
  AND visibility = 'manager_only'
  -- Author must be the current user
  AND author_user_id = auth.uid()
);

-- RLS Policy: Admin can insert events
CREATE POLICY "Admin can insert demand_events"
ON public.demand_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
  AND author_user_id = auth.uid()
);

-- Add comment
COMMENT ON TABLE public.demand_events IS 'Timeline de eventos/comentários das demandas (manager-only na primeira versão)';

-- 2. Create notifications table (WhatsApp tracking)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES public.demands(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  template_id TEXT NOT NULL,
  payload JSONB,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  dedupe_key TEXT UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  
  CONSTRAINT notifications_channel_check CHECK (channel IN ('whatsapp', 'email', 'sms')),
  CONSTRAINT notifications_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_demand_id ON public.notifications(demand_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admin can read all notifications
CREATE POLICY "Admin can read all notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Service role can insert notifications (via server actions)
-- Note: INSERT will be done via Server Actions using service_role key (bypasses RLS)

-- Add comment
COMMENT ON TABLE public.notifications IS 'Auditoria de notificações WhatsApp (com dedupe_key para evitar duplicidade)';

