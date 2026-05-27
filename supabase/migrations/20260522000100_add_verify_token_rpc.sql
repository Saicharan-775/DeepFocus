-- ==============================================================
-- DeepFocus: verify_extension_token RPC
-- Lightweight read-only token verification for the popup UI.
-- Does NOT write any data — purely checks if the token is valid
-- and not expired.
-- ==============================================================

CREATE OR REPLACE FUNCTION public.verify_extension_token(
    p_raw_token TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
BEGIN
    -- Hash the raw token and check against stored hashes
    SELECT user_id INTO v_uid
    FROM public.extension_connections
    WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
      AND expires_at > NOW();

    IF v_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

-- Grant to anon so the Chrome Extension (which uses the anon key) can call it
GRANT EXECUTE ON FUNCTION public.verify_extension_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_extension_token(TEXT) TO authenticated;