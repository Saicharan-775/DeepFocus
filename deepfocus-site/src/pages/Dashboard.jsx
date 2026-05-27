import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  History,
  Loader2,
  RotateCcw,
  Target,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRevisionProblems, getSuggestedProblems } from '../services/revisionService';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [suggestedProblem, setSuggestedProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const dailyGoal = parseInt(localStorage.getItem('dailyRevisionGoal')) || 5;

  useEffect(() => {
    async function loadData() {
      const data = await getRevisionProblems();
      setProblems(data);

      const suggested = await getSuggestedProblems(1);
      setSuggestedProblem(suggested?.[0] || null);

      const { supabase } = await import('../lib/supabaseClient');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: sData } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', authUser.id);
        setSessions(sData || []);
      }
    }

    async function init() {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    }
    init();

    let channel;
    import('../lib/supabaseClient').then(({ supabase }) => {
      channel = supabase
        .channel('dashboard_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => loadData())
        .subscribe();
    });

    return () => {
      if (channel) {
        import('../lib/supabaseClient').then(({ supabase }) => supabase.removeChannel(channel));
      }
    };
  }, []);

  const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
  const problemIds = new Set(problems.map((p) => p.id));
  const accountMasteredIds = masteredIds.filter((id) => problemIds.has(id));
  const totalSolved = problems.length;
  const masteredCount = accountMasteredIds.length;
  const masteryProgress = totalSolved > 0 ? Math.round((masteredCount / totalSolved) * 100) : 0;

  const totalDurationSeconds = problems.reduce((acc, p) => acc + (p.focus_duration || 0), 0);
  const totalHours = Math.floor(totalDurationSeconds / 3600);
  const totalMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
  const formattedTime = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

  const scores = problems
    .filter((p) => p.focus_score !== undefined && p.focus_score !== null)
    .map((p) => p.focus_score);
  const retentionScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const activityMap = {};
  problems.forEach((p) => {
    if (p.created_at) {
      const dateKey = dayjs(p.created_at).format('YYYY-MM-DD');
      activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    }
  });
  sessions.forEach((s) => {
    const dateValue = s.start_time || s.created_at;
    if (dateValue) {
      const dateKey = dayjs(dateValue).format('YYYY-MM-DD');
      activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
    }
  });

  let currentStreak = 0;
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (activityMap[todayStr] || activityMap[yesterdayStr]) {
    let checkDate = activityMap[todayStr] ? dayjs(todayStr) : dayjs(yesterdayStr);
    while (activityMap[checkDate.format('YYYY-MM-DD')]) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    }
  }

  const activeDaysInLast7Days = new Set();
  Object.keys(activityMap).forEach((dateKey) => {
    const diffDays = Math.abs(dayjs().diff(dayjs(dateKey), 'day'));
    if (diffDays <= 7) activeDaysInLast7Days.add(dateKey);
  });
  const activeDaysCount = activeDaysInLast7Days.size;

  const chartData = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = dayjs(d).format('YYYY-MM-DD');
    dayLabels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]);
    chartData[6 - i] = activityMap[dateKey] || 0;
  }
  const maxChartVal = Math.max(...chartData, 3);

  const todayProblemsSet = new Set();
  problems.forEach((p) => {
    if (p.created_at && new Date(p.created_at).toDateString() === new Date().toDateString()) {
      todayProblemsSet.add(p.link || p.id);
    }
  });
  sessions.forEach((s) => {
    const dateStr = s.start_time || s.created_at;
    if (dateStr && new Date(dateStr).toDateString() === new Date().toDateString()) {
      todayProblemsSet.add(s.problem_url || s.id);
    }
  });
  const todaySolved = todayProblemsSet.size;

  const todayDuration = sessions.reduce((acc, s) => {
    const dateStr = s.start_time || s.created_at;
    if (dateStr && new Date(dateStr).toDateString() === new Date().toDateString()) {
      return acc + (s.focus_duration || 0);
    }
    return acc;
  }, 0);
  const todayDurationMinutes = Math.floor(todayDuration / 60);
  const dailyProgress = Math.min((todaySolved / dailyGoal) * 100, 100);

  const revisionQueue = problems
    .filter((p) => p.revision_needed !== false || p.focus_status === 'Give Up' || p.focus_status === 'Cheated' || (p.focus_score ?? 100) < 70)
    .slice(0, 5);
  const abandonedProblems = problems.filter((p) => p.focus_status === 'Give Up' || p.focus_status === 'Cheated');
  const recentActivity = problems.slice(0, 5);

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const heroTitle = displayName ? `${timeGreeting}, ${displayName}` : timeGreeting;
  const momentumLine = totalSolved === 0
    ? 'Start your first focused solve.'
    : revisionQueue.length > 0
      ? `${revisionQueue.length} problems are ready for reinforcement.`
      : 'Your revision queue is clear. Keep the loop warm.';

  const stats = [
    { title: 'Daily Target', value: `${todaySolved}/${dailyGoal}`, change: `${Math.round(dailyProgress)}% complete`, icon: Target, color: 'text-violet-300' },
    { title: 'Mastery', value: `${masteryProgress}%`, change: `${masteredCount}/${totalSolved || 0} mastered`, icon: CheckCircle2, color: 'text-emerald-300' },
    { title: 'Streak', value: `${currentStreak}d`, change: `${activeDaysCount} active days`, icon: Flame, color: 'text-amber-300' },
    { title: 'Retention', value: `${retentionScore}%`, change: 'average focus score', icon: TrendingUp, color: 'text-indigo-300' },
    { title: 'Time Invested', value: formattedTime, change: 'deep work logged', icon: Clock, color: 'text-zinc-300' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const CircleProgress = ({ progress, size = 112, strokeWidth = 8, color = 'text-violet-300', label, value }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size}>
          <circle className="text-white/[0.055]" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
          <motion.circle
            className={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-white">{value}</span>
          {label && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="-m-4 min-h-[calc(100vh-4rem)] bg-[#050506] px-4 py-4 text-white antialiased md:-m-6 md:px-6 md:py-6 xl:-m-8 xl:px-8 xl:py-7"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
        <motion.section variants={itemVariants} className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#0b0b0d] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 p-6 md:p-7">
              <div className="mb-8 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                Mastery Console
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">{heroTitle}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 md:text-[15px]">
                {momentumLine} Keep the solve, review, and recall loop moving.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                <button onClick={() => navigate('/today')} className="flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                  Start Daily Revision
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => navigate('/workspace')} className="flex h-10 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                  Open Workspace
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>

            <div className="border-t border-white/[0.06] bg-white/[0.015] p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Today</p>
                  <p className="mt-1 text-sm text-zinc-400">Target completion</p>
                </div>
                <CircleProgress progress={dailyProgress} value={todaySolved} label={`/ ${dailyGoal}`} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Solved</p>
                  <p className="mt-2 text-xl font-semibold">{totalSolved}</p>
                </div>
                <div className="rounded-md border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Mastered</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">{masteredCount}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.title} className="group rounded-lg border border-white/[0.07] bg-[#0d0d0f] p-4 transition-colors hover:bg-white/[0.035]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{stat.title}</p>
                  <StatIcon size={15} className={`${stat.color} opacity-80`} />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-500">{stat.change}</p>
              </div>
            );
          })}
        </motion.section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <motion.section variants={itemVariants} className="rounded-lg border border-white/[0.07] bg-[#0d0d0f]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Revision Flow</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Next reinforcement queue</h2>
              </div>
              <button onClick={() => navigate('/today')} className="hidden rounded-md border border-white/[0.07] px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white sm:block">
                Daily review
              </button>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {(revisionQueue.length ? revisionQueue : problems.slice(0, 3)).map((item) => (
                <button key={item.id} onClick={() => navigate(`/workspace?id=${item.id}`)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.focus_status === 'Give Up' || item.focus_status === 'Cheated' ? 'bg-rose-300' : (item.focus_score ?? 0) < 70 ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                      <h3 className="truncate text-sm font-semibold text-zinc-100">{item.title}</h3>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">{item.focus_status || 'Attempted'} / {item.focus_score ?? 0}% focus</p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase ${item.difficulty === 'Hard' ? 'bg-rose-300/[0.08] text-rose-200' : item.difficulty === 'Easy' ? 'bg-emerald-300/[0.08] text-emerald-200' : 'bg-amber-300/[0.08] text-amber-200'}`}>
                    {item.difficulty || 'Medium'}
                  </span>
                </button>
              ))}

              {problems.length === 0 && (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <BookOpen size={28} className="text-zinc-700" />
                  <p className="mt-3 text-sm font-medium text-zinc-300">No solved problems yet</p>
                  <p className="mt-1 text-xs text-zinc-600">Complete a focused LeetCode session to seed your mastery system.</p>
                </div>
              )}
            </div>
          </motion.section>

          <motion.aside variants={itemVariants} className="rounded-lg border border-white/[0.07] bg-[#0d0d0f]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Up Next</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Continue momentum</h2>
            </div>
            <div className="p-5">
              {suggestedProblem ? (
                <div>
                  <span className="inline-flex rounded bg-violet-300/[0.09] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">Suggested review</span>
                  <h3 className="mt-4 text-xl font-semibold leading-snug text-white">{suggestedProblem.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{suggestedProblem.suggestionReason || 'Recommended for reinforcement based on your recent attempts.'}</p>
                  <button onClick={() => navigate('/today')} className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                    Review now
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-300/50" />
                  <h3 className="mt-3 text-base font-semibold text-white">Queue clear</h3>
                  <p className="mt-2 text-sm text-zinc-500">Your revision loop is clean for now.</p>
                </div>
              )}
            </div>
          </motion.aside>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <motion.section variants={itemVariants} className="rounded-lg border border-white/[0.07] bg-[#0d0d0f] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Consistency</p>
                <h2 className="mt-1 text-lg font-semibold text-white">7-day activity</h2>
              </div>
              <span className="text-xs text-zinc-500">{currentStreak} day streak</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {chartData.map((val, i) => {
                const intensity = val === 0 ? 'bg-white/[0.035]' : val === 1 ? 'bg-emerald-300/20' : val < maxChartVal ? 'bg-emerald-300/40' : 'bg-emerald-300/70';
                return (
                  <div key={`${dayLabels[i]}-${i}`} className="group">
                    <div className={`h-16 rounded-md border border-white/[0.05] ${intensity} transition-colors group-hover:border-white/[0.12]`} />
                    <p className="mt-2 text-center text-[10px] font-medium text-zinc-600">{dayLabels[i]}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="rounded-lg border border-white/[0.07] bg-[#0d0d0f] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Attention</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Weak signals</h2>
              </div>
              <RotateCcw size={16} className="text-zinc-600" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/20 px-3 py-3">
                <span className="text-sm text-zinc-400">Abandoned</span>
                <span className="text-sm font-semibold text-rose-200">{abandonedProblems.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/20 px-3 py-3">
                <span className="text-sm text-zinc-400">Today focus</span>
                <span className="text-sm font-semibold text-zinc-100">{todayDurationMinutes}m</span>
              </div>
              <button onClick={() => navigate('/revision')} className="flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.07] px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white">
                Inspect revision sheet
                <ArrowUpRight size={15} />
              </button>
            </div>
          </motion.section>
        </div>

        <motion.section variants={itemVariants} className="rounded-lg border border-white/[0.07] bg-[#0d0d0f]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Recent Sessions</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Latest problem attempts</h2>
            </div>
            <button onClick={() => navigate('/revision')} className="text-xs font-medium text-zinc-500 transition-colors hover:text-white">View all</button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <History className="h-8 w-8 text-zinc-700" />
              <p className="mt-3 text-sm font-medium text-zinc-400">No recent activity.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.055]">
              {recentActivity.map((item) => (
                <button key={item.id} onClick={() => navigate(`/workspace?id=${item.id}`)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025]">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{item.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>{item.focus_status || 'Attempted'}</span>
                      <span>/</span>
                      <span>{item.solved_at || item.created_at ? new Date(item.solved_at || item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-100">{item.focus_score || 0}%</span>
                    <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${item.difficulty === 'Hard' ? 'bg-rose-300/[0.08] text-rose-200' : item.difficulty === 'Easy' ? 'bg-emerald-300/[0.08] text-emerald-200' : 'bg-amber-300/[0.08] text-amber-200'}`}>
                      {item.difficulty || 'Medium'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
