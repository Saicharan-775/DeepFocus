-- ==============================================================
-- DeepFocus: Add RPC to append AI Summary from Extension
-- ==============================================================
CREATE OR REPLACE FUNCTION append_ai_summary(
    p_raw_token TEXT,
    p_link TEXT,
    p_summary TEXT
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_existing_notes TEXT;
BEGIN
    -- 1. Validate token and get user_id
    SELECT user_id INTO v_uid
    FROM public.extension_connections
    WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
      AND expires_at > NOW();

    IF v_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- 2. Get existing notes
    SELECT notes INTO v_existing_notes
    FROM public.revision_problems
    WHERE user_id = v_uid AND link = p_link;

    -- 3. Append summary
    IF v_existing_notes IS NULL OR btrim(v_existing_notes) = '' THEN
        v_existing_notes := E'### AI Summary\n' || p_summary;
    ELSE
        -- Prevent duplicate appends
        IF position(p_summary in v_existing_notes) > 0 THEN
            RETURN json_build_object('success', true, 'message', 'Already exists');
        END IF;
        v_existing_notes := v_existing_notes || E'\n\n### AI Summary\n' || p_summary;
    END IF;

    -- 4. Update the record
    UPDATE public.revision_problems
    SET notes = v_existing_notes
    WHERE user_id = v_uid AND link = p_link;

    RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT) TO authenticated;
