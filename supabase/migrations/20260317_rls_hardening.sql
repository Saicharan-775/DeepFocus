-- ==============================================================
-- DeepFocus — Production RLS Security Migration
-- 20260317_rls_hardening.sql
--
-- PURPOSE: Comprehensive Row Level Security hardening for all
-- tables. Safe to run on an existing database — uses
-- CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
-- and CREATE OR REPLACE for idempotent execution.
--
-- TABLES COVERED:
--   1. revision_problems
--   2. extension_connections
--   3. focus_sessions
--   4. focus_violations
-- ==============================================================


-- ==============================================================
-- ██████╗ ██████╗ ██████╗ ██████╗
-- ██╔══██╗██╔══██╗██╔════╝██╔══██╗
-- ██████╔╝██████╔╝█████╗  ██████╔╝
-- ██╔═══╝ ██╔══██╗██╔══╝  ██╔═══╝
-- ██║     ██║  ██║███████╗██║
-- ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝
-- PREREQUISITES
-- ==============================================================

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==============================================================
-- SECTION 1 — ENSURE TABLES EXIST (idempotent)
-- ==============================================================
-- These CREATE TABLE IF NOT EXISTS statements are safe on an
-- existing DB — they only create tables that are missing.

-- 1a. revision_problems
-- Real schema (from live migration 20260316131355):
--   id, user_id, title, link, difficulty, focus_status,
--   focus_score, switches, created_at, notes, revision_needed
CREATE TABLE IF NOT EXISTS revision_problems (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title          TEXT NOT NULL,
    link           TEXT NOT NULL,
    difficulty     TEXT NOT NULL,
    focus_status   TEXT NOT NULL,
    focus_score    INTEGER NOT NULL DEFAULT 0,
    switches       INTEGER NOT NULL DEFAULT 0,
    notes          TEXT,
    revision_needed BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, link)  -- prevent duplicate problems per user
);

-- 1b. extension_connections
-- Real schema (from live migration 20260316174650):
--   id, user_id (unique), token_hash, created_at, last_used
CREATE TABLE IF NOT EXISTS extension_connections (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used  TIMESTAMP WITH TIME ZONE
);

-- 1c. focus_sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    problem_title    TEXT NOT NULL,
    problem_url      TEXT NOT NULL,
    platform         TEXT NOT NULL DEFAULT 'leetcode',
    start_time       TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    end_time         TIMESTAMP WITH TIME ZONE,
    focus_duration   INTEGER DEFAULT 0,
    status           TEXT CHECK (status IN ('completed', 'abandoned', 'active')) DEFAULT 'active',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1d. focus_violations
CREATE TABLE IF NOT EXISTS focus_violations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID REFERENCES focus_sessions(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL CHECK (
        violation_type IN ('tab_switch', 'opened_solution', 'manual_stop', 'paste_attempt')
    ),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- ==============================================================
-- SECTION 2 — INDEXES
-- Fast lookups per-user and per-session. Essential for 100k+ users.
-- ==============================================================

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_id
    ON revision_problems(user_id);

CREATE INDEX IF NOT EXISTS idx_revision_problems_link
    ON revision_problems(link);

CREATE INDEX IF NOT EXISTS idx_extension_connections_user_id
    ON extension_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_extension_connections_token_hash
    ON extension_connections(token_hash);  -- focus-event Edge Function hot path

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id
    ON focus_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_problem_url
    ON focus_sessions(problem_url);

CREATE INDEX IF NOT EXISTS idx_focus_violations_session_id
    ON focus_violations(session_id);


-- ==============================================================
-- SECTION 3 — ENABLE RLS ON ALL TABLES
-- When RLS is enabled with no policies, ALL access is denied
-- by default. Policies below explicitly grant what is allowed.
-- ==============================================================

ALTER TABLE revision_problems     ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_violations      ENABLE ROW LEVEL SECURITY;

-- Enforce RLS even for table owners (prevents accidental bypass)
ALTER TABLE revision_problems     FORCE ROW LEVEL SECURITY;
ALTER TABLE extension_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions        FORCE ROW LEVEL SECURITY;
ALTER TABLE focus_violations      FORCE ROW LEVEL SECURITY;


-- ==============================================================
-- SECTION 4 — CLEAN SLATE: Drop all existing policies first
-- This ensures no stale or duplicate policies remain.
-- ==============================================================

-- revision_problems
DROP POLICY IF EXISTS "Users can select their own problems"        ON revision_problems;
DROP POLICY IF EXISTS "Users can insert their own problems"        ON revision_problems;
DROP POLICY IF EXISTS "Users can update their own problems"        ON revision_problems;
DROP POLICY IF EXISTS "Users can delete their own problems"        ON revision_problems;
DROP POLICY IF EXISTS "Users can manage their own revision problems" ON revision_problems;

-- extension_connections
DROP POLICY IF EXISTS "Users can view their own connections"       ON extension_connections;
DROP POLICY IF EXISTS "Users can insert their own connections"     ON extension_connections;
DROP POLICY IF EXISTS "Users can delete their own connections"     ON extension_connections;
DROP POLICY IF EXISTS "Users can read own connections"             ON extension_connections;
DROP POLICY IF EXISTS "Users can manage their own connections"     ON extension_connections;

-- focus_sessions
DROP POLICY IF EXISTS "Users can manage their own sessions"        ON focus_sessions;
DROP POLICY IF EXISTS "Users can select their own sessions"        ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions"        ON focus_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions"        ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions"        ON focus_sessions;

-- focus_violations
DROP POLICY IF EXISTS "Users can view violations of their sessions" ON focus_violations;
DROP POLICY IF EXISTS "Users can insert violations for their sessions" ON focus_violations;


-- ==============================================================
-- SECTION 5 — REVISION_PROBLEMS POLICIES
--
-- Security model:
--   • Only authenticated users can access this table
--   • Users can only see/edit rows where user_id = their own UID
--   • auth.uid() IS NOT NULL guarantees no anonymous access
--   • WITH CHECK on INSERT/UPDATE prevents a user from writing
--     a row with someone else's user_id
-- ==============================================================

-- SELECT: user can only read their own problems
CREATE POLICY "rls_revision_problems_select"
ON revision_problems
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

-- INSERT: user can only insert rows for themselves
-- (WITH CHECK prevents user_id spoofing)
CREATE POLICY "rls_revision_problems_insert"
ON revision_problems
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

-- UPDATE: user can only update their own rows
-- Both USING (which rows are visible to update) and
-- WITH CHECK (what the row can become after update) are enforced
CREATE POLICY "rls_revision_problems_update"
ON revision_problems
FOR UPDATE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
)
WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

-- DELETE: user can only delete their own rows
CREATE POLICY "rls_revision_problems_delete"
ON revision_problems
FOR DELETE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);


-- ==============================================================
-- SECTION 6 — EXTENSION_CONNECTIONS POLICIES
--
-- Security model:
--   • SELECT: authenticated user can read their own row
--     (to check if extension is linked — used in Revision.jsx)
--   • INSERT: BLOCKED for anon client — handled by Edge Function
--     (upsert_extension_token RPC with SECURITY DEFINER)
--   • UPDATE: BLOCKED for anon client — handled by Edge Function
--   • DELETE: user can remove their own connection
--
-- WHY insert/update is blocked on frontend:
--   The token_hash must never be set by untrusted client code.
--   The create-extension-token Edge Function or the
--   upsert_extension_token DB function (SECURITY DEFINER) handles
--   all writes using the service_role key.
-- ==============================================================

-- SELECT: user can check their own connection status
CREATE POLICY "rls_extension_connections_select"
ON extension_connections
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

-- DELETE: user can disconnect (clear their token)
CREATE POLICY "rls_extension_connections_delete"
ON extension_connections
FOR DELETE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

-- NOTE: No INSERT or UPDATE policy for the anon/authenticated role.
-- All writes to extension_connections go through:
--   a) The upsert_extension_token() SECURITY DEFINER function (see Section 8)
--   b) The focus-event Edge Function (service_role key)
-- This means even if the anon key leaks, nobody can plant a
-- token_hash for someone else's account.


-- ==============================================================
-- SECTION 7 — FOCUS_SESSIONS POLICIES
--
-- Security model:
--   • Full CRUD but strictly scoped to own user_id
--   • auth.uid() IS NOT NULL on every policy
-- ==============================================================

CREATE POLICY "rls_focus_sessions_select"
ON focus_sessions
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

CREATE POLICY "rls_focus_sessions_insert"
ON focus_sessions
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

CREATE POLICY "rls_focus_sessions_update"
ON focus_sessions
FOR UPDATE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
)
WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);

CREATE POLICY "rls_focus_sessions_delete"
ON focus_sessions
FOR DELETE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
);


-- ==============================================================
-- SECTION 8 — FOCUS_VIOLATIONS POLICIES
--
-- Security model:
--   • Access to violations is gated on SESSION OWNERSHIP
--   • A user cannot see or insert violations for sessions
--     they do not own — even if they know the session_id UUID
--   • The EXISTS subquery performs the ownership check in one
--     round-trip, fully within the DB (no client-side check needed)
--
-- WHY no direct user_id on this table:
--   focus_violations only has session_id (FK to focus_sessions).
--   We enforce ownership by joining through focus_sessions and
--   checking that focus_sessions.user_id = auth.uid().
-- ==============================================================

-- SELECT: can only view violations for own sessions
CREATE POLICY "rls_focus_violations_select"
ON focus_violations
FOR SELECT
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM focus_sessions
        WHERE focus_sessions.id = focus_violations.session_id
          AND focus_sessions.user_id = auth.uid()
    )
);

-- INSERT: can only insert violations linked to own sessions
CREATE POLICY "rls_focus_violations_insert"
ON focus_violations
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM focus_sessions
        WHERE focus_sessions.id = focus_violations.session_id
          AND focus_sessions.user_id = auth.uid()
    )
);

-- DELETE: can only delete violations from own sessions
CREATE POLICY "rls_focus_violations_delete"
ON focus_violations
FOR DELETE
TO authenticated
USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM focus_sessions
        WHERE focus_sessions.id = focus_violations.session_id
          AND focus_sessions.user_id = auth.uid()
    )
);


-- ==============================================================
-- SECTION 9 — SECURITY DEFINER FUNCTIONS
--
-- upsert_extension_token() runs with the privileges of the
-- function owner (postgres), not the calling user. This is the
-- ONLY safe way to write to extension_connections from the
-- frontend anon client WITHOUT giving the anon role INSERT/UPDATE
-- permissions on the table directly.
--
-- Security guarantees:
--   1. The function reads auth.uid() internally — the caller
--      cannot forge a different user_id
--   2. The anon/authenticated role has no INSERT/UPDATE policy,
--      so direct table writes are impossible
--   3. The function is marked SECURITY DEFINER + search_path=''
--      to prevent privilege escalation via schema hijacking
-- ==============================================================

CREATE OR REPLACE FUNCTION upsert_extension_token(p_token_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Prevent search_path hijacking attacks
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Get the authenticated user's UID (cannot be forged by caller)
  v_uid := auth.uid();

  -- Reject if not authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Reject empty or suspiciously short hashes
  IF p_token_hash IS NULL OR length(p_token_hash) < 64 THEN
    RAISE EXCEPTION 'Invalid token hash';
  END IF;

  -- Upsert: one token per user, update on conflict
  INSERT INTO public.extension_connections (user_id, token_hash, created_at)
  VALUES (v_uid, p_token_hash, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    created_at = NOW(),
    last_used  = NULL;  -- Reset last_used on new token
END;
$$;

-- Grant execute only to authenticated users (not anon)
REVOKE ALL ON FUNCTION upsert_extension_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_extension_token(TEXT) TO authenticated;


-- ==============================================================
-- SECTION 10 — COLUMN-LEVEL CONSTRAINTS
-- Extra database-level validation that rejects bad data even if
-- application-level validation is bypassed.
-- ==============================================================

-- revision_problems: ensure focus_score is within valid range
ALTER TABLE revision_problems
    DROP CONSTRAINT IF EXISTS chk_focus_score_range;
ALTER TABLE revision_problems
    ADD CONSTRAINT chk_focus_score_range
    CHECK (focus_score >= 0 AND focus_score <= 100);

-- revision_problems: ensure switches is non-negative
ALTER TABLE revision_problems
    DROP CONSTRAINT IF EXISTS chk_switches_non_negative;
ALTER TABLE revision_problems
    ADD CONSTRAINT chk_switches_non_negative
    CHECK (switches >= 0);

-- revision_problems: valid difficulty values
ALTER TABLE revision_problems
    DROP CONSTRAINT IF EXISTS chk_difficulty_values;
ALTER TABLE revision_problems
    ADD CONSTRAINT chk_difficulty_values
    CHECK (difficulty IN ('Easy', 'Medium', 'Hard'));

-- revision_problems: valid focus_status values
ALTER TABLE revision_problems
    DROP CONSTRAINT IF EXISTS chk_focus_status_values;
ALTER TABLE revision_problems
    ADD CONSTRAINT chk_focus_status_values
    CHECK (focus_status IN ('Cheated', 'Give Up', 'Low Focus', 'Focus Kept'));

-- extension_connections: token_hash must look like a SHA-256 hex string (64 chars)
ALTER TABLE extension_connections
    DROP CONSTRAINT IF EXISTS chk_token_hash_format;
ALTER TABLE extension_connections
    ADD CONSTRAINT chk_token_hash_format
    CHECK (length(token_hash) = 64 AND token_hash ~ '^[0-9a-f]+$');


-- ==============================================================
-- SECTION 11 — TABLE COMMENTS (documentation in DB)
-- ==============================================================

COMMENT ON TABLE revision_problems IS
    'Problems flagged for revision by the user. User-isolated via RLS.';

COMMENT ON TABLE extension_connections IS
    'Hashed connection tokens linking the Chrome Extension to a user account. '
    'Writes go through upsert_extension_token() SECURITY DEFINER function only.';

COMMENT ON TABLE focus_sessions IS
    'Records of individual LeetCode focus periods. User-isolated via RLS.';

COMMENT ON TABLE focus_violations IS
    'Cheating/distraction events per session. Access gated through session ownership.';

COMMENT ON FUNCTION upsert_extension_token(TEXT) IS
    'SECURITY DEFINER function that safely writes a hashed extension token for '
    'the currently authenticated user. Bypasses RLS safely by reading auth.uid() '
    'internally — the caller cannot forge a different user_id.';
