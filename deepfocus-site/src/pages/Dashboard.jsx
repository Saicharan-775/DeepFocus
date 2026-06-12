import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  History,
  Radar,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DeepFocusLoader from '../components/DeepFocusLoader';
import { supabase } from '../lib/supabaseClient';
import { getRevisionProblems } from '../services/revisionService';

const ease = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } }
};

function scoreSuggestedProblem(problem) {
  let score = 0;
  let reason = 'A short reinforcement pass keeps this pattern warm.';

  if (problem.focus_status === 'Cheated') {
    score += 110;
    reason = 'Shortcut used. Rebuild it cleanly before the copied path hardens.';
  } else if (problem.focus_status === 'Give Up') {
    score += 100;
    reason = 'Unfinished solve. Recover the missing transition while it is still useful.';
  } else if ((problem.focus_score ?? 100) < 50) {
    score += 82;
    reason = 'Low focus score. Re-check the invariant and implementation together.';
  } else if ((problem.focus_score ?? 100) < 75) {
    score += 56;
    reason = 'Recall is still fragile. Do a fast proof-first pass.';
  }

  if (problem.revision_needed !== false) score += 22;
  if (problem.difficulty === 'Hard') score += 16;
  if (problem.difficulty === 'Medium') score += 6;

  return { ...problem, priorityScore: score, suggestionReason: reason };
}

function formatDuration(seconds = 0) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function difficultyClass(difficulty) {
  if (difficulty === 'Hard') return 'border-rose-300/20 bg-rose-300/[0.075] text-rose-100';
  if (difficulty === 'Easy') return 'border-emerald-300/20 bg-emerald-300/[0.075] text-emerald-100';
  return 'border-amber-300/20 bg-amber-300/[0.075] text-amber-100';
}

function signalColor(problem) {
  if (problem.focus_status === 'Give Up' || problem.focus_status === 'Cheated') return 'bg-rose-300';
  if ((problem.focus_score ?? 100) < 70) return 'bg-amber-300';
  return 'bg-violet-200';
}

function Panel({ children, className = '' }) {
  return (
    <motion.section
      variants={itemVariants}
      className={`rounded-2xl border border-white/[0.08] bg-[#0D0C10]/98 shadow-[0_24px_80px_rgba(0,0,0,0.32)] ring-1 ring-white/[0.018] ${className}`}
    >
      {children}
    </motion.section>
  );
}

function MissionDial({ progress }) {
  const value = Math.round(progress);
  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_80px_rgba(0,0,0,0.28)] sm:h-36 sm:w-36">
      <div
        className="absolute inset-3 rounded-full"
        style={{ background: `conic-gradient(#ddd6fe ${value * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}
      />
      <div className="absolute inset-6 rounded-full bg-[#0D0C10]" />
      <div className="relative text-center">
        <p className="text-3xl font-semibold tracking-tight text-white">{value}%</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">today</p>
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="min-h-[106px] rounded-xl border border-white/[0.065] bg-[#0D0C10] p-3.5 transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.025]">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        <Icon size={13} className="text-zinc-400" />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function RevisionCalendar({ days, monthLabel, activeCount, currentStreak, onStart, onPrevMonth, onNextMonth }) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Revision calendar</p>
          <div className="flex items-center gap-2 rounded-full border border-amber-200/[0.10] bg-amber-200/[0.045] px-2.5 py-1 text-[10px] font-bold text-amber-100">
            <Flame size={12} className="animate-calendar-flame text-amber-300" />
            {currentStreak} day
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111015] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.09),transparent_62%)] blur-2xl" />

          <div className="mb-4 flex items-center justify-between">
            <button onClick={onPrevMonth} type="button" className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:bg-white/[0.045] hover:text-white" aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <div className="relative text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-white">{monthLabel}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">streak heatmap</p>
            </div>
            <button onClick={onNextMonth} type="button" className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/[0.07] text-zinc-500 transition hover:bg-white/[0.045] hover:text-white" aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="relative grid grid-cols-7 border-b border-white/[0.06] pb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="relative mt-3 grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const active = day.count > 0;
              const missedYesterday = day.missedYesterday;
              return (
                <motion.div
                  key={`${day.dateKey}-${index}`}
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: day.inMonth ? 1 : 0.28, scale: 1 }}
                  transition={{ duration: 0.36, delay: index * 0.012, ease }}
                  className="grid h-9 place-items-center"
                >
                  <motion.div
                    animate={active && !day.isToday ? { y: [0, -1.5, 0], scale: [1, 1.045, 1] } : { y: 0, scale: 1 }}
                    transition={{ duration: 2.15, repeat: active && !day.isToday ? Infinity : 0, ease: 'easeInOut' }}
                    className={`relative grid h-8 w-8 place-items-center rounded-full border text-[10px] font-semibold transition-colors ${
                      day.isToday
                        ? 'border-white bg-white text-black shadow-[0_0_0_4px_rgba(255,255,255,0.06),0_0_22px_rgba(255,255,255,0.08)]'
                        : active
                          ? 'border-amber-200/25 bg-[radial-gradient(circle_at_50%_42%,rgba(251,191,36,0.22),rgba(167,139,250,0.12)_48%,rgba(255,255,255,0.035)_100%)] text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.10)]'
                          : missedYesterday
                            ? 'border-rose-200/[0.12] bg-rose-200/[0.035] text-rose-100/80'
                            : 'border-white/[0.055] bg-white/[0.03] text-zinc-600'
                    }`}
                  >
                    {active && !day.isToday ? (
                      <>
                        <span className="absolute inset-0 rounded-full bg-amber-300/10 blur-sm" />
                        <Flame size={13} className="animate-calendar-flame relative text-amber-200" />
                      </>
                    ) : missedYesterday ? (
                      <span className="text-[11px] leading-none">!</span>
                    ) : (
                      day.date.date()
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">This month</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{activeCount} revision days logged</p>
            </div>
            <button onClick={onStart} type="button" className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Revise
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs().startOf('month'));

  const dailyGoal = parseInt(localStorage.getItem('dailyRevisionGoal'), 10) || 5;

  useEffect(() => {
    async function loadData() {
      const [data, authResult] = await Promise.all([
        getRevisionProblems(),
        supabase.auth.getUser()
      ]);

      setProblems(data);

      const authUser = authResult?.data?.user;
      if (authUser) {
        const { data: sessionData } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', authUser.id);
        setSessions(sessionData || []);
      }
    }

    async function init() {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    }

    init();

    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const state = useMemo(() => {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const problemIds = new Set(problems.map((p) => p.id));
    const masteredCount = masteredIds.filter((id) => problemIds.has(id)).length;
    const totalSolved = problems.length;
    const masteryProgress = totalSolved > 0 ? Math.round((masteredCount / totalSolved) * 100) : 0;
    const totalDurationSeconds = problems.reduce((acc, p) => acc + (p.focus_duration || 0), 0);
    const scores = problems.filter((p) => p.focus_score !== undefined && p.focus_score !== null).map((p) => p.focus_score);
    const retentionScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const activityMap = {};
    problems.forEach((p) => {
      if (p.created_at) {
        const key = dayjs(p.created_at).format('YYYY-MM-DD');
        activityMap[key] = (activityMap[key] || 0) + 1;
      }
    });
    sessions.forEach((s) => {
      const dateValue = s.start_time || s.created_at;
      if (dateValue) {
        const key = dayjs(dateValue).format('YYYY-MM-DD');
        activityMap[key] = (activityMap[key] || 0) + 1;
      }
    });

    let currentStreak = 0;
    const todayStr = dayjs().format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    if (activityMap[todayStr] || activityMap[yesterdayStr]) {
      let checkDate = activityMap[todayStr] ? dayjs(todayStr) : dayjs(yesterdayStr);
      while (activityMap[checkDate.format('YYYY-MM-DD')]) {
        currentStreak += 1;
        checkDate = checkDate.subtract(1, 'day');
      }
    }

    const chartData = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = dayjs().subtract(i, 'day');
      chartData.push({ day: d.format('dd')[0], value: activityMap[d.format('YYYY-MM-DD')] || 0 });
    }
    const maxChartVal = Math.max(...chartData.map((d) => d.value), 3);

    const monthStart = calendarMonth.startOf('month');
    const calendarStart = monthStart.subtract((monthStart.day() + 6) % 7, 'day');
    const calendarDays = Array.from({ length: 35 }, (_, index) => {
      const date = calendarStart.add(index, 'day');
      const dateKey = date.format('YYYY-MM-DD');
      const missed = date.isBefore(dayjs(), 'day') && date.month() === monthStart.month() && (activityMap[dateKey] || 0) === 0;
      return {
        date,
        dateKey,
        count: activityMap[dateKey] || 0,
        inMonth: date.month() === monthStart.month(),
        isToday: date.isSame(dayjs(), 'day'),
        missedYesterday: missed && date.isSame(dayjs().subtract(1, 'day'), 'day')
      };
    });
    const calendarActiveCount = calendarDays.filter((day) => day.inMonth && day.count > 0).length;

    const todayProblemsSet = new Set();
    problems.forEach((p) => {
      if (p.created_at && dayjs(p.created_at).isSame(dayjs(), 'day')) todayProblemsSet.add(p.link || p.id);
    });
    sessions.forEach((s) => {
      const dateStr = s.start_time || s.created_at;
      if (dateStr && dayjs(dateStr).isSame(dayjs(), 'day')) todayProblemsSet.add(s.problem_url || s.id);
    });

    const todaySolved = todayProblemsSet.size;
    const todayDuration = sessions.reduce((acc, s) => {
      const dateStr = s.start_time || s.created_at;
      return dateStr && dayjs(dateStr).isSame(dayjs(), 'day') ? acc + (s.focus_duration || 0) : acc;
    }, 0);

    const revisionQueue = problems
      .filter((p) => p.revision_needed !== false || p.focus_status === 'Give Up' || p.focus_status === 'Cheated' || (p.focus_score ?? 100) < 70)
      .map(scoreSuggestedProblem)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 6);

    const recentActivity = [...problems]
      .sort((a, b) => new Date(b.solved_at || b.created_at || 0) - new Date(a.solved_at || a.created_at || 0))
      .slice(0, 5);

    const abandonedCount = problems.filter((p) => p.focus_status === 'Give Up' || p.focus_status === 'Cheated').length;
    const weakCount = problems.filter((p) => (p.focus_score ?? 100) < 70).length;
    const hardCount = problems.filter((p) => p.difficulty === 'Hard').length;
    const cleanCount = problems.filter((p) => (p.focus_score ?? 0) >= 80 && p.focus_status !== 'Give Up' && p.focus_status !== 'Cheated').length;

    return {
      totalSolved,
      masteredCount,
      masteryProgress,
      totalDurationSeconds,
      retentionScore,
      currentStreak,
      chartData,
      maxChartVal,
      calendarDays,
      calendarActiveCount,
      monthLabel: monthStart.format('MMM YYYY'),
      todaySolved,
      todayDuration,
      dailyProgress: Math.min((todaySolved / dailyGoal) * 100, 100),
      revisionQueue,
      recentActivity,
      abandonedCount,
      weakCount,
      hardCount,
      cleanCount
    };
  }, [calendarMonth, dailyGoal, problems, sessions]);

  if (isLoading) {
    return <DeepFocusLoader message="" fullScreen={false} />;
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const runway = state.revisionQueue.length ? state.revisionQueue : problems.slice(0, 4).map(scoreSuggestedProblem);
  const todayMinutes = Math.floor(state.todayDuration / 60);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="-m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[#050506] px-4 py-4 text-white antialiased md:-m-6 md:px-6 md:py-6 xl:-m-8 xl:px-8 xl:py-7"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_46%_0%,rgba(139,125,255,0.14),transparent_32%),radial-gradient(circle_at_92%_22%,rgba(255,255,255,0.04),transparent_24%)]" />

      <div className="relative mx-auto flex max-w-[1500px] flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
          <Panel className="overflow-hidden">
            <div className="grid gap-7 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:p-7">
              <div className="min-w-0">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  <Sparkles size={13} className="text-violet-200" />
                  Revision cockpit
                </div>
                <h1 className="max-w-3xl text-3xl font-semibold leading-[1.02] tracking-tight text-white sm:text-4xl md:text-5xl">
                  {greeting}{displayName ? `, ${displayName}` : ''}. One clean pass beats ten loose solves.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 md:text-[15px]">
                  DeepFocus chooses the next problem that protects your memory, exposes weak thinking, and keeps your practice honest.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button onClick={() => navigate('/today')} className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200">
                    Start revision
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => navigate('/workspace')} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white">
                    Workspace
                    <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Mission</p>
                    <p className="mt-1 text-sm font-semibold text-white">{state.todaySolved}/{dailyGoal} today</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Recover</p>
                    <p className="mt-1 text-sm font-semibold text-white">{state.weakCount} weak solves</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Queue</p>
                    <p className="mt-1 text-sm font-semibold text-white">{state.revisionQueue.length} ready</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <MissionDial progress={state.dailyProgress} />
              </div>
            </div>
          </Panel>

          <RevisionCalendar
            days={state.calendarDays}
            monthLabel={state.monthLabel}
            activeCount={state.calendarActiveCount}
            currentStreak={state.currentStreak}
            onStart={() => navigate('/today')}
            onPrevMonth={() => setCalendarMonth((month) => month.subtract(1, 'month'))}
            onNextMonth={() => setCalendarMonth((month) => month.add(1, 'month'))}
          />
        </div>

        <motion.section variants={itemVariants} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatPill icon={Target} label="Today" value={`${state.todaySolved}/${dailyGoal}`} />
          <StatPill icon={CheckCircle2} label="Mastered" value={`${state.masteryProgress}%`} />
          <StatPill icon={Flame} label="Streak" value={`${state.currentStreak}d`} />
          <StatPill icon={TrendingUp} label="Focus" value={`${state.retentionScore}%`} />
          <StatPill icon={Clock3} label="Deep work" value={formatDuration(state.totalDurationSeconds)} />
          <StatPill icon={RotateCcw} label="Today time" value={`${todayMinutes}m`} />
        </motion.section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <Panel className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Memory runway</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Work ordered by risk, not recency</h2>
              </div>
              <button onClick={() => navigate('/today')} className="w-fit rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.045] hover:text-white">
                Open queue
              </button>
            </div>

            {runway.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <BookOpen size={30} className="text-zinc-700" />
                <p className="mt-3 text-sm font-medium text-zinc-300">No solved problems yet</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-600">Complete one protected session and this becomes your revision runway.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.055]">
                {runway.slice(0, 6).map((item, index) => (
                  <button key={`${item.id}-${index}`} onClick={() => navigate(`/workspace?id=${item.id}`)} className="group grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 text-left transition hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:px-5">
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.075] bg-white/[0.025] text-sm font-semibold text-white">
                      <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${signalColor(item)}`} />
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-zinc-100">{item.title}</h3>
                      <p className="mt-1 truncate text-xs text-zinc-500">{item.suggestionReason}</p>
                    </div>
                    <span className={`hidden shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase sm:inline-flex ${difficultyClass(item.difficulty)}`}>
                      {item.difficulty || 'Medium'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Pressure map</p>
              <h2 className="mt-1 text-lg font-semibold text-white">What needs repair</h2>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {[
                { label: 'Shortcut or gave up', value: state.abandonedCount, icon: ShieldAlert, tone: 'text-rose-100' },
                { label: 'Low focus solves', value: state.weakCount, icon: Radar, tone: 'text-amber-100' },
                { label: 'Hard problems stored', value: state.hardCount, icon: Target, tone: 'text-violet-100' },
                { label: 'Clean solves', value: state.cleanCount, icon: CheckCircle2, tone: 'text-emerald-100' }
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon size={16} className={row.tone} />
                        <span className="truncate text-sm text-zinc-400">{row.label}</span>
                      </div>
                      <span className={`text-lg font-semibold ${row.tone}`}>{row.value}</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full bg-white/40" style={{ width: `${Math.min(row.value * 12, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => navigate('/revision')} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white">
                Inspect sheet
                <ArrowUpRight size={15} />
              </button>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
          <Panel className="p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Practice pulse</p>
                <h2 className="mt-1 text-lg font-semibold text-white">14-day signal</h2>
              </div>
              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-xs text-zinc-500">
                {state.currentStreak} day streak
              </span>
            </div>
            <div className="grid gap-1.5 rounded-xl border border-white/[0.055] bg-black/15 p-3" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
              {state.chartData.map((item, index) => {
                const height = Math.max(18, Math.round((item.value / state.maxChartVal) * 70));
                const fill = item.value === 0 ? 'bg-white/[0.04]' : item.value === 1 ? 'bg-violet-200/25' : item.value < state.maxChartVal ? 'bg-violet-200/45' : 'bg-violet-100/75';
                return (
                  <div key={`${item.day}-${index}`} className="flex h-24 flex-col justify-end">
                    <motion.div
                      initial={{ height: 18 }}
                      animate={{ height }}
                      transition={{ duration: 0.65, delay: index * 0.025, ease }}
                      className={`rounded-md border border-white/[0.06] ${fill}`}
                    />
                    <p className="mt-2 text-center text-[10px] font-medium text-zinc-600">{item.day}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Solved</p>
                <p className="mt-1 text-sm font-semibold text-white">{state.totalSolved}</p>
              </div>
              <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Clean</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100">{state.cleanCount}</p>
              </div>
              <div className="rounded-lg border border-white/[0.055] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">Weak</p>
                <p className="mt-1 text-sm font-semibold text-amber-100">{state.weakCount}</p>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Solve tape</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Latest attempts</h2>
              </div>
              <button onClick={() => navigate('/revision')} className="shrink-0 text-xs font-medium text-zinc-500 transition hover:text-white">View all</button>
            </div>

            {state.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <History className="h-8 w-8 text-zinc-700" />
                <p className="mt-3 text-sm font-medium text-zinc-400">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.055]">
                {state.recentActivity.map((item) => (
                  <button key={item.id} onClick={() => navigate(`/workspace?id=${item.id}`)} className="grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{item.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{item.focus_status || 'Attempted'}</span>
                        <span>/</span>
                        <span>{item.solved_at || item.created_at ? new Date(item.solved_at || item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-sm font-semibold text-zinc-100">{item.focus_score || 0}%</span>
                      <span className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase ${difficultyClass(item.difficulty)}`}>
                        {item.difficulty || 'Medium'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </motion.div>
  );
}
