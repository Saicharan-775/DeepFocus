-- Secure Extension Token Hashing Migration

-- 1. Drop the old table completely to recreate it with the new schema
DROP TABLE IF EXISTS extension_connections;

-- 2. Create the new schema with token_hash instead of raw tokens
CREATE TABLE extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  token_hash text unique not null,
  created_at timestamp with time zone default now(),
  last_used timestamp with time zone
);

-- 3. Add Index for fast lookups by token_hash (essential for focus-event Edge Function)
CREATE INDEX IF NOT EXISTS idx_extension_connections_token_hash ON extension_connections(token_hash);
CREATE INDEX IF NOT EXISTS idx_extension_connections_user_id ON extension_connections(user_id);

-- 4. Enable RLS
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can only read their own connections.
-- Insert/Update is handled exclusively by Edge Functions (Service Role)
CREATE POLICY "Users can read own connections"
ON extension_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
