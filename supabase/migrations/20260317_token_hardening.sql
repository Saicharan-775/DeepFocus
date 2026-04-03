-- ==============================================================
-- DeepFocus: Hardened Token System & Integrity Migration
-- ==============================================================

-- 1. Update extension_connections to support expiry
ALTER TABLE extension_connections 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- 2. Update revision_problems to prevent duplicate titles per user
-- We keep the UNIQUE(user_id, link) but add UNIQUE(user_id, title) as requested
ALTER TABLE revision_problems 
DROP CONSTRAINT IF EXISTS unique_user_title;

ALTER TABLE revision_problems 
ADD CONSTRAINT unique_user_title UNIQUE(user_id, title);

-- 3. Update the SECURITY DEFINER function to handle expiry
CREATE OR REPLACE FUNCTION upsert_extension_token(p_token_hash TEXT)
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
