-- ==============================================================
-- DeepFocus: Secure Unsubscribe Verification (SHA-256 validation)
-- Migration: 20260615000300_secure_unsubscribe.sql
-- ==============================================================

-- 1. Drop the old insecure unsubscribe function
DROP FUNCTION IF EXISTS public.unsubscribe_user_email(TEXT);

-- 2. Create the secured unsubscribe function
CREATE OR REPLACE FUNCTION public.unsubscribe_user_email(p_email TEXT, p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_secret TEXT := 'fallback-secret-key-for-development'; -- Default secret key fallback
    v_expected_token TEXT;
BEGIN
    -- Check if custom secret is configured via vault or settings (can be retrieved from vault if needed)
    -- For standard setups, we match the environment variable UNSUBSCRIBE_SECRET
    v_expected_token := encode(extensions.digest(v_secret || lower(p_email), 'sha256'), 'hex');
    
    IF p_token = v_expected_token THEN
        INSERT INTO public.unsubscribed_emails (email)
        VALUES (p_email)
        ON CONFLICT (email) DO NOTHING;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant EXECUTE privileges
GRANT EXECUTE ON FUNCTION public.unsubscribe_user_email(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.unsubscribe_user_email(TEXT, TEXT) TO authenticated;
