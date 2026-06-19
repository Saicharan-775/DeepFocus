import { supabase } from '../lib/supabaseClient';
import { getSafeSession } from '../utils/authHelpers';

export function normalizeProblemUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.split('?')[0].split('#')[0];
  const match = cleanUrl.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([^/]+)/i);
  return match ? `https://leetcode.com/problems/${match[1]}/` : cleanUrl;
}

function revisionTimestamp(problem) {
  const value = problem?.updated_at || problem?.created_at || 0;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

/**
 * Fetch all revision problems for the logged-in user.
 * RLS on the `revision_problems` table ensures users only see their own data.
 */
export async function getRevisionProblems() {
  const session = await getSafeSession();
  if (!session) return [];

  let { data, error } = await supabase
    .from('revision_problems')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error && /updated_at/i.test(error.message || '')) {
    const fallback = await supabase
      .from('revision_problems')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('[revisionService] Error fetching revision problems:', error.message);
    return [];
  }
  return (data || []).sort((a, b) => revisionTimestamp(b) - revisionTimestamp(a));
}

/**
 * Add a new revision problem.
 * Validates required fields before sending to the database.
 */
export async function addRevisionProblem(problem) {
  const session = await getSafeSession();
  if (!session) return null;

  // Input validation
  if (!problem?.title || typeof problem.title !== 'string') {
    console.error('[revisionService] Invalid problem: missing title');
    return null;
  }

  const normalizedLink = normalizeProblemUrl(problem.link);
  if (!normalizedLink) {
    console.error('[revisionService] Invalid problem: missing link');
    return null;
  }

  const newProblem = {
    user_id: session.user.id,
    title: problem.title,
    link: normalizedLink,
    difficulty: problem.difficulty || 'Medium',
    focus_status: problem.focusStatus || problem.focus_status || 'Unattempted',
    focus_score: problem.focusScore !== undefined ? problem.focusScore : (problem.focus_score ?? 0),
    switches: problem.switches || 0,
    focus_duration: problem.focusDuration !== undefined ? problem.focusDuration : (problem.focus_duration ?? 0),
    notes: problem.notes || '',
    code: problem.code || '',
    revision_needed: true,
  };

  let { data: existing, error: lookupError } = await supabase
    .from('revision_problems')
    .select('id, notes, code, focus_history')
    .eq('user_id', session.user.id)
    .eq('link', newProblem.link)
    .maybeSingle();

  if (!lookupError && !existing) {
    const titleLookup = await supabase
      .from('revision_problems')
      .select('id, notes, code, focus_history')
      .eq('user_id', session.user.id)
      .eq('title', newProblem.title)
      .maybeSingle();
    existing = titleLookup.data;
    lookupError = titleLookup.error;
  }

  if (lookupError) {
    console.error('[revisionService] Error checking existing revision problem:', lookupError.message);
    return null;
  }

  const isNewAttempt = problem.isNewAttempt || false;
  const historyItem = {
    score: newProblem.focus_score,
    status: newProblem.focus_status,
    switches: newProblem.switches,
    duration: newProblem.focus_duration,
    code: newProblem.code,
    timestamp: new Date().toISOString()
  };

  let updatedHistory = [];
  if (existing) {
    updatedHistory = Array.isArray(existing.focus_history) ? existing.focus_history : [];
    if (isNewAttempt) {
      updatedHistory = [...updatedHistory, historyItem];
    }
  } else {
    updatedHistory = [historyItem];
  }

  const query = existing
    ? supabase
        .from('revision_problems')
        .update({
          ...newProblem,
          notes: problem.notes ? problem.notes : (existing.notes || ''),
          code: problem.code ? problem.code : (existing.code || ''),
          focus_history: updatedHistory
        })
        .eq('id', existing.id)
    : supabase
        .from('revision_problems')
        .insert([{
          ...newProblem,
          focus_history: updatedHistory
        }]);

  const { data, error } = await query
    .select()
    .single();

  if (error) {
    console.error('[revisionService] Error upserting revision problem:', error.message);
    return null;
  }
  return data;
}

/**
 * Update problem notes for a given problem ID.
 */
export async function updateProblemNotes(id, notes) {
  if (!id) return { data: null, error: new Error('Missing problem id') };

  const { data, error } = await supabase
    .from('revision_problems')
    .update({ notes })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[revisionService] Error updating notes:', error.message);
  }
  return { data, error };
}

/**
 * Update problem notes for a given problem link (append AI summary).
 */
export async function updateProblemNotesByLink(link, summaryToAppend, title = null, difficulty = null) {
  const normalizedLink = normalizeProblemUrl(link);
  if (!normalizedLink || !summaryToAppend) return;

  const session = await getSafeSession();
  if (!session) return;

  // Find problem by link
  const { data, error } = await supabase
    .from('revision_problems')
    .select('id, notes')
    .eq('link', normalizedLink)
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) {
    await addRevisionProblem({
      title: title || 'Unknown Problem',
      link: normalizedLink,
      difficulty: difficulty || 'Medium',
      focusStatus: 'Unattempted',
      focusScore: 0,
      notes: '### AI Summary\n' + summaryToAppend
    });
    return;
  }

  if (data) {
    // Append the new summary
    const newNotes = data.notes 
      ? data.notes + '\n\n### AI Summary\n' + summaryToAppend
      : '### AI Summary\n' + summaryToAppend;

    await updateProblemNotes(data.id, newNotes);
  }
}

/**
 * Toggle whether a problem needs revision.
 */
export async function toggleProblemMarked(id, revision_needed) {
  if (!id) return { data: null, error: new Error('Missing problem id') };

  const { data, error } = await supabase
    .from('revision_problems')
    .update({ revision_needed })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[revisionService] Error toggling revision status:', error.message);
  }
  return { data, error };
}

export async function setProblemRevisionNeeded(id, revisionNeeded) {
  if (!id) return { data: null, error: new Error('Missing problem id') };

  const { data, error } = await supabase
    .from('revision_problems')
    .update({ revision_needed: revisionNeeded })
    .eq('id', id)
    .select('id, revision_needed')
    .single();

  if (error) {
    console.error('[revisionService] Error updating reviewed state:', error.message);
  }

  return { data, error };
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
