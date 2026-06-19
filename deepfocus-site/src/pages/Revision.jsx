import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  FolderOpen, ShieldAlert, Target, CheckSquare, Search, ExternalLink, FileText, ChevronLeft, ChevronRight, X, Link as LinkIcon, CheckCircle2, ChevronDown, Sparkles,
  Brain, Code, Lightbulb, AlertTriangle, Clock, Database, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RevisionSkeleton } from "../components/Boneyard";
import { refreshRevisionProblems, subscribeRevisionStore, updateRevisionProblem } from "../store/revisionStore";
import { setProblemRevisionNeeded } from "../services/revisionService";
import { getSafeUser } from "../utils/authHelpers";
import { getProblemPattern, patternPriorityMap, normalizeTitle, getSlugFromLink } from "../utils/patternMatcher";
import { getAiSummary } from "../services/aiService";
import curatedQuestions from '../constants/Patterns/curated_questions.json';

const COMPLETED_FOCUS_STATUSES = new Set(["Focus Kept", "Low Focus", "Give Up", "Cheated"]);

function toFocusSeconds(value) {
  const seconds = Number(value || 0);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
}

function formatFocusDuration(value, compact = false) {
  const seconds = toFocusSeconds(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return compact ? `${hours}h ${minutes}m` : `${hours}h ${minutes}m invested`;
  if (minutes > 0) return compact ? `${minutes}m` : `${minutes}m invested`;
  return compact ? "0m" : "Not tracked yet";
}

function parseDbNotes(dbNotes) {
  if (!dbNotes || typeof dbNotes !== 'string') {
    return { userNotes: {}, aiSummary: "" };
  }
  const aiMarker = "### AI Summary";
  const index = dbNotes.indexOf(aiMarker);
  
  let rawUserNotes = "";
  let aiSummary = "";
  
  if (index === -1) {
    rawUserNotes = dbNotes.trim();
  } else {
    rawUserNotes = dbNotes.substring(0, index).trim();
    aiSummary = dbNotes.substring(index + aiMarker.length).trim();
  }
  
  // Try to parse rawUserNotes as JSON
  let userNotes = {};
  if (rawUserNotes) {
    try {
      userNotes = JSON.parse(rawUserNotes);
    } catch (e) {
      // If it's not valid JSON, treat it as plain text and put it in optimal
      userNotes = {
        optimal: rawUserNotes,
        brute: "", bruteTime: "", bruteSpace: "",
        better: "", betterTime: "", betterSpace: "",
        optimalTime: "", optimalSpace: ""
      };
    }
  }
  
  return { userNotes, aiSummary };
}

function parseAiSummary(text) {
  if (!text) return null;

  const patterns = [
    /(?:1\.\s*\*\*Code Review & Mistake\*\*|1\.\s*\*Code Review & Mistake\*|1\.\s*Code Review & Mistake|Code Review & Mistake):?/i,
    /(?:2\.\s*\*\*Cognitive Root Cause \("What made you think like this\?"\)\*\*|2\.\s*\*Cognitive Root Cause \("What made you think like this\?"\)\*|2\.\s*Cognitive Root Cause \("What made you think like this\?"\)|Cognitive Root Cause|Cognitive Root Cause \("What made you think like this\?"\)):?/i,
    /(?:3\.\s*\*\*Correct Approach Tip\*\*|3\.\s*\*Correct Approach Tip\*|3\.\s*Correct Approach Tip|Correct Approach Tip):?/i
  ];

  let part1 = -1, part2 = -1, part3 = -1;
  let len1 = 0, len2 = 0, len3 = 0;

  let m1 = text.match(patterns[0]);
  if (m1) { part1 = text.indexOf(m1[0]); len1 = m1[0].length; }
  
  let m2 = text.match(patterns[1]);
  if (m2) { part2 = text.indexOf(m2[0]); len2 = m2[0].length; }

  let m3 = text.match(patterns[2]);
  if (m3) { part3 = text.indexOf(m3[0]); len3 = m3[0].length; }

  if (part1 !== -1 && part2 !== -1 && part3 !== -1) {
    return {
      mistake: text.substring(part1 + len1, part2).trim().replace(/^:\s*/, ""),
      cause: text.substring(part2 + len2, part3).trim().replace(/^:\s*/, ""),
      tip: text.substring(part3 + len3).trim().replace(/^:\s*/, "")
    };
  }

  const parts = text.split(/(?:1\.|2\.|3\.)/);
  if (parts.length >= 4) {
    return {
      mistake: parts[1].replace(/^\s*\*\*Code Review & Mistake\*\*:\s*/i, "").trim().replace(/^\s*\*Code Review & Mistake\*:\s*/i, "").trim().replace(/^\s*Code Review & Mistake:\s*/i, "").trim(),
      cause: parts[2].replace(/^\s*\*\*Cognitive Root Cause \("What made you think like this\?"\)\*\*:\s*/i, "").trim().replace(/^\s*Cognitive Root Cause \("What made you think like this\?"\):\s*/i, "").trim(),
      tip: parts[3].replace(/^\s*\*\*Correct Approach Tip\*\*:\s*/i, "").trim().replace(/^\s*Correct Approach Tip:\s*/i, "").trim()
    };
  }

  const lines = text.split('\n');
  let currentSec = 'mistake';
  const result = { mistake: "", cause: "", tip: "" };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (/Code Review & Mistake/i.test(trimmed)) {
      currentSec = 'mistake';
      continue;
    } else if (/Cognitive Root Cause/i.test(trimmed)) {
      currentSec = 'cause';
      continue;
    } else if (/Correct Approach/i.test(trimmed)) {
      currentSec = 'tip';
      continue;
    }
    result[currentSec] += (result[currentSec] ? '\n' : '') + line;
  }

  if (result.mistake.trim() || result.cause.trim() || result.tip.trim()) {
    result.mistake = result.mistake.trim().replace(/^:\s*/, "");
    result.cause = result.cause.trim().replace(/^:\s*/, "");
    result.tip = result.tip.trim().replace(/^:\s*/, "");
    return result;
  }

  return {
    mistake: text,
    cause: "",
    tip: ""
  };
}

export default function Revision() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loadSeqRef = useRef(0);

  const [extensionLinked, setExtensionLinked] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: "" });

  const [viewMode, setViewMode] = useState("list"); // 'list' or 'pattern'
  const [expandedPattern, setExpandedPattern] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [masteryFilter, setMasteryFilter] = useState("all");
  const [strengthFilter, setStrengthFilter] = useState("all");



  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  function mapRawProblems(rawData) {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const strengths = JSON.parse(localStorage.getItem('df_strength') || '{}');
    const localNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');

    // Build a curated lookup for enriching DB problems with reliable pattern data
    const curatedByNormTitle = {};
    const curatedByNormSlug = {};
    curatedQuestions.forEach(cq => {
      const normCqTitle = normalizeTitle(cq.title);
      const cqSlugRaw = cq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const normCqSlug = getSlugFromLink(`/problems/${cqSlugRaw}/`);
      if (normCqTitle) curatedByNormTitle[normCqTitle] = cq;
      if (normCqSlug) curatedByNormSlug[normCqSlug] = cq;
    });

    return rawData.map(p => {
      const normTitle = normalizeTitle(p.title);
      const normSlug = getSlugFromLink(p.link);
      const curatedMatch = curatedByNormTitle[normTitle] || curatedByNormSlug[normSlug];
      const hasDbReviewState = typeof p.revision_needed === 'boolean';
      return {
        ...p,
        id: p.id,
        focusStatus: p.focus_status,
        focusScore: Number.isFinite(Number(p.focus_score)) ? Number(p.focus_score) : 0,
        focusDuration: toFocusSeconds(p.focus_duration),
        revised: hasDbReviewState ? !p.revision_needed : masteredIds.includes(p.id),
        revisionNeeded: hasDbReviewState ? p.revision_needed : !masteredIds.includes(p.id),
        strength: strengths[p.id] || "Normal",
        pattern: curatedMatch?.primary_pattern || getProblemPattern(p.title),
        notes: localNotes[p.id] || {},
        dbNotes: p.notes || "",
        added: p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '',
        code: p.code || ''
      };
    }).sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
      return bTime - aTime;
    });
  }

  useEffect(() => {
    const unsubscribeRevisionStore = subscribeRevisionStore((snapshot) => {
      setProblems(mapRawProblems(snapshot.items));
      if (!snapshot.loading) setDataLoading(false);
    });

    loadData();
    const channel = supabase
      .channel('revision_sheet_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => {
        refreshRevisionProblems();
      })
      .subscribe();

    const handleConnectionChange = (e) => {
      if (e.detail && e.detail.connected !== undefined) {
        setExtensionLinked(e.detail.connected);
      }
    };
    window.addEventListener('deepfocus_connection_changed', handleConnectionChange);

    return () => { 
      unsubscribeRevisionStore();
      supabase.removeChannel(channel); 
      window.removeEventListener('deepfocus_connection_changed', handleConnectionChange);
    };
  }, []);

  async function loadData(silent = false) {
    const loadSeq = ++loadSeqRef.current;
    if (!silent) setDataLoading(true);

    try {
      const snapshot = await refreshRevisionProblems();
      if (loadSeq !== loadSeqRef.current) return;
      setProblems(mapRawProblems(snapshot.items));

      const user = await getSafeUser();
      if (user) {
        const { data: conn, error: connErr } = await supabase
          .from('extension_connections')
          .select('created_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (connErr) throw connErr;
        if (loadSeq !== loadSeqRef.current) return;
        setExtensionLinked(!!conn);
      }
    } catch (err) {
      console.error("Failed to load revision problems:", err);
    } finally {
      if (!silent && loadSeq === loadSeqRef.current) {
        setDataLoading(false);
      }
    }
  }

  const filtered = useMemo(() => {
    return [...problems]
      .filter(p => statusFilter === "all" || p.focusStatus === statusFilter)
      .filter(p => difficultyFilter === "all" || p.difficulty === difficultyFilter)
      .filter(p => {
        if (masteryFilter === "all") return true;
        const isMastered = p.revised;
        if (masteryFilter === "Solved") return isMastered;
        if (masteryFilter === "Pending") return !isMastered;
        return true;
      })
      .filter(p => strengthFilter === "all" || p.strength === strengthFilter)
      .filter(p => (p.title || "").toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aValue = a[sortConfig.key], bValue = b[sortConfig.key];
        if (sortConfig.key === "difficulty") {
          const order = { Hard: 3, Medium: 2, Easy: 1 };
          aValue = order[aValue]; bValue = order[bValue];
        }
        if (sortConfig.key === "focusDuration") {
          aValue = toFocusSeconds(aValue);
          bValue = toFocusSeconds(bValue);
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [problems, search, statusFilter, difficultyFilter, masteryFilter, strengthFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  const groupedPatterns = useMemo(() => {
    if (viewMode !== 'pattern') return [];
    const pMap = {};
    filtered.forEach(p => {
      if (!pMap[p.pattern]) pMap[p.pattern] = [];
      pMap[p.pattern].push(p);
    });
    return Object.keys(pMap)
      .sort((a, b) => (patternPriorityMap[b] || 0) - (patternPriorityMap[a] || 0))
      .map(pattern => ({
        pattern,
        items: pMap[pattern]
      }));
  }, [filtered, viewMode]);

  function requestSort(key) {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  }

  async function toggle(id) {
    const problem = problems.find(p => p.id === id);
    if (!problem) return;

    if (String(problem.id).startsWith('optimistic:') || problem.__syncState === 'optimistic' || problem.__syncState === 'queued') {
      setAlertModal({
        open: true,
        message: "This problem is still syncing. Please try again after it appears in your revision sheet."
      });
      return;
    }

    if (!COMPLETED_FOCUS_STATUSES.has(problem.focusStatus)) {
      setAlertModal({
        open: true,
        message: "Complete a DeepFocus session for this problem before marking it as reviewed."
      });
      return;
    }

    const nextRevised = !problem.revised;
    const nextRevisionNeeded = !nextRevised;

    const optimisticPatch = {
      revised: nextRevised,
      revisionNeeded: nextRevisionNeeded,
      revision_needed: nextRevisionNeeded
    };
    setProblems(prev => prev.map(p => p.id === id ? { ...p, ...optimisticPatch } : p));
    updateRevisionProblem(id, optimisticPatch);

    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const newMastered = nextRevised
      ? Array.from(new Set([...masteredIds, id]))
      : masteredIds.filter(i => i !== id);
    localStorage.setItem('df_mastered', JSON.stringify(newMastered));

    const { data: updatedProblem, error } = await setProblemRevisionNeeded(id, nextRevisionNeeded);

    if (error) {
      console.error('[Revision] Failed to update reviewed state:', error.message);
      const rollbackPatch = {
        revised: problem.revised,
        revisionNeeded: problem.revisionNeeded,
        revision_needed: problem.revision_needed
      };
      setProblems(prev => prev.map(p => p.id === id ? {
        ...p,
        ...rollbackPatch
      } : p));
      updateRevisionProblem(id, rollbackPatch);
      localStorage.setItem('df_mastered', JSON.stringify(masteredIds));
      setAlertModal({
        open: true,
        message: "Could not update reviewed state. Please check your connection and try again."
      });
      return;
    }

    if (updatedProblem) {
      updateRevisionProblem(id, updatedProblem);
    }

    supabase.auth.updateUser({
      data: { df_mastered: newMastered }
    }).catch((error) => {
      console.warn('[Revision] Failed to sync legacy mastered metadata:', error?.message || error);
    });
  }

  async function cycleStrength(id, current) {
    const order = { "Weakest": "Normal", "Normal": "Strongest", "Strongest": "Weakest" };
    const newStrength = order[current] || "Normal";
    const strengths = JSON.parse(localStorage.getItem('df_strength') || '{}');
    strengths[id] = newStrength;
    localStorage.setItem('df_strength', JSON.stringify(strengths));
    setProblems(prev => prev.map(p => p.id === id ? { ...p, strength: newStrength } : p));
    
    // Sync with Supabase
    await supabase.auth.updateUser({
      data: { df_strength: strengths }
    });
  }

  function openNotes(id) {
    navigate(`/workspace?id=${id}`);
  }



  const cheated = problems.filter(p => p.focusStatus === "Cheated").length;
  const avgScore = problems.length > 0 ? Math.round(problems.reduce((a, b) => a + (Number(b.focusScore) || 0), 0) / problems.length) : 0;
  const totalFocusSeconds = problems.reduce((total, problem) => total + toFocusSeconds(problem.focusDuration), 0);
  const formattedTotalFocus = formatFocusDuration(totalFocusSeconds, true);

  const handleConnectExtension = async () => {
    setIsConnecting(true);
    try {
      const rawToken = 'dfx_' + crypto.randomUUID().replace(/-/g, '');
      const encoder = new TextEncoder();
      const data = encoder.encode(rawToken.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');

      const { error: rpcError } = await supabase.rpc('upsert_extension_token', {
        p_token_hash: tokenHash
      });

      if (rpcError) throw rpcError;

      setGeneratedToken(rawToken);
      setConnectionModalOpen(true);
      window.postMessage({ type: "DEEPFOCUS_CONNECT", token: rawToken }, window.location.origin);
      
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy token:", err);
          // Fallback
          try {
            const textArea = document.createElement("textarea");
            textArea.value = generatedToken;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch (e) {
            console.error("Fallback copy failed:", e);
          }
        });
    }
  };
  if (dataLoading) {
    return <RevisionSkeleton />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070708] pb-12 text-zinc-100 antialiased selection:bg-violet-400/20 selection:text-white">
      {/* Background Grid & Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070708]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_40%,_rgba(255,255,255,0.015))]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
          }}
        />
        {/* Glow Spheres */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2 py-0.5 rounded-md">Revision Hub</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-100 to-zinc-400">Revision Sheet</h1>
            <p className="text-[#94A3B8] text-sm mt-1">Review your problems and track cognitive performance.</p>
          </div>
          <div>
            <button
              onClick={handleConnectExtension}
              disabled={isConnecting}
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg ${extensionLinked
                ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400 shadow-emerald-400/5'
                : 'bg-[#09090B] text-white hover:bg-white/[0.06] border-white/[0.06] active:scale-95 shadow-white/10'
                }`}
            >
              {extensionLinked ? <CheckCircle2 size={16} /> : <LinkIcon size={16} />}
              {isConnecting ? 'Generating...' : (extensionLinked ? 'Regenerate Token' : 'Generate Token')}
            </button>
          </div>
        </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Problems" value={filtered.length} icon={FolderOpen} />
        <StatCard title="Cheated" value={cheated} icon={ShieldAlert} />
        <StatCard title="Avg Focus" value={`${avgScore}%`} icon={Target} />
        <StatCard title="Time Invested" value={formattedTotalFocus} icon={Clock} />
        <StatCard title="Revised" value={problems.filter(p=>p.revised).length} icon={CheckSquare} />
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap md:flex-nowrap justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <FilterDropdown label="Status" value={statusFilter} options={["all", "Focus Kept", "Cheated", "Give Up", "Low Focus"]} onChange={setStatusFilter} />
            <FilterDropdown label="Difficulty" value={difficultyFilter} options={["all", "Easy", "Medium", "Hard"]} onChange={setDifficultyFilter} />
            <FilterDropdown label="Strength" value={strengthFilter} options={["all", "Weakest", "Normal", "Strongest"]} onChange={setStrengthFilter} />
            <FilterDropdown label="Mastery" value={masteryFilter} options={["all", "Solved", "Pending"]} onChange={setMasteryFilter} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#09090b] border border-white/10 rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>List</button>
              <button onClick={() => setViewMode('pattern')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'pattern' ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Pattern</button>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems..."
                className="w-full md:w-64 bg-[#000000] border border-white/[0.06] rounded-xl py-2 pl-9 pr-4 text-sm text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
        </div>

        {(() => {
          const renderTable = (items) => (
            <div className="mt-6 overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#111827] border-b border-white/[0.06] text-[#94A3B8]">
                  <tr>
                    <th className="p-4 w-12"></th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("title")}>Problem</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("focusStatus")}>Status</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("focusScore")}>Focus Score</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("focusDuration")}>Time Invested</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("difficulty")}>Difficulty</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("strength")}>Strength</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("added")}>Added</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {items.map(p => {
                    const parsedDb = parseDbNotes(p.dbNotes);
                    const hasAiSummary = !!parsedDb.aiSummary;
                    const dbUserNotes = parsedDb.userNotes || {};
                    const localNotes = p.notes || {};
                    const hasUserNotes = (
                      Object.values(localNotes).some(v => typeof v === 'string' && v.trim() !== "") ||
                      Object.values(dbUserNotes).some(v => typeof v === 'string' && v.trim() !== "")
                    );
                    const hasCode = !!p.code;
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={p.revised} onChange={() => toggle(p.id)} className="w-4 h-4 rounded border-gray-600 text-violet-500 focus:ring-violet-500 bg-transparent cursor-pointer" />
                        </td>
                        <td className="p-4 font-medium text-white max-w-[250px] truncate">
                          <a href={p.link} target="_blank" rel="noreferrer" className="hover:text-violet-400 flex items-center gap-2 transition-colors font-semibold">
                            {p.title} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                          </a>
                          {/* Past Attempts Mini-Dots */}
                          {(() => {
                            const history = Array.isArray(p.focus_history) ? p.focus_history : [];
                            if (history.length === 0) return null;
                            const lastThree = history.slice(-3);
                            return (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Attempts:</span>
                                <div className="flex items-center gap-1">
                                  {lastThree.map((att, idx) => {
                                    let dotColor = "bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.4)]";
                                    if (att.status === "Cheated") {
                                      dotColor = "bg-rose-400/80 shadow-[0_0_6px_rgba(248,113,113,0.4)]";
                                    } else if (att.status === "Give Up" || att.status === "Low Focus") {
                                      dotColor = "bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.4)]";
                                    }
                                    const dateStr = att.timestamp ? new Date(att.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A';
                                    return (
                                      <span 
                                        key={idx} 
                                        className={`w-2 h-2 rounded-full border border-black/20 ${dotColor}`} 
                                        title={`Score: ${att.score}% | Status: ${att.status} | Date: ${dateStr}`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-4"><StatusBadge status={p.focusStatus} /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs w-6">{p.focusScore}</span>
                            <div className="w-20 h-1.5 bg-[#000000] rounded-full overflow-hidden">
                              <div style={{ width: p.focusScore + "%" }} className={`h-full ${p.focusScore >= 80 ? 'bg-emerald-400' : p.focusScore >= 50 ? 'bg-violet-500' : 'bg-rose-400'}`} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-xs text-[#CBD5E1]">
                            <Clock size={13} className="text-violet-300/80" />
                            <span className="font-mono">{formatFocusDuration(p.focusDuration, true)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${p.difficulty==='Easy'?'bg-emerald-400/10 text-emerald-400 border-emerald-400/20':p.difficulty==='Medium'?'bg-amber-400/10 text-amber-400 border-amber-400/20':'bg-rose-400/10 text-rose-400 border-rose-400/20'}`}>
                            {p.difficulty}
                          </span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => cycleStrength(p.id, p.strength)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all hover:scale-105 active:scale-95 ${p.strength==='Weakest'?'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.2)]':p.strength==='Strongest'?'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]':'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                            {p.strength}
                          </button>
                        </td>
                        <td className="p-4 text-[#94A3B8] text-xs">{p.added}</td>
                        <td className="p-4">
                          <div className="relative inline-block shrink-0">
                            <button
                              onClick={() => openNotes(p.id)}
                              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                                hasAiSummary
                                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.2)] hover:bg-violet-500/20 hover:border-violet-500/40'
                                  : (hasUserNotes || hasCode)
                                  ? 'text-[#0ea5e9] bg-[#0ea5e9]/8 border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/15'
                                  : 'text-[#64748B] border-transparent hover:bg-white/[0.06] hover:text-white'
                              }`}
                              title={hasAiSummary ? 'View Analysis & Notes' : (hasUserNotes || hasCode) ? 'View/Edit Note' : 'Add Note'}
                            >
                              <FileText size={16} />
                            </button>
                            {hasAiSummary && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );

          return (
            <>
              {viewMode === 'pattern' ? (
                <div className="mt-6 space-y-4">
                  {groupedPatterns.map(group => {
                    const isExpanded = expandedPattern === group.pattern;
                    const completed = group.items.filter(p => p.revised).length;
                    return (
                      <div key={group.pattern} className="bg-[#09090b] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <button 
                          onClick={() => setExpandedPattern(isExpanded ? null : group.pattern)}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                              <FolderOpen size={16} />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-white">{group.pattern}</h3>
                              <p className="text-xs text-[#64748B] mt-0.5">{group.items.length} problems • {completed} mastered</p>
                            </div>
                          </div>
                          <ChevronDown size={20} className={`text-[#64748B] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/[0.06] bg-[#000000]">
                              {renderTable(group.items)}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6">
                  {renderTable(paginated)}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <span className="text-xs text-[#64748B]">Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-white/[0.06] text-[#94A3B8] hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-white/[0.06] text-[#94A3B8] hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {connectionModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#09090B] border border-white/[0.06] rounded-xl w-[500px] p-6 space-y-4">
            <h2 className="text-xl font-semibold text-emerald-400">Connect Your Extension</h2>
            <p className="text-sm text-gray-400">
              Copy the secure token below and paste it into your DeepFocus Chrome Extension popup.
            </p>
            <div className="bg-[#000000] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
              <code className="text-emerald-300 font-mono text-sm break-all">{generatedToken}</code>
              <button
                onClick={copyTokenToClipboard}
                className={`ml-4 px-3 py-1 rounded transition flex items-center gap-2 text-xs font-medium ${copied
                  ? 'bg-emerald-400 text-black'
                  : 'bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400'
                  }`}
              >
                {copied ? <CheckCircle2 size={14} /> : <LinkIcon size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setConnectionModalOpen(false);
                  setGeneratedToken(null);
                  loadData();
                }}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      <AnimatePresence>
        {alertModal.open && (
          <div className="fixed inset-0 bg-[#040405]/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-[#0b0b0c] border border-white/[0.06] rounded-xl w-full max-w-sm shadow-2xl p-8 relative flex flex-col items-center text-center"
            >
              <h3 className="text-sm font-semibold text-white mb-2 tracking-tight">System Message</h3>
              <p className="text-zinc-500 text-xs leading-relaxed mb-6 font-medium">
                {alertModal.message}
              </p>
              <button 
                onClick={() => setAlertModal({ open: false, message: "" })} 
                className="w-full py-2 px-4 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: IconComponent }) {
  return (
    <div className="glass-card p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[#94A3B8]">
        <IconComponent size={20} />
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleClick = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#09090b] border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm focus:outline-none focus:border-violet-500/50 min-w-[140px] justify-between group"
      >
        <span className={value === 'all' ? 'text-zinc-500 font-medium' : 'text-white font-medium'}>
          {value === 'all' ? label : value}
        </span>
        <ChevronDown size={14} className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-48 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="py-1.5 flex flex-col">
              {options.map(o => (
                <button
                  key={o}
                  onClick={() => {
                    onChange(o);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-all ${value === o ? 'bg-violet-500/10 text-violet-400 font-bold border-l-2 border-violet-500' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white border-l-2 border-transparent'}`}
                >
                  {o === 'all' ? `All ${label}s` : o}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Cheated': 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    'Give Up': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'Low Focus': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    'Focus Kept': 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
  };
  return <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${styles[status] || styles['Low Focus']}`}>{status || 'Unknown'}</span>;
}
