-- 2. Required Database Schema
CREATE TABLE IF NOT EXISTS extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  connection_token text unique not null,
  created_at timestamp with time zone default now()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_extension_connections_user on extension_connections(user_id);

-- 3. Row Level Security
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;

-- Add policies
-- Drop if exists to avoid errors on retry
DROP POLICY IF EXISTS "Users can read own connections" ON extension_connections;

create policy "Users can read own connections"
on extension_connections
for select
to authenticated
using (auth.uid() = user_id);
