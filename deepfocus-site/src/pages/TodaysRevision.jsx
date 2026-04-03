import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Target,
  Settings,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Flame,
  RefreshCw,
  ExternalLink,
  Plus,
  ArrowRight,
  MoreHorizontal,
  Clock,
  Undo2,
  FileText,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { getSuggestedProblems } from "../services/revisionService";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";
import AuthPage from "../components/AuthPage";
import DashboardNav from "../components/DashboardNav";

export default function TodaysRevision() {
  const [session, setSession] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revisedToday, setRevisedToday] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(() => {
    return parseInt(localStorage.getItem('dailyRevisionGoal')) || 5;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempGoal, setTempGoal] = useState(dailyGoal);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadSuggestions() {
    setLoading(true);
    const suggested = await getSuggestedProblems(dailyGoal);
    setProblems(suggested);

    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem(`revised_${today}`)) || [];
    setRevisedToday(stored);

    setLoading(false);
  }

  const [calendarData, setCalendarData] = useState({ sessions: [], problems: [] });
  const [viewState, setViewState] = useState({ month: dayjs().month(), year: dayjs().year() });

  useEffect(() => {
    if (session) {
      loadSuggestions();
      // Also load data for the mission calendar
      (async () => {
        const [sRes, pRes] = await Promise.all([
          supabase.from('focus_sessions').select('*').eq('user_id', session.user.id).order('start_time', { ascending: true }),
          supabase.from('revision_problems').select('*').eq('user_id', session.user.id)
        ]);
        setCalendarData({ sessions: sRes.data || [], problems: pRes.data || [] });
      })();
    }
  }, [session, dailyGoal]);

  const gridDays = useMemo(() => {
    const startOfMonth = dayjs().year(viewState.year).month(viewState.month).startOf('month');
    const endOfMonth = startOfMonth.endOf('month');

    let startDayOfWeek = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1;
    const startDate = startOfMonth.subtract(startDayOfWeek, 'day');

    let endDayOfWeek = endOfMonth.day() === 0 ? 6 : endOfMonth.day() - 1;
    const endDate = endOfMonth.add(6 - endDayOfWeek, 'day');

    const result = [];
    let curr = startDate;
    while (curr.isBefore(endDate.add(1, 'day'))) {
      result.push({ date: curr, inMonth: curr.month() === viewState.month, isPast: curr.isBefore(dayjs(), 'day') });
      curr = curr.add(1, 'day');
    }
    return result;
  }, [viewState]);

  const toggleRevised = (id) => {
    const today = new Date().toDateString();
    let newRevised;

    // Global Mastered State sync
    const currentMastered = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    let newMastered = [...currentMastered];

    if (revisedToday.includes(id)) {
      newRevised = revisedToday.filter(i => i !== id);
      newMastered = newMastered.filter(i => i !== id);
    } else {
      newRevised = [id, ...revisedToday];
      if (!newMastered.includes(id)) {
        newMastered.push(id);
      }

      // Every click pop
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#FFFFFF', '#4F46E5']
      });

      // Mission complete big celebration
      if (newRevised.length >= Math.min(problems.length, dailyGoal)) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFFFFF', '#4F46E5', '#10B981']
        });
      }
    }
    setRevisedToday(newRevised);
    localStorage.setItem(`revised_${today}`, JSON.stringify(newRevised));
    localStorage.setItem('df_mastered', JSON.stringify(newMastered));
    
    // Notify other components (like Insights)
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveSettings = () => {
    setDailyGoal(tempGoal);
    localStorage.setItem('dailyRevisionGoal', tempGoal);
    setSettingsOpen(false);
  };

  const completedCount = revisedToday.filter(id => problems.some(p => p.id === id)).length;
  const targetCompleted = Math.min(problems.length, dailyGoal);
  const progressPercent = targetCompleted > 0 ? (completedCount / targetCompleted) * 100 : 0;

  if (!session) return <AuthPage />;

  return (
    <div className="min-h-screen bg-[#000] text-[#EDEDED] font-sans selection:bg-white selection:text-black antialiased selection:rounded-none">

      {/* BACKGROUND TEXTURE */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <DashboardNav />

      <div className="max-w-[1200px] mx-auto px-6 py-40 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16">

        {/* LEFT COLUMN: PRIMARY MISSION CONTROL */}
        <section className="lg:col-span-7 space-y-12">
          <header className="relative">

            <h1 className="text-4xl font-bold tracking-tight text-white/90 mb-4 font-['Outfit']">Daily Mission</h1>
            <p className="text-[#666] text-[15px] max-w-md leading-relaxed">
              Curated problem-sets based on your <span className="text-white">Cognitive Performance Trace</span> and failure patterns.
            </p>

            {/* CLASSY PROGRESS DOCK */}
            <div className="mt-10 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -z-10 group-hover:bg-indigo-500/10 transition-all" />
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444] block mb-2">Current Completion</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white tracking-tighter">{completedCount}</span>
                    <span className="text-sm font-medium text-[#444]">/ {targetCompleted} Solved</span>
                  </div>
                </div>
                <button
                  onClick={() => { setTempGoal(dailyGoal); setSettingsOpen(true); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Adjust Goal
                </button>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                />
              </div>
            </div>
          </header>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#414141]">Today's Recommendations</span>
            </div>

            <div className="divide-y divide-white/[0.03] bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              {loading ? (
                <div className="p-12 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 bg-white/5 animate-pulse rounded-xl" />)}
                </div>
              ) : problems.length > 0 ? (
                problems.map((p, idx) => (
                  <ProblemRow
                    key={p.id}
                    problem={p}
                    isRevised={revisedToday.includes(p.id)}
                    onToggle={toggleRevised}
                  />
                ))
              ) : (
                <div className="py-24 text-center">
                  <p className="text-[#333] text-[10px] font-black uppercase tracking-[0.4em]">Grid is Empty</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: SYSTEM SCRATCHPAD */}
        <section className="lg:col-span-5 space-y-10">

          {/* DAILY INTENT: CLASSY FLOATING DOCK */}
          <div className="p-10 rounded-[2.5rem] bg-[#0A0A0A] border border-white/10 relative overflow-hidden group shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                  <FileText size={14} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20">Daily Intent</h3>
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
              </div>
            </div>

            <DailyTasks />
          </div>

          {/* MISSION CALENDAR: COMPACT MONTHLY VIEW */}
          <div className="p-8 rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10">
                  <Target size={14} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-0.5">Performance</h3>
                  <h4 className="text-[14px] font-bold uppercase tracking-widest text-white/80 font-['Outfit']">
                    {dayjs().month(viewState.month).format("MMMM YYYY")}
                  </h4>
                </div>
              </div>
              <div className="flex items-center bg-white/5 rounded-lg border border-white/5">
                <button onClick={() => setViewState(s => ({ ...s, month: s.month === 0 ? 11 : s.month - 1 }))} className="p-1 px-2.5 hover:bg-white/10 rounded-md transition-all text-white/20 hover:text-white">
                  <Icon icon="solar:alt-arrow-left-linear" width="12" />
                </button>
                <button onClick={() => setViewState(s => ({ ...s, month: (s.month + 1) % 12 }))} className="p-1 px-2.5 hover:bg-white/10 rounded-md transition-all text-white/20 hover:text-white">
                  <Icon icon="solar:alt-arrow-right-linear" width="12" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[8px] font-black text-white/10 uppercase mb-3">{d}</div>
              ))}
              {gridDays.map((day, i) => {
                const dStr = day.date.format('YYYY-MM-DD');
                const dayProblems = calendarData.problems.filter(p => dayjs(p.solved_at || p.created_at).format('YYYY-MM-DD') === dStr);
                const solveCount = dayProblems.length;
                const isToday = dStr === dayjs().format('YYYY-MM-DD');

                return (
                  <div key={i} className={`flex items-center justify-center aspect-square ${!day.inMonth ? 'opacity-0 pointer-events-none' : ''}`}>
                    {solveCount > 0 ? (
                      <motion.div
                        whileHover={{ scale: 1.15, y: -2 }}
                        className={`relative w-8 h-8 rounded-xl border flex items-center justify-center text-[12px] cursor-pointer group/day transition-all bg-orange-600/10 border-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.15)]`}
                      >
                        🔥
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-3 bg-[#080809] border border-white/10 rounded-xl opacity-0 group-hover/day:opacity-100 transition-all z-50 pointer-events-none shadow-2xl min-w-[100px] text-center scale-90 group-hover/day:scale-100">
                          <p className="text-[9px] font-black uppercase text-white/20 border-b border-white/5 pb-1.5 mb-1.5 tracking-widest">{day.date.format('MMM DD')}</p>
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-white/40 uppercase">Solves</span>
                            <span className="text-white">{solveCount}</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className={`w-8 h-8 flex items-center justify-center text-[9px] font-bold transition-all ${day.isPast ? 'text-white/20' : 'text-white/5'} ${isToday ? 'border border-white/10 rounded-xl text-white/40 bg-white/5' : ''}`}>
                        {day.isPast ? '😭' : day.date.date()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                <span className="text-[18px] font-bold text-white mb-0.5 tracking-tighter">14d</span>
                <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">Live Streak</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col items-center">
                <span className="text-[18px] font-bold text-white mb-0.5 tracking-tighter">92%</span>
                <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">Efficiency</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* REFINED CONFIG MODAL */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 30 }}
              className="bg-[#0A0A0A] border border-white/10 p-12 w-full max-w-sm rounded-2xl relative shadow-2xl"
            >
              <h2 className="text-xl font-semibold mb-1 text-white uppercase tracking-widest">Goal</h2>
              <p className="text-[#A1A1AA] text-xs mb-10">Set your daily solve target.</p>

              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex justify-between items-baseline mb-2 text-[10px] font-black tracking-widest uppercase text-[#71717A]">
                    <span>Target Volume</span>
                    <span className="text-3xl font-black text-white">{tempGoal}</span>
                  </div>
                  <input
                    type="range" min="1" max="15" value={tempGoal}
                    onChange={(e) => setTempGoal(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-white hover:accent-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSaveSettings}
                    className="w-full bg-white text-black font-extrabold py-3.5 rounded-lg text-[10px] tracking-widest uppercase transition-all hover:bg-[#D4D4D4]"
                  >
                    Commit Configuration
                  </button>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="w-full text-[#71717A] transition-colors text-[10px] font-bold uppercase tracking-[0.3em] pt-4"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function DailyTasks() {
  const [tasks, setTasks] = useState(() => {
    return JSON.parse(localStorage.getItem('dailyScratchpad')) || [
      { id: 1, text: "Revise DP patterns", done: false },
      { id: 2, text: "Finish 3 Mediums", done: false }
    ];
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem('dailyScratchpad', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      setTasks([...tasks, { id: Date.now(), text: input, done: false }]);
      setInput("");
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 group/item">
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-3 h-3 rounded-full border transition-all ${task.done ? 'bg-white border-white' : 'border-white/20'}`}
            />
            <span className={`text-[11px] font-medium leading-tight flex-1 transition-all ${task.done ? 'line-through text-[#444]' : 'text-[#A1A1AA]'}`}>
              {task.text}
            </span>
            <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover/item:opacity-100 transition-opacity">
              <X size={10} className="text-[#444] hover:text-white" />
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={addTask}
        placeholder="+ Add task..."
        className="w-full bg-transparent border-t border-white/5 pt-3 text-[11px] font-medium text-white placeholder:text-[#333] focus:outline-none transition-all focus:placeholder:text-[#555]"
      />
    </div>
  );
}

function ProblemRow({ problem, isRevised, onToggle }) {
  const priorityColor = {
    1: 'bg-rose-500',
    2: 'bg-amber-500',
    3: 'bg-indigo-500',
    4: 'bg-emerald-500',
    5: 'bg-[#52525B]',
  }[problem.priorityLevel] || 'bg-[#52525B]';

  return (
    <div className={`group relative flex items-center justify-between p-5 border-b border-white/[0.03] transition-all bg-transparent hover:bg-white/[0.01] ${isRevised ? 'opacity-30' : ''}`}>

      {/* clickable link area */}
      <a
        href={problem.link}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-6 min-w-0 flex-1 no-underline"
      >
        <div className={`w-1 h-3 rounded-full ${priorityColor} transition-all duration-300 group-hover:h-5 opacity-40 group-hover:opacity-100`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[#EDEDED] font-bold text-sm truncate group-hover:text-white transition-colors duration-300">
              {problem.title}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest ${problem.difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-400/5' :
              problem.difficulty === 'Medium' ? 'text-amber-400 bg-amber-400/5' : 'text-rose-400 bg-rose-400/5'
              }`}>
              {problem.difficulty}
            </span>

            {/* NOTES INDICATOR */}
            {problem.notes && problem.notes.trim() !== "" && (
              <FileText size={12} className="text-[#71717A] group-hover:text-white transition-colors" />
            )}
          </div>
          <p className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest truncate group-hover:text-white/50 transition-colors">
            {problem.suggestionReason}
          </p>
        </div>
      </a>

      <div className="flex items-center gap-6 ml-6 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[9px] font-black text-[#71717A] uppercase tracking-[0.2em] mb-0.5">Focus Score</span>
          <span className="text-xs font-mono font-bold text-[#A1A1AA] group-hover:text-white transition-colors">{problem.focus_score}%</span>
        </div>

        <div className="flex items-center gap-2">
          {isRevised ? (
            <button
              onClick={() => onToggle(problem.id)}
              className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-widest text-[#71717A] hover:text-white hover:border-white/20 transition-all active:scale-95"
              title="Restore to mission"
            >
              <Undo2 size={12} />
              Revert
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(problem.id)}
                className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase rounded-lg tracking-widest transition-all hover:bg-[#D4D4D4] active:scale-95 shadow-xl border border-white"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Status({ status }) {
  const styles = {
    'Cheated': 'bg-red-500/20 text-red-400 border border-red-500/20',
    'Give Up': 'bg-orange-500/20 text-orange-400 border border-orange-500/20',
    'Low Focus': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20',
    'Focus Kept': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
  };

  return (
    <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md ${styles[status] || styles['Low Focus']}`}>
      {status || 'Unknown'}
    </span>
  );
}

const MemoStat = React.memo(function Stat({ title, value, icon: IconComponent }) {
  return (
    <div className="bg-[#121212] border border-white/10 rounded-xl p-6 flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </div>
      {IconComponent && <IconComponent size={26} className="text-gray-500" />}
    </div>
  );
});
