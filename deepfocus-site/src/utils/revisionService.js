import { supabase } from "../lib/supabaseClient";

/**
 * Fetch all revision problems for the logged-in user.
 */
export async function getRevisionProblems() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("revision_problems")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching revision problems:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Add a new revision problem.
 */
export async function addRevisionProblem(problem) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const newProblem = {
    user_id: session.user.id,
    title: problem.title,
    link: problem.link,
    difficulty: problem.difficulty,
    focus_status: problem.focusStatus || problem.focus_status,
    focus_score: problem.focusScore !== undefined ? problem.focusScore : problem.focus_score,
    switches: problem.switches || 0,
    notes: problem.notes || "",
    revision_needed: true,
  };

  const { data, error } = await supabase
    .from("revision_problems")
    .insert([newProblem])
    .select()
    .single();

  if (error) {
    // 23505 is PostgreSQL unique violation code
    if (error.code === '23505') {
       console.log("Problem already exists in Supabase. Ignored.");
    } else {
       console.error("Error adding revision problem:", error.message);
    }
    return null;
  }
  return data;
}

/**
 * Update problem notes.
 */
export async function updateProblemNotes(id, notes) {
  const { error } = await supabase
    .from("revision_problems")
    .update({ notes })
    .eq("id", id);

  if (error) {
    console.error("Error updating notes:", error.message);
  }
}

/**
 * Toggle whether a problem needs revision.
 */
export async function toggleProblemMarked(id, revision_needed) {
  const { error } = await supabase
    .from("revision_problems")
    .update({ revision_needed })
    .eq("id", id);

  if (error) {
    console.error("Error toggling revision status:", error.message);
  }
}