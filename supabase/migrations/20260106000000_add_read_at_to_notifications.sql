-- Add read_at column to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Comment
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when the notification was read by the user';

