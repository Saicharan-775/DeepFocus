import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  FolderOpen, ShieldAlert, Target, CheckSquare, Search, ExternalLink, FileText, ChevronLeft, ChevronRight, X, Link as LinkIcon, CheckCircle2, ChevronDown
} from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion, AnimatePresence } from "framer-motion";
import { getRevisionProblems } from "../services/revisionService";
import { getProblemPattern, patternPriorityMap } from "../utils/patternMatcher";

export default function Revision() {
  const [problems, setProblems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [extensionLinked, setExtensionLinked] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [viewMode, setViewMode] = useState("list"); // 'list' or 'pattern'
  const [expandedPattern, setExpandedPattern] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [masteryFilter, setMasteryFilter] = useState("all");
  const [strengthFilter, setStrengthFilter] = useState("all");

  const [notesModal, setNotesModal] = useState({
    open: false, id: null, activeTab: 'brute',
    brute: "", bruteTime: "", bruteSpace: "",
    better: "", betterTime: "", betterSpace: "",
    optimal: "", optimalTime: "", optimalSpace: ""
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    setDataLoading(true);
    const rawData = await getRevisionProblems();
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const strengths = JSON.parse(localStorage.getItem('df_strength') || '{}');

    const mapped = rawData.map(p => ({
      ...p,
      id: p.id,
      focusStatus: p.focus_status,
      focusScore: p.focus_score,
      focusDuration: p.focus_duration || 0,
      revised: masteredIds.includes(p.id),
      strength: strengths[p.id] || "Normal",
      pattern: getProblemPattern(p.title),
      notes: JSON.parse(localStorage.getItem('df_notes') || '{}')[p.id] || {},
      added: p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''
    }));

    setProblems(mapped);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: conn } = await supabase
        .from('extension_connections')
        .select('created_at')
        .eq('user_id', user.id)
        .maybeSingle();
      setExtensionLinked(!!conn);
    }
    
    setDataLoading(false);
  }

  const filtered = useMemo(() => {
    return problems
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
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    let newMastered;
    if (masteredIds.includes(id)) newMastered = masteredIds.filter(i => i !== id);
    else newMastered = [...masteredIds, id];
    localStorage.setItem('df_mastered', JSON.stringify(newMastered));
    setProblems(prev => prev.map(p => p.id === id ? { ...p, revised: !p.revised } : p));
    
    // Sync with Supabase
    await supabase.auth.updateUser({
      data: { df_mastered: newMastered }
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
    const problem = problems.find(p => p.id === id);
    const localNotes = problem?.notes || {};
    setNotesModal({
      open: true, id, activeTab: 'brute',
      ...localNotes
    });
  }

  async function saveNotes() {
    const allNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    allNotes[notesModal.id] = {
      brute: notesModal.brute, bruteTime: notesModal.bruteTime, bruteSpace: notesModal.bruteSpace,
      better: notesModal.better, betterTime: notesModal.betterTime, betterSpace: notesModal.betterSpace,
      optimal: notesModal.optimal, optimalTime: notesModal.optimalTime, optimalSpace: notesModal.optimalSpace
    };
    localStorage.setItem('df_notes', JSON.stringify(allNotes));
    loadData();
    setNotesModal({ open: false, id: null });
    
    // Sync with Supabase
    await supabase.auth.updateUser({
      data: { df_notes: allNotes }
    });
  }

  const cheated = problems.filter(p => p.focusStatus === "Cheated").length;
  const avgScore = problems.length > 0 ? Math.round(problems.reduce((a, b) => a + b.focusScore, 0) / problems.length) : 0;

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
      window.postMessage({ type: "DEEPFOCUS_CONNECT", token: rawToken }, "*");
      
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (generatedToken) {
      try {
        // Use the modern clipboard API to set multiple MIME types
        const type = "text/plain";
        const blob = new Blob([generatedToken], { type });
        const internalBlob = new Blob(["true"], { type: "text/deepfocus-internal" });
        const data = [new ClipboardItem({ 
          [type]: blob, 
          "text/deepfocus-internal": internalBlob 
        })];
        
        navigator.clipboard.write(data).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      } catch (err) {
        // Fallback for browsers that don't support ClipboardItem with custom types fully
        navigator.clipboard.writeText(generatedToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (dataLoading) {
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
          className="text-violet-400 font-medium tracking-widest text-xs uppercase mt-4 animate-pulse"
        >
          Loading your revision list...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Revision Sheet</h1>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Problems" value={filtered.length} icon={FolderOpen} />
        <StatCard title="Cheated" value={cheated} icon={ShieldAlert} />
        <StatCard title="Avg Focus" value={`${avgScore}%`} icon={Target} />
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
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("difficulty")}>Difficulty</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("strength")}>Strength</th>
                    <th className="p-4 cursor-pointer hover:text-white" onClick={() => requestSort("added")}>Added</th>
                    <th className="p-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {items.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={p.revised} onChange={() => toggle(p.id)} className="w-4 h-4 rounded border-gray-600 text-violet-500 focus:ring-violet-500 bg-transparent cursor-pointer" />
                      </td>
                      <td className="p-4 font-medium text-white max-w-[250px] truncate">
                        <a href={p.link} target="_blank" rel="noreferrer" className="hover:text-violet-400 flex items-center gap-2 transition-colors">
                          {p.title} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                        </a>
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
                        <button onClick={() => openNotes(p.id)} className="p-1.5 rounded-lg text-[#64748B] hover:bg-white/[0.06] hover:text-white transition-colors">
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {notesModal.open && (
        <div className="fixed inset-0 /80 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111827] border border-white/[0.06] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#000000]">
              <h2 className="font-semibold text-white">Problem Notes</h2>
              <button onClick={() => setNotesModal({ ...notesModal, open: false })} className="text-[#64748B] hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex gap-2">
                {['brute', 'better', 'optimal'].map(tab => (
                  <button key={tab} onClick={() => setNotesModal({ ...notesModal, activeTab: tab })} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${notesModal.activeTab === tab ? 'bg-violet-500 text-white' : 'bg-white/[0.03] text-[#94A3B8] hover:text-white hover:bg-white/[0.06]'}`}>{tab}</button>
                ))}
              </div>
              <div className="flex gap-4">
                <input value={notesModal[`${notesModal.activeTab}Time`] || ""} onChange={e => setNotesModal({...notesModal, [`${notesModal.activeTab}Time`]: e.target.value})} placeholder="Time O(N)" className="premium-input flex-1" />
                <input value={notesModal[`${notesModal.activeTab}Space`] || ""} onChange={e => setNotesModal({...notesModal, [`${notesModal.activeTab}Space`]: e.target.value})} placeholder="Space O(1)" className="premium-input flex-1" />
              </div>
              <textarea value={notesModal[notesModal.activeTab] || ""} onChange={e => setNotesModal({...notesModal, [notesModal.activeTab]: e.target.value})} placeholder="Write your approach or code here..." className="premium-input h-64 resize-none font-mono" />
            </div>
            <div className="px-6 py-4 border-t border-white/[0.06] bg-[#000000] flex justify-end gap-3">
              <button onClick={() => setNotesModal({ ...notesModal, open: false })} className="premium-button-secondary">Cancel</button>
              <button onClick={saveNotes} className="premium-button">Save Notes</button>
            </div>
          </motion.div>
        </div>
      )}
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
    'Low Focus': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Focus Kept': 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
  };
  return <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${styles[status] || styles['Low Focus']}`}>{status || 'Unknown'}</span>;
}