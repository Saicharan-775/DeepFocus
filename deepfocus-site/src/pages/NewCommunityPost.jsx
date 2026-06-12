import React, { useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";

const TAGS = ["Experience", "Question", "Strategy", "Interview", "Win"];

function getDisplayName(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || user?.email?.split("@")[0] || "DeepFocus member";
}

function getAvatar(user) {
  return user?.user_metadata?.avatar_url || null;
}

export default function NewCommunityPost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    body: "",
    tag: "Question",
    mood: "Focused",
    problem_title: "",
    problem_url: "",
  });

  const canSubmit = form.title.trim().length >= 4 && form.body.trim().length >= 8 && !isSaving;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit || !user?.id) return;

    setIsSaving(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          author_name: getDisplayName(user),
          author_avatar: getAvatar(user),
          title: form.title.trim(),
          body: form.body.trim(),
          tag: form.tag,
          mood: form.mood,
          problem_title: form.problem_title.trim() || null,
          problem_url: form.problem_url.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      navigate(`/community/post/${data.id}`);
    } catch (err) {
      console.error("Failed to create community post:", err);
      setError("Could not publish this discussion. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-4">
      <Link to="/community" className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-200">
        <ArrowLeft size={16} />
        Back to Discuss
      </Link>

      <form onSubmit={submit} className="rounded-lg border border-white/10 bg-[#111111]">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <h1 className="text-xl font-semibold text-neutral-100">New discussion</h1>
          <p className="mt-1 text-sm text-neutral-500">Share a question, experience, or reusable problem-solving note.</p>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Title</label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={140}
              placeholder="What do you want to discuss?"
              className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Body</label>
            <textarea
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
              rows={10}
              maxLength={5000}
              placeholder="Include context, what you tried, and what others can learn from it."
              className="w-full resize-y rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Category</label>
              <select
                value={form.tag}
                onChange={(event) => updateField("tag", event.target.value)}
                className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-violet-300/50"
              >
                {TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">Problem or topic</label>
              <input
                value={form.problem_title}
                onChange={(event) => updateField("problem_title", event.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Reference link</label>
            <input
              value={form.problem_url}
              onChange={(event) => updateField("problem_url", event.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-white/10 bg-[#0b0b0b] px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-300/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-5 py-4">
          <Link to="/community" className="rounded-md px-4 py-2 text-sm font-medium text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Publish
          </button>
        </div>
      </form>
    </div>
  );
}
