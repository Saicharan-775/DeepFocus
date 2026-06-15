import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { refreshRevisionProblems, subscribeRevisionStore } from '../store/revisionStore';
import { getProblemPattern, patternPriorityMap, normalizeTitle, getSlugFromLink } from '../utils/patternMatcher';
import curatedQuestions from '../constants/Patterns/curated_questions.json';
import subpatternFilters from '../constants/Patterns/subpattern_filters.json';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check, X, FileText, Sparkles } from 'lucide-react';
import { SheetSkeleton } from '../components/Boneyard';

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
  
  let userNotes = {};
  if (rawUserNotes) {
    try {
      userNotes = JSON.parse(rawUserNotes);
    } catch (e) {
      userNotes = {
        optimal: rawUserNotes,
        brute: "", bruteTime: "", bruteSpace: "",
        better: "", betterTime: "", betterSpace: "",
        optimalTime: "", optimalSpace: "",
        mentalModel: ""
      };
    }
  }
  
  return { userNotes, aiSummary };
}

// Study tips for each pattern, displayed upon selection
const PATTERN_TIPS = {
  'Two Pointers': 'Use two pointers to scan sorted arrays or linked lists. Typically reduces search space from O(N²) to O(N) by traversing from both ends or at different speeds.',
  'Sliding Window': 'Maintain a subrange/window that expands or shrinks. Excellent for contiguous subarrays or substrings matching specific length/sum/character criteria.',
  'Trees': 'Practice tree traversals (DFS/BFS). Most binary tree questions are solved recursively by defining base cases and combining left/right subtree results.',
  'Graphs': 'Represent connections. Use Breadth-First Search (BFS) for shortest paths in unweighted graphs, and Depth-First Search (DFS) for cycle detection or connectivity.',
  'Dynamic Programming': 'Solve complex optimization by storing overlapping subproblem solutions. Define state variables, base cases, and state transition relations.',
  'Heap': 'Use heaps (priority queues) to maintain a running min/max. Optimal for K-th elements or scheduling problems requiring O(1) retrieval and O(log N) updates.',
  'Backtracking': 'Use recursion to build candidates step-by-step. Backtrack (undo state) when a candidate cannot be completed to find all permutations or combinations.',
  'Greedy': 'Make the locally optimal choice at each step. Works when local optimum decisions guarantee a globally optimal solution (e.g. interval scheduling).',
  'Binary Search': 'Halve your search space at each step. Applicable to sorted arrays, or monotonic functions where you want to find the first/last valid answer.',
  'Stack': 'Process elements in LIFO order. Monotonic stacks are useful for finding the next greater or smaller elements in linear O(N) time.',
  'Bit Manipulation': 'Manipulate binary representations. Use bitwise operators (&, |, ^, ~) for fast arithmetic, subset tracking, and checking single occurrence properties.',
  'Linked List': 'Manipulate node references. Use sentinel dummy nodes to simplify edge cases, fast/slow pointers to find cycles, or reverse subsegments in-place.',
  'Arrays & Matrices': 'Utilize prefix arrays, hashing, or cyclic sorting. For matrices, traverse layer-by-layer or row/column-by-row/column in sorted states.',
  'Strings': 'Analyze substrings, palidromes, or patterns. Apply sliding windows, frequency hashes, or trie structures for optimal prefix searches.',
  'Design': 'Build customized data structures (e.g. LRU Cache). Implement operations like insert, delete, or lookup in constant O(1) average time.',
  'Union Find': 'Maintain disjoint subsets. Optimizes merge operations and connectivity lookups to near-constant time using path compression and union by rank.',
  'Trie': 'Optimize word prefix lookups. A search tree where nodes store characters, allowing insertion and word/prefix search in O(length) time.',
  'Segment Tree': 'Query and update range values (like sum or minimum) dynamically. Both update and query operations run in O(log N) time.',
  'Sweep Line': 'Coordinate events sorted along an axis. Track active intervals sequentially to solve overlap, scheduling, or boundary coverage problems.',
};

// Unified style metadata (Violet accent color throughout)
const UNIFIED_ACCENT = '#a78bfa'; // violet-400
const UNIFIED_GLOW = 'rgba(167,139,250,0.02)';

function groupItemsBySubpattern(items, subpatterns) {
  const groups = {};
  const uncategorized = [];
  subpatterns.forEach(sp => { groups[sp] = []; });
  items.forEach(item => {
    const match = subpatterns.find(sp => item.hiddenTags?.includes(sp));
    if (match) groups[match].push(item);
    else uncategorized.push(item);
  });
  return { groups, uncategorized };
}

function problemTimestamp(problem) {
  const time = new Date(problem?.updated_at || problem?.created_at || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isAttemptedProblem(problem) {
  return !!problem && problem.focus_status && problem.focus_status !== 'Unattempted';
}

function chooseVisibleProblem(current, candidate) {
  if (!current) return candidate;
  if (isAttemptedProblem(candidate) && !isAttemptedProblem(current)) return candidate;
  if (!isAttemptedProblem(candidate) && isAttemptedProblem(current)) return current;
  return problemTimestamp(candidate) >= problemTimestamp(current) ? candidate : current;
}

function setDbMatch(map, key, problem) {
  if (!key) return;
  map[key] = chooseVisibleProblem(map[key], problem);
}

export default function Sheet() {
  const [dbProblems, setDbProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'detail', 'smart'
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const navigate = useNavigate();
  const [alertModal, setAlertModal] = useState({ open: false, message: "" });

  useEffect(() => {
    const unsubscribeRevisionStore = subscribeRevisionStore((snapshot) => {
      setDbProblems(snapshot.items);
      if (!snapshot.loading) setLoading(false);
    });

    loadData(false);
    const channel = supabase
      .channel('sheet_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => refreshRevisionProblems())
      .subscribe();
    return () => {
      unsubscribeRevisionStore();
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    const snapshot = await refreshRevisionProblems();
    setDbProblems(snapshot.items);
    if (!silent) setLoading(false);
  }

  const { mergedData, patternsMap, smartQueue } = useMemo(() => {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    const localNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    
    // Map DB problems to normalized keys for robust matching
    const dbMatchMap = {};
    dbProblems.forEach(p => {
      const normTitle = normalizeTitle(p.title);
      const normSlug = getSlugFromLink(p.link);
      setDbMatch(dbMatchMap, normTitle, p);
      setDbMatch(dbMatchMap, normSlug, p);
    });

    const combined = [];
    const usedDbIds = new Set();

    // 1. Map Curated Questions
    curatedQuestions.forEach(cq => {
      const normCqTitle = normalizeTitle(cq.title);
      const cqSlug = cq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const normCqSlug = getSlugFromLink(`/problems/${cqSlug}/`);
      
      const dbMatch = dbMatchMap[normCqTitle] || dbMatchMap[normCqSlug];
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
        notes: localNotes[dbId || `cq-${cq.leetcode_id}`] || {},
        dbNotes: dbMatch?.notes || "",
        code: dbMatch?.code || "",
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
          pattern: getProblemPattern(p.title, [], p.link),
          hiddenTags: [],
          status: p.focus_status,
          focusScore: p.focus_score,
          revised: masteredIds.includes(p.id),
          isCurated: false,
          notes: localNotes[p.id] || {},
          dbNotes: p.notes || "",
          code: p.code || "",
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
      const progress = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
      g.strength = progress > 75 ? "Strong" : "Weak";
      g.priorityScore = patternPriorityMap[g.name] || 0;
      
      // Sort items inside pattern by difficulty: Easy -> Medium -> Hard
      const diffOrder = { "Easy": 1, "Medium": 2, "Hard": 3 };
      g.items.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));
    });

    const sortedPatterns = Object.values(pMap).sort((a, b) => b.priorityScore - a.priorityScore);

    return { mergedData: combined, patternsMap: sortedPatterns, smartQueue: queue.sort((a,b) => (a.focusScore||0) - (b.focusScore||0)) };

  }, [dbProblems]);

  async function toggleMastered(id, isCurated) {
    const problem = mergedData.find(item => item.id === id);
    if (!problem) return;

    if (problem.status !== "Focus Kept") {
      setAlertModal({ 
        open: true, 
        message: "You must successfully complete a Focus Session with 'Focus Kept' status on LeetCode first before marking it as mastered." 
      });
      return;
    }

    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    let newMastered;
    if (masteredIds.includes(id)) newMastered = masteredIds.filter(i => i !== id);
    else newMastered = [...masteredIds, id];
    localStorage.setItem('df_mastered', JSON.stringify(newMastered));
    setDbProblems([...dbProblems]); 

    supabase.auth.updateUser({
      data: { df_mastered: newMastered }
    }).catch(console.error);
  }

  function openNotes(itemOrId) {
    const id = (itemOrId && typeof itemOrId === 'object') ? itemOrId.id : itemOrId;
    if (id) {
      if (String(id).startsWith('cq-')) {
        setAlertModal({ 
          open: true, 
          message: "You need to solve or attempt this problem using the DeepFocus extension first before viewing it in the workspace." 
        });
        return;
      }
      navigate(`/workspace?id=${id}`);
    }
  }

  if (loading) {
    return <SheetSkeleton />;
  }

  const totalProblems = mergedData.length;
  const totalCompleted = patternsMap.reduce((a, p) => a + p.completed, 0);
  const overallProgress = totalProblems > 0 ? Math.round((totalCompleted / totalProblems) * 100) : 0;
  
  const strongPatterns = patternsMap.filter(p => p.strength === 'Strong').length;
  const weakPatterns = patternsMap.filter(p => p.strength === 'Weak').length;

  return (
    <div className="relative min-h-screen bg-[#070709] text-zinc-100 pb-24 overflow-hidden antialiased selection:bg-violet-400/20">
      
      {/* Subtle background mesh grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.2]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-[-250px] right-[-100px] w-[600px] h-[600px] rounded-full bg-cyan-950/[0.08] blur-[140px] pointer-events-none" />

      <div className="relative max-w-[1040px] mx-auto px-6 pt-12 md:pt-16">
        
        {/* HEADER SECTION (Simple & Clean) */}
        <header className="mb-12 border-b border-white/[0.04] pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">Curriculum</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
                DSA Pattern Sheet
              </h1>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed max-w-2xl">
                Master problem-solving paradigms systematically. Track your retention index and practice targeted pattern groups.
              </p>
            </div>

            {/* Flat Statistics Counter */}
            <div className="flex items-center gap-6 shrink-0 font-mono text-sm">
              <div className="px-5 py-3.5 rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] shadow-lg backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Progress</p>
                <p className="font-semibold text-zinc-200">{overallProgress}% ({totalCompleted}/{totalProblems})</p>
              </div>
              <div className="px-5 py-3.5 rounded-xl bg-[#0c0d12]/80 border border-white/[0.06] shadow-lg backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Strength Profile</p>
                <p className="font-semibold text-zinc-200">
                  <span className="text-emerald-400">{strongPatterns} Strong</span>
                  <span className="text-zinc-600 mx-1.5">·</span>
                  <span className="text-rose-400">{weakPatterns} Weak</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* SEARCH & SWITCHER DOCK */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5 mb-10">
          
          {/* Raycast-style Clean Search Bar */}
          <div className="relative flex-1 max-w-sm group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#a78bfa] transition-colors" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search concepts or patterns…"
              className="w-full bg-[#0c0d12]/80 border border-white/[0.06] focus:border-[#a78bfa]/40 focus:bg-[#0c0d12] rounded-xl py-2.5 pl-10 pr-12 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all focus:ring-1 focus:ring-[#a78bfa]/20 shadow-inner"
            />
            <AnimatePresence>
              {!searchFocused && !searchQuery && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-[10px] text-zinc-400 font-mono font-bold pointer-events-none"
                >
                  <span>/</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Switcher Tab Capsule */}
          <div className="flex p-1 rounded-xl bg-[#0c0d12]/60 border border-white/[0.06] relative shrink-0 backdrop-blur-sm shadow-md">
            <button
              onClick={() => { setActiveView('dashboard'); setSelectedPattern(null); setSearchQuery(""); }}
              className={`relative z-10 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeView === 'dashboard' && !searchQuery ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {activeView === 'dashboard' && !searchQuery && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#12141c] border border-white/[0.08] rounded-lg -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Patterns
            </button>
            <button
              onClick={() => { setActiveView('smart'); setSelectedPattern(null); setSearchQuery(""); }}
              className={`relative z-10 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeView === 'smart' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {activeView === 'smart' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#12141c] border border-white/[0.08] rounded-lg -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              Smart Revise
            </button>
          </div>

        </div>

        {/* WORKSPACE VIEWPORT */}
        <div className="relative z-10 min-h-[360px]">
          <AnimatePresence mode="wait">
            {searchQuery ? (
              <SearchResults key="search" query={searchQuery} data={mergedData} toggleMastered={toggleMastered} setNotesModal={openNotes} />
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
                setNotesModal={openNotes}
              />
            ) : activeView === 'smart' ? (
              <SmartRevision key="smart" queue={smartQueue} toggleMastered={toggleMastered} setNotesModal={openNotes} />
            ) : null}
          </AnimatePresence>
        </div>

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

// --- SUBCOMPONENTS ---

function ProgressRing({ progress, color = UNIFIED_ACCENT, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700"
        style={{ filter: `drop-shadow(0 0 2px ${color}44)` }}
      />
    </svg>
  );
}

// Pattern dashboard grid layout
function PatternDashboard({ patternsMap, onSelect }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {patternsMap.map((p, index) => {
        const progress = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
        const isFeatured = index === 0;

        return (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: index * 0.015, duration: 0.35 } }}
            whileHover={{ y: -4 }}
            key={p.name}
            onClick={() => onSelect(p)}
            className={`group relative text-left w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0d12]/80 backdrop-blur-md hover:bg-[#12141c]/90 hover:border-white/[0.12] hover:shadow-[0_0_24px_-12px_rgba(167,139,250,0.35)] transition-all duration-300 shadow-md ${isFeatured ? 'sm:col-span-2 xl:col-span-1' : ''}`}
          >
            {/* Premium Top Glow */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#a78bfa]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Ambient Inner Glow */}
            <div className="absolute -inset-px bg-gradient-to-br from-white/[0.01] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-center justify-between gap-6 p-7 h-full relative z-10">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-zinc-200 group-hover:text-white truncate tracking-tight mb-2.5">{p.name}</h3>
                <p className="text-[13px] text-zinc-400 font-mono">{p.completed} / {p.total} solved</p>
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                    p.strength === 'Strong' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.strength === 'Strong' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {p.strength}
                  </span>
                </div>
              </div>
              
              {/* Round Completion Circular Percentage Progressbar */}
              <div className="relative flex items-center justify-center shrink-0">
                <ProgressRing progress={progress} color={UNIFIED_ACCENT} size={60} />
                <span className="absolute text-xs font-mono font-bold text-zinc-300">{progress}%</span>
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// Collapsible Subpattern Accordion Component
function SubpatternAccordion({ title, items, defaultOpen, toggleMastered, setNotesModal }) {
  const [open, setOpen] = useState(defaultOpen);
  const completed = items.filter(i => i.status !== 'Unattempted').length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0c0d12]/40 transition-all duration-300 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-5 px-6 py-4.5 text-left hover:bg-[#12141c]/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-zinc-200 truncate">{title}</h4>
          <p className="text-xs text-zinc-400 mt-1">{items.length} items · {completed} solved</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative flex items-center justify-center shrink-0">
            <ProgressRing progress={progress} color={UNIFIED_ACCENT} size={38} />
            <span className="absolute text-[10px] font-mono font-bold text-zinc-300">{progress}%</span>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-zinc-400 shrink-0" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-white/[0.03]">
              <ProblemList items={items} toggleMastered={toggleMastered} setNotesModal={setNotesModal} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pattern Detail View Component
function PatternDetail({ pattern, onBack, toggleMastered, setNotesModal }) {
  const availableSubpatterns = subpatternFilters[pattern.name] || [];
  const { groups, uncategorized } = useMemo(
    () => groupItemsBySubpattern(pattern.items, subpatternFilters[pattern.name] || []),
    [pattern.items, pattern.name]
  );

  const progress = pattern.total > 0 ? Math.round((pattern.completed / pattern.total) * 100) : 0;
  const nonEmptySubpatterns = availableSubpatterns.filter(sp => groups[sp]?.length > 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -6 }} 
      className="space-y-6"
    >
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        ← All Patterns
      </button>

      {/* Premium Frameless Hero Header */}
      <div className="relative pb-8 border-b border-white/[0.06] overflow-hidden">
        {/* Subtle background radial glow */}
        <div className="absolute top-[-50px] left-[-20px] w-80 h-80 bg-[#a78bfa]/[0.03] rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{pattern.name}</h2>
            
            <div className="flex flex-wrap items-center gap-6 mt-4">
              {/* Strength Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                pattern.strength === 'Strong' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pattern.strength === 'Strong' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {pattern.strength}
              </span>
              
              <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

              {/* Solved Metric */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Solved</span>
                <span className="text-sm font-semibold text-zinc-200 font-mono mt-0.5">{pattern.completed} <span className="text-zinc-600 text-xs">/</span> {pattern.total}</span>
              </div>

              <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

              {/* Score Metric */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Avg Score</span>
                <span className="text-sm font-semibold text-zinc-200 font-mono mt-0.5">{pattern.avgScore ? `${pattern.avgScore}%` : '—'}</span>
              </div>
            </div>
          </div>
          
          {/* Progress Widget Card */}
          <div className="flex items-center gap-4 bg-white/[0.015] border border-white/[0.05] px-5 py-3.5 rounded-2xl shrink-0 self-start md:self-center">
            <div className="relative flex items-center justify-center">
              <ProgressRing progress={progress} color={UNIFIED_ACCENT} size={54} />
              <span className="absolute text-xs font-mono font-bold text-zinc-100">{progress}%</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-extrabold">Completion</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Ratio achieved</p>
            </div>
          </div>
        </div>

        {/* Pattern Focus Tip Card */}
        {PATTERN_TIPS[pattern.name] && (
          <div className="mt-8 bg-zinc-950/40 border border-white/[0.04] rounded-xl p-5 relative overflow-hidden z-10 max-w-3xl">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#a78bfa]" />
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
              Study Tip
            </h4>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-medium pl-3 italic">
              "{PATTERN_TIPS[pattern.name]}"
            </p>
          </div>
        )}
      </div>

      {availableSubpatterns.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Subpatterns</p>
          {nonEmptySubpatterns.map((sp, i) => (
            <SubpatternAccordion
              key={sp}
              title={sp}
              items={groups[sp]}
              defaultOpen={i === 0}
              toggleMastered={toggleMastered}
              setNotesModal={setNotesModal}
            />
          ))}
          {uncategorized.length > 0 && (
            <SubpatternAccordion
              title="General Problems"
              items={uncategorized}
              defaultOpen={nonEmptySubpatterns.length === 0}
              toggleMastered={toggleMastered}
              setNotesModal={setNotesModal}
            />
          )}
        </div>
      ) : (
        <ProblemList items={pattern.items} toggleMastered={toggleMastered} setNotesModal={setNotesModal} />
      )}
    </motion.div>
  );
}

// Smart Revision View Component
function SmartRevision({ queue, toggleMastered, setNotesModal }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }} 
      className="space-y-6"
    >
      {queue.length === 0 ? (
        <div className="text-center py-24 rounded-xl border border-dashed border-white/[0.04] bg-white/[0.002]">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">All revision complete</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">Your queue contains zero weak spots.</p>
        </div>
      ) : (
        <ProblemList items={queue} toggleMastered={toggleMastered} setNotesModal={setNotesModal} showPattern />
      )}
    </motion.div>
  );
}

// Search Results View Component
function SearchResults({ query, data, toggleMastered, setNotesModal }) {
  const lowerQuery = query.toLowerCase();
  const results = data.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.pattern.toLowerCase().includes(lowerQuery) ||
    item.hiddenTags.some(t => t.toLowerCase().includes(lowerQuery))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      <p className="text-xs md:text-sm text-zinc-400">
        Found <span className="text-zinc-200 font-semibold">{results.length}</span> matches for <span className="text-white">"{query}"</span>
      </p>
      {results.length > 0 ? (
        <ProblemList items={results} toggleMastered={toggleMastered} setNotesModal={setNotesModal} showPattern />
      ) : (
        <div className="text-center py-20 rounded-xl border border-white/[0.04] bg-white/[0.002]">
          <p className="text-zinc-500 text-xs md:text-sm">No matching elements found.</p>
        </div>
      )}
    </motion.div>
  );
}

function ProblemList({ items, toggleMastered, setNotesModal, showPattern = false, compact = false }) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5 pt-2' : 'gap-2'}`}>
      {items.map((item, i) => {
        const parsedDb = parseDbNotes(item.dbNotes);
        const hasAiSummary = !!parsedDb.aiSummary;
        const dbUserNotes = parsedDb.userNotes || {};
        const localNotes = item.notes || {};
        const hasUserNotes = (
          Object.values(localNotes).some(v => typeof v === 'string' && v.trim() !== "") ||
          Object.values(dbUserNotes).some(v => typeof v === 'string' && v.trim() !== "")
        );
        const hasCode = !!item.code;

        return (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i * 0.01, 0.1) } }}
            key={item.id}
            className={`group flex items-center rounded-xl border border-transparent hover:border-white/[0.03] hover:bg-white/[0.005] transition-all duration-200 ${compact ? 'px-3 py-2 gap-3.5' : 'px-5 py-3 gap-4'}`}
          >
            {/* Custom Circular Checkbox */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleMastered(item.id, item.isCurated)}
              className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${
                item.revised
                  ? 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#a78bfa]'
                  : 'border-zinc-700 hover:border-[#a78bfa]/40 text-transparent hover:text-[#a78bfa]/30'
              }`}
              title={item.revised ? 'Mastered' : 'Mark mastered'}
            >
              <AnimatePresence>
                {item.revised && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    exit={{ scale: 0 }}
                  >
                    <Check strokeWidth={3} size={11} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Problem Link */}
            <div className="flex-1 min-w-0">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate block transition-colors"
              >
                {item.title}
              </a>
              {showPattern && (
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block truncate">{item.pattern}</span>
              )}
            </div>

            {/* Colored difficulty badge */}
            <span className={`shrink-0 w-16 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase text-center border ${
              item.difficulty === 'Easy'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : item.difficulty === 'Medium'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {item.difficulty}
            </span>

            {/* Focus Score (Simple Text) */}
            <div className="w-12 text-right shrink-0">
              {item.focusScore !== null ? (
                <span className="text-xs font-mono font-semibold text-zinc-300 tabular-nums">
                  {item.focusScore}%
                </span>
              ) : (
                <span className="text-xs text-zinc-700 font-mono">—</span>
              )}
            </div>

            {/* Icon-based Notes Action */}
            <div className="relative shrink-0">
              <button
                onClick={() => setNotesModal(item.id)}
                className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                  hasAiSummary
                    ? 'text-violet-400 bg-violet-500/10 border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.2)] hover:bg-violet-500/20 hover:border-violet-500/40'
                    : (hasUserNotes || hasCode)
                    ? 'text-[#a78bfa] bg-[#a78bfa]/8 border-[#a78bfa]/20 hover:bg-[#a78bfa]/15'
                    : 'text-zinc-500 border-transparent hover:bg-white/[0.03] hover:text-zinc-300'
                }`}
                title={hasAiSummary ? 'View AI Summary & Notes' : (hasUserNotes || hasCode) ? 'View/Edit Note' : 'Add Note'}
              >
                <FileText size={15} />
              </button>
              {hasAiSummary && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
