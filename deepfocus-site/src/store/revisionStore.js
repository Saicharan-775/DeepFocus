import { getRevisionProblems, normalizeProblemUrl } from '../services/revisionService';
import { normalizeFocusProblem } from '../services/focusPersistence';

const listeners = new Set();
let state = {
  items: [],
  loading: false,
  version: 0,
};
let refreshSeq = 0;

function timestamp(problem) {
  const value = problem?.updated_at || problem?.created_at || 0;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function keyFor(problem) {
  const link = normalizeProblemUrl(problem?.link);
  return link || String(problem?.id || '');
}

function sortLatestFirst(items) {
  return [...items].sort((a, b) => timestamp(b) - timestamp(a));
}

function emit() {
  const snapshot = getRevisionSnapshot();
  listeners.forEach(listener => listener(snapshot));
}

export function getRevisionSnapshot() {
  return {
    ...state,
    items: [...state.items],
  };
}

export function subscribeRevisionStore(listener) {
  listeners.add(listener);
  listener(getRevisionSnapshot());
  return () => listeners.delete(listener);
}

export function mergeRevisionProblem(problem, syncState = 'optimistic') {
  const normalized = normalizeFocusProblem({ ...problem, __syncState: syncState });
  if (!normalized.link) return getRevisionSnapshot();

  const next = [
    normalized,
    ...state.items.filter(item => keyFor(item) !== keyFor(normalized)),
  ];

  state = {
    ...state,
    items: sortLatestFirst(next),
    version: state.version + 1,
  };
  emit();
  return getRevisionSnapshot();
}

export function mergeRevisionProblems(problems = []) {
  const map = new Map();

  state.items.forEach(item => {
    if (item.__syncState === 'optimistic' || item.__syncState === 'queued') {
      map.set(keyFor(item), item);
    }
  });

  problems.forEach(problem => {
    const normalized = normalizeFocusProblem({ ...problem, __syncState: 'synced' });
    map.set(keyFor(normalized), normalized);
  });

  state = {
    ...state,
    items: sortLatestFirst(Array.from(map.values())),
    version: state.version + 1,
  };
  emit();
  return getRevisionSnapshot();
}

export function updateRevisionProblem(idOrLink, changes = {}) {
  const targetKey = normalizeProblemUrl(idOrLink);
  let changed = false;

  const items = state.items.map(item => {
    const sameId = String(item.id) === String(idOrLink);
    const sameLink = targetKey && keyFor(item) === targetKey;
    if (!sameId && !sameLink) return item;

    changed = true;
    return { ...item, ...changes };
  });

  if (!changed) return getRevisionSnapshot();

  state = {
    ...state,
    items: sortLatestFirst(items),
    version: state.version + 1,
  };
  emit();
  return getRevisionSnapshot();
}

export async function refreshRevisionProblems() {
  const seq = ++refreshSeq;
  state = { ...state, loading: true };
  emit();

  const data = await getRevisionProblems();
  if (seq !== refreshSeq) return getRevisionSnapshot();

  mergeRevisionProblems(data);
  state = { ...state, loading: false };
  emit();
  return getRevisionSnapshot();
}

export function installRevisionMessageBridge() {
  if (window.__DEEPFOCUS_REVISION_STORE_BRIDGE__) return;
  window.__DEEPFOCUS_REVISION_STORE_BRIDGE__ = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'DEEPFOCUS_REVISION_UPSERT') {
      mergeRevisionProblem(event.data.problem, event.data.syncState || 'optimistic');
    }
    if (event.data.type === 'DEEPFOCUS_REVISION_REFRESH') {
      refreshRevisionProblems();
    }
  });
}
