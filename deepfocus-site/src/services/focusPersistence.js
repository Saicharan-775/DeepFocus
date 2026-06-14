import { addRevisionProblem, normalizeProblemUrl } from './revisionService';

export function normalizeFocusProblem(input = {}) {
  const now = new Date().toISOString();
  const link = normalizeProblemUrl(input.link);

  return {
    id: input.id || `optimistic:${link || Date.now()}`,
    title: input.title || 'Unknown Problem',
    link,
    difficulty: ['Easy', 'Medium', 'Hard'].includes(input.difficulty) ? input.difficulty : 'Medium',
    focus_status: input.focus_status || input.focusStatus || 'Give Up',
    focus_score: Number.isFinite(Number(input.focus_score ?? input.focusScore))
      ? Number(input.focus_score ?? input.focusScore)
      : 0,
    switches: Number.isFinite(Number(input.switches)) ? Number(input.switches) : 0,
    focus_duration: Number.isFinite(Number(input.focus_duration ?? input.focusDuration))
      ? Number(input.focus_duration ?? input.focusDuration)
      : 0,
    notes: input.notes || '',
    code: input.code || '',
    revision_needed: input.revision_needed ?? true,
    focus_history: input.focus_history || [],
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
    __syncState: input.__syncState || 'optimistic',
  };
}

export async function persistFocusProblem(problem) {
  const normalized = normalizeFocusProblem(problem);
  return addRevisionProblem({
    title: normalized.title,
    link: normalized.link,
    difficulty: normalized.difficulty,
    focus_status: normalized.focus_status,
    focus_score: normalized.focus_score,
    switches: normalized.switches,
    notes: normalized.notes,
    code: normalized.code,
    isNewAttempt: true,
  });
}
