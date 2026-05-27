-- ==============================================================
-- DeepFocus: Update RPC to support upsert for AI Summary
-- Resolves race conditions on new problem attempts
-- ==============================================================

-- Drop the old 3-parameter function to avoid conflicts
DROP FUNCTION IF EXISTS append_ai_summary(TEXT, TEXT, TEXT);

-- Create the updated 5-parameter function with default parameters
CREATE OR REPLACE FUNCTION append_ai_summary(
    p_raw_token TEXT,
    p_link TEXT,
    p_summary TEXT,
    p_title TEXT DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_existing_notes TEXT;
    v_exists BOOLEAN;
BEGIN
    -- 1. Validate token and get user_id
    SELECT user_id INTO v_uid
    FROM public.extension_connections
    WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
      AND expires_at > NOW();

    IF v_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- 2. Check if the problem row already exists for this user and link
    SELECT EXISTS (
        SELECT 1 FROM public.revision_problems
        WHERE user_id = v_uid AND link = p_link
    ) INTO v_exists;

    -- 3. If it doesn't exist, insert it (upsert)
    IF NOT v_exists THEN
        INSERT INTO public.revision_problems (
            user_id, title, link, difficulty, notes, focus_status, focus_score, switches, focus_duration, revision_needed
        ) VALUES (
            v_uid,
            COALESCE(p_title, 'Unknown Problem'),
            p_link,
            COALESCE(p_difficulty, 'Medium'),
            E'### AI Summary\n' || p_summary,
            'Unattempted',
            0,
            0,
            0,
            TRUE
        );
        RETURN json_build_object('success', true, 'message', 'Created new problem and saved summary');
    END IF;

    -- 4. If it does exist, fetch existing notes and append the new summary
    SELECT notes INTO v_existing_notes
    FROM public.revision_problems
    WHERE user_id = v_uid AND link = p_link;

    IF v_existing_notes IS NULL OR btrim(v_existing_notes) = '' THEN
        v_existing_notes := E'### AI Summary\n' || p_summary;
    ELSE
        -- Prevent duplicate appends of the exact same summary
        IF position(p_summary in v_existing_notes) > 0 THEN
            RETURN json_build_object('success', true, 'message', 'Already exists');
        END IF;
        v_existing_notes := v_existing_notes || E'\n\n### AI Summary\n' || p_summary;
    END IF;

    -- 5. Update the record
    UPDATE public.revision_problems
    SET notes = v_existing_notes
    WHERE user_id = v_uid AND link = p_link;

    RETURN json_build_object('success', true);
END;
$$;

-- Grant permissions for execution
REVOKE ALL ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
