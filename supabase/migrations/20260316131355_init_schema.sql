CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the revision_problems table
CREATE TABLE IF NOT EXISTS revision_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    focus_status TEXT NOT NULL,
    focus_score INTEGER NOT NULL,
    switches INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    revision_needed BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, link)
);

-- Enable Row Level Security (RLS)
ALTER TABLE revision_problems ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can select their own problems"
ON revision_problems FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own problems"
ON revision_problems FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own problems"
ON revision_problems FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own problems"
ON revision_problems FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create a table for Cross-Browser Extension Connections
CREATE TABLE IF NOT EXISTS extension_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  connection_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE extension_connections ENABLE ROW LEVEL SECURITY;

-- Create Policies for extension_connections
CREATE POLICY "Users can view their own connections"
ON extension_connections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
ON extension_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
ON extension_connections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
