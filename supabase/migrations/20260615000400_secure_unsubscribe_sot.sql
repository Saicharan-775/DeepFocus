-- Migration: 20260615000400_secure_unsubscribe_sot.sql

-- 1. Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed default unsubscribe secret if not present
INSERT INTO public.app_settings (key, value)
VALUES ('unsubscribe_secret', 'fallback-secret-key-for-development')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Revoke default access from public, anon, and authenticated roles
REVOKE ALL ON public.app_settings FROM public, anon, authenticated;

-- Allow read/write only for service_role and postgres (implicit since no RLS policies are added)

-- 2. Drop the old signature of unsubscribe_user_email if needed
CREATE OR REPLACE FUNCTION public.unsubscribe_user_email(p_email TEXT, p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_secret TEXT;
    v_expected_token TEXT;
BEGIN
    -- Fetch secret from app_settings
    SELECT value INTO v_secret
    FROM public.app_settings
    WHERE key = 'unsubscribe_secret';

    -- Fallback to default in case it wasn't found
    IF v_secret IS NULL THEN
        v_secret := 'fallback-secret-key-for-development';
    END IF;

    -- Calculate expected token using SHA-256
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

-- Grant EXECUTE privileges to anon and authenticated
GRANT EXECUTE ON FUNCTION public.unsubscribe_user_email(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.unsubscribe_user_email(TEXT, TEXT) TO authenticated;
