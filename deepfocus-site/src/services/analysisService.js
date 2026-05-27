import { updateProblemNotesByLink } from './revisionService';

export async function attachAnalysisToProblem({ link, summary, title, difficulty }) {
  if (!link || !summary) return null;
  return updateProblemNotesByLink(link, summary, title, difficulty);
}
