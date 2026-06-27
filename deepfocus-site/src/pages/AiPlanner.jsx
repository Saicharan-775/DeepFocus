import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Gauge,
  LayoutGrid,
  List,
  RotateCcw,
  BookOpen,
  Settings2,
  Target,
  BarChart,
  ExternalLink
} from 'lucide-react';
import curatedQuestions from '../constants/Patterns/curated_questions.json';
import { RevisionSkeleton } from '../components/Boneyard';
import { DEFAULT_WEAK_TOPICS, PATTERN_MAPPING, PATTERN_WEIGHTS, TOPIC_WEIGHTS } from '../features/ai-planner/plannerConstants';
import {
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
    title: 'Top Tier (FAANG)',
    goal: 'FAANG Preparation',
    summary: 'Heavy load. Hard pattern exposure and strict revision pressure.'
  },
  {
    id: 'startup',
    title: 'Fast-paced Startups',
    goal: 'Startup Preparation',
    summary: 'Speed and breadth. Strong medium-level pattern fluency.'
  },
  {
    id: 'service',
    title: 'Core Screening',
    goal: 'Standard Interviews',
    summary: 'Fundamentals: arrays, pointers, trees, stacks, and binary search.'
  }
];

const COMMITMENTS = ['1 hour / day', '2 hours / day', '4 hours / day', '6 hours / day'];
const TAB_OPTIONS = [
  { id: 'plan', label: 'Curriculum', icon: List },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: BarChart }
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
  PENDING: { label: 'Queued', border: 'border-zinc-800', bg: 'bg-zinc-900', text: 'text-zinc-400', dot: 'bg-zinc-600' },
  ACTIVE: { label: 'In Progress', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500' },
  DONE: { label: 'Completed', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' }
};

function getDifficultyStyle(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'hard': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
    default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
  }
}

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

function Metric({ icon: Icon, label, value, subtext }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-[#0f0f11] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
        <Icon size={14} className="text-zinc-500" />
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">{value}</span>
        {subtext && <span className="text-xs text-zinc-500">{subtext}</span>}
      </div>
    </div>
  );
}

export default function AiPlanner() {
  const [goal, setGoal] = useState('FAANG Preparation');
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
      setGoal(savedPlan.goal || 'FAANG Preparation');
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
    savePlannerData({ phases: nextPhases, goal, targetDate, commitment, focus, topics, weeks });
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
        focus, weakTopics: topics, weeks, commitment, selectedQuestionIds: preview.selectedIds
      });
      setPhases(generated);
      setOpenPhase(0);
      setIsSetupOpen(false);
      savePlan(generated);
      setIsGenerating(false);
    }, 400); // reduced delay for snappy feel
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
        ...problem, completed: status === 'DONE' ? true : status === 'PENDING' ? false : problem.completed
      }));
      return { ...phase, status, problems };
    });
    setPhases(updated);
    savePlan(updated);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-blue-500/30">
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#09090b] flex flex-col pt-24 px-8"
          >
            <div className="max-w-6xl w-full mx-auto">
              <RevisionSkeleton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1200px] mx-auto px-6 py-10">
        
        {/* Simple, grounded header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <BookOpen size={16} />
              <span className="text-sm font-medium">DSA Study Plan</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
              Revision Planner
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSetupOpen(!isSetupOpen)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors border ${
                isSetupOpen ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-[#0f0f11] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Settings2 size={16} />
              Configuration
            </button>
            <button
              onClick={resetPlanner}
              className="flex items-center gap-2 rounded-md bg-[#0f0f11] border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw size={16} />
              Reset Data
            </button>
          </div>
        </header>

        {/* Dense Dashboard Metrics */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric icon={Gauge} label="Completion" value={`${summary.progress}%`} subtext="Overall progress" />
          <Metric icon={Target} label="Total Problems" value={phases.length ? summary.problems : preview.selectedCount} subtext="Allocated tasks" />
          <Metric icon={Clock} label="Target" value={preview.weeklyCapacity} subtext="Problems per week" />
          <Metric icon={BarChart} label="Est. Duration" value={weeks} subtext="Weeks required" />
        </section>

        {/* Configuration Panel */}
        <AnimatePresence initial={false}>
          {isSetupOpen && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#0c0c0e]"
            >
              <div className="grid md:grid-cols-[1fr_300px]">
                <div className="p-6 md:border-r border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-base font-semibold text-zinc-100">Plan Settings</h2>
                    <button
                      onClick={buildPlan}
                      disabled={topics.length === 0}
                      className="rounded-md bg-zinc-100 text-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Generate Curriculum
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Goal Selection */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 mb-3 block">TARGET PROFILE</label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {FOCUS_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleFocusChange(item.id)}
                            className={`text-left p-3 rounded-lg border transition-colors ${
                              focus === item.id 
                              ? 'bg-blue-500/10 border-blue-500/50' 
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className={`text-sm font-semibold mb-1 ${focus === item.id ? 'text-blue-400' : 'text-zinc-200'}`}>
                              {item.title}
                            </div>
                            <div className="text-xs text-zinc-500 leading-relaxed">{item.summary}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Basic Inputs */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 mb-2 block">PLAN TITLE</label>
                        <input
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 mb-2 block">TARGET DATE</label>
                        <input
                          type="date"
                          value={targetDate}
                          onChange={(e) => setTargetDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Bandwidth */}
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 mb-3 block">DAILY BANDWIDTH</label>
                      <div className="flex flex-wrap gap-2">
                        {COMMITMENTS.map((item) => (
                          <button
                            key={item}
                            onClick={() => setCommitment(item)}
                            className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                              commitment === item 
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-100' 
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Topics */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-semibold text-zinc-500">DSA PATTERNS TO INCLUDE</label>
                        <div className="flex gap-3 text-xs">
                          <button onClick={() => setTopics(ALL_TOPICS)} className="text-blue-400 hover:text-blue-300">Select All</button>
                          <button onClick={() => setTopics([])} className="text-zinc-500 hover:text-zinc-300">Clear</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_TOPICS.map((topic) => {
                          const isSelected = topics.includes(topic);
                          return (
                            <button
                              key={topic}
                              onClick={() => toggleTopic(topic)}
                              className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                                isSelected 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                              }`}
                            >
                              {topic}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Forecast Sidebar */}
                <div className="bg-[#0f0f11] p-6 border-t md:border-t-0 border-zinc-800">
                  <h3 className="text-xs font-semibold text-zinc-500 mb-4">ALLOCATION PREVIEW</h3>
                  <div className="space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                      <div className="text-sm text-zinc-400 mb-1">Total Dataset</div>
                      <div className="text-2xl font-semibold text-zinc-100 font-mono">{preview.selectedCount} <span className="text-sm font-normal text-zinc-500">problems</span></div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="text-emerald-400">{preview.easy} E</span>
                        <span className="text-amber-400">{preview.medium} M</span>
                        <span className="text-rose-400">{preview.hard} H</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {preview.candidates.map(candidate => (
                        <div key={candidate.pattern} className="flex justify-between items-center text-xs p-2 rounded bg-zinc-900 border border-zinc-800/50">
                          <span className="text-zinc-300 truncate pr-2">{candidate.pattern}</span>
                          <span className="text-zinc-500 font-mono">{candidate.allocated}w</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* State: No Plan Generated */}
        {phases.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-xl bg-[#0c0c0e] p-12 text-center">
            <List size={32} className="mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Curriculum Generated</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Use the configuration panel above to select your target topics and availability, then generate your study plan.
            </p>
          </div>
        ) : (
          /* Main Generated Content */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">{goal}</h2>
                <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Due {formatDate(targetDate)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} /> {commitment}</span>
                </div>
              </div>

              <div className="flex bg-[#0f0f11] p-1 rounded-lg border border-zinc-800">
                {TAB_OPTIONS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Curriculum List Tab */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                {phases.map((phase, phaseIdx) => {
                  const isOpen = openPhase === phaseIdx;
                  const progress = getPhaseProgress(phase);
                  const meta = statusMeta[phase.status] || statusMeta.PENDING;

                  return (
                    <div key={phaseIdx} className="border border-zinc-800 rounded-lg bg-[#0c0c0e] overflow-hidden">
                      <button
                        onClick={() => setOpenPhase(isOpen ? -1 : phaseIdx)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <ChevronRight size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                          <div className="text-left">
                            <div className="text-[10px] font-semibold text-zinc-500 mb-1">{phase.week.toUpperCase()}</div>
                            <h3 className="text-sm font-medium text-zinc-200">{phase.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="hidden sm:flex items-center gap-3">
                            <div className="text-xs text-zinc-500 font-mono">{progress.done}/{progress.total}</div>
                            <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${progress.pct}%` }} />
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-semibold border ${meta.border} ${meta.bg} ${meta.text}`}>
                            {meta.label}
                          </div>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-zinc-800 p-4 bg-[#0a0a0c]">
                          <div className="flex justify-between items-start mb-6 gap-4">
                            <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">{phase.description}</p>
                            <select
                              value={phase.status}
                              onChange={(e) => changePhaseStatus(phaseIdx, e.target.value)}
                              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500"
                            >
                              <option value="PENDING">Queued</option>
                              <option value="ACTIVE">In Progress</option>
                              <option value="DONE">Completed</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            {(phase.problems || []).map((prob, probIdx) => (
                              <div key={probIdx} className="group flex items-center justify-between p-3 rounded-md border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900 transition-colors">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => toggleProblem(phaseIdx, probIdx)}
                                    className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                                      prob.completed ? 'bg-emerald-500 border-emerald-500 text-[#09090b]' : 'border-zinc-600 hover:border-zinc-400 text-transparent'
                                    }`}
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                  <div>
                                    <a
                                      href={prob.link || '#'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400 ${
                                        prob.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                      }`}
                                    >
                                      {prob.name}
                                      {prob.link && <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-zinc-500" />}
                                    </a>
                                    <div className="text-[11px] text-zinc-600 mt-0.5">{prob.subpattern}</div>
                                  </div>
                                </div>
                                <div className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getDifficultyStyle(prob.difficulty)}`}>
                                  {prob.difficulty}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Board Tab */}
            {activeTab === 'board' && (
              <div className="grid md:grid-cols-3 gap-6">
                {['PENDING', 'ACTIVE', 'DONE'].map((status) => {
                  const meta = statusMeta[status];
                  const colPhases = phases.filter(p => p.status === status);
                  return (
                    <div key={status} className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          <span className="text-xs font-semibold text-zinc-300">{meta.label}</span>
                        </div>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{colPhases.length}</span>
                      </div>
                      <div className="space-y-3">
                        {colPhases.map((p, idx) => {
                          const progress = getPhaseProgress(p);
                          return (
                            <div key={idx} className="bg-zinc-900 border border-zinc-800/50 p-3 rounded-lg cursor-default">
                              <div className="text-xs font-medium text-zinc-200 mb-1">{p.title}</div>
                              <div className="text-[10px] text-zinc-500 mb-3">{p.week}</div>
                              <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1.5 font-mono">
                                <span>{progress.pct}%</span>
                                <span>{progress.done}/{progress.total}</span>
                              </div>
                              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${progress.pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                        {colPhases.length === 0 && (
                          <div className="text-center py-6 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-lg">
                            Empty
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl overflow-x-auto custom-scrollbar">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="grid border-b border-zinc-800 bg-zinc-900/50" style={{ gridTemplateColumns: `250px repeat(${weeks}, 1fr)` }}>
                    <div className="p-3 text-xs font-medium text-zinc-500 border-r border-zinc-800">Module</div>
                    {Array.from({ length: weeks }, (_, i) => (
                      <div key={i} className="p-3 text-[10px] font-medium text-zinc-500 text-center border-r border-zinc-800/50 last:border-0">W{i + 1}</div>
                    ))}
                  </div>
                  {/* Rows */}
                  <div>
                    {phases.map((phase, i) => {
                      const { start, span } = parseWeekRange(phase.week);
                      const s = Math.max(1, Math.min(start, weeks));
                      const sp = Math.max(1, Math.min(span, weeks + 1 - s));
                      const meta = statusMeta[phase.status] || statusMeta.PENDING;
                      return (
                        <div key={i} className="grid border-b border-zinc-800 last:border-0" style={{ gridTemplateColumns: `250px repeat(${weeks}, 1fr)` }}>
                          <div className="p-3 border-r border-zinc-800">
                            <div className="text-xs font-medium text-zinc-200 truncate">{phase.title}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{phase.week}</div>
                          </div>
                          <div className="col-span-full row-start-1 grid items-center px-0 py-2" style={{ gridColumn: `2 / span ${weeks}`, gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                            <div 
                              className={`mx-2 h-6 rounded text-[10px] font-medium flex items-center px-2 border ${meta.border} ${meta.bg} ${meta.text}`}
                              style={{ gridColumn: `${s} / span ${sp}` }}
                            >
                              <span className="truncate">{meta.label}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>
    </div>
  );
}