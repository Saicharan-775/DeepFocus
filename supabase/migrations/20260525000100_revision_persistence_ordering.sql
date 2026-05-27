-- DeepFocus: make revision persistence idempotent and sortable by latest activity.
-- Existing problems are refreshed instead of duplicated, and refreshed rows move
-- to the top of revision views via updated_at.

ALTER TABLE public.revision_problems
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.revision_problems
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.revision_problems
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.revision_problems
  DROP CONSTRAINT IF EXISTS chk_focus_status_values;

ALTER TABLE public.revision_problems
  ADD CONSTRAINT chk_focus_status_values
  CHECK (focus_status IN ('Cheated', 'Give Up', 'Low Focus', 'Focus Kept', 'Unattempted')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_updated_at
  ON public.revision_problems(user_id, updated_at DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_revision_problem_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revision_problems_updated_at ON public.revision_problems;
CREATE TRIGGER trg_revision_problems_updated_at
BEFORE UPDATE ON public.revision_problems
FOR EACH ROW
EXECUTE FUNCTION public.set_revision_problem_updated_at();

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
BEGIN
  SELECT user_id INTO v_uid
  FROM public.extension_connections
  WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
    AND expires_at > NOW();

  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

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
    p_link,
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

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_focus_event(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

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
  v_next_notes TEXT;
BEGIN
  SELECT user_id INTO v_uid
  FROM public.extension_connections
  WHERE token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
    AND expires_at > NOW();

  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  SELECT notes INTO v_existing_notes
  FROM public.revision_problems
  WHERE user_id = v_uid AND link = p_link;

  IF v_existing_notes IS NOT NULL AND position(p_summary in v_existing_notes) > 0 THEN
    UPDATE public.revision_problems
    SET title = COALESCE(NULLIF(btrim(p_title), ''), title),
        difficulty = COALESCE(NULLIF(btrim(p_difficulty), ''), difficulty),
        code = COALESCE(NULLIF(p_code, ''), code),
        revision_needed = TRUE,
        updated_at = NOW()
    WHERE user_id = v_uid AND link = p_link;

    RETURN json_build_object('success', true, 'message', 'Summary already attached');
  END IF;

  IF v_existing_notes IS NULL OR btrim(v_existing_notes) = '' THEN
    v_next_notes := E'### AI Summary\n' || p_summary;
  ELSE
    v_next_notes := v_existing_notes || E'\n\n### AI Summary\n' || p_summary;
  END IF;

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
    p_link,
    COALESCE(NULLIF(btrim(p_difficulty), ''), 'Medium'),
    v_next_notes,
    'Unattempted',
    0,
    0,
    0,
    TRUE,
    p_code,
    NOW()
  )
  ON CONFLICT (user_id, link) DO UPDATE
  SET title = COALESCE(NULLIF(btrim(EXCLUDED.title), ''), public.revision_problems.title),
      difficulty = COALESCE(NULLIF(btrim(EXCLUDED.difficulty), ''), public.revision_problems.difficulty),
      notes = v_next_notes,
      code = COALESCE(NULLIF(EXCLUDED.code, ''), public.revision_problems.code),
      revision_needed = TRUE,
      updated_at = NOW();

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.append_ai_summary(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
