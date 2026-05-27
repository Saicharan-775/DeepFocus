-- ==============================================================
-- DeepFocus: Fix COALESCE parameter ordering for metadata updates
-- ==============================================================

-- 1. Recreate sync_focus_event with correct COALESCE parameter order
CREATE OR REPLACE FUNCTION public.sync_focus_event(
    p_raw_token TEXT,
    p_title TEXT,
    p_link TEXT,
    p_difficulty TEXT,
    p_status TEXT,
    p_score INTEGER,
    p_switches INTEGER,
    p_duration INTEGER,
    p_code TEXT DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_exists BOOLEAN;
    v_existing_code TEXT;
BEGIN
    -- Validate token and get user_id (using fully-qualified extensions.digest)
    SELECT user_id INTO v_uid
    FROM public.extension_connections
    WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
      AND expires_at > NOW();

    IF v_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- Check if the problem row already exists for this user and link
    SELECT EXISTS (
        SELECT 1 FROM public.revision_problems
        WHERE user_id = v_uid AND link = p_link
    ) INTO v_exists;

    IF v_exists THEN
        -- Fetch existing code
        SELECT code INTO v_existing_code
        FROM public.revision_problems
        WHERE user_id = v_uid AND link = p_link;

        -- Update stats, conserving code if no new code is passed
        UPDATE public.revision_problems
        SET focus_status = p_status,
            focus_score = p_score,
            switches = p_switches,
            focus_duration = p_duration,
            difficulty = COALESCE(p_difficulty, difficulty),
            title = COALESCE(p_title, title),
            code = COALESCE(p_code, v_existing_code),
            revision_needed = TRUE
        WHERE user_id = v_uid AND link = p_link;
    ELSE
        -- Insert new row
        INSERT INTO public.revision_problems (
            user_id, title, link, difficulty, notes, focus_status, focus_score, switches, focus_duration, revision_needed, code
        ) VALUES (
            v_uid,
            COALESCE(p_title, 'Unknown Problem'),
            p_link,
            COALESCE(p_difficulty, 'Medium'),
            '',
            p_status,
            p_score,
            p_switches,
            p_duration,
            TRUE,
            p_code
        );
    END IF;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;


-- 2. Recreate append_ai_summary to update title/difficulty when available
CREATE OR REPLACE FUNCTION public.append_ai_summary(
    p_raw_token TEXT,
    p_link TEXT,
    p_summary TEXT,
    p_title TEXT DEFAULT NULL,
    p_difficulty TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL
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
    -- Validate token and get user_id (using fully-qualified extensions.digest)
    SELECT user_id INTO v_uid
    FROM public.extension_connections
    WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
      AND expires_at > NOW();

    IF v_uid IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
    END IF;

    -- Check if the problem row already exists for this user and link
    SELECT EXISTS (
        SELECT 1 FROM public.revision_problems
        WHERE user_id = v_uid AND link = p_link
    ) INTO v_exists;

    -- If it doesn't exist, insert it (upsert)
    IF NOT v_exists THEN
        INSERT INTO public.revision_problems (
            user_id, title, link, difficulty, notes, focus_status, focus_score, switches, focus_duration, revision_needed, code
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
            TRUE,
            p_code
        );
        RETURN json_build_object('success', true, 'message', 'Created new problem, saved summary and code');
    END IF;

    -- If it does exist, fetch existing notes and append the new summary
    SELECT notes INTO v_existing_notes
    FROM public.revision_problems
    WHERE user_id = v_uid AND link = p_link;

    IF v_existing_notes IS NULL OR btrim(v_existing_notes) = '' THEN
        v_existing_notes := E'### AI Summary\n' || p_summary;
    ELSE
        -- Prevent duplicate appends of the exact same summary
        IF position(p_summary in v_existing_notes) > 0 THEN
            -- Still update code/metadata even if summary already exists
            UPDATE public.revision_problems
            SET code = COALESCE(p_code, code),
                title = COALESCE(p_title, title),
                difficulty = COALESCE(p_difficulty, difficulty)
            WHERE user_id = v_uid AND link = p_link;
            
            RETURN json_build_object('success', true, 'message', 'Already exists, metadata updated');
        END IF;
        v_existing_notes := v_existing_notes || E'\n\n### AI Summary\n' || p_summary;
    END IF;

    -- Update the record with new summary, code, and metadata
    UPDATE public.revision_problems
    SET notes = v_existing_notes,
        code = COALESCE(p_code, code),
        title = COALESCE(p_title, title),
        difficulty = COALESCE(p_difficulty, difficulty)
    WHERE user_id = v_uid AND link = p_link;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
