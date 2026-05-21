import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, Clock, Calendar, CheckCircle2, ChevronRight, Play, Loader2, BrainCircuit, History } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRevisionProblems, getSuggestedProblems } from '../services/revisionService';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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
      if (suggested && suggested.length > 0) {
        setSuggestedProblem(suggested[0]);
      }

      // Fetch focus sessions for streak / active days calculations
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

    // Import supabase dynamically to avoid top-level require errors if not already imported
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
         import('../lib/supabaseClient').then(({supabase}) => supabase.removeChannel(channel));
      }
    };
  }, []);

  // Compute live statistics
  const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
  const totalSolved = problems.length;
  const masteredCount = masteredIds.length;
  
  const totalDurationSeconds = problems.reduce((acc, p) => acc + (p.focus_duration || 0), 0);
  const totalHours = Math.floor(totalDurationSeconds / 3600);
  const totalMinutes = Math.floor((totalDurationSeconds % 3600) / 60);
  const formattedTime = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;

  const scores = problems.filter(p => p.focus_score !== undefined && p.focus_score !== null).map(p => p.focus_score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  // Compute streak (consecutive active days merging problems & sessions)
  const activityMap = {};
  problems.forEach(p => {
     const dateKey = dayjs(p.created_at).format('YYYY-MM-DD');
     activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
  });
  sessions.forEach(s => {
     const dateKey = dayjs(s.start_time || s.created_at).format('YYYY-MM-DD');
     activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
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

  // Active Days count in the last 7 days (merging problems and sessions)
  const activeDaysInLast7Days = new Set();
  problems.forEach(p => {
    if (p.created_at) {
      const diffDays = Math.abs(dayjs().diff(dayjs(p.created_at), 'day'));
      if (diffDays <= 7) {
        activeDaysInLast7Days.add(dayjs(p.created_at).format('YYYY-MM-DD'));
      }
    }
  });
  sessions.forEach(s => {
    const dateStr = s.start_time || s.created_at;
    if (dateStr) {
      const diffDays = Math.abs(dayjs().diff(dayjs(dateStr), 'day'));
      if (diffDays <= 7) {
        activeDaysInLast7Days.add(dayjs(dateStr).format('YYYY-MM-DD'));
      }
    }
  });
  const activeDaysCount = activeDaysInLast7Days.size;

  const stats = [
    { title: 'Total Problems', value: totalSolved.toString(), change: `${masteredCount} Mastered`, icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10', glow: 'from-violet-500/20' },
    { title: 'Active Days', value: `${activeDaysCount} Days`, change: 'Last 7 days', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'from-orange-500/20' },
    { title: 'Time Spent', value: formattedTime, change: 'All time', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-400/10', glow: 'from-emerald-400/20' },
    { title: 'Average Score', value: `${avgScore}%`, change: 'Across all sessions', icon: Calendar, color: 'text-cyan-400', bg: 'bg-cyan-500/10', glow: 'from-cyan-500/20' },
  ];

  // Compute chart data (Last 7 days unique problems solved/revised)
  const chartData = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayLabels.push(['S','M','T','W','T','F','S'][d.getDay()]);
    
    const dayProblemsSet = new Set();
    problems.forEach(p => {
      if (p.created_at && new Date(p.created_at).toDateString() === d.toDateString()) {
        dayProblemsSet.add(p.link);
      }
    });
    sessions.forEach(s => {
      const dateStr = s.start_time || s.created_at;
      if (dateStr && new Date(dateStr).toDateString() === d.toDateString()) {
        dayProblemsSet.add(s.problem_url);
      }
    });
    chartData[6-i] = dayProblemsSet.size;
  }
  const maxChartVal = Math.max(...chartData, 5); // Minimum scale of 5

  // Compute daily progress
  const todayProblemsSet = new Set();
  problems.forEach(p => {
    if (p.created_at && new Date(p.created_at).toDateString() === new Date().toDateString()) {
      todayProblemsSet.add(p.link);
    }
  });
  sessions.forEach(s => {
    const dateStr = s.start_time || s.created_at;
    if (dateStr && new Date(dateStr).toDateString() === new Date().toDateString()) {
      todayProblemsSet.add(s.problem_url);
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

  const targets = [
    { label: 'Daily Solve Goal', progress: Math.min((todaySolved / dailyGoal) * 100, 100), current: todaySolved, total: dailyGoal, color: 'bg-violet-500' },
    { label: 'Master a Problem', progress: masteredCount > 0 ? 100 : 0, current: masteredCount > 0 ? 1 : 0, total: 1, color: 'bg-emerald-400' },
    { label: '60 Min Focus Time', progress: Math.min((todayDurationMinutes / 60) * 100, 100), current: `${todayDurationMinutes}m`, total: '60m', color: 'bg-orange-500' },
  ];

  const recentActivity = problems.slice(0, 4);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const hour = new Date().getHours();
  let timeGreeting = 'Good evening';
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 18) timeGreeting = 'Good afternoon';
  
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];
  const greetingText = displayName ? `${timeGreeting}, ${displayName} 👋` : `${timeGreeting} 👋`;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Helper for circular progress
  const CircleProgress = ({ progress, size = 120, strokeWidth = 8, color = "text-violet-500", label, value }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="text-white/[0.05]"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
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
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-white tracking-tight">{value}</span>
          {label && <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mt-0.5">{label}</span>}
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      className="mx-auto max-w-[1200px] p-6 lg:p-10 text-white font-sans antialiased space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {greetingText}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Overview of your learning progress and upcoming reviews.
          </p>
        </div>
      </motion.div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ROW 1: Progress & Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Main Progress Card (LeetCode Style) */}
          <motion.div variants={itemVariants} className="bg-[#0c0c0c] border border-white/[0.06] rounded-2xl p-6 flex flex-col h-full">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-6">Daily Target</h2>
            <div className="flex-1 flex flex-col items-center justify-center pb-4">
              <CircleProgress 
                progress={targets[0].progress} 
                value={targets[0].current} 
                label={`/ ${targets[0].total}`}
                size={160} 
                strokeWidth={10}
                color="text-emerald-400" 
              />
              <div className="mt-8 w-full flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-sm font-semibold text-white">{totalSolved}</div>
                  <div className="text-xs text-zinc-500 mt-1">Total Solved</div>
                </div>
                <div className="h-8 w-px bg-white/[0.06]" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-emerald-400">{masteredCount}</div>
                  <div className="text-xs text-zinc-500 mt-1">Mastered</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-[#0c0c0c] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.02] transition-colors relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{stat.title}</div>
                <stat.icon size={16} className={`${stat.color} opacity-80`} />
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight text-white mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-zinc-500 group-hover:text-zinc-400 transition-colors">{stat.change}</div>
              </div>
            </motion.div>
          ))}
          
          {/* Heatmap / Activity Row */}
          <motion.div variants={itemVariants} className="col-span-2 md:col-span-4 bg-[#0c0c0c] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">7-Day Activity</h2>
              <div className="text-xs text-zinc-400 font-medium">{currentStreak} Day Streak</div>
            </div>
            
            <div className="flex items-end justify-between h-24 gap-2">
              {chartData.map((val, i) => {
                const heightPercent = (val / maxChartVal) * 100;
                // Heatmap logic for block color intensity
                let bgColor = "bg-white/[0.04]";
                if (val > 0) bgColor = "bg-emerald-500/20";
                if (val >= Math.max(2, maxChartVal * 0.5)) bgColor = "bg-emerald-500/50";
                if (val >= maxChartVal && val > 0) bgColor = "bg-emerald-400";

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-xs font-medium text-white px-2 py-1 rounded border border-white/10 pointer-events-none z-20 whitespace-nowrap">
                      {val} problems
                    </div>
                    {/* Linear Bar / Heatmap Hybrid */}
                    <div className="w-full relative flex items-end justify-center flex-1 rounded-md bg-[#151515] overflow-hidden border border-white/[0.05]">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                        className={`w-full ${val > 0 ? bgColor : ''} transition-colors`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase">{dayLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ROW 2: Activity & Suggested */}
        <div className="lg:col-span-8">
          <motion.div variants={itemVariants} className="bg-[#0c0c0c] border border-white/[0.06] rounded-2xl overflow-hidden h-full">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Recent Sessions</h2>
              <button onClick={() => navigate('/revision')} className="text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                View All →
              </button>
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <History className="h-8 w-8 text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-400">No recent activity.</p>
                <p className="text-xs text-zinc-500 mt-1">Your solved problems will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Health Indicator */}
                      <div className={`w-2 h-2 rounded-full ${item.focus_score >= 80 ? 'bg-emerald-400' : item.focus_score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                      <div>
                        <h4 className="text-sm font-medium text-white">{item.title}</h4>
                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>{item.focus_status}</span>
                          <span>•</span>
                          <span>{item.solved_at || item.created_at ? new Date(item.solved_at || item.created_at).toLocaleDateString([], {month:'short', day:'numeric'}) : 'Today'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{item.focus_score || 0}%</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Score</div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded font-semibold uppercase tracking-wider
                        ${item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                        {item.difficulty || 'Medium'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="lg:col-span-4">
          <motion.div variants={itemVariants} className="bg-[#0c0c0c] border border-white/[0.06] rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-white/[0.06] bg-white/[0.01]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Up Next</h2>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center">
              {suggestedProblem ? (
                <div className="space-y-6">
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/[0.06] text-zinc-300 border border-white/[0.08] mb-3">
                      Suggested Review
                    </span>
                    <h3 className="text-lg font-semibold text-white leading-snug">{suggestedProblem.title}</h3>
                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                      {suggestedProblem.suggestionReason || "Recommended for review based on your learning curve."}
                    </p>
                  </div>
                  
                  <button onClick={() => navigate('/revision')} className="w-full h-10 bg-white hover:bg-zinc-200 text-black rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    Review Now <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto border border-white/[0.08]">
                    <CheckCircle2 className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">All Caught Up</h3>
                    <p className="text-sm text-zinc-400 mt-1">Your revision queue is currently empty.</p>
                  </div>
                  <button onClick={() => navigate('/planner')} className="w-full h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] rounded-lg text-sm font-medium transition-colors mt-2">
                    Open Planner
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
