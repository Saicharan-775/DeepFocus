import { supabase } from '../lib/supabaseClient';

/**
 * Fetch all revision problems for the logged-in user.
 * RLS on the `revision_problems` table ensures users only see their own data.
 */
export async function getRevisionProblems() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('revision_problems')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[revisionService] Error fetching revision problems:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Add a new revision problem.
 * Validates required fields before sending to the database.
 */
export async function addRevisionProblem(problem) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Input validation
  if (!problem?.title || typeof problem.title !== 'string') {
    console.error('[revisionService] Invalid problem: missing title');
    return null;
  }

  const newProblem = {
    user_id: session.user.id,
    title: problem.title,
    link: problem.link,
    difficulty: problem.difficulty,
    focus_status: problem.focusStatus || problem.focus_status,
    focus_score: problem.focusScore !== undefined ? problem.focusScore : problem.focus_score,
    switches: problem.switches || 0,
    notes: problem.notes || '',
    revision_needed: true,
  };

  const { data, error } = await supabase
    .from('revision_problems')
    .insert([newProblem])
    .select()
    .single();

  if (error) {
    // 23505 = PostgreSQL unique violation — problem already exists, silently ignore
    if (error.code === '23505') {
      console.log('[revisionService] Problem already exists. Ignored.');
    } else {
      console.error('[revisionService] Error adding revision problem:', error.message);
    }
    return null;
  }
  return data;
}

/**
 * Update problem notes for a given problem ID.
 */
export async function updateProblemNotes(id, notes) {
  if (!id) return;

  const { error } = await supabase
    .from('revision_problems')
    .update({ notes })
    .eq('id', id);

  if (error) {
    console.error('[revisionService] Error updating notes:', error.message);
  }
}

/**
 * Toggle whether a problem needs revision.
 */
export async function toggleProblemMarked(id, revision_needed) {
  if (!id) return;

  const { error } = await supabase
    .from('revision_problems')
    .update({ revision_needed })
    .eq('id', id);

  if (error) {
    console.error('[revisionService] Error toggling revision status:', error.message);
  }
}

/**
 * Intelligent Algorithm to fetch suggested problems for Today's Revision.
 * Prioritizes based on performance status and focus score.
 */
export async function getSuggestedProblems(limit = 5) {
  const problems = await getRevisionProblems();
  
  const scored = problems.map(p => {
    let score = 0;
    let reason = "Recommended";
    let priority = 4; // 1 = Critical, 2 = High, 3 = Medium, 4 = Low

    if (p.focus_status === 'Cheated') {
      score += 100;
      reason = "High Priority: Critical violation detected";
      priority = 1;
    } else if (p.focus_status === 'Give Up') {
      score += 80;
      reason = "Urgent: Problem was abandoned";
      priority = 2;
    } else if (p.focus_status === 'Low Focus' || p.focus_score < 70) {
      score += 60;
      reason = "Moderate: Focus score was below threshold";
      priority = 3;
    } else if (p.focus_score < 90) {
      score += 30;
      reason = "Targeted: Good performance, but needs solidifying";
      priority = 4;
    } else {
      score += 10;
      reason = "Review: Keep the concept fresh";
      priority = 5;
    }

    // Boost score for Hard problems
    if (p.difficulty === 'Hard') score += 15;
    if (p.difficulty === 'Medium') score += 5;

    return { ...p, priorityScore: score, suggestionReason: reason, priorityLevel: priority };
  });

  return scored
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}
