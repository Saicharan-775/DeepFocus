-- ==============================================================
-- DeepFocus: Unified API & Database Integrity Fixes
-- ==============================================================

-- 1. Enforce non-nullability on user_id only when existing data is clean.
-- Never delete production rows from a migration; surface dirty data as a notice
-- so it can be reviewed separately.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.extension_connections
    WHERE user_id IS NULL
  ) THEN
    ALTER TABLE public.extension_connections ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL on extension_connections.user_id: NULL rows exist.';
  END IF;
END $$;

-- 2. Drop all overloaded/previous signatures of RPC functions to avoid PostgREST conflicts
DROP FUNCTION IF EXISTS public.append_ai_summary(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

DROP FUNCTION IF EXISTS public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT);

DROP FUNCTION IF EXISTS public.upsert_extension_token(TEXT);

-- 3. Recreate upsert_extension_token with strict authentication and inputs checks
CREATE OR REPLACE FUNCTION public.upsert_extension_token(p_token_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validation: Token hash must be exactly 64 chars hex (SHA-256)
  IF p_token_hash IS NULL OR length(p_token_hash) != 64 OR p_token_hash !~ '^[0-9a-f]+$' THEN
    RAISE EXCEPTION 'Invalid token hash format';
  END IF;

  INSERT INTO public.extension_connections (user_id, token_hash, created_at, expires_at, last_used)
  VALUES (v_uid, p_token_hash, NOW(), NOW() + INTERVAL '7 days', NULL)
  ON CONFLICT (user_id)
  DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days',
    last_used  = NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_extension_token(TEXT) TO authenticated;

-- 4. Recreate append_ai_summary (6-parameter version) with qualified extensions.digest
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
            -- Still update code even if summary already exists
            UPDATE public.revision_problems
            SET code = COALESCE(p_code, code)
            WHERE user_id = v_uid AND link = p_link;
            
            RETURN json_build_object('success', true, 'message', 'Already exists, code updated');
        END IF;
        v_existing_notes := v_existing_notes || E'\n\n### AI Summary\n' || p_summary;
    END IF;

    -- Update the record with new summary and/or code
    UPDATE public.revision_problems
    SET notes = v_existing_notes,
        code = COALESCE(p_code, code)
    WHERE user_id = v_uid AND link = p_link;

    RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. Recreate sync_focus_event (9-parameter version) with qualified extensions.digest
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
            difficulty = COALESCE(difficulty, p_difficulty),
            title = COALESCE(title, p_title),
            code = COALESCE(p_code, v_existing_code),
            revision_needed = TRUE
        WHERE user_id = v_uid AND link = p_link;
    ELSE
        -- Insert new row
        INSERT INTO public.revision_problems (
            user_id, title, link, difficulty, notes, focus_status, focus_score, switches, focus_duration, revision_needed, code
        ) VALUES (
            v_uid,
            p_title,
            p_link,
            p_difficulty,
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
