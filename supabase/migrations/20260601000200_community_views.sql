-- Add real view counts for community discussions.

ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0);

CREATE OR REPLACE FUNCTION increment_community_post_view(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts
    SET views_count = views_count + 1
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
