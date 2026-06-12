import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Gauge,
  LayoutGrid,
  ListChecks,
  RotateCcw,
  Route,
  Sparkles,
  Target,
  TimerReset
} from 'lucide-react';
import curatedQuestions from '../constants/Patterns/curated_questions.json';
import DeepFocusLoader from '../components/DeepFocusLoader';
import { DEFAULT_WEAK_TOPICS, PATTERN_MAPPING, PATTERN_WEIGHTS, TOPIC_WEIGHTS } from '../features/ai-planner/plannerConstants';
import {
  diffColor,
  generateLocalPlan,
  getCandidateAllocations,
  getDefaultTopicsForFocus,
  getRecommendedQuestionIds,
  migrateSavedPhases,
  parseWeekRange,
  predictWeeks
} from '../features/ai-planner/plannerUtils';
import {
  clearPlannerData,
  loadPlannerData,
  savePlannerData
} from '../features/ai-planner/plannerStorage';

const FOCUS_OPTIONS = [
  {
    id: 'faang',
    title: 'Top product interviews',
    goal: 'Crack FAANG Interviews',
    summary: 'Medium-heavy plan with hard pattern exposure and strict revision pressure.'
  },
  {
    id: 'startup',
    title: 'Fast startup rounds',
    goal: 'Crack Product Startup Interviews',
    summary: 'Speed, breadth, and strong medium-level pattern fluency.'
  },
  {
    id: 'service',
    title: 'Core company screens',
    goal: 'Crack Service Company Screenings',
    summary: 'Fundamentals first: arrays, pointers, trees, stacks, and binary search.'
  }
];

const COMMITMENTS = ['1 hour / day', '2 hours / day', '4 hours / day', '6 hours / day'];
const TAB_OPTIONS = [
  { id: 'plan', label: 'Plan', icon: ListChecks },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: Route }
];

const ALL_TOPICS = [
  'Dynamic Programming',
  'Graph Algorithms',
  'Trees & Recursion',
  'Sliding Window',
  'Two Pointers',
  'Binary Search',
  'Heaps & Priority Queues',
  'Stack & Queue puzzles',
  'Hash Tables',
  'Linked Lists',
  'Backtracking'
];

const statusMeta = {
  PENDING: { label: 'Queued', dot: 'bg-zinc-500', chip: 'border-white/[0.08] bg-white/[0.025] text-zinc-400' },
  ACTIVE: { label: 'In progress', dot: 'bg-amber-300', chip: 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200' },
  DONE: { label: 'Complete', dot: 'bg-emerald-300', chip: 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200' }
};

function commitmentHours(commitment) {
  const value = Number.parseInt(commitment, 10);
  return Number.isFinite(value) ? value : 2;
}

function getTopicPattern(topic) {
  return PATTERN_MAPPING[topic] || topic;
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function summarizePlan(phases, commitment, topics) {
  const problems = phases.flatMap((phase) => phase.problems || []);
  const completed = problems.filter((problem) => problem.completed).length;
  const hard = problems.filter((problem) => problem.difficulty === 'Hard').length;
  const medium = problems.filter((problem) => problem.difficulty === 'Medium').length;
  const easy = problems.filter((problem) => problem.difficulty === 'Easy').length;
  const weeklyCapacity = Math.max(3, Math.round(commitmentHours(commitment) * 3.2));
  const revisionPasses = Math.ceil(problems.length * 1.6);
  const patterns = new Set(topics.map(getTopicPattern));

  return {
    problems: problems.length,
    completed,
    progress: problems.length ? Math.round((completed / problems.length) * 100) : 0,
    hard,
    medium,
    easy,
    weeklyCapacity,
    revisionPasses,
    patterns: patterns.size
  };
}

function buildPreview({ focus, topics, weeks, commitment }) {
  const candidates = getCandidateAllocations(focus, topics, weeks);
  const selectedIds = getRecommendedQuestionIds({ candidates, focus, commitment });
  const selected = curatedQuestions.filter((question) => selectedIds.has(question.leetcode_id));
  const hard = selected.filter((question) => question.difficulty === 'Hard').length;
  const medium = selected.filter((question) => question.difficulty === 'Medium').length;
  const easy = selected.filter((question) => question.difficulty === 'Easy').length;
  const weightedLoad = topics.reduce((sum, topic) => sum + (TOPIC_WEIGHTS[topic] || 1), 0);
  const weeklyCapacity = Math.max(3, Math.round(commitmentHours(commitment) * 3.2));

  return {
    candidates,
    selectedIds,
    selectedCount: selected.length,
    hard,
    medium,
    easy,
    weightedLoad,
    weeklyCapacity
  };
}

function getPhaseProgress(phase) {
  const total = phase.problems?.length || 0;
  const done = phase.problems?.filter((problem) => problem.completed).length || 0;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function TopicPill({ topic, selected, onClick }) {
  const pattern = getTopicPattern(topic);
  const weight = PATTERN_WEIGHTS[pattern] || TOPIC_WEIGHTS[topic] || 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${
        selected
          ? 'border-violet-300/45 bg-violet-300/[0.08] text-white'
          : 'border-white/[0.06] bg-white/[0.018] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300'
      }`}
    >
      <span className="block text-xs font-semibold">{topic}</span>
      <span className="mt-1 block text-[10px] text-zinc-600">weight {weight.toFixed(1)}x</span>
    </button>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.065] bg-white/[0.025] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

export default function AiPlanner() {
  const [goal, setGoal] = useState('Crack FAANG Interviews');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [commitment, setCommitment] = useState('2 hours / day');
  const [focus, setFocus] = useState('faang');
  const [topics, setTopics] = useState(DEFAULT_WEAK_TOPICS);
  const [weeks, setWeeks] = useState(8);
  const [phases, setPhases] = useState([]);
  const [activeTab, setActiveTab] = useState('plan');
  const [openPhase, setOpenPhase] = useState(0);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const savedPlan = loadPlannerData();
    if (!savedPlan) return;

    try {
      const migrated = migrateSavedPhases(savedPlan.phases || []);
      setPhases(migrated);
      setGoal(savedPlan.goal || 'Crack FAANG Interviews');
      setTargetDate(savedPlan.targetDate || '2026-12-31');
      setCommitment(savedPlan.commitment || '2 hours / day');
      setFocus(savedPlan.focus || 'faang');
      setTopics(savedPlan.topics || getDefaultTopicsForFocus(savedPlan.focus || 'faang'));
      setWeeks(savedPlan.weeks || predictWeeks(savedPlan.topics || DEFAULT_WEAK_TOPICS, savedPlan.commitment || '2 hours / day'));
      setIsSetupOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
    }
  }, []);

  useEffect(() => {
    setWeeks(predictWeeks(topics, commitment));
  }, [topics, commitment]);

  const preview = useMemo(
    () => buildPreview({ focus, topics, weeks, commitment }),
    [focus, topics, weeks, commitment]
  );

  const summary = useMemo(
    () => summarizePlan(phases, commitment, topics),
    [phases, commitment, topics]
  );

  const savePlan = (nextPhases) => {
    savePlannerData({
      phases: nextPhases,
      goal,
      targetDate,
      commitment,
      focus,
      topics,
      weeks
    });
  };

  const handleFocusChange = (nextFocus) => {
    const option = FOCUS_OPTIONS.find((item) => item.id === nextFocus);
    const nextTopics = getDefaultTopicsForFocus(nextFocus);
    setFocus(nextFocus);
    setGoal(option?.goal || goal);
    setTopics(nextTopics);
  };

  const toggleTopic = (topic) => {
    setTopics((current) => {
      if (current.includes(topic)) return current.filter((item) => item !== topic);
      return [...current, topic];
    });
  };

  const buildPlan = () => {
    if (topics.length === 0) return;

    setIsGenerating(true);
    window.setTimeout(() => {
      const generated = generateLocalPlan({
        focus,
        weakTopics: topics,
        weeks,
        commitment,
        selectedQuestionIds: preview.selectedIds
      });

      setPhases(generated);
      setOpenPhase(0);
      setIsSetupOpen(false);
      savePlan(generated);
      setIsGenerating(false);
    }, 550);
  };

  const resetPlanner = () => {
    clearPlannerData();
    setPhases([]);
    setOpenPhase(0);
    setIsSetupOpen(true);
  };

  const toggleProblem = (phaseIndex, problemIndex) => {
    const updated = phases.map((phase, pIndex) => {
      if (pIndex !== phaseIndex) return phase;
      const problems = (phase.problems || []).map((problem, prIndex) =>
        prIndex === problemIndex ? { ...problem, completed: !problem.completed } : problem
      );
      const done = problems.filter((problem) => problem.completed).length;
      const status = done === problems.length && problems.length > 0 ? 'DONE' : done > 0 ? 'ACTIVE' : 'PENDING';
      return { ...phase, problems, status };
    });

    setPhases(updated);
    savePlan(updated);
  };

  const changePhaseStatus = (phaseIndex, status) => {
    const updated = phases.map((phase, pIndex) => {
      if (pIndex !== phaseIndex) return phase;
      const problems = (phase.problems || []).map((problem) => ({
        ...problem,
        completed: status === 'DONE' ? true : status === 'PENDING' ? false : problem.completed
      }));
      return { ...phase, status, problems };
    });

    setPhases(updated);
    savePlan(updated);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070708] pb-14 text-zinc-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_34%),radial-gradient(circle_at_80%_22%,rgba(255,255,255,0.035),transparent_24%)]" />
        <div
          className="absolute inset-0 opacity-[0.17]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
            backgroundSize: '28px 28px'
          }}
        />
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black"
          >
            <DeepFocusLoader message="" />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 mx-auto max-w-[1180px] px-6 pt-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Route size={13} />
              Study planner
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-5xl">
              Build a revision roadmap that respects your time.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              DeepFocus ranks topics by prerequisite order, pattern weight, difficulty mix, and weekly capacity, then turns them into a practical revision plan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsSetupOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-white/[0.16] hover:bg-white/[0.06]"
            >
              <Sparkles size={14} />
              {isSetupOpen ? 'Hide setup' : 'Tune plan'}
            </button>
            <button
              type="button"
              onClick={resetPlanner}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-zinc-500 transition hover:border-white/[0.14] hover:text-zinc-200"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-3 md:grid-cols-4">
          <Metric icon={Gauge} label="Progress" value={`${summary.progress}% complete`} />
          <Metric icon={ListChecks} label="Problem load" value={`${phases.length ? summary.problems : preview.selectedCount} problems`} />
          <Metric icon={TimerReset} label="Revision passes" value={`${phases.length ? summary.revisionPasses : Math.ceil(preview.selectedCount * 1.6)} planned`} />
          <Metric icon={Clock3} label="Capacity" value={`${preview.weeklyCapacity} problems / week`} />
        </section>

        <AnimatePresence initial={false}>
          {isSetupOpen && (
            <motion.section
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d10]/92 shadow-[0_22px_70px_rgba(0,0,0,0.34)]"
            >
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_360px]">
                <div className="border-b border-white/[0.07] p-5 lg:border-b-0 lg:border-r">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-white">Planner setup</h2>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Choose the target, weak patterns, and deadline.</p>
                    </div>
                    <button
                      type="button"
                      onClick={buildPlan}
                      disabled={topics.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Build roadmap
                      <ArrowUpRight size={14} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Interview target</p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {FOCUS_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleFocusChange(item.id)}
                            className={`rounded-lg border p-4 text-left transition ${
                              focus === item.id
                                ? 'border-violet-300/45 bg-violet-300/[0.08]'
                                : 'border-white/[0.06] bg-white/[0.018] hover:border-white/[0.12]'
                            }`}
                          >
                            <span className="text-sm font-bold text-white">{item.title}</span>
                            <span className="mt-2 block text-xs leading-5 text-zinc-500">{item.summary}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Goal name</span>
                        <input
                          value={goal}
                          onChange={(event) => setGoal(event.target.value)}
                          className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-violet-300/45"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Target date</span>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(event) => setTargetDate(event.target.value)}
                          className="w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-violet-300/45"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Plan length</span>
                        <div className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-zinc-100">
                          {weeks} weeks
                        </div>
                      </label>
                    </div>

                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Daily commitment</p>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {COMMITMENTS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setCommitment(item)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              commitment === item
                                ? 'border-violet-300/45 bg-violet-300/[0.08] text-white'
                                : 'border-white/[0.06] bg-white/[0.018] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Patterns to include</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setTopics(ALL_TOPICS)} className="text-xs text-zinc-500 transition hover:text-zinc-200">Select all</button>
                          <button type="button" onClick={() => setTopics([])} className="text-xs text-zinc-500 transition hover:text-zinc-200">Clear</button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ALL_TOPICS.map((topic) => (
                          <TopicPill
                            key={topic}
                            topic={topic}
                            selected={topics.includes(topic)}
                            onClick={() => toggleTopic(topic)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="p-5">
                  <div className="mb-5 rounded-lg border border-white/[0.07] bg-black/25 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Plan forecast</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{weeks} weeks</h3>
                    <p className="mt-2 text-xs leading-6 text-zinc-500">
                      {preview.selectedCount} curated problems, {preview.hard} hard, {preview.medium} medium, {preview.easy} easy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {preview.candidates.map((candidate) => (
                      <div key={candidate.pattern} className="rounded-lg border border-white/[0.06] bg-white/[0.018] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-zinc-200">{candidate.pattern}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{candidate.allocated} wk</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-violet-300"
                            style={{ width: `${Math.min(100, (candidate.allocated / Math.max(1, weeks)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {phases.length === 0 ? (
          <section className="rounded-xl border border-dashed border-white/[0.09] bg-white/[0.018] px-6 py-20 text-center">
            <Target size={34} className="mx-auto mb-4 text-zinc-600" />
            <h2 className="text-lg font-bold text-white">No roadmap yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Tune the planner inputs and build your first revision roadmap.</p>
          </section>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{goal}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {formatDate(targetDate)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {commitment}</span>
                </div>
              </div>

              <div className="flex rounded-lg border border-white/[0.07] bg-white/[0.025] p-1">
                {TAB_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
                      activeTab === id ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'plan' && (
              <div className="space-y-3">
                {phases.map((phase, phaseIndex) => {
                  const isOpen = openPhase === phaseIndex;
                  const progress = getPhaseProgress(phase);
                  const meta = statusMeta[phase.status] || statusMeta.PENDING;

                  return (
                    <article key={`${phase.week}-${phase.title}`} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d10]/90">
                      <button
                        type="button"
                        onClick={() => setOpenPhase(isOpen ? -1 : phaseIndex)}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/[0.02]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <ChevronRight size={17} className={`shrink-0 text-zinc-500 transition ${isOpen ? 'rotate-90 text-violet-300' : ''}`} />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">{phase.week}</p>
                            <h3 className="truncate text-sm font-bold text-zinc-100">{phase.title}</h3>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden text-xs font-mono text-zinc-500 sm:inline">{progress.done}/{progress.total}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${meta.chip}`}>{meta.label}</span>
                          <ChevronDown size={16} className="text-zinc-600" />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="border-t border-white/[0.07] p-4">
                              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <p className="max-w-2xl text-xs leading-6 text-zinc-500">{phase.description}</p>
                                <select
                                  value={phase.status}
                                  onChange={(event) => changePhaseStatus(phaseIndex, event.target.value)}
                                  className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-violet-300/45"
                                >
                                  <option value="PENDING">Queued</option>
                                  <option value="ACTIVE">In progress</option>
                                  <option value="DONE">Complete</option>
                                </select>
                              </div>

                              <div className="space-y-2">
                                {(phase.problems || []).map((problem, problemIndex) => (
                                  <div key={`${problem.leetcode_id}-${problemIndex}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.055] bg-black/25 p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => toggleProblem(phaseIndex, problemIndex)}
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                                          problem.completed ? 'border-violet-300 bg-violet-300 text-black' : 'border-white/[0.12] bg-white/[0.02] text-transparent hover:border-violet-300/40'
                                        }`}
                                      >
                                        <Check size={13} strokeWidth={3} />
                                      </button>
                                      <div className="min-w-0">
                                        <p className={`truncate text-sm ${problem.completed ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>{problem.name}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-zinc-600">{problem.subpattern}</p>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${diffColor(problem.difficulty)}`}>{problem.difficulty}</span>
                                      {problem.link && (
                                        <a href={problem.link} target="_blank" rel="noopener noreferrer" className="text-zinc-600 transition hover:text-violet-300">
                                          <ArrowUpRight size={15} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === 'board' && (
              <div className="grid gap-4 md:grid-cols-3">
                {['PENDING', 'ACTIVE', 'DONE'].map((status) => {
                  const meta = statusMeta[status];
                  const items = phases.filter((phase) => phase.status === status);

                  return (
                    <div key={status} className="rounded-xl border border-white/[0.07] bg-[#0d0d10]/82 p-3">
                      <div className="mb-3 flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300">
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="text-xs text-zinc-600">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((phase) => {
                          const progress = getPhaseProgress(phase);
                          return (
                            <div key={phase.title} className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
                              <p className="text-xs font-bold text-zinc-200">{phase.title}</p>
                              <p className="mt-1 text-[11px] text-zinc-600">{phase.week}</p>
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className="h-full rounded-full bg-violet-300" style={{ width: `${progress.pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d10]/90">
                <div className="grid border-b border-white/[0.07] bg-white/[0.025]" style={{ gridTemplateColumns: `220px repeat(${weeks}, minmax(52px, 1fr))` }}>
                  <div className="border-r border-white/[0.07] p-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Phase</div>
                  {Array.from({ length: weeks }, (_, index) => (
                    <div key={index} className="border-r border-white/[0.045] p-3 text-center text-[10px] font-mono text-zinc-600 last:border-r-0">W{index + 1}</div>
                  ))}
                </div>

                <div>
                  {phases.map((phase, index) => {
                    const { start, span } = parseWeekRange(phase.week);
                    const clampedStart = Math.max(1, Math.min(start, weeks));
                    const clampedSpan = Math.max(1, Math.min(span, weeks + 1 - clampedStart));
                    const meta = statusMeta[phase.status] || statusMeta.PENDING;

                    return (
                      <div key={`${phase.title}-${index}`} className="grid border-b border-white/[0.055] last:border-b-0" style={{ gridTemplateColumns: `220px repeat(${weeks}, minmax(52px, 1fr))` }}>
                        <div className="border-r border-white/[0.07] p-3">
                          <p className="truncate text-xs font-bold text-zinc-200">{phase.title}</p>
                          <p className="mt-1 text-[10px] text-zinc-600">{phase.week}</p>
                        </div>
                        <div className="col-span-full row-start-1 grid items-center px-0 py-3" style={{ gridColumn: `2 / span ${weeks}`, gridTemplateColumns: `repeat(${weeks}, minmax(52px, 1fr))` }}>
                          <div
                            className={`mx-1 h-7 rounded-md border px-2 text-[10px] font-semibold leading-7 ${meta.chip}`}
                            style={{ gridColumn: `${clampedStart} / span ${clampedSpan}` }}
                          >
                            {meta.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
