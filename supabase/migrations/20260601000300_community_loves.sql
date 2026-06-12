-- Separate "love" reactions from upvotes for community discussions.

ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS loves_count INTEGER NOT NULL DEFAULT 0 CHECK (loves_count >= 0);

CREATE TABLE IF NOT EXISTS community_post_loves (
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_loves_user ON community_post_loves(user_id);

CREATE OR REPLACE FUNCTION refresh_community_post_love_count()
RETURNS TRIGGER AS $$
DECLARE
    target_post_id UUID;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    UPDATE community_posts
    SET loves_count = (
        SELECT COUNT(*)::INTEGER
        FROM community_post_loves
        WHERE post_id = target_post_id
    )
    WHERE id = target_post_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS refresh_community_post_love_count_insert ON community_post_loves;
CREATE TRIGGER refresh_community_post_love_count_insert
AFTER INSERT ON community_post_loves
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_love_count();

DROP TRIGGER IF EXISTS refresh_community_post_love_count_delete ON community_post_loves;
CREATE TRIGGER refresh_community_post_love_count_delete
AFTER DELETE ON community_post_loves
FOR EACH ROW EXECUTE FUNCTION refresh_community_post_love_count();

ALTER TABLE community_post_loves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read community loves" ON community_post_loves;
DROP POLICY IF EXISTS "Users can manage their own community loves" ON community_post_loves;

CREATE POLICY "Authenticated users can read community loves"
ON community_post_loves FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own community loves"
ON community_post_loves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'community_post_loves'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE community_post_loves;
    END IF;
END $$;
