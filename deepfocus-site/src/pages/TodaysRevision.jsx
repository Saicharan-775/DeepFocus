import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { 
  Target, CheckCircle2, ExternalLink, 
  MessageSquare, Brain, Clock, AlertTriangle, Lightbulb, 
  RefreshCcw, FolderOpen, ChevronDown, ChevronLeft, Code, Code2,
  Sparkles, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { getProblemPattern, patternPriorityMap } from "../utils/patternMatcher";
import { RevisionSkeleton } from "../components/Boneyard";
import { getSafeUser } from "../utils/authHelpers";
import { getAiPseudoCode } from "../services/aiService";

function parseRevisionNotes(dbNotes) {
  if (!dbNotes || typeof dbNotes !== "string") {
    return { notes: {}, aiSummary: "" };
  }

  const aiMarker = "### AI Summary";
  const markerIndex = dbNotes.indexOf(aiMarker);
  const rawNotes = markerIndex === -1 ? dbNotes.trim() : dbNotes.slice(0, markerIndex).trim();
  const aiSummary = markerIndex === -1 ? "" : dbNotes.slice(markerIndex + aiMarker.length).trim();

  try {
    return { notes: rawNotes ? JSON.parse(rawNotes) : {}, aiSummary };
  } catch {
    return { notes: { optimal: rawNotes }, aiSummary };
  }
}

function parseLearningSummary(text) {
  if (!text) return { mistake: "", fix: "" };
  const clean = (value = "") => value.replace(/\*\*/g, "").replace(/##+/g, "").replace(/^\s*[-:*]+\s*/gm, "").trim();
  const mistakeMatch = text.match(/(?:Code Review & Mistake|Mistake):?\s*([\s\S]*?)(?:Cognitive Root Cause|Correct Approach Tip|Fix|$)/i);
  const fixMatch = text.match(/(?:Correct Approach Tip|Fix):?\s*([\s\S]*)/i);
  return {
    mistake: clean(mistakeMatch?.[1] || ""),
    fix: clean(fixMatch?.[1] || "")
  };
}

export default function TodaysRevision() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestedProblems, setSuggestedProblems] = useState([]);
  const [algorithmExplanation, setAlgorithmExplanation] = useState(false);
  const [hasNoProblems, setHasNoProblems] = useState(false);
  
  const [viewMode, setViewMode] = useState("list");
  const [expandedPattern, setExpandedPattern] = useState(null);
  const [activeProblem, setActiveProblem] = useState(null);
  const [activeSurface, setActiveSurface] = useState("pseudo");
  const [solveMode, setSolveMode] = useState(false);
  const [solveDraft, setSolveDraft] = useState("");

  const [editorPseudoCode, setEditorPseudoCode] = useState("");
  const [editorNotes, setEditorNotes] = useState("");
  const [isNotesSaved, setIsNotesSaved] = useState(true);
  const [pseudoCodeLoading, setPseudoCodeLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (activeProblem) {
      const activeRevision = parseRevisionNotes(activeProblem.notes);
      const activeNotes = activeRevision.notes || {};
      const localNotes = JSON.parse(localStorage.getItem('df_notes') || '{}')[activeProblem.id] || {};
      
      const initPseudo = activeNotes.pseudoCode || activeNotes.mentalModel || localNotes.pseudoCode || localNotes.mentalModel || "";
      const initNotes = activeNotes.optimal || activeNotes.better || activeNotes.brute || localNotes.optimal || localNotes.better || localNotes.brute || "";
      
      setEditorPseudoCode(initPseudo);
      setEditorNotes(initNotes);
      setIsNotesSaved(true);
    } else {
      setEditorPseudoCode("");
      setEditorNotes("");
      setIsNotesSaved(true);
    }
  }, [activeProblem]);

  const handleEditorTextChange = (field, value) => {
    setIsNotesSaved(false);
    if (field === 'pseudo') {
      setEditorPseudoCode(value);
    } else if (field === 'notes') {
      setEditorNotes(value);
    }
  };

  async function handleSaveNotes() {
    if (!activeProblem) return;
    
    const activeRevision = parseRevisionNotes(activeProblem.notes);
    const existingNotesObj = activeRevision.notes || {};
    
    const noteObj = {
      ...existingNotesObj,
      pseudoCode: editorPseudoCode,
      mentalModel: editorPseudoCode,
      optimal: editorNotes,
      better: existingNotesObj.better || editorNotes,
      brute: existingNotesObj.brute || editorNotes
    };
    
    // Save to localStorage
    const allNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    allNotes[activeProblem.id] = noteObj;
    localStorage.setItem('df_notes', JSON.stringify(allNotes));
    
    // Database format
    const finalDbNotes = JSON.stringify(noteObj) + (activeRevision.aiSummary ? "\n\n### AI Summary\n" + activeRevision.aiSummary : "");
    
    try {
      const { error } = await supabase
        .from('revision_problems')
        .update({ notes: finalDbNotes })
        .eq('id', activeProblem.id);
        
      if (error) throw error;
      
      setSuggestedProblems(prev => prev.map(p => p.id === activeProblem.id ? { ...p, notes: finalDbNotes } : p));
      setActiveProblem(prev => prev && prev.id === activeProblem.id ? { ...prev, notes: finalDbNotes } : prev);
      setIsNotesSaved(true);
    } catch (e) {
      console.error("Error saving notes in Today's Revision:", e);
    }
  }

  async function handleGeneratePseudoCode() {
    if (!activeProblem) return;
    setPseudoCodeLoading(true);
    try {
      const generated = await getAiPseudoCode({
        title: activeProblem.title,
        difficulty: activeProblem.difficulty,
        code: activeProblem.code || ""
      });
      setEditorPseudoCode(generated);
      setIsNotesSaved(false);
    } catch (e) {
      console.error("Error generating pseudocode:", e);
    } finally {
      setPseudoCodeLoading(false);
    }
  }

  const handleCopyCode = () => {
    if (!activeProblem?.code) return;
    navigator.clipboard.writeText(activeProblem.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [stats, setStats] = useState({
    totalSolved: 0,
    streak: 0,
    todayTarget: 5,
    todayCompleted: 0,
    retentionRate: 0
  });

  useEffect(() => {
    if (!suggestedProblems.length) {
      setActiveProblem(null);
      return;
    }

    if (!activeProblem || !suggestedProblems.some((p) => p.id === activeProblem.id)) {
      setActiveProblem(suggestedProblems[0]);
      setSolveDraft("");
    }
  }, [suggestedProblems, activeProblem]);

  useEffect(() => {
    async function init() {
      try {
        const user = await getSafeUser();
        setUser(user);
        if (user) {
          await loadDashboardData(user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("TodaysRevision init error:", err);
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadDashboardData(userId) {
    try {
      const todayStr = dayjs().format('YYYY-MM-DD');
    
    const [pRes, sRes] = await Promise.all([
      supabase.from('revision_problems').select('*').eq('user_id', userId),
      supabase.from('focus_sessions').select('*').eq('user_id', userId)
    ]);
    
    const problems = pRes.data || [];
    const sessions = sRes.data || [];
    setHasNoProblems(problems.length === 0);
    
    const problemIds = new Set(problems.map((p) => p.id));
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]')
      .filter((id) => problemIds.has(id));
    const strengths = JSON.parse(localStorage.getItem('df_strength') || '{}');
    const srsData = JSON.parse(localStorage.getItem('df_srs_data') || '{}');
    const solvedCount = problems.filter(p => masteredIds.includes(p.id)).length;
    
    const dailyGoal = parseInt(localStorage.getItem('dailyRevisionGoal')) || 5;
    const todayCompletedKey = `revised_${userId}_${new Date().toDateString()}`;
    const todayCompletedList = (JSON.parse(localStorage.getItem(todayCompletedKey)) || [])
      .filter((id) => problemIds.has(id));

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

    } catch (err) {
      console.error("Failed to load dashboard data in TodaysRevision:", err);
    } finally {
      setLoading(false);
    }
  }

  const markAsReviewed = async (id) => {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    if (!masteredIds.includes(id)) {
        masteredIds.push(id);
        localStorage.setItem('df_mastered', JSON.stringify(masteredIds));
    }
    
    const todayStr = new Date().toDateString();
    const todayCompletedKey = `revised_${user?.id || 'anonymous'}_${todayStr}`;
    const todayCompletedList = JSON.parse(localStorage.getItem(todayCompletedKey)) || [];
    if (!todayCompletedList.includes(id)) {
        todayCompletedList.push(id);
        localStorage.setItem(todayCompletedKey, JSON.stringify(todayCompletedList));
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
    return <RevisionSkeleton />;
  }

  const progressPercent = stats.todayTarget > 0 ? Math.min((stats.todayCompleted / stats.todayTarget) * 100, 100) : 0;

  const renderProblemCard = (p, index, inPattern = false) => {
    const ReasonIcon = p.icon;
    const diffColor = (p.difficulty || '').toLowerCase().startsWith('e') ? 'text-emerald-300 bg-emerald-400/[0.08]' : (p.difficulty || '').toLowerCase().startsWith('m') ? 'text-amber-300 bg-amber-400/[0.08]' : 'text-rose-300 bg-rose-400/[0.08]';
    const isActive = activeProblem?.id === p.id;

    return (
      <motion.div
          initial={!inPattern ? { opacity: 0, y: 10 } : false}
          animate={!inPattern ? { opacity: 1, y: 0 } : false}
          transition={!inPattern ? { delay: index * 0.04, ease: "easeOut" } : undefined}
          key={p.id} 
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveProblem(p);
            setSolveDraft("");
            setSolveMode(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setActiveProblem(p);
              setSolveDraft("");
              setSolveMode(false);
            }
          }}
          className={`group w-full text-left rounded-lg border px-3.5 py-3 transition-all ${
            isActive
              ? 'border-indigo-300/20 bg-indigo-300/[0.08] text-white'
              : 'border-white/[0.045] bg-white/[0.018] text-zinc-400 hover:border-white/[0.09] hover:bg-white/[0.035] hover:text-zinc-200'
          }`}
      >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold tracking-tight">{p.title}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${diffColor}`}>
                  {p.difficulty}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 items-center gap-2 text-[11px] text-zinc-500">
                <ReasonIcon size={12} className={p.iconColor} />
                <span className="truncate">{p.humanReason}</span>
              </div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                markAsReviewed(p.id);
              }}
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-black/20 text-zinc-500 transition-colors hover:border-emerald-300/25 hover:bg-emerald-300/[0.08] hover:text-emerald-200"
              title="Mark as reviewed"
            >
              <CheckCircle2 size={14} />
            </button>
          </div>
      </motion.div>
    );
  };

  const activeRevision = activeProblem ? parseRevisionNotes(activeProblem.notes) : { notes: {}, aiSummary: "" };
  const activeNotes = activeRevision.notes || {};
  const learning = parseLearningSummary(activeRevision.aiSummary);
  const pseudocodeText = activeNotes.pseudoCode || activeNotes.mentalModel || activeNotes.optimal || "";
  const notesText = activeNotes.optimal || activeNotes.better || activeNotes.brute || "";
  const submittedCode = activeProblem?.code || "";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative -m-4 min-h-[calc(100vh-4rem)] overflow-hidden bg-[#060607] text-zinc-100 md:-m-6 xl:-m-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_30%,rgba(255,255,255,0.015))]" />

      <main className="relative flex min-h-[calc(100vh-4rem)] w-full max-w-full flex-col px-4 py-4 md:px-6">
        <motion.header variants={itemVariants} className="mb-4 flex flex-col gap-3 border-b border-white/[0.06] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-zinc-500 transition-colors hover:bg-white/[0.055] hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Daily Revision</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white">Revision Workspace</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-zinc-400">
              <span className="text-zinc-600">Today</span> {stats.todayCompleted}/{stats.todayTarget}
            </div>
            <div className="rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-zinc-400">
              <span className="text-zinc-600">Memory</span> {stats.retentionRate}%
            </div>
            <button
              onClick={() => setAlgorithmExplanation(!algorithmExplanation)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${algorithmExplanation ? 'border-amber-300/20 bg-amber-300/[0.08] text-amber-200' : 'border-white/[0.06] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'}`}
            >
              <Lightbulb size={14} />
              Review Logic
            </button>
          </div>
        </motion.header>

        <AnimatePresence>
          {algorithmExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="rounded-lg border border-amber-300/[0.12] bg-amber-300/[0.035] px-4 py-3 text-sm leading-6 text-amber-100/75">
                Problems are pulled forward when memory is likely to decay, when a pattern is weak, or when the last attempt showed friction.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="grid flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(250px,310px)_minmax(0,1fr)_minmax(280px,360px)]">
          <aside className="flex min-h-[660px] min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#0d0d0f]/94">
            <div className="flex min-h-12 items-center justify-between border-b border-white/[0.06] px-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Queue</p>
                <p className="text-xs text-zinc-500">{suggestedProblems.length} scheduled</p>
              </div>
              {suggestedProblems.length > 0 && (
                <div className="flex rounded-md bg-black/25 p-0.5">
                  <button onClick={() => setViewMode('list')} className={`rounded px-2 py-1 text-[10px] font-semibold ${viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>List</button>
                  <button onClick={() => setViewMode('pattern')} className={`rounded px-2 py-1 text-[10px] font-semibold ${viewMode === 'pattern' ? 'bg-white/[0.08] text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>Pattern</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {suggestedProblems.length === 0 ? (
                hasNoProblems ? (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center py-12">
                    <div className="p-4 bg-violet-500/10 rounded-2xl text-violet-400 mb-4 animate-bounce">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-200">Start Your Spaced Repetition Queue</h4>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
                      Link the DeepFocus extension in settings and start solving LeetCode problems. We will automatically compute your memory decay and schedule them here when you need to review them.
                    </p>
                    <Link
                      to="/settings"
                      className="mt-5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
                    >
                      Connect Extension
                    </Link>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <CheckCircle2 size={34} className="mb-3 text-emerald-400" />
                    <h4 className="text-sm font-semibold text-zinc-300">All caught up</h4>
                    <p className="mt-2 text-xs leading-5 text-zinc-600">No problems are scheduled for review right now.</p>
                  </div>
                )
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
                    <div key={group.pattern} className="mb-2 overflow-hidden rounded-lg border border-white/[0.05] bg-black/20">
                      <button onClick={() => setExpandedPattern(isExpanded ? null : group.pattern)} className="flex w-full items-center justify-between px-3 py-3 text-left">
                        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-zinc-300">
                          <FolderOpen size={14} className="text-zinc-500" />
                          <span className="truncate">{group.pattern}</span>
                        </span>
                        <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="space-y-2 border-t border-white/[0.05] p-2">
                            {group.items.map((p, index) => renderProblemCard(p, index, true))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                });
              })() : (
                <div className="space-y-2">
                  {suggestedProblems.map((p, index) => renderProblemCard(p, index, false))}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-[660px] min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#101012]/94">
            <div className="flex min-h-12 items-center justify-between border-b border-white/[0.06] px-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">{solveMode ? 'Solve Mode' : 'Revision Surface'}</p>
                <h2 className="truncate text-sm font-semibold text-zinc-100">{activeProblem?.title || 'Select a problem'}</h2>
              </div>
              {activeProblem && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setSolveMode(!solveMode)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${solveMode ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200' : 'border-white/[0.06] bg-white/[0.025] text-zinc-500 hover:text-zinc-200'}`}>
                    {solveMode ? 'Review' : 'Solve'}
                  </button>
                  <Link to={`/workspace?id=${activeProblem.id}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025] text-zinc-500 transition-colors hover:text-zinc-200" title="Open full workspace">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              )}
            </div>

            {activeProblem ? (
              solveMode ? (
                <textarea
                  value={solveDraft}
                  onChange={(e) => setSolveDraft(e.target.value)}
                  placeholder={"Rebuild the solution from memory.\n\nStart from the invariant, define state transitions, then write the implementation."}
                  className="min-h-[608px] flex-1 resize-none border-0 bg-[#09090b] p-6 font-mono text-[15px] leading-7 text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0d0d0f] px-2 py-2">
                    <div className="flex gap-1">
                      {[
                        { key: 'pseudo', label: 'Pseudocode', icon: Code },
                        { key: 'notes', label: 'Notes', icon: MessageSquare },
                        { key: 'code', label: 'Code', icon: Code2 }
                      ].map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveSurface(tab.key)}
                            className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${activeSurface === tab.key ? 'bg-white/[0.07] text-white' : 'text-zinc-600 hover:text-zinc-300'}`}
                          >
                            <TabIcon size={13} />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pr-1 font-mono text-xs">
                      {!isNotesSaved && (
                        <button
                          onClick={handleSaveNotes}
                          className="flex h-7 items-center gap-1 rounded bg-indigo-500/20 px-2.5 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-500/30 active:scale-95 cursor-pointer"
                        >
                          <Save size={12} />
                          <span>Save</span>
                        </button>
                      )}

                      {activeSurface === 'pseudo' && (
                        <button
                          onClick={handleGeneratePseudoCode}
                          disabled={pseudoCodeLoading}
                          className="flex h-7 items-center gap-1.5 rounded bg-violet-500/15 border border-violet-500/25 px-2.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/25 disabled:text-zinc-600 active:scale-95 cursor-pointer"
                        >
                          <Sparkles size={12} />
                          <span>{pseudoCodeLoading ? 'Generating...' : 'Generate Approach'}</span>
                        </button>
                      )}

                      {activeSurface === 'code' && submittedCode && (
                        <button
                          onClick={handleCopyCode}
                          className="flex h-7 items-center gap-1 rounded bg-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex min-w-0 flex-1 overflow-hidden bg-[#09090b]">
                    <div className="w-14 shrink-0 select-none border-r border-white/[0.055] bg-[#0d0d0f] py-6 pr-3 text-right font-mono text-xs leading-7 text-zinc-700">
                      {Array.from({ length: Math.max(24, (activeSurface === 'pseudo' ? editorPseudoCode : activeSurface === 'notes' ? editorNotes : (submittedCode || "")).split('\n').length) }).map((_, i) => <div key={i}>{i + 1}</div>)}
                    </div>

                    {activeSurface === 'pseudo' ? (
                      <textarea
                        value={editorPseudoCode}
                        onChange={(e) => handleEditorTextChange('pseudo', e.target.value)}
                        onBlur={handleSaveNotes}
                        placeholder="Generate approach outline or write pseudocode manually..."
                        className="min-h-[560px] min-w-0 flex-1 resize-none border-0 bg-transparent p-6 font-mono text-[15px] leading-7 text-zinc-200 outline-none placeholder:text-zinc-600"
                      />
                    ) : activeSurface === 'notes' ? (
                      <textarea
                        value={editorNotes}
                        onChange={(e) => handleEditorTextChange('notes', e.target.value)}
                        onBlur={handleSaveNotes}
                        placeholder="Write your study notes, key insights, failed attempts, or invariants here..."
                        className="min-h-[560px] min-w-0 flex-1 resize-none border-0 bg-transparent p-6 font-mono text-[15px] leading-7 text-zinc-200 outline-none placeholder:text-zinc-600"
                      />
                    ) : (
                      <pre className="min-h-[560px] min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-6 font-mono text-[15px] leading-7 text-zinc-200">
                        {submittedCode || "No submitted code was captured yet."}
                      </pre>
                    )}
                  </div>
                </>
              )
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">Nothing to revise right now.</div>
            )}
          </section>

          <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#0d0d0f]/94 xl:col-span-2 2xl:col-span-1 2xl:min-h-[660px]">
            <div className="border-b border-white/[0.06] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Reinforcement</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/40">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full bg-emerald-300/70" />
              </div>
              <p className="mt-3 text-xs text-zinc-500">{Math.round(progressPercent)}% of today complete</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 lg:grid-cols-2 2xl:grid-cols-1">
              <div className="rounded-lg border border-rose-300/[0.12] bg-rose-300/[0.035] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-rose-200">
                  <AlertTriangle size={14} />
                  Mistake
                </div>
                <p className="break-words text-sm leading-6 text-zinc-300">{learning.mistake || "Review the skipped transition, wrong assumption, or edge case that made this problem fragile."}</p>
              </div>

              <div className="rounded-lg border border-emerald-300/[0.12] bg-emerald-300/[0.035] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <Lightbulb size={14} />
                  Fix
                </div>
                <p className="break-words text-sm leading-6 text-zinc-300">{learning.fix || "Restate the corrected invariant and the cleaner transition before marking the problem as reviewed."}</p>
              </div>
            </div>

            {activeProblem && (
              <div className="border-t border-white/[0.06] p-4">
                <button onClick={() => markAsReviewed(activeProblem.id)} className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
                  <CheckCircle2 size={16} />
                  Mark Reviewed
                </button>
              </div>
            )}
          </aside>
        </motion.div>
      </main>
    </motion.div>
  );
}
