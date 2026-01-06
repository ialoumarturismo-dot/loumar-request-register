-- Add UPDATE policy for notifications table
-- Users can update their own notifications (e.g., mark as read)

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comment
COMMENT ON POLICY "Users can update own notifications" ON public.notifications IS 
'Allows authenticated users to update their own notifications (e.g., mark as read)';

