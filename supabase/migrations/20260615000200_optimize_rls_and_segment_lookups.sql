-- ==============================================================
-- DeepFocus: RLS & Segment Lookup Optimization (O(1) checks)
-- Migration: 20260615000200_optimize_rls_and_segment_lookups.sql
-- ==============================================================

-- 1. Create check_user_in_segment boolean helper function (SECURITY DEFINER to query auth.users)
CREATE OR REPLACE FUNCTION public.check_user_in_segment(p_user_id UUID, p_segment TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_match BOOLEAN := FALSE;
BEGIN
    CASE p_segment
        WHEN 'all' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                WHERE u.id = p_user_id
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        WHEN 'new' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                WHERE u.id = p_user_id 
                  AND u.created_at >= NOW() - INTERVAL '7 days'
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        WHEN 'active' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                JOIN public.focus_sessions s ON s.user_id = u.id 
                WHERE u.id = p_user_id 
                  AND s.start_time >= NOW() - INTERVAL '7 days'
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        WHEN 'inactive' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                WHERE u.id = p_user_id
                  AND u.id NOT IN (
                      SELECT DISTINCT s.user_id FROM public.focus_sessions s WHERE s.start_time >= NOW() - INTERVAL '7 days'
                  )
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        WHEN 'premium' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                JOIN public.profiles p ON p.id = u.id 
                WHERE u.id = p_user_id 
                  AND p.is_premium = TRUE
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        WHEN 'beta' THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                JOIN public.profiles p ON p.id = u.id 
                WHERE u.id = p_user_id 
                  AND p.is_beta = TRUE
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
        ELSE
            -- Default back to checking if user exists and is subscribed
            SELECT EXISTS (
                SELECT 1 FROM auth.users u 
                WHERE u.id = p_user_id
                  AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue)
            ) INTO v_match;
    END CASE;
    
    RETURN v_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant EXECUTE privileges
GRANT EXECUTE ON FUNCTION public.check_user_in_segment(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_in_segment(UUID, TEXT) TO authenticated;


-- 2. Update RLS policy on notifications table to use O(1) checks
DROP POLICY IF EXISTS "Users can view active targeted or broadcast notifications" ON public.notifications;

CREATE POLICY "Users can view active targeted or broadcast notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
    is_published = TRUE
    AND scheduled_for <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
        user_id = auth.uid()
        OR (
            user_id IS NULL
            AND public.check_user_in_segment(auth.uid(), target_segment)
        )
    )
);


-- 3. Update get_user_notifications() RPC to use check_user_in_segment
CREATE OR REPLACE FUNCTION public.get_user_notifications()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    target_segment TEXT,
    delivery_method TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    icon TEXT,
    image_url TEXT,
    cta_text TEXT,
    cta_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN
) AS $$
BEGIN
    -- Check if global notifications flag is enabled
    IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = 'notifications' AND value = TRUE) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        n.id,
        n.user_id,
        n.title,
        n.message,
        n.type,
        n.target_segment,
        n.delivery_method,
        n.scheduled_for,
        n.expires_at,
        n.icon,
        n.image_url,
        n.cta_text,
        n.cta_url,
        n.created_at,
        COALESCE(
            CASE 
                -- If it's a global notification (user_id IS NULL), look up in interactions
                WHEN n.user_id IS NULL THEN EXISTS (
                    SELECT 1 FROM public.notification_interactions ni 
                    WHERE ni.notification_id = n.id AND ni.user_id = auth.uid() AND ni.is_viewed = TRUE
                )
                -- If it's a direct notification (user_id IS NOT NULL), look up in interactions
                ELSE EXISTS (
                    SELECT 1 FROM public.notification_interactions ni 
                    WHERE ni.notification_id = n.id AND ni.user_id = auth.uid() AND ni.is_viewed = TRUE
                )
            END, 
            FALSE
        ) AS is_read
    FROM public.notifications n
    WHERE 
        n.is_published = TRUE
        AND n.scheduled_for <= NOW()
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            -- User-specific
            n.user_id = auth.uid()
            OR 
            -- Global broadcast targeted at their audience segment
            (
                n.user_id IS NULL 
                AND public.check_user_in_segment(auth.uid(), n.target_segment)
            )
        )
    ORDER BY n.scheduled_for DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Update mark_all_notifications_as_read() RPC to use check_user_in_segment
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notification_interactions (notification_id, user_id, is_viewed)
    SELECT n.id, auth.uid(), TRUE
    FROM public.notifications n
    WHERE 
        n.is_published = TRUE
        AND n.scheduled_for <= NOW()
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.user_id = auth.uid()
            OR (
                n.user_id IS NULL 
                AND public.check_user_in_segment(auth.uid(), n.target_segment)
            )
        )
    ON CONFLICT (user_id, notification_id) 
    DO UPDATE SET is_viewed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
