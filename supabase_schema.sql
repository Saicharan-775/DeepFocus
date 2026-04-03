-- ==============================================================
-- DeepFocus: Production-Ready Supabase Schema
-- Optimized for 100k+ Users | Scalable & Secure
-- ==============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================
-- 1. EXTENSION CONNECTIONS
-- ==============================================================
CREATE TABLE IF NOT EXISTS extension_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT UNIQUE NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_connection UNIQUE(user_id)
);

-- Ensure correct columns exist (in case table was old)
ALTER TABLE extension_connections ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE extension_connections ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- ==============================================================
-- 2. FOCUS SESSIONS
-- ==============================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    problem_title TEXT NOT NULL,
    problem_url TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'leetcode',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    focus_duration INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('completed', 'abandoned', 'active')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- 3. FOCUS VIOLATIONS
-- ==============================================================
CREATE TABLE IF NOT EXISTS focus_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES focus_sessions(id) ON DELETE CASCADE NOT NULL,
    violation_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ==============================================================
-- 4. REVISION PROBLEMS
-- ==============================================================
CREATE TABLE IF NOT EXISTS revision_problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    difficulty TEXT,
    notes TEXT DEFAULT '',
    focus_status TEXT, 
    focus_score INTEGER DEFAULT 0,
    switches INTEGER DEFAULT 0,
    focus_duration INTEGER DEFAULT 0,
    revision_needed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_problem UNIQUE(user_id, link)
);

-- ADD COLUMNS IF MISSING (for existing tables)
ALTER TABLE revision_problems ADD COLUMN IF NOT EXISTS focus_score INTEGER DEFAULT 0;
ALTER TABLE revision_problems ADD COLUMN IF NOT EXISTS switches INTEGER DEFAULT 0;
ALTER TABLE revision_problems ADD COLUMN IF NOT EXISTS focus_duration INTEGER DEFAULT 0;
ALTER TABLE revision_problems ADD COLUMN IF NOT EXISTS revision_needed BOOLEAN DEFAULT TRUE;
ALTER TABLE revision_problems ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ==============================================================
-- 5. RPC FUNCTIONS
-- ==============================================================
CREATE OR REPLACE FUNCTION upsert_extension_token(p_token_hash TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO extension_connections (user_id, token_hash, expires_at)
    VALUES (auth.uid(), p_token_hash, now() + interval '7 days')
    ON CONFLICT (user_id) DO UPDATE 
    SET token_hash = EXCLUDED.token_hash, 
        expires_at = EXCLUDED.expires_at,
        created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================
-- 6. INDEXES
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_extension_connections_user ON extension_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_problems_user ON revision_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_violations_session ON focus_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_url ON focus_sessions(problem_url);
CREATE INDEX IF NOT EXISTS idx_revision_problems_link ON revision_problems(link);

-- ==============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_problems ENABLE ROW LEVEL SECURITY;

-- CLEAN UP OLD POLICIES TO AVOID ERRORS
DROP POLICY IF EXISTS "Users can manage their own connections" ON extension_connections;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can view violations of their sessions" ON focus_violations;
DROP POLICY IF EXISTS "Users can manage their own revision problems" ON revision_problems;

-- CREATE NEW POLICIES
CREATE POLICY "Users can manage their own connections" 
ON extension_connections FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" 
ON focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view violations of their sessions" 
ON focus_violations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM focus_sessions WHERE id = session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage their own revision problems" 
ON revision_problems FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ==============================================================
-- 8. ENABLE REALTIME
-- ==============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'revision_problems'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE revision_problems;
    END IF;
END $$;
