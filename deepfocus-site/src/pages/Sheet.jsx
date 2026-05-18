import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getRevisionProblems } from '../services/revisionService';
import { getProblemPattern, patternPriorityMap, patternsList } from '../utils/patternMatcher';
import curatedQuestions from '../constants/Patterns/curated_questions.json';
import subpatternFilters from '../constants/Patterns/subpattern_filters.json';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { 
  ChevronRight, ExternalLink, CheckCircle2, Target, CheckSquare, 
  ShieldAlert, Circle, Activity, Search, BookOpen, Clock, AlertTriangle, 
  ArrowLeft, Filter, FileText, X, Check
} from 'lucide-react';
import { Icon } from '@iconify/react';

export default function Sheet() {
  const [dbProblems, setDbProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'detail', 'smart'
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Notes Modal
  const [notesModal, setNotesModal] = useState({ open: false, id: null, content: "" });
  const [alertModal, setAlertModal] = useState({ open: false, message: "" });

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('sheet_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    setLoading(true);
    const rawData = await getRevisionProblems();
    setDbProblems(rawData);
    setLoading(false);
  }

  const { mergedData, patternsMap, smartQueue } = useMemo(() => {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const localNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    
    const dbMap = {};
    dbProblems.forEach(p => {
      dbMap[p.title.toLowerCase()] = p;
    });

    const combined = [];
    const usedDbIds = new Set();

    // 1. Map Curated Questions
    curatedQuestions.forEach(cq => {
      const dbMatch = dbMap[cq.title.toLowerCase()];
      let status = "Unattempted";
      let focusScore = null;
      let revised = false;
      let dbId = null;

      if (dbMatch) {
        status = dbMatch.focus_status;
        focusScore = dbMatch.focus_score;
        revised = masteredIds.includes(dbMatch.id);
        dbId = dbMatch.id;
        usedDbIds.add(dbMatch.id);
      }

      combined.push({
        id: dbId || `cq-${cq.leetcode_id}`,
        title: cq.title,
        difficulty: cq.difficulty,
        pattern: cq.primary_pattern,
        hiddenTags: cq.hidden_tags || [],
        status,
        focusScore,
        revised,
        isCurated: true,
        notes: dbId ? (localNotes[dbId]?.optimal || "") : "",
        link: dbMatch?.link || `https://leetcode.com/problems/${cq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`
      });
    });

    // 2. Map dynamically added questions
    dbProblems.forEach(p => {
      if (!usedDbIds.has(p.id)) {
        combined.push({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          pattern: getProblemPattern(p.title),
          hiddenTags: [],
          status: p.focus_status,
          focusScore: p.focus_score,
          revised: masteredIds.includes(p.id),
          isCurated: false,
          notes: localNotes[p.id]?.optimal || "",
          link: p.link
        });
      }
    });

    // 3. Group by Pattern & Build Stats
    const pMap = {};
    const queue = [];

    combined.forEach(item => {
      if (!pMap[item.pattern]) {
        pMap[item.pattern] = {
          name: item.pattern,
          items: [],
          completed: 0,
          total: 0,
          scoreSum: 0,
          scoreCount: 0,
          weakCount: 0
        };
      }
      
      const group = pMap[item.pattern];
      group.items.push(item);
      group.total++;
      
      if (item.status !== "Unattempted") {
        group.completed++;
        if (item.focusScore !== null) {
          group.scoreSum += item.focusScore;
          group.scoreCount++;
        }
        if (item.focusScore < 70 || item.status === "Cheated" || item.status === "Give Up") {
          group.weakCount++;
          queue.push(item); // Add to smart revision queue
        } else if (!item.revised) {
          queue.push(item); // Needs mastery revision
        }
      }
    });

    // 4. Calculate strengths and sort patterns
    Object.values(pMap).forEach(g => {
      g.avgScore = g.scoreCount > 0 ? Math.round(g.scoreSum / g.scoreCount) : 0;
      g.strength = g.avgScore === 0 ? "Neutral" : g.avgScore >= 80 ? "Strong" : g.avgScore >= 60 ? "Average" : "Weak";
      g.priorityScore = patternPriorityMap[g.name] || 0;
      
      // Sort items inside pattern by difficulty: Easy -> Medium -> Hard
      const diffOrder = { "Easy": 1, "Medium": 2, "Hard": 3 };
      g.items.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));
    });

    const sortedPatterns = Object.values(pMap).sort((a, b) => b.priorityScore - a.priorityScore);

    return { mergedData: combined, patternsMap: sortedPatterns, smartQueue: queue.sort((a,b) => (a.focusScore||0) - (b.focusScore||0)) };

  }, [dbProblems]);

  async function toggleMastered(id, isCurated) {
    if (isCurated && String(id).startsWith('cq-')) {
      setAlertModal({ 
        open: true, 
        message: "You need to attempt or solve this problem using the DeepFocus extension first before marking it as mastered." 
      });
      return;
    }
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    let newMastered;
    if (masteredIds.includes(id)) newMastered = masteredIds.filter(i => i !== id);
    else newMastered = [...masteredIds, id];
    localStorage.setItem('df_mastered', JSON.stringify(newMastered));
    // Optimistic UI Update (Immediate response)
    setDbProblems([...dbProblems]); 

    // Background Server Update
    supabase.auth.updateUser({
      data: { df_mastered: newMastered }
    }).catch(console.error);
  }

  async function saveNotes() {
    const allNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    if (!allNotes[notesModal.id]) allNotes[notesModal.id] = {};
    allNotes[notesModal.id].optimal = notesModal.content;
    localStorage.setItem('df_notes', JSON.stringify(allNotes));
    // Optimistic UI Update (Immediate response)
    setNotesModal({ open: false, id: null, content: "" });
    setDbProblems([...dbProblems]); 
    
    // Background Server Update
    supabase.auth.updateUser({
      data: { df_notes: allNotes }
    }).catch(console.error);
  }

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
          className="text-indigo-400 font-medium tracking-widest text-xs uppercase mt-4 animate-pulse"
        >
          Loading pattern curriculum...
        </motion.p>
      </div>
    );
  }

  // Linear/Notion inspired clean layout
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-['Inter',sans-serif] pb-20 overflow-hidden antialiased selection:bg-violet-500/30">
      {/* Premium Background Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] opacity-[0.15] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600 via-fuchsia-600/20 to-transparent blur-3xl rounded-full mix-blend-screen" />
      </div>

      <div className="relative max-w-[1200px] mx-auto p-6 md:p-10 pt-16 animate-fade-in">
        {/* Premium Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.06] pb-8">
          <div className="relative z-10">
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Curriculum V2.0</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Pattern Curriculum</h1>
            <p className="text-zinc-400 text-sm md:text-base font-medium max-w-xl leading-relaxed">
              Master Data Structures through pattern recognition. DeepFocus tracks your progress and helps you revise efficiently.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0c0c0c] border border-white/[0.06] p-1.5 rounded-2xl relative z-10">
            <button 
              onClick={() => { setActiveView('dashboard'); setSelectedPattern(null); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'dashboard' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Curriculum
            </button>
            <button 
              onClick={() => { setActiveView('smart'); setSelectedPattern(null); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeView === 'smart' ? 'bg-violet-500/10 text-violet-400 shadow-sm border border-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Smart Revise
            </button>
          </div>
        </header>

        {/* Global Search (Glassy UI) */}
        <div className="relative mb-12 group max-w-2xl relative z-10">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems, patterns, or exact constraints..."
            className="w-full bg-[#0c0c0c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl py-4 pl-14 pr-6 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all shadow-2xl font-medium"
          />
        </div>

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {searchQuery ? (
              <SearchResults key="search" query={searchQuery} data={mergedData} toggleMastered={toggleMastered} setNotesModal={setNotesModal} />
            ) : activeView === 'dashboard' && !selectedPattern ? (
              <PatternDashboard 
                key="dashboard"
                patternsMap={patternsMap} 
                onSelect={(p) => { setSelectedPattern(p); setActiveView('detail'); }} 
              />
            ) : activeView === 'detail' && selectedPattern ? (
              <PatternDetail 
                key="detail"
                pattern={selectedPattern} 
                onBack={() => { setSelectedPattern(null); setActiveView('dashboard'); }}
                toggleMastered={toggleMastered}
                setNotesModal={setNotesModal}
              />
            ) : activeView === 'smart' ? (
              <SmartRevision key="smart" queue={smartQueue} toggleMastered={toggleMastered} setNotesModal={setNotesModal} />
            ) : null}
          </AnimatePresence>
        </div>

        {/* Clean Notion-style Notes Modal */}
        <AnimatePresence>
          {notesModal.open && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="bg-[#0c0c0c] border border-white/[0.08] rounded-[24px] w-full max-w-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Problem Notes</h2>
                  <button onClick={() => setNotesModal({ open: false, id: null, content: "" })} className="text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8">
                  <textarea 
                    value={notesModal.content} 
                    onChange={e => setNotesModal({...notesModal, content: e.target.value})} 
                    placeholder="Write your mental models, optimal approaches, or edge cases to remember..." 
                    className="w-full bg-transparent border border-white/[0.08] rounded-2xl p-6 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.02] transition-all h-64 resize-none leading-relaxed font-mono shadow-inner" 
                  />
                </div>
                <div className="px-8 py-6 bg-white/[0.01] flex justify-end gap-4">
                  <button onClick={() => setNotesModal({ open: false, id: null, content: "" })} className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors">Cancel</button>
                  <button onClick={saveNotes} className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-white text-black rounded-full hover:bg-zinc-200 transition-colors shadow-xl shadow-white/10">Save Notes</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Premium Alert Modal */}
        <AnimatePresence>
          {alertModal.open && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[#0c0c0c] border border-white/[0.08] rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col items-center text-center p-10 relative"
              >
                <button 
                  onClick={() => setAlertModal({ open: false, message: "" })} 
                  className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6 border border-violet-500/30">
                  <ShieldAlert size={32} className="text-violet-400" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-3 tracking-tight">Action Required</h3>
                <p className="text-zinc-300 text-sm leading-relaxed mb-10 font-medium">
                  {alertModal.message}
                </p>
                <button 
                  onClick={() => setAlertModal({ open: false, message: "" })} 
                  className="w-full py-3.5 px-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
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

// --- SUBCOMPONENTS ---

function PatternDashboard({ patternsMap, onSelect }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {patternsMap.map((p, index) => {
        const progress = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05, duration: 0.5, ease: "easeOut" } }}
            whileHover={{ y: -4, scale: 1.01 }}
            key={p.name}
            onClick={() => onSelect(p)}
            className="relative cursor-pointer bg-[#0c0c0c] border border-white/[0.06] hover:border-white/[0.15] rounded-[24px] p-6 lg:p-8 transition-all flex flex-col justify-between min-h-[180px] group shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Subtle glow orb on hover inside card */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-lg font-extrabold text-zinc-100 group-hover:text-white transition-colors tracking-tight">{p.name}</h3>
                <div className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  p.strength === 'Strong' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  p.strength === 'Weak' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                  'bg-white/[0.05] text-zinc-300 border-white/[0.1]'
                }`}>
                  {p.strength}
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors">{p.completed} / {p.total} Solved</span>
                  <span className="text-xs font-extrabold text-white">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div style={{ width: `${progress}%` }} className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-violet-500'}`} />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function PatternDetail({ pattern, onBack, toggleMastered, setNotesModal }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const availableSubpatterns = subpatternFilters[pattern.name] || [];

  const filteredItems = pattern.items.filter(item => {
    if (activeFilter === "All") return true;
    return item.hiddenTags.includes(activeFilter);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      {/* Back button and Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors group mb-8 w-fit">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Curriculum
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/[0.06]">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{pattern.name}</h2>
            <div className="flex items-center gap-6 text-sm font-medium">
              <span className="flex items-center gap-2 text-zinc-400"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> {pattern.completed} / {pattern.total} Mastered</span>
              <span className="flex items-center gap-2 text-zinc-400"><span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a855f7]" /> Avg Score: {pattern.avgScore || '-'}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      {availableSubpatterns.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-2">
          <button onClick={() => setActiveFilter("All")} className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeFilter === "All" ? 'bg-white text-black shadow-lg' : 'bg-[#0c0c0c] border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20'}`}>All</button>
          {availableSubpatterns.map(tag => (
            <button 
              key={tag} 
              onClick={() => setActiveFilter(tag)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${activeFilter === tag ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-[#0c0c0c] border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <ProblemList items={filteredItems} toggleMastered={toggleMastered} setNotesModal={setNotesModal} />
    </motion.div>
  );
}

function SmartRevision({ queue, toggleMastered, setNotesModal }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      <div className="pb-8 border-b border-white/[0.06]">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
          <Activity size={18} className="text-violet-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Smart Revise Queue</h2>
        <p className="text-sm text-zinc-400 font-medium">Problems you need to revise based on your focus scores and recent attempts.</p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-24 bg-[#0c0c0c] rounded-[24px] border border-white/[0.06]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">You're all caught up!</h3>
          <p className="text-sm text-zinc-500 font-medium max-w-sm mx-auto">Your foundation is solid. Keep solving new problems in the main curriculum.</p>
        </div>
      ) : (
        <ProblemList items={queue} toggleMastered={toggleMastered} setNotesModal={setNotesModal} showPattern />
      )}
    </motion.div>
  );
}

function SearchResults({ query, data, toggleMastered, setNotesModal }) {
  const lowerQuery = query.toLowerCase();
  const results = data.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) || 
    item.pattern.toLowerCase().includes(lowerQuery) ||
    item.hiddenTags.some(t => t.toLowerCase().includes(lowerQuery))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 pb-4 border-b border-white/[0.06]">Search results for "{query}"</h2>
      {results.length > 0 ? (
        <ProblemList items={results} toggleMastered={toggleMastered} setNotesModal={setNotesModal} showPattern />
      ) : (
        <div className="text-center py-24 bg-[#0c0c0c] rounded-[24px] border border-white/[0.06]">
          <p className="text-zinc-500 text-sm font-medium">No exact matches found. Try adjusting your query.</p>
        </div>
      )}
    </motion.div>
  );
}

// Reusable Premium Linear-style Minimal List Component
function ProblemList({ items, toggleMastered, setNotesModal, showPattern = false }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.03, 0.3) } }}
          key={item.id} 
          className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#0c0c0c] border border-white/[0.04] hover:border-white/[0.1] rounded-2xl transition-all shadow-sm hover:shadow-xl"
        >
          {/* Left side: Premium Checkbox and Title */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleMastered(item.id, item.isCurated)}
              className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all relative overflow-hidden group/tick ${
                item.revised 
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                  : 'bg-[#09090b] border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10'
              }`}
              title={item.revised ? 'Mastered' : 'Mark as Mastered'}
            >
              <AnimatePresence>
                {item.revised && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="text-emerald-400 flex items-center justify-center"
                  >
                    <Check strokeWidth={3.5} size={13} />
                  </motion.div>
                )}
              </AnimatePresence>
              {!item.revised && (
                <Check strokeWidth={3.5} size={13} className="text-emerald-500/0 group-hover/tick:text-emerald-500/30 transition-colors duration-300" />
              )}
            </motion.button>
            
            <div className="flex flex-col truncate pr-4">
              <a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate block">
                {item.title}
              </a>
              {showPattern && <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-widest mt-1.5">{item.pattern}</span>}
            </div>
          </div>

          {/* Right Side: Badges and Actions */}
          <div className="flex items-center gap-4 md:gap-6 mt-4 md:mt-0 shrink-0">
            {/* Difficulty Badge */}
            <div className={`hidden md:block text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border 
              ${item.difficulty==='Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                item.difficulty==='Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {item.difficulty}
            </div>

            {/* Typography Based Focus Score */}
            {item.focusScore !== null ? (
              <div className="flex items-center gap-2 w-20 justify-end">
                 <span className="hidden sm:inline text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Focus</span>
                 <span className={`text-xs font-extrabold ${item.focusScore >= 80 ? 'text-emerald-400' : item.focusScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{item.focusScore}%</span>
              </div>
            ) : (
              <div className="w-20 text-right"><span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Unscored</span></div>
            )}

            {/* Premium Icon + Text Actions */}
            <div className="flex items-center gap-2 ml-2">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setNotesModal({ open: true, id: item.id, content: item.notes })}
                className={`w-7 h-7 shrink-0 rounded-md border flex items-center justify-center transition-all relative overflow-hidden ${
                  item.notes 
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/30 hover:bg-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]' 
                    : 'bg-[#09090b] text-zinc-500 border-white/[0.08] hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/10'
                }`}
                title={item.notes ? 'View Notes' : 'Add Note'}
              >
                <Icon icon={item.notes ? "solar:document-text-bold-duotone" : "solar:document-text-linear"} width="16" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
