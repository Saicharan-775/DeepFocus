import React, { useEffect, useMemo, useState } from "react";
import { ArrowUp, ChevronDown, Eye, Flame, Heart, Loader2, MessageSquare, Plus, Search, Wifi } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { CommunitySkeleton } from "../components/Boneyard";

const TAGS = ["All", "Experience", "Question", "Strategy", "Interview", "Win"];
const FEED_LIMIT = 60;
const PAGE_SIZE = 24;
const SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Most Votes", value: "top" },
  { label: "Most Liked", value: "loved" },
  { label: "Most Comments", value: "comments" },
  { label: "Most Viewed", value: "views" },
];

const tagClassName = {
  Experience: "border-white/10 bg-white/[0.04] text-neutral-300",
  Question: "border-violet-300/20 bg-violet-400/10 text-violet-200",
  Strategy: "border-sky-300/18 bg-sky-400/[0.08] text-sky-200",
  Interview: "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-200",
  Win: "border-amber-300/18 bg-amber-400/[0.08] text-amber-200",
};

function timeAgo(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  return `${Math.floor(diff / day)}d`;
}

function Tag({ value }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${tagClassName[value] || "border-white/10 bg-white/[0.04] text-neutral-400"}`}>
      {value}
    </span>
  );
}

function AuthorAvatar({ name, avatar }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatar) {
    return <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />;
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#262626] text-[10px] font-semibold text-neutral-200 ring-1 ring-white/10">
      {initials || "DF"}
    </span>
  );
}

function DiscussionRow({ post, onVote, onLove, onOpen }) {
  return (
    <article
      onClick={() => onOpen(post.id)}
      className="group cursor-pointer border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.025]"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag value={post.tag} />
            {post.problem_title && <span className="truncate text-xs text-neutral-500">{post.problem_title}</span>}
          </div>
          <h2 className="line-clamp-1 text-[15px] font-medium text-neutral-100 group-hover:text-white">
            {post.title}
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-neutral-500">{post.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <AuthorAvatar name={post.author_name} avatar={post.author_avatar} />
            <span className="text-neutral-300">{post.author_name}</span>
            <span>{timeAgo(post.created_at)} ago</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 md:justify-self-end">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onVote(post);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 transition ${
              post.has_voted
                ? "bg-violet-400/10 text-violet-200"
                : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
            }`}
          >
            <ArrowUp size={14} />
            {post.upvotes_count || 0}
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onLove(post);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 transition ${
              post.has_loved
                ? "bg-rose-500/10 text-rose-300"
                : "bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-neutral-200"
            }`}
          >
            <Heart size={14} fill={post.has_loved ? "currentColor" : "none"} />
            {post.loves_count || 0}
          </button>

          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1.5">
            <MessageSquare size={14} />
            {post.comments_count || 0}
          </span>

          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-2 py-1.5">
            <Eye size={14} />
            {post.views_count || 0}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [activeTag, setActiveTag] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [pendingVotes, setPendingVotes] = useState(new Set());
  const [pendingLoves, setPendingLoves] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hydrateReactions = async (rows) => {
    if (!rows.length || !user?.id) {
      return rows.map((post) => ({ ...post, has_voted: false, has_loved: false }));
    }

    const postIds = rows.map((post) => post.id);
    const [{ data: votes, error: voteError }, { data: loves, error: loveError }] = await Promise.all([
      supabase
      .from("community_post_votes")
      .select("post_id")
      .eq("user_id", user.id)
        .in("post_id", postIds),
      supabase
        .from("community_post_loves")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
    ]);

    if (voteError) throw voteError;
    if (loveError) throw loveError;

    const votedIds = new Set((votes || []).map((vote) => vote.post_id));
    const lovedIds = new Set((loves || []).map((love) => love.post_id));
    return rows.map((post) => ({
      ...post,
      has_voted: votedIds.has(post.id),
      has_loved: lovedIds.has(post.id),
    }));
  };

  const loadPosts = async ({ keepLoading = false } = {}) => {
    if (!keepLoading) setIsLoading(true);
    setConnectionError("");

    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id,user_id,author_name,author_avatar,title,body,tag,mood,problem_title,problem_url,upvotes_count,loves_count,comments_count,views_count,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);

      if (error) throw error;

      setPosts(await hydrateReactions(data || []));
    } catch (err) {
      console.error("Failed to load community posts:", err);
      setPosts([]);
      setConnectionError("Realtime discussions could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [user?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => loadPosts({ keepLoading: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_votes" }, () => loadPosts({ keepLoading: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_loves" }, () => loadPosts({ keepLoading: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, () => loadPosts({ keepLoading: true }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = posts.filter((post) => {
      const matchesTag = activeTag === "All" || post.tag === activeTag;
      const searchable = `${post.title} ${post.body} ${post.problem_title || ""} ${post.author_name}`.toLowerCase();
      return matchesTag && (!query || searchable.includes(query));
    });

    return [...result].sort((a, b) => {
      if (sortBy === "top") return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      if (sortBy === "loved") return (b.loves_count || 0) - (a.loves_count || 0);
      if (sortBy === "comments") return (b.comments_count || 0) - (a.comments_count || 0);
      if (sortBy === "views") return (b.views_count || 0) - (a.views_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [activeTag, posts, searchQuery, sortBy]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTag, searchQuery, sortBy]);

  const visiblePosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  const tagCounts = useMemo(() => {
    return TAGS.filter((tag) => tag !== "All").map((tag) => ({
      tag,
      count: posts.filter((post) => post.tag === tag).length,
    }));
  }, [posts]);

  const trendingPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => (
        (b.upvotes_count || 0) + (b.loves_count || 0) + (b.comments_count || 0) + Math.floor((b.views_count || 0) / 5)
      ) - (
        (a.upvotes_count || 0) + (a.loves_count || 0) + (a.comments_count || 0) + Math.floor((a.views_count || 0) / 5)
      ))
      .slice(0, 5);
  }, [posts]);

  const toggleVote = async (post) => {
    if (!user?.id || pendingVotes.has(post.id)) return;

    setPendingVotes((current) => new Set(current).add(post.id));
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              has_voted: !item.has_voted,
              upvotes_count: Math.max(0, (item.upvotes_count || 0) + (item.has_voted ? -1 : 1)),
            }
          : item
      )
    );

    try {
      if (post.has_voted) {
        const { error } = await supabase
          .from("community_post_votes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_post_votes").insert({
          post_id: post.id,
          user_id: user.id,
        });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle vote:", err);
      await loadPosts({ keepLoading: true });
    } finally {
      setPendingVotes((current) => {
        const next = new Set(current);
        next.delete(post.id);
        return next;
      });
    }
  };

  const toggleLove = async (post) => {
    if (!user?.id || pendingLoves.has(post.id)) return;

    setPendingLoves((current) => new Set(current).add(post.id));
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              has_loved: !item.has_loved,
              loves_count: Math.max(0, (item.loves_count || 0) + (item.has_loved ? -1 : 1)),
            }
          : item
      )
    );

    try {
      if (post.has_loved) {
        const { error } = await supabase
          .from("community_post_loves")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_post_loves").insert({
          post_id: post.id,
          user_id: user.id,
        });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to toggle love:", err);
      await loadPosts({ keepLoading: true });
    } finally {
      setPendingLoves((current) => {
        const next = new Set(current);
        next.delete(post.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return <CommunitySkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">Discuss</h1>
          <p className="mt-1 text-sm text-neutral-500">Ask questions, share experiences, and compare approaches.</p>
        </div>
        <Link
          to="/community/new"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          <Plus size={16} />
          New post
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111111]">
          <div className="border-b border-white/[0.08] px-4 pt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex overflow-x-auto">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                      activeTag === tag
                        ? "border-violet-300/60 text-neutral-100"
                        : "border-transparent text-neutral-500 hover:text-neutral-200"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-3 lg:pb-0">
                <div className="relative min-w-0 flex-1 sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search discussions"
                    className="h-9 w-full rounded-md border border-white/10 bg-[#0b0b0b] pl-9 pr-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
                  />
                </div>
                <label className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="h-9 appearance-none rounded-md border border-white/10 bg-[#0b0b0b] pl-3 pr-8 text-sm text-neutral-300 outline-none focus:border-violet-300/50"
                  >
                    {SORTS.map((sort) => (
                      <option key={sort.value} value={sort.value}>
                        {sort.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                </label>
              </div>
            </div>
          </div>

          {connectionError && (
            <div className="flex items-center gap-2 border-b border-yellow-400/10 bg-yellow-400/[0.04] px-4 py-2 text-xs text-yellow-200/80">
              <Wifi size={14} />
              {connectionError}
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <MessageSquare size={24} className="mb-3 text-neutral-600" />
              <p className="text-sm font-medium text-neutral-200">No discussions found</p>
              <p className="mt-1 text-sm text-neutral-500">Start the first thread or change the filters.</p>
            </div>
          ) : (
            <>
              {visiblePosts.map((post) => (
                <DiscussionRow
                  key={post.id}
                  post={post}
                  onVote={toggleVote}
                  onLove={toggleLove}
                  onOpen={(id) => navigate(`/community/post/${id}`)}
                />
              ))}
              {visibleCount < filteredPosts.length && (
                <div className="border-t border-white/[0.06] p-4 text-center">
                  <button
                    onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredPosts.length))}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-violet-300/40 hover:bg-violet-400/10"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-lg border border-white/10 bg-[#111111] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200">
              <Flame size={16} className="text-violet-300" />
              Trending
            </div>
            {trendingPosts.length === 0 ? (
              <p className="text-sm text-neutral-500">No active discussions yet.</p>
            ) : (
              <div className="space-y-3">
                {trendingPosts.map((post) => (
                  <Link key={post.id} to={`/community/post/${post.id}`} className="block rounded-md p-2 transition hover:bg-white/[0.04]">
                    <p className="line-clamp-2 text-sm font-medium text-neutral-200">{post.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {post.upvotes_count || 0} upvotes · {post.loves_count || 0} likes · {post.comments_count || 0} replies · {post.views_count || 0} views
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111111] p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-200">Tags</h3>
            <div className="space-y-1">
              {tagCounts.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => setActiveTag(item.tag)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200"
                >
                  <span>{item.tag}</span>
                  <span className="text-xs text-neutral-600">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111111] p-4">
            <h3 className="text-sm font-semibold text-neutral-200">Community Guidelines</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Be specific, include the problem context, and explain the approach that changed your thinking.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
