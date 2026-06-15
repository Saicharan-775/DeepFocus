-- ==============================================================
-- DeepFocus: Premium Real-Time Broadcast & Email Notification Platform
-- Migration: 20260615000000_add_premium_notifications.sql
-- Optimized for Security, Real-Time Subscriptions, and Analytics
-- ==============================================================

-- 1. PROFILES TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user' NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
    is_beta BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Trigger to sync new auth users to public profiles automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users in auth.users into profiles
INSERT INTO public.profiles (id, full_name, avatar_url, role)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', ''),
    COALESCE(raw_user_meta_data->>'avatar_url', ''),
    COALESCE(raw_user_meta_data->>'role', 'user')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. NOTIFICATIONS TABLE (Campaigns & Messages)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NULL, -- targeted single user, NULL = broadcast
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('system', 'feature', 'achievement', 'revision', 'warning', 'announcement')) DEFAULT 'system',
    target_segment TEXT NOT NULL CHECK (target_segment IN ('all', 'new', 'active', 'inactive', 'premium', 'beta')) DEFAULT 'all',
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'both')) DEFAULT 'in_app',
    is_published BOOLEAN DEFAULT TRUE NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    icon TEXT NULL,
    image_url TEXT NULL,
    cta_text TEXT NULL,
    cta_url TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. NOTIFICATION INTERACTIONS TABLE (Read / Click Logging)
CREATE TABLE IF NOT EXISTS public.notification_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_viewed BOOLEAN DEFAULT FALSE NOT NULL,
    is_clicked BOOLEAN DEFAULT FALSE NOT NULL,
    interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_user_notification_interaction UNIQUE(user_id, notification_id)
);

-- 4. BROADCAST DELIVERIES TABLE (Resend Email Queue & Status)
CREATE TABLE IF NOT EXISTS public.broadcast_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    delivery_method TEXT CHECK (delivery_method IN ('in_app', 'email')) NOT NULL,
    status TEXT CHECK (status IN ('queued', 'sent', 'delivered', 'failed')) DEFAULT 'queued' NOT NULL,
    resend_id TEXT UNIQUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_notification_user_delivery UNIQUE(notification_id, user_id, delivery_method)
);

-- 5. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'Broadcast Created', 'Broadcast Updated', 'Broadcast Deleted', 'Broadcast Published', 'Broadcast Cancelled', 'Email Campaign Sent'
    notification_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key TEXT PRIMARY KEY,
    value BOOLEAN DEFAULT TRUE NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed initial feature flags (including emergency kill switch maintenance_mode)
INSERT INTO public.feature_flags (key, value, description) VALUES
    ('notifications', TRUE, 'Enables global in-app notifications system'),
    ('realtime_notifications', TRUE, 'Enables real-time push alerts via websockets'),
    ('email_broadcasts', TRUE, 'Enables Resend email dispatches for announcements'),
    ('broadcast_center', TRUE, 'Enables administrative control panels for broadcasts'),
    ('maintenance_mode', FALSE, 'Enables global read-only maintenance mode')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- ==============================================================
-- 7. HELPER FUNCTIONS & RPC ACTIONS
-- ==============================================================

-- Helper: Check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Segment Resolver: Get all users matching a specified segment
CREATE OR REPLACE FUNCTION public.get_users_matching_segment(p_segment TEXT)
RETURNS TABLE (user_id UUID, email TEXT) AS $$
BEGIN
    CASE p_segment
        WHEN 'all' THEN
            RETURN QUERY SELECT u.id, u.email FROM auth.users u;
        WHEN 'new' THEN
            RETURN QUERY SELECT u.id, u.email FROM auth.users u WHERE u.created_at >= NOW() - INTERVAL '7 days';
        WHEN 'active' THEN
            RETURN QUERY SELECT DISTINCT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.focus_sessions s ON s.user_id = u.id 
                         WHERE s.start_time >= NOW() - INTERVAL '7 days';
        WHEN 'inactive' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         WHERE u.id NOT IN (
                             SELECT DISTINCT s.user_id FROM public.focus_sessions s WHERE s.start_time >= NOW() - INTERVAL '7 days'
                         );
        WHEN 'premium' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.profiles p ON p.id = u.id 
                         WHERE p.is_premium = TRUE;
        WHEN 'beta' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.profiles p ON p.id = u.id 
                         WHERE p.is_beta = TRUE;
        ELSE
            -- Default back to all users
            RETURN QUERY SELECT u.id, u.email FROM auth.users u;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retrieve active user notifications
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
                -- If it's a direct notification (user_id IS NOT NULL), look up in notifications.is_read or interactions
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
                AND auth.uid() IN (SELECT matching.user_id FROM public.get_users_matching_segment(n.target_segment) matching)
            )
        )
    ORDER BY n.scheduled_for DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read (record view interaction)
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notification_interactions (notification_id, user_id, is_viewed)
    VALUES (p_notification_id, auth.uid(), TRUE)
    ON CONFLICT (user_id, notification_id) 
    DO UPDATE SET is_viewed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all active user notifications as read
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
                AND auth.uid() IN (SELECT matching.user_id FROM public.get_users_matching_segment(n.target_segment) matching)
            )
        )
    ON CONFLICT (user_id, notification_id)
    DO UPDATE SET is_viewed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track CTA click interactions
CREATE OR REPLACE FUNCTION public.record_notification_interaction(
    p_notification_id UUID, 
    p_is_viewed BOOLEAN, 
    p_is_clicked BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notification_interactions (notification_id, user_id, is_viewed, is_clicked, interacted_at)
    VALUES (p_notification_id, auth.uid(), p_is_viewed, p_is_clicked, NOW())
    ON CONFLICT (user_id, notification_id) 
    DO UPDATE SET 
        is_viewed = CASE WHEN p_is_viewed THEN TRUE ELSE public.notification_interactions.is_viewed END,
        is_clicked = CASE WHEN p_is_clicked THEN TRUE ELSE public.notification_interactions.is_clicked END,
        interacted_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fetch broadcast statistics for administration analytics panel
CREATE OR REPLACE FUNCTION public.get_notification_analytics(p_notification_id UUID)
RETURNS TABLE (
    total_recipients INTEGER,
    total_views INTEGER,
    total_clicks INTEGER,
    read_rate NUMERIC,
    click_through_rate NUMERIC,
    email_sent INTEGER,
    email_delivered INTEGER,
    email_failed INTEGER
) AS $$
DECLARE
    v_target_segment TEXT;
    v_user_id UUID;
    v_recipient_count INTEGER;
    v_view_count INTEGER;
    v_click_count INTEGER;
    v_email_sent INTEGER;
    v_email_delivered INTEGER;
    v_email_failed INTEGER;
BEGIN
    -- Enforce administrative access control
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;
    
    SELECT target_segment, user_id INTO v_target_segment, v_user_id 
    FROM public.notifications WHERE id = p_notification_id;
    
    IF v_user_id IS NOT NULL THEN
        v_recipient_count := 1;
    ELSE
        SELECT COUNT(*)::integer INTO v_recipient_count 
        FROM public.get_users_matching_segment(v_target_segment);
    END IF;
    
    SELECT COUNT(*)::integer INTO v_view_count 
    FROM public.notification_interactions WHERE notification_id = p_notification_id AND is_viewed = TRUE;
    
    SELECT COUNT(*)::integer INTO v_click_count 
    FROM public.notification_interactions WHERE notification_id = p_notification_id AND is_clicked = TRUE;
    
    SELECT COUNT(*)::integer INTO v_email_sent 
    FROM public.broadcast_deliveries WHERE notification_id = p_notification_id AND status = 'sent';
    
    SELECT COUNT(*)::integer INTO v_email_delivered 
    FROM public.broadcast_deliveries WHERE notification_id = p_notification_id AND status = 'delivered';
    
    SELECT COUNT(*)::integer INTO v_email_failed 
    FROM public.broadcast_deliveries WHERE notification_id = p_notification_id AND status = 'failed';
    
    RETURN QUERY
    SELECT 
        v_recipient_count,
        v_view_count,
        v_click_count,
        ROUND(COALESCE((v_view_count::numeric / NULLIF(v_recipient_count, 0)) * 100, 0), 2) AS read_rate,
        ROUND(COALESCE((v_click_count::numeric / NULLIF(v_view_count, 0)) * 100, 0), 2) AS click_through_rate,
        v_email_sent,
        v_email_delivered,
        v_email_failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log actions inside admin audit trail
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action TEXT, 
    p_notification_id UUID, 
    p_metadata JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (admin_user_id, action, notification_id, metadata)
    VALUES (auth.uid(), p_action, p_notification_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automated triggers on notifications to log actions
CREATE OR REPLACE FUNCTION public.trigger_log_notification_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_metadata JSONB;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_metadata := jsonb_build_object(
            'title', NEW.title,
            'type', NEW.type,
            'target_segment', NEW.target_segment,
            'delivery_method', NEW.delivery_method,
            'scheduled_for', NEW.scheduled_for
        );
        PERFORM public.log_admin_action('Broadcast Created', NEW.id, v_metadata);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_metadata := jsonb_build_object(
            'title', NEW.title,
            'is_published', NEW.is_published,
            'scheduled_for', NEW.scheduled_for
        );
        IF OLD.is_published = FALSE AND NEW.is_published = TRUE THEN
            PERFORM public.log_admin_action('Broadcast Published', NEW.id, v_metadata);
        ELSIF OLD.is_published = TRUE AND NEW.is_published = FALSE THEN
            PERFORM public.log_admin_action('Broadcast Cancelled', NEW.id, v_metadata);
        ELSE
            PERFORM public.log_admin_action('Broadcast Updated', NEW.id, v_metadata);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_metadata := jsonb_build_object(
            'title', OLD.title,
            'type', OLD.type
        );
        PERFORM public.log_admin_action('Broadcast Deleted', OLD.id, v_metadata);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first to ensure idempotency
DROP TRIGGER IF EXISTS audit_notifications_trigger ON public.notifications;
CREATE TRIGGER audit_notifications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_log_notification_changes();

-- ==============================================================
-- 8. INDEXES FOR PERFORMANCE & HIGH CONCURRENCY
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_notifications_published_time ON public.notifications(is_published, scheduled_for, expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_segment ON public.notifications(user_id, target_segment);
CREATE INDEX IF NOT EXISTS idx_notification_interactions_lookup ON public.notification_interactions(notification_id, user_id, is_viewed, is_clicked);
CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_lookup ON public.broadcast_deliveries(notification_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- ==============================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Users can manage their own profile details" ON public.profiles;
CREATE POLICY "Users can manage their own profile details"
ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Notifications Policies
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
            AND auth.uid() IN (SELECT matching.user_id FROM public.get_users_matching_segment(target_segment) matching)
        )
    )
);

DROP POLICY IF EXISTS "Admins can manage any notifications" ON public.notifications;
CREATE POLICY "Admins can manage any notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Notification Interactions Policies
DROP POLICY IF EXISTS "Users can manage their own notification interactions" ON public.notification_interactions;
CREATE POLICY "Users can manage their own notification interactions"
ON public.notification_interactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all interactions" ON public.notification_interactions;
CREATE POLICY "Admins can view all interactions"
ON public.notification_interactions FOR SELECT TO authenticated
USING (public.is_admin());

-- Broadcast Deliveries Policies
DROP POLICY IF EXISTS "Admins can manage broadcast deliveries logs" ON public.broadcast_deliveries;
CREATE POLICY "Admins can manage broadcast deliveries logs"
ON public.broadcast_deliveries FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

-- Feature Flags Policies
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON public.feature_flags;
CREATE POLICY "Feature flags are readable by authenticated users"
ON public.feature_flags FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================
-- 10. REAL-TIME SUBSCRIPTION HOOK
-- ==============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;
