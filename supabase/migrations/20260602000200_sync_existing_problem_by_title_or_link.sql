-- DeepFocus: extension solves should refresh an existing problem even when
-- older rows have a slightly different LeetCode URL format.

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
  v_link TEXT;
  v_existing_id UUID;
BEGIN
  SELECT user_id INTO v_uid
  FROM public.extension_connections
  WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
    AND expires_at > NOW();

  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  v_link := regexp_replace(
    split_part(split_part(COALESCE(p_link, ''), '?', 1), '#', 1),
    '^https?://(www\.)?leetcode\.com/problems/([^/]+).*$',
    'https://leetcode.com/problems/\2/',
    'i'
  );

  SELECT id INTO v_existing_id
  FROM public.revision_problems
  WHERE user_id = v_uid
    AND (
      regexp_replace(
        split_part(split_part(COALESCE(link, ''), '?', 1), '#', 1),
        '^https?://(www\.)?leetcode\.com/problems/([^/]+).*$',
        'https://leetcode.com/problems/\2/',
        'i'
      ) = v_link
      OR lower(btrim(title)) = lower(btrim(COALESCE(p_title, '')))
    )
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.revision_problems
    SET title = COALESCE(NULLIF(btrim(p_title), ''), title),
        link = v_link,
        difficulty = COALESCE(NULLIF(btrim(p_difficulty), ''), difficulty),
        focus_status = p_status,
        focus_score = p_score,
        switches = p_switches,
        focus_duration = COALESCE(p_duration, 0),
        revision_needed = TRUE,
        code = COALESCE(NULLIF(p_code, ''), code),
        updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.revision_problems (
      user_id,
      title,
      link,
      difficulty,
      notes,
      focus_status,
      focus_score,
      switches,
      focus_duration,
      revision_needed,
      code,
      updated_at
    ) VALUES (
      v_uid,
      COALESCE(NULLIF(btrim(p_title), ''), 'Unknown Problem'),
      v_link,
      COALESCE(NULLIF(btrim(p_difficulty), ''), 'Medium'),
      '',
      p_status,
      p_score,
      p_switches,
      COALESCE(p_duration, 0),
      TRUE,
      p_code,
      NOW()
    )
    ON CONFLICT (user_id, link) DO UPDATE
    SET title = COALESCE(NULLIF(btrim(EXCLUDED.title), ''), public.revision_problems.title),
        difficulty = COALESCE(NULLIF(btrim(EXCLUDED.difficulty), ''), public.revision_problems.difficulty),
        focus_status = EXCLUDED.focus_status,
        focus_score = EXCLUDED.focus_score,
        switches = EXCLUDED.switches,
        focus_duration = EXCLUDED.focus_duration,
        revision_needed = TRUE,
        code = COALESCE(NULLIF(EXCLUDED.code, ''), public.revision_problems.code),
        updated_at = NOW();
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
