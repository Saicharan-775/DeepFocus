-- DeepFocus Community: public discussion feed with realtime updates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'DeepFocus member',
    author_avatar TEXT,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 4 AND 140),
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 8 AND 5000),
    tag TEXT NOT NULL DEFAULT 'Experience',
    mood TEXT NOT NULL DEFAULT 'Focused',
    problem_title TEXT,
    problem_url TEXT,
    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'DeepFocus member',
    author_avatar TEXT,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_post_votes (
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_tag ON community_posts(tag);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created_at ON community_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_community_votes_user ON community_post_votes(user_id);

CREATE OR REPLACE FUNCTION set_community_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_community_posts_updated_at ON community_posts;
CREATE TRIGGER set_community_posts_updated_at
BEFORE UPDATE ON community_posts
FOR EACH ROW EXECUTE FUNCTION set_community_updated_at();

DROP TRIGGER IF EXISTS set_community_comments_updated_at ON community_comments;
CREATE TRIGGER set_community_comments_updated_at
BEFORE UPDATE ON community_comments
FOR EACH ROW EXECUTE FUNCTION set_community_updated_at();

CREATE OR REPLACE FUNCTION refresh_community_post_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    target_post_id UUID;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    UPDATE community_posts
    SET comments_count = (
        SELECT COUNT(*)::INTEGER
        FROM community_comments
        WHERE post_id = target_post_id
    )
    WHERE id = target_post_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_community_post_vote_count()
RETURNS TRIGGER AS $$
DECLARE
    target_post_id UUID;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    UPDATE community_posts
    SET upvotes_count = (
        SELECT COUNT(*)::INTEGER
        FROM community_post_votes
        WHERE post_id = target_post_id
    )
    WHERE id = target_post_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS refresh_community_post_comment_count_insert ON community_comments;
CREATE TRIGGER refresh_community_post_comment_count_insert
AFTER INSERT ON community_comments
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_comment_count();

DROP TRIGGER IF EXISTS refresh_community_post_comment_count_delete ON community_comments;
CREATE TRIGGER refresh_community_post_comment_count_delete
AFTER DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_comment_count();

DROP TRIGGER IF EXISTS refresh_community_post_vote_count_insert ON community_post_votes;
CREATE TRIGGER refresh_community_post_vote_count_insert
AFTER INSERT ON community_post_votes
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_vote_count();

DROP TRIGGER IF EXISTS refresh_community_post_vote_count_delete ON community_post_votes;
CREATE TRIGGER refresh_community_post_vote_count_delete
AFTER DELETE ON community_post_votes
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_vote_count();

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read community posts" ON community_posts;
DROP POLICY IF EXISTS "Authenticated users can create community posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own community posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own community posts" ON community_posts;

CREATE POLICY "Authenticated users can read community posts"
ON community_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create community posts"
ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own community posts"
ON community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own community posts"
ON community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read community comments" ON community_comments;
DROP POLICY IF EXISTS "Authenticated users can create community comments" ON community_comments;
DROP POLICY IF EXISTS "Users can update their own community comments" ON community_comments;
DROP POLICY IF EXISTS "Users can delete their own community comments" ON community_comments;

CREATE POLICY "Authenticated users can read community comments"
ON community_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create community comments"
ON community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own community comments"
ON community_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own community comments"
ON community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read community votes" ON community_post_votes;
DROP POLICY IF EXISTS "Users can manage their own community votes" ON community_post_votes;

CREATE POLICY "Authenticated users can read community votes"
ON community_post_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own community votes"
ON community_post_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'community_posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'community_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE community_comments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'community_post_votes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE community_post_votes;
    END IF;
END $$;
