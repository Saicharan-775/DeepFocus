-- Secure Extension Token Hashing Migration

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Create the secure schema without dropping existing production tokens.
CREATE TABLE IF NOT EXISTS extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  token_hash text unique not null,
  created_at timestamp with time zone default now(),
  last_used timestamp with time zone
);

ALTER TABLE extension_connections
  ADD COLUMN IF NOT EXISTS token_hash text;

ALTER TABLE extension_connections
  ADD COLUMN IF NOT EXISTS last_used timestamp with time zone;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extension_connections'
      AND column_name = 'connection_token'
  ) THEN
    ALTER TABLE public.extension_connections
      ALTER COLUMN connection_token DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extension_connections'
      AND column_name = 'connection_token'
  ) THEN
    EXECUTE $sql$
      UPDATE public.extension_connections
      SET token_hash = encode(extensions.digest(connection_token, 'sha256'), 'hex')
      WHERE token_hash IS NULL
        AND connection_token IS NOT NULL
    $sql$;
  END IF;
END $$;

-- 3. Add Index for fast lookups by token_hash (essential for focus-event Edge Function)
CREATE INDEX IF NOT EXISTS idx_extension_connections_token_hash ON extension_connections(token_hash);
CREATE INDEX IF NOT EXISTS idx_extension_connections_user_id ON extension_connections(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.extension_connections
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_extension_connections_user_unique
      ON public.extension_connections(user_id);
  ELSE
    RAISE NOTICE 'Skipping unique user index on extension_connections: duplicate users already exist.';
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can only read their own connections.
-- Insert/Update is handled exclusively by Edge Functions (Service Role)
DROP POLICY IF EXISTS "Users can read own connections" ON extension_connections;
CREATE POLICY "Users can read own connections"
ON extension_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
