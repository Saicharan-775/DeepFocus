-- ==============================================================
-- DeepFocus: Rate Limiting & Email Deliverability Hardening
-- Migration: 20260615000100_add_email_unsub_and_rate_limiting.sql
-- ==============================================================

-- 1. UNSUBSCRIBED EMAILS TABLE
CREATE TABLE IF NOT EXISTS public.unsubscribed_emails (
    email TEXT PRIMARY KEY,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- RLS for Unsubscribe Table
ALTER TABLE public.unsubscribed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can opt-out by inserting their email" ON public.unsubscribed_emails;
CREATE POLICY "Anyone can opt-out by inserting their email"
ON public.unsubscribed_emails FOR INSERT TO anon, authenticated
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Users can view their own opt-out state" ON public.unsubscribed_emails;
CREATE POLICY "Users can view their own opt-out state"
ON public.unsubscribed_emails FOR SELECT TO authenticated
USING (email = auth.jwt() ->> 'email');

-- 2. RE-IMPLEMENT SEGMENT RESOLVER TO EXCLUDE UNSUBSCRIBED EMAILS
CREATE OR REPLACE FUNCTION public.get_users_matching_segment(p_segment TEXT)
RETURNS TABLE (user_id UUID, email TEXT) AS $$
BEGIN
    CASE p_segment
        WHEN 'all' THEN
            RETURN QUERY SELECT u.id, u.email FROM auth.users u
                         WHERE u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        WHEN 'new' THEN
            RETURN QUERY SELECT u.id, u.email FROM auth.users u 
                         WHERE u.created_at >= NOW() - INTERVAL '7 days'
                           AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        WHEN 'active' THEN
            RETURN QUERY SELECT DISTINCT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.focus_sessions s ON s.user_id = u.id 
                         WHERE s.start_time >= NOW() - INTERVAL '7 days'
                           AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        WHEN 'inactive' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         WHERE u.id NOT IN (
                             SELECT DISTINCT s.user_id FROM public.focus_sessions s WHERE s.start_time >= NOW() - INTERVAL '7 days'
                         )
                         AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        WHEN 'premium' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.profiles p ON p.id = u.id 
                         WHERE p.is_premium = TRUE
                           AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        WHEN 'beta' THEN
            RETURN QUERY SELECT u.id, u.email 
                         FROM auth.users u 
                         JOIN public.profiles p ON p.id = u.id 
                         WHERE p.is_beta = TRUE
                           AND u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
        ELSE
            -- Default back to all active subscribers
            RETURN QUERY SELECT u.id, u.email FROM auth.users u
                         WHERE u.email NOT IN (SELECT ue.email FROM public.unsubscribed_emails ue);
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ADMIN CAMPAIGN RATE LIMIT CHECKER
-- Wait, let's keep it complete and correct
CREATE OR REPLACE FUNCTION public.check_admin_rate_limit(p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_recent_count INTEGER;
BEGIN
    SELECT COUNT(*)::integer INTO v_recent_count 
    FROM public.admin_audit_logs 
    WHERE admin_user_id = p_admin_id 
      AND action = 'Broadcast Created' 
      AND created_at >= NOW() - INTERVAL '1 minute';
    
    RETURN v_recent_count < 3; -- limit to max 3 campaigns per minute
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ESTIMATE RECIPIENTS COUNT RPC
CREATE OR REPLACE FUNCTION public.get_segment_recipient_count(p_segment TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::integer INTO v_count 
    FROM public.get_users_matching_segment(p_segment);
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PUBLIC RPC TO OPT-OUT UNSUBSCRIBE
CREATE OR REPLACE FUNCTION public.unsubscribe_user_email(p_email TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.unsubscribed_emails (email)
    VALUES (p_email)
    ON CONFLICT (email) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
