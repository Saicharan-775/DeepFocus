import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, Eye, Heart, Loader2, MessageSquare, Send, Wifi } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { CommunityPostSkeleton } from "../components/Boneyard";

const tagClassName = {
  Experience: "border-white/10 bg-white/[0.04] text-neutral-300",
  Question: "border-violet-300/20 bg-violet-400/10 text-violet-200",
  Strategy: "border-sky-300/18 bg-sky-400/[0.08] text-sky-200",
  Interview: "border-emerald-300/18 bg-emerald-400/[0.08] text-emerald-200",
  Win: "border-amber-300/18 bg-amber-400/[0.08] text-amber-200",
};

function getDisplayName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || user?.email?.split("@")[0] || "DeepFocus member";
}

function getAvatar(user) {
  return user?.user_metadata?.avatar_url || null;
}

function timeAgo(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)} minutes ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
  return `${Math.floor(diff / day)} days ago`;
}

function AuthorAvatar({ name, avatar }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatar) {
    return <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />;
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#262626] text-xs font-semibold text-neutral-200 ring-1 ring-white/10">
      {initials || "DF"}
    </span>
  );
}

function Tag({ value }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${tagClassName[value] || "border-white/10 bg-white/[0.04] text-neutral-400"}`}>
      {value}
    </span>
  );
}

export default function CommunityPost() {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [reply, setReply] = useState("");
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoving, setIsLoving] = useState(false);
  const [error, setError] = useState("");

  const hydrateReactions = async (row) => {
    if (!row || !user?.id) return row ? { ...row, has_voted: false, has_loved: false } : null;

    const [{ data: vote, error: voteError }, { data: love, error: loveError }] = await Promise.all([
      supabase
        .from("community_post_votes")
        .select("post_id")
        .eq("post_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("community_post_loves")
        .select("post_id")
        .eq("post_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (voteError) throw voteError;
    if (loveError) throw loveError;
    return { ...row, has_voted: Boolean(vote), has_loved: Boolean(love) };
  };

  const loadPost = async ({ keepLoading = false } = {}) => {
    if (!postId) return;
    if (!keepLoading) setIsLoadingPost(true);
    setError("");

    try {
      const { data, error: postError } = await supabase
        .from("community_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();

      if (postError) throw postError;
      setPost(await hydrateReactions(data));
    } catch (err) {
      console.error("Failed to load community post:", err);
      setError("This discussion could not be loaded.");
    } finally {
      setIsLoadingPost(false);
    }
  };

  const loadComments = async ({ keepLoading = false } = {}) => {
    if (!postId) return;
    if (!keepLoading) setIsLoadingComments(true);

    try {
      const { data, error: commentError } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentError) throw commentError;
      setComments(data || []);
    } catch (err) {
      console.error("Failed to load community comments:", err);
      setError("Replies could not be loaded.");
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId, user?.id]);

  useEffect(() => {
    if (!postId) return;

    const viewedKey = `df_community_viewed_${postId}`;
    if (sessionStorage.getItem(viewedKey)) return;
    sessionStorage.setItem(viewedKey, "1");

    supabase.rpc("increment_community_post_view", { p_post_id: postId }).then(({ error: viewError }) => {
      if (viewError) console.error("Failed to record community post view:", viewError);
    });
  }, [postId]);

  useEffect(() => {
    if (!postId) return undefined;

    const channel = supabase
      .channel(`community-post-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts", filter: `id=eq.${postId}` }, () => {
        loadPost({ keepLoading: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_votes", filter: `post_id=eq.${postId}` }, () => {
        loadPost({ keepLoading: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_loves", filter: `post_id=eq.${postId}` }, () => {
        loadPost({ keepLoading: true });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_comments", filter: `post_id=eq.${postId}` }, () => {
        loadPost({ keepLoading: true });
        loadComments({ keepLoading: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user?.id]);

  const toggleVote = async () => {
    if (!post || !user?.id || isVoting) return;
    const previous = post;

    setIsVoting(true);
    setPost((current) => ({
      ...current,
      has_voted: !current.has_voted,
      upvotes_count: Math.max(0, (current.upvotes_count || 0) + (current.has_voted ? -1 : 1)),
    }));

    try {
      if (previous.has_voted) {
        const { error: deleteError } = await supabase
          .from("community_post_votes")
          .delete()
          .eq("post_id", previous.id)
          .eq("user_id", user.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from("community_post_votes").insert({
          post_id: previous.id,
          user_id: user.id,
        });
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Failed to vote on community post:", err);
      setPost(previous);
    } finally {
      setIsVoting(false);
    }
  };

  const toggleLove = async () => {
    if (!post || !user?.id || isLoving) return;
    const previous = post;

    setIsLoving(true);
    setPost((current) => ({
      ...current,
      has_loved: !current.has_loved,
      loves_count: Math.max(0, (current.loves_count || 0) + (current.has_loved ? -1 : 1)),
    }));

    try {
      if (previous.has_loved) {
        const { error: deleteError } = await supabase
          .from("community_post_loves")
          .delete()
          .eq("post_id", previous.id)
          .eq("user_id", user.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from("community_post_loves").insert({
          post_id: previous.id,
          user_id: user.id,
        });
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Failed to love community post:", err);
      setPost(previous);
    } finally {
      setIsLoving(false);
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!reply.trim() || !user?.id || !post || isSavingReply) return;

    setIsSavingReply(true);
    setError("");

    try {
      const { error: insertError } = await supabase.from("community_comments").insert({
        post_id: post.id,
        user_id: user.id,
        author_name: getDisplayName(user),
        author_avatar: getAvatar(user),
        body: reply.trim(),
      });

      if (insertError) throw insertError;
      setReply("");
      await loadComments({ keepLoading: true });
      await loadPost({ keepLoading: true });
    } catch (err) {
      console.error("Failed to reply to community post:", err);
      setError("Could not post your reply. Please try again.");
    } finally {
      setIsSavingReply(false);
    }
  };

  if (isLoadingPost) {
    return <CommunityPostSkeleton />;
  }

  if (!post) {
    return (
      <div className="mx-auto w-full max-w-[860px] space-y-4">
        <Link to="/community" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-200">
          <ArrowLeft size={16} />
          Back to Discuss
        </Link>
        <div className="rounded-lg border border-white/10 bg-[#111111] p-8 text-center">
          <MessageSquare size={24} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-sm font-medium text-neutral-200">Discussion not found</p>
          <p className="mt-1 text-sm text-neutral-500">It may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4">
      <Link to="/community" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-200">
        <ArrowLeft size={16} />
        Back to Discuss
      </Link>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-400/10 bg-yellow-400/[0.04] px-3 py-2 text-sm text-yellow-200/80">
          <Wifi size={14} />
          {error}
        </div>
      )}

      <article className="rounded-lg border border-white/10 bg-[#111111]">
        <div className="border-b border-white/[0.08] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tag value={post.tag} />
            <span className="text-xs text-neutral-500">{timeAgo(post.created_at)}</span>
          </div>
          <h1 className="text-2xl font-semibold leading-8 text-neutral-100">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <AuthorAvatar name={post.author_name} avatar={post.author_avatar} />
            <span className="font-medium text-neutral-300">{post.author_name}</span>
            {post.problem_title && (
              <>
                <span>in</span>
                <a
                  href={post.problem_url || undefined}
                  target={post.problem_url ? "_blank" : undefined}
                  rel="noreferrer"
                  className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-neutral-300 transition hover:bg-white/[0.07]"
                >
                  {post.problem_title}
                </a>
              </>
            )}
          </div>
        </div>

        <div className="p-5">
          <p className="whitespace-pre-wrap text-[15px] leading-8 text-neutral-100">{post.body}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-4">
            <button
              onClick={toggleVote}
              disabled={isVoting}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                post.has_voted
                  ? "border-violet-300/30 bg-violet-400/10 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-neutral-200"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <ArrowUp size={16} />
              <span>{post.upvotes_count || 0}</span>
              <span>Upvote{(post.upvotes_count || 0) === 1 ? "" : "s"}</span>
            </button>

            <button
              onClick={toggleLove}
              disabled={isLoving}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                post.has_loved
                  ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                  : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-neutral-200"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <Heart size={16} fill={post.has_loved ? "currentColor" : "none"} />
              <span>{post.loves_count || 0}</span>
              <span>Like{(post.loves_count || 0) === 1 ? "" : "s"}</span>
            </button>

            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neutral-400">
              <MessageSquare size={16} />
              <span>{post.comments_count || comments.length}</span>
              <span>Replies</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-neutral-400">
              <Eye size={16} />
              <span>{post.views_count || 0}</span>
              <span>Views</span>
            </div>
          </div>
        </div>
      </article>

      <section className="rounded-lg border border-white/10 bg-[#111111]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-200">Replies</h2>
          <span className="text-xs text-neutral-500">{post.comments_count || comments.length} total</span>
        </div>

        <form onSubmit={submitReply} className="border-b border-white/[0.08] p-5">
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Write a reply..."
            className="w-full resize-y rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!reply.trim() || isSavingReply}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Reply
            </button>
          </div>
        </form>

        {isLoadingComments ? (
          <div className="flex min-h-[180px] items-center justify-center text-sm text-neutral-500">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading replies
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={22} className="mx-auto mb-3 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-200">No replies yet</p>
            <p className="mt-1 text-sm text-neutral-500">Be the first to add a useful detail.</p>
          </div>
        ) : (
          <div>
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 border-b border-white/[0.06] p-5 last:border-b-0">
                <AuthorAvatar name={comment.author_name} avatar={comment.author_avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-neutral-200">{comment.author_name}</span>
                    <span className="text-xs text-neutral-600">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
