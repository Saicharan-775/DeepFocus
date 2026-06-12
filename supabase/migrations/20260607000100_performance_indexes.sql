-- Query-path indexes for the web app's revision and community views.

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_updated_created
ON revision_problems(user_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_title
ON revision_problems(user_id, title);

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_link
ON revision_problems(user_id, link);

CREATE INDEX IF NOT EXISTS idx_revision_problems_user_revision_needed
ON revision_problems(user_id, revision_needed, updated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_start_time
ON focus_sessions(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_tag_created_at
ON community_posts(tag, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_votes_created_at
ON community_posts(upvotes_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_loves_created_at
ON community_posts(loves_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_comments_created_at
ON community_posts(comments_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_views_created_at
ON community_posts(views_count DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_votes_user_post
ON community_post_votes(user_id, post_id);

CREATE INDEX IF NOT EXISTS idx_community_loves_user_post
ON community_post_loves(user_id, post_id);
