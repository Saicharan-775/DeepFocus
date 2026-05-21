import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { 
  Target, Zap, Flame, Activity, CheckCircle2, ExternalLink, 
  MessageSquare, Brain, Clock, AlertTriangle, Lightbulb, 
  RefreshCcw, FolderOpen, ChevronDown, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { getProblemPattern, patternPriorityMap } from "../utils/patternMatcher";
import { Icon } from '@iconify/react';

export default function TodaysRevision() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestedProblems, setSuggestedProblems] = useState([]);
  const [algorithmExplanation, setAlgorithmExplanation] = useState(false);
  
  const [viewMode, setViewMode] = useState("list");
  const [expandedPattern, setExpandedPattern] = useState(null);

  const [stats, setStats] = useState({
    totalSolved: 0,
    streak: 0,
    todayTarget: 5,
    todayCompleted: 0,
    retentionRate: 0
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadDashboardData(user.id);
    });
  }, []);

  async function loadDashboardData(userId) {
    const todayStr = dayjs().format('YYYY-MM-DD');
    
    const [pRes, sRes] = await Promise.all([
      supabase.from('revision_problems').select('*').eq('user_id', userId),
      supabase.from('focus_sessions').select('*').eq('user_id', userId)
    ]);
    
    const problems = pRes.data || [];
    const sessions = sRes.data || [];
    
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const strengths = JSON.parse(localStorage.getItem('df_strength') || '{}');
    const srsData = JSON.parse(localStorage.getItem('df_srs_data') || '{}');
    const solvedCount = problems.filter(p => masteredIds.includes(p.id)).length;
    
    const dailyGoal = parseInt(localStorage.getItem('dailyRevisionGoal')) || 5;
    const todayCompletedList = JSON.parse(localStorage.getItem(`revised_${new Date().toDateString()}`)) || [];

    const activeDates = new Set();
    problems.forEach(p => {
       activeDates.add(dayjs(p.created_at).format('YYYY-MM-DD'));
    });
    sessions.forEach(s => {
       activeDates.add(dayjs(s.start_time || s.created_at).format('YYYY-MM-DD'));
    });
    const uniqueDays = [...activeDates].sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    if (uniqueDays.length > 0 && (uniqueDays[0] === todayStr || uniqueDays[0] === dayjs().subtract(1, 'day').format('YYYY-MM-DD'))) {
       streak = 1;
       let current = dayjs(uniqueDays[0]);
       for (let i = 1; i < uniqueDays.length; i++) {
          if (uniqueDays.includes(current.subtract(i, 'day').format('YYYY-MM-DD'))) streak++;
          else break;
       }
    }

    const pendingProblems = problems.filter(p => {
        const srs = srsData[p.id];
        if (!srs) return true;
        return dayjs().startOf('day').diff(dayjs(srs.nextReviewDate).startOf('day'), 'day') >= 0;
    });
    
    const scoredProblems = pendingProblems.map(p => {
        let score = 0;
        let humanReason = "Regular practice to keep your memory sharp.";
        let icon = RefreshCcw;
        let iconColor = "text-emerald-400";
        let iconBg = "bg-emerald-400/10";
        
        const strength = strengths[p.id] || "Normal";
        const srs = srsData[p.id];
        
        if (srs) {
           score += 150; 
           humanReason = "Scheduled for review today to lock it into your long-term memory.";
           icon = Clock; iconColor = "text-emerald-400"; iconBg = "bg-emerald-400/10";
        } else {
            const daysSince = dayjs().diff(dayjs(p.created_at), 'day');
            let decayRisk = 0;
            if (daysSince === 1) decayRisk = 80; 
            else if (daysSince === 3) decayRisk = 85; 
            else if (daysSince === 7) decayRisk = 90; 
            else if (daysSince > 14) decayRisk = Math.min(99, 50 + daysSince * 2); 
            
            if (decayRisk > 0) {
                score += decayRisk * 2;
                if (decayRisk > 80) {
                  humanReason = `It's been ${daysSince} days since you saw this. Review it before you forget it!`;
                  icon = Clock; iconColor = "text-rose-400"; iconBg = "bg-rose-400/10";
                }
            }
        }

        if (strength === "Weakest") {
            score += 300;
            humanReason = "You've marked this as a weak topic. Let's conquer it today.";
            icon = Target; iconColor = "text-violet-400"; iconBg = "bg-violet-400/10";
        }
        
        if (p.focus_status === "Cheated" || p.focus_status === "Give Up") {
            score += 250;
            humanReason = p.focus_status === "Give Up" 
              ? "You gave up on this previously. Give it another try with a fresh mind!" 
              : "You struggled with this before. Try solving it independently this time.";
            icon = RefreshCcw; iconColor = "text-amber-400"; iconBg = "bg-amber-400/10";
        } else if (p.focus_score !== null && p.focus_score < 50) {
            score += (100 - p.focus_score) * 1.5;
            humanReason = "Your focus was low last time. Let's try giving it your full attention!";
            icon = Brain; iconColor = "text-cyan-400"; iconBg = "bg-cyan-400/10";
        }

        if (score === 0) score = 50;

        return { ...p, priorityScore: Math.round(score), humanReason, icon, iconColor, iconBg, pattern: getProblemPattern(p.title) };
    });

    scoredProblems.sort((a, b) => b.priorityScore - a.priorityScore);
    
    const dailySuggestions = scoredProblems.slice(0, dailyGoal);
    setSuggestedProblems(dailySuggestions);
    
    const masteredData = problems.filter(p => masteredIds.includes(p.id));
    const retention = masteredData.length > 0 
      ? Math.round(masteredData.reduce((acc, p) => acc + (p.focus_score || 80), 0) / masteredData.length)
      : 85; 

    setStats({
      totalSolved: solvedCount,
      streak,
      todayTarget: dailyGoal,
      todayCompleted: todayCompletedList.length,
      retentionRate: retention
    });

    setLoading(false);
  }

  const markAsReviewed = async (id) => {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    if (!masteredIds.includes(id)) {
        masteredIds.push(id);
        localStorage.setItem('df_mastered', JSON.stringify(masteredIds));
    }
    
    const todayStr = new Date().toDateString();
    const todayCompletedList = JSON.parse(localStorage.getItem(`revised_${todayStr}`)) || [];
    if (!todayCompletedList.includes(id)) {
        todayCompletedList.push(id);
        localStorage.setItem(`revised_${todayStr}`, JSON.stringify(todayCompletedList));
    }

    const srsData = JSON.parse(localStorage.getItem('df_srs_data') || '{}');
    let srs = srsData[id] || { interval: 0, repetition: 0, easiness: 2.5 };
    
    const quality = 4; 
    
    srs.easiness = Math.max(1.3, srs.easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    if (srs.repetition === 0) {
        srs.interval = 1; 
    } else if (srs.repetition === 1) {
        srs.interval = 6; 
    } else {
        srs.interval = Math.round(srs.interval * srs.easiness);
    }
    
    srs.repetition += 1;
    srs.nextReviewDate = dayjs().add(srs.interval, 'day').toISOString();
    
    srsData[id] = srs;
    localStorage.setItem('df_srs_data', JSON.stringify(srsData));
    
    await supabase.auth.updateUser({
      data: { 
        df_mastered: masteredIds,
        df_srs_data: srsData
      }
    });

    if (user) loadDashboardData(user.id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
       <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-50">
          <div className="w-64 h-64">
             <DotLottieReact
                src="https://lottie.host/5a449ee2-c5f8-439b-9455-6e83cde25682/XXzIGAxwx3.lottie"
                loop
                autoplay
             />
          </div>
          <motion.p 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
             className="text-amber-400 font-medium tracking-widest text-xs uppercase mt-4 animate-pulse"
          >
             Loading your problems...
          </motion.p>
       </div>
    );
  }

  const progressPercent = stats.todayTarget > 0 ? Math.min((stats.todayCompleted / stats.todayTarget) * 100, 100) : 0;

  const renderProblemCard = (p, index, inPattern = false) => {
    const ReasonIcon = p.icon;
    const diffColor = (p.difficulty || '').toLowerCase().startsWith('e') ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : (p.difficulty || '').toLowerCase().startsWith('m') ? 'text-amber-400 border-amber-400/20 bg-amber-400/10' : 'text-rose-400 border-rose-400/20 bg-rose-400/10';

    return (
      <motion.div 
          initial={!inPattern ? { opacity: 0, y: 10 } : false}
          animate={!inPattern ? { opacity: 1, y: 0 } : false}
          transition={!inPattern ? { delay: index * 0.04, ease: "easeOut" } : undefined}
          key={p.id} 
          className="flex items-center justify-between group py-4 px-5 border border-white/5 rounded-xl bg-[#000000] hover:bg-white/[0.02] hover:border-white/10 transition-all shadow-sm"
      >
          <div className="flex items-start gap-4 flex-1 min-w-0">
              <motion.button
							onClick={() => markAsReviewed(p.id)}
							className="mt-0.5 group/tick w-5 h-5 shrink-0 rounded border border-white/20 bg-[#09090b] hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-all relative overflow-hidden"
							title="Mark as Reviewed"
							whileTap={{ scale: 0.9 }}
						>
							<motion.div
								initial={{ opacity: 0, scale: 0.5 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3, ease: "easeOut" }}
								className="text-emerald-400"
							>
								<Icon icon="solar:check-bold" width="14" />
							</motion.div>
						</motion.button>
              
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                      <a href={p.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-300 group-hover:text-white truncate tracking-tight flex items-center gap-2">
                          {p.title}
                          <Icon icon="solar:link-square-linear" width="14" className="text-zinc-600 group-hover:text-zinc-400" />
                      </a>
                      <span className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded border ${diffColor}`}>
                          {p.difficulty}
                      </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs font-medium text-zinc-500">
                      <ReasonIcon size={12} className={p.iconColor} />
                      <span className="truncate">{p.humanReason}</span>
                  </div>
              </div>
          </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-8 text-zinc-100 font-['Inter',sans-serif]"
    >
      <main>
        <motion.header variants={itemVariants} className="mb-12 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-3">
              <div className="flex items-center gap-3">
                 <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5 bg-[#09090b]">
                    <ChevronLeft size={16} className="text-zinc-400" />
                 </button>
                 <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 border border-violet-500/20 rounded">Daily Review</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">Daily Practice</h1>
              <p className="text-zinc-400 font-medium max-w-xl text-sm leading-relaxed">
                 Stop forgetting what you learn. We bring back problems you've solved right before you're about to forget them.
              </p>
           </div>

           <div className="flex items-center gap-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <button 
                onClick={() => setAlgorithmExplanation(!algorithmExplanation)}
                className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${algorithmExplanation ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#09090b] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Lightbulb size={14} />
                How it works
              </button>
           </div>
        </motion.header>

        <AnimatePresence>
          {algorithmExplanation && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="p-8 border border-amber-500/20 bg-amber-500/5 rounded-2xl shadow-xl">
                <h4 className="text-amber-400 font-bold flex items-center gap-2 mb-6">
                  <Brain size={20} /> How this works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Clock size={16} className="text-rose-400"/><h5 className="text-sm font-bold text-white">Remember Better</h5></div>
                    <p className="text-[13px] text-amber-500/60 leading-relaxed font-medium">We show you problems again just before you are likely to forget them.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><Target size={16} className="text-violet-400"/><h5 className="text-sm font-bold text-white">Practice Hard Topics</h5></div>
                    <p className="text-[13px] text-amber-500/60 leading-relaxed font-medium">Topics you find hard will show up more often, so you don't just practice the easy things.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><RefreshCcw size={14} className="text-amber-400 animate-spin-slow"/><h5 className="text-sm font-bold text-white">Fix Weak Spots</h5></div>
                    <p className="text-[13px] text-amber-500/60 leading-relaxed font-medium">Problems where you struggled or gave up will appear more often until you get them right.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KEY METRICS */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-0 mb-10 border border-white/10 rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/10 bg-[#09090b] shadow-2xl">
           {[
              { label: "Today's Target", val: `${stats.todayCompleted}/${stats.todayTarget}`, color: 'text-violet-400' },
              { label: 'Consistency', val: `${stats.streak} Days`, color: 'text-amber-400' },
              { label: 'Memory Score', val: `${stats.retentionRate}%`, color: 'text-emerald-400' },
              { label: 'Mastered', val: stats.totalSolved, color: 'text-cyan-400' }
           ].map((s, i) => (
              <div key={i} className="p-8 group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 group-hover:text-white transition-colors relative z-10">{s.label}</div>
                 <div className={`text-4xl font-extrabold tracking-tight ${s.color} relative z-10 drop-shadow-md`}>{s.val}</div>
              </div>
           ))}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* LEFT: QUEUE */}
           <div className="lg:col-span-8 p-8 border border-white/10 bg-[#09090b] rounded-2xl flex flex-col shadow-2xl relative min-h-[400px]">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Review Queue <span className="ml-2 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-400">{suggestedProblems.length}</span>
                  </h3>
                  {suggestedProblems.length > 0 && (
                    <div className="flex items-center gap-1.5 px-1.5 py-1.5 bg-[#000000] border border-white/5 rounded-lg">
                      <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>List</button>
                      <button onClick={() => setViewMode('pattern')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'pattern' ? 'bg-violet-500/20 text-violet-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Pattern</button>
                    </div>
                  )}
               </div>

               {suggestedProblems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#000000] group">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center text-white/20 mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Icon icon="solar:check-circle-bold-duotone" width="32" className="text-emerald-500/50" />
                      </div>
                      <h4 className="text-white/60 font-bold mb-2 tracking-tight">You're All Caught Up!</h4>
                      <p className="text-white/40 text-sm max-w-[250px] leading-relaxed">
                        Your memory is sharp. There are no problems scheduled for review right now.
                      </p>
                  </div>
               ) : viewMode === 'pattern' ? (() => {
                  const pMap = {};
                  suggestedProblems.forEach(p => {
                    if (!pMap[p.pattern]) pMap[p.pattern] = [];
                    pMap[p.pattern].push(p);
                  });
                  const grouped = Object.keys(pMap)
                    .sort((a, b) => (patternPriorityMap[b] || 0) - (patternPriorityMap[a] || 0))
                    .map(pattern => ({ pattern, items: pMap[pattern] }));
                  
                  return grouped.map(group => {
                    const isExpanded = expandedPattern === group.pattern;
                    return (
                      <div key={group.pattern} className="bg-[#000000] border border-white/5 rounded-xl overflow-hidden mb-3 hover:border-white/10 transition-colors">
                        <button 
                          onClick={() => setExpandedPattern(isExpanded ? null : group.pattern)}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <FolderOpen size={16} className="text-violet-400" />
                            <h3 className="font-bold text-zinc-300 text-sm">{group.pattern}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">{group.items.length}</span>
                          </div>
                          <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/[0.05] bg-[#09090b] flex flex-col p-2 space-y-2">
                              {group.items.map((p, index) => renderProblemCard(p, index, true))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  });
               })() : (
                  <div className="flex-1 space-y-3">
                     {suggestedProblems.map((p, index) => renderProblemCard(p, index, false))}
                  </div>
               )}
           </div>

           {/* RIGHT: PROGRESS & TOOLS */}
           <div className="lg:col-span-4 flex flex-col gap-8">
              <div className="p-8 border border-white/10 bg-[#09090b] rounded-2xl flex flex-col shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-500" />
                  
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-8 relative z-10">Today's Progress</h3>
                  
                  <div className="text-center mb-8 relative z-10">
                    <div className="inline-flex items-baseline justify-center gap-1">
                      <span className="text-[64px] font-extrabold text-white tracking-tighter leading-none drop-shadow-md">{Math.round(progressPercent)}</span>
                      <span className="text-2xl text-emerald-500 font-bold">%</span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-[#000000] rounded-full overflow-hidden relative z-10 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-zinc-500 mt-6 text-center tracking-wide uppercase relative z-10">
                    {stats.todayCompleted >= stats.todayTarget 
                      ? <span className="text-emerald-400">Great job! Goal reached.</span>
                      : `${stats.todayTarget - stats.todayCompleted} more to reach your goal.`}
                  </p>
              </div>

              <div className="p-8 border border-white/10 bg-[#09090b] rounded-2xl flex flex-col shadow-2xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Helpful Tools</h3>
                  <div className="space-y-3">
                     <Link to="/planner" className="flex items-center gap-4 py-3 px-4 border border-white/5 rounded-xl bg-[#000000] hover:bg-amber-500/10 hover:border-amber-500/30 transition-all shadow-sm group">
                       <Icon icon="solar:calendar-bold-duotone" width="20" className="text-amber-400 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                       <span className="text-xs font-bold text-zinc-300 group-hover:text-white">Create a Plan</span>
                     </Link>
                     <Link to="/tutor" className="flex items-center gap-4 py-3 px-4 border border-white/5 rounded-xl bg-[#000000] hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all shadow-sm group">
                       <Icon icon="solar:chat-round-line-bold-duotone" width="20" className="text-cyan-400 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                       <span className="text-xs font-bold text-zinc-300 group-hover:text-white">Ask a Tutor</span>
                     </Link>
                  </div>
              </div>
           </div>
        </motion.div>
      </main>
    </motion.div>
  );
}
