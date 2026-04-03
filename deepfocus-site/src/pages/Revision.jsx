import React, { useEffect, useState, useMemo } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabaseClient";
import {
  FolderOpen,
  ShieldAlert,
  Target,
  CheckSquare,
  Search,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Link,
  X
} from "lucide-react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { getRevisionProblems, updateProblemNotes, toggleProblemMarked } from "../services/revisionService";
import AuthPage from "../components/AuthPage";
import DashboardNav from "../components/DashboardNav";

export default function Revision() {

  const [problems, setProblems] = useState([]);
  const [session, setSession] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [masteryFilter, setMasteryFilter] = useState("all"); // Solve status filter
  const [selected, setSelected] = useState([]);

  const [notesModal, setNotesModal] = useState({
    open: false,
    id: null,
    activeTab: 'brute',
    brute: "", bruteTime: "", bruteSpace: "",
    better: "", betterTime: "", betterSpace: "",
    optimal: "", optimalTime: "", optimalSpace: ""
  });

  const [pageLoading, setPageLoading] = useState(false);

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc"
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isConnecting, setIsConnecting] = useState(false);
  const [extensionLinked, setExtensionLinked] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // SHA-256 hash using browser Web Crypto API
  async function hashToken(rawToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleConnectExtension = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      // 1. Generate a secure raw token (dfx_ prefix + UUID)
      const rawToken = 'dfx_' + crypto.randomUUID().replace(/-/g, '');

      // 2. Hash the token on user's device
      const encoder = new TextEncoder();
      const data = encoder.encode(rawToken.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');

      console.warn("⚠️ DEEPFOCUS DIAGNOSTIC (STRICT CHECK)");
      console.log("Raw Token generated:", rawToken);
      console.log("Token Hash sent to DB:", tokenHash);
      console.log("Please compare this hash value with your SQL Editor output!");

      // 3. Store only the hash via SECURITY DEFINER function
      const { error: rpcError } = await supabase.rpc('upsert_extension_token', {
        p_token_hash: tokenHash
      });

      if (rpcError) throw rpcError;

      // 4. Show raw token to user (and try to broadcast it)
      setGeneratedToken(rawToken);
      setConnectionModalOpen(true);

      // BROADCAST to any open LeetCode tabs to auto-link
      window.postMessage({ type: "DEEPFOCUS_CONNECT", token: rawToken }, "*");

      // Refresh connection status
      loadData();

    } catch (error) {
      console.error("Connection error:", error);
      alert("Error: " + (error.message || "Failed to link extension"));
    } finally {
      setIsConnecting(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setShowToast(false), 3000);
    }
  };
  /* LOAD DATA & AUTH */

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadData() {
    setDataLoading(true);
    const rawData = await getRevisionProblems();

    // Map snake_case from DB to camelCase for the UI
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');

    const mapped = rawData.map(p => ({
      ...p,
      id: p.id,
      focusStatus: p.focus_status,
      focusScore: p.focus_score,
      focusDuration: p.focus_duration || 0,
      revised: masteredIds.includes(p.id),
      // Merge local notes
      notes: JSON.parse(localStorage.getItem('df_notes') || '{}')[p.id] || { brute: '', better: '', optimal: '' },
      added: p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    }));

    setProblems(mapped);

    // Check if extension is linked and get expiry
    const { data: conn, error: checkError } = await supabase
      .from('extension_connections')
      .select('created_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (checkError) console.error("Database check failed:", checkError);
    setExtensionLinked(!!conn);
    setDataLoading(false);
  }

  useEffect(() => {
    if (!session) return;

    loadData();

    const channel = supabase
      .channel('dashboard_sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'revision_problems', filter: `user_id=eq.${session.user.id}` },
        () => loadData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'extension_connections', filter: `user_id=eq.${session.user.id}` },
        () => {
          supabase
            .from('extension_connections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .then(({ count }) => setExtensionLinked(count > 0));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);


  /* CHANGE PAGE */

  function changePage(page) {

    if (page === currentPage) return;

    setPageLoading(true);

    setTimeout(() => {
      setCurrentPage(page);
      setPageLoading(false);
    }, 200);

  }


  /* SORT */

  function requestSort(key) {

    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });

  }


  /* FILTER + SORT */

  const filtered = useMemo(() => {

    return problems
      .filter(p => statusFilter === "all" || p.focusStatus === statusFilter)
      .filter(p => difficultyFilter === "all" || p.difficulty === difficultyFilter)
      .filter(p => {
        if (masteryFilter === "all") return true;
        const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
        const isMastered = masteredIds.includes(p.id);
        if (masteryFilter === "Solved") return isMastered;
        if (masteryFilter === "Pending") return !isMastered;
        return true;
      })
      .filter(p => (p.title || "").toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {

        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "difficulty") {
          const order = { Hard: 3, Medium: 2, Easy: 1 };
          aValue = order[aValue];
          bValue = order[bValue];
        }

        if (sortConfig.key === "added") {
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;

        return 0;

      });

  }, [problems, search, statusFilter, difficultyFilter, masteryFilter, sortConfig]);


  /* PAGINATION */

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);


  /* PAGE NUMBERS */

  function getPageNumbers() {

    const delta = 2;
    const range = [];
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {

      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }

    }

    let last;

    for (const page of range) {

      if (last) {

        if (page - last === 2) {
          pages.push(last + 1);
        } else if (page - last > 2) {
          pages.push("...");
        }

      }

      pages.push(page);
      last = page;

    }

    return pages;

  }

  const pageNumbers = getPageNumbers();


  /* STATS */

  const cheated = problems.filter(p => p.focusStatus === "Cheated").length;
  const revisedCount = problems.filter(p => p.revised).length;

  const avgScore =
    problems.length > 0
      ? Math.round(problems.reduce((a, b) => a + b.focusScore, 0) / problems.length)
      : 0;


  /* CHECKBOX */

  async function toggle(id) {
    const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
    let newMastered;

    if (masteredIds.includes(id)) {
      newMastered = masteredIds.filter(i => i !== id);
    } else {
      newMastered = [...masteredIds, id];
    }

    localStorage.setItem('df_mastered', JSON.stringify(newMastered));
    
    // Update state locally to avoid full loadData() refresh
    setProblems(prev => prev.map(p => 
      p.id === id ? { ...p, revised: !p.revised } : p
    ));
    
    // Notify other tabs
    window.dispatchEvent(new Event('storage'));
  }


  /* NOTES */

  function openNotes(id) {
    const problem = problems.find(p => p.id === id);
    const localNotes = problem?.notes || {};

    setNotesModal({
      open: true,
      id,
      activeTab: 'brute',
      brute: localNotes.brute || "",
      bruteTime: localNotes.bruteTime || "",
      bruteSpace: localNotes.bruteSpace || "",
      better: localNotes.better || "",
      betterTime: localNotes.betterTime || "",
      betterSpace: localNotes.betterSpace || "",
      optimal: localNotes.optimal || "",
      optimalTime: localNotes.optimalTime || "",
      optimalSpace: localNotes.optimalSpace || ""
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
    setNotesModal({ open: false, id: null, activeTab: 'brute', brute: "", better: "", optimal: "" });
  }


  /* UI */

  if (!session) {
    return <AuthPage />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex items-center justify-center p-6">
        <div className="animate-pulse space-y-4 flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-white/10" />
          <p className="text-gray-400">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardNav />

      <div className="min-h-screen bg-[#0B0B0B] text-white">

        <div className="max-w-[1300px] mx-auto px-6 py-32 space-y-10">

          {/* HEADER */}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#121212] border border-white/10 flex items-center justify-center text-yellow-400 font-bold">
                DF
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Revision Sheet</h1>
                <p className="text-sm text-gray-500">
                  Review problems based on focus performance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleConnectExtension}
                disabled={isConnecting}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition disabled:opacity-50 ${extensionLinked
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
              >
                {extensionLinked ? <CheckCircle2 size={16} /> : <Link size={16} />}
{isConnecting ? 'Generating...' : (extensionLinked ? 'Regenerate Token' : 'Generate Token')}
              </button>
            </div>
          </div>


          {/* STATS */}

          <div className="grid grid-cols-4 gap-6">

            <MemoStat title="Problems" value={filtered.length} icon={FolderOpen} />
            <MemoStat title="Cheated" value={cheated} icon={ShieldAlert} />
            <MemoStat title="Avg Focus" value={avgScore + "%"} icon={Target} />
            <MemoStat title="Revised" value={revisedCount} icon={CheckSquare} />

          </div>


          {/* FILTER BAR */}

          <div className="flex justify-between items-center">

            <div className="flex gap-3">

              <FilterDropdown
                label="All Status"
                value={statusFilter}
                options={["all", "Focus Kept", "Cheated", "Give Up", "Low Focus"]}
                onChange={setStatusFilter}
              />

              <FilterDropdown
                label="All Difficulty"
                value={difficultyFilter}
                options={["all", "Easy", "Medium", "Hard"]}
                onChange={setDifficultyFilter}
              />

              <FilterDropdown
                label="Mastery Status"
                value={masteryFilter}
                options={["all", "Solved", "Pending"]}
                onChange={setMasteryFilter}
              />

            </div>

            <div className="relative">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems..."
                className="bg-[#121212] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-yellow-400 transition w-64"
              />

            </div>

          </div>


          {/* TABLE */}

          <div className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden shadow-xl">

            <table className="w-full text-sm">

              <thead className="border-b border-white/10 text-gray-400">

                <tr>

                  <th className="p-4"></th>

                  <SortableHeader label="Problem" column="title" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Status" column="focusStatus" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Score" column="focusScore" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Switches" column="switches" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Time" column="focusDuration" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Difficulty" column="difficulty" sortConfig={sortConfig} requestSort={requestSort} />
                  <SortableHeader label="Added" column="added" sortConfig={sortConfig} requestSort={requestSort} />

                  <th className="p-4 text-left">Notes</th>

                </tr>

              </thead>

              <tbody>

                {pageLoading ? (

                  Array.from({ length: itemsPerPage }).map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan="8" className="p-4">
                        <div className="h-5 w-full rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
                      </td>
                    </tr>
                  ))

                ) : (

                  paginated.map(p => (

                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">

                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={p.revised}
                          onChange={() => toggle(p.id)}
                          className="w-4 h-4 accent-yellow-400"
                        />
                      </td>

                      <td className="p-4 max-w-md">
                        <div className="flex items-center gap-2 group">
                          <a
                            href={p.link}
                            target="_blank"
                            className="hover:text-white text-gray-200 flex items-center gap-2 truncate"
                          >
                            <span className="truncate">{p.title}</span>
                            <ExternalLink size={14} className="flex-shrink-0 opacity-20 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>
                      </td>

                      <td className="p-4 w-40">
                        <div className="flex flex-col items-start gap-1">
                          <Status status={p.focusStatus} />
                        </div>
                      </td>

                      <td className="p-4">

                        <div className="flex items-center gap-3">

                          <span className="text-xs font-mono">{p.focusScore}</span>

                          <div className="w-28 h-1.5 bg-white/10 rounded-full">

                            <div
                              style={{ width: p.focusScore + "%" }}
                              className="h-full bg-yellow-400 rounded-full"
                            />

                          </div>

                        </div>

                      </td>

                      <td className="p-4 text-gray-400">{p.switches}</td>

                      <td className="p-4 text-gray-400 font-mono text-xs">
                        {p.focusDuration > 0 ? (
                          <>
                            {Math.floor(p.focusDuration / 60)}m {p.focusDuration % 60}s
                          </>
                        ) : '—'}
                      </td>

                      <td className="p-4">
                        <span className={
                          p.difficulty === "Easy"
                            ? "text-green-400"
                            : p.difficulty === "Medium"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }>
                          {p.difficulty}
                        </span>
                      </td>

                      <td className="p-4 text-gray-500 text-xs">{p.added}</td>

                      <td className="p-4">

                        <button
                          onClick={() => openNotes(p.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition"
                        >

                          <FileText size={18} />

                        </button>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>


          {/* PAGINATION */}

          <div className="flex items-center justify-center gap-4 pt-8">

            <button
              onClick={() => changePage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1 || pageLoading}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition disabled:opacity-30"
            >
              <ChevronLeft size={18} />
              Previous
            </button>


            <div className="flex items-center gap-2">

              {pageNumbers.map((page, index) => {

                if (page === "...") {
                  return <span key={index} className="px-2 text-gray-500">...</span>;
                }

                return (

                  <button
                    key={page}
                    onClick={() => changePage(page)}
                    className={`w-9 h-9 rounded-lg text-sm flex items-center justify-center transition
${currentPage === page
                        ? "bg-[#1f1f1f] text-white border border-white/10"
                        : "text-gray-400 hover:text-white"
                      }
`}
                  >

                    {page}

                  </button>

                );

              })}

            </div>

            <button
              onClick={() => changePage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages || pageLoading}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition disabled:opacity-30"
            >
              Next
              <ChevronRight size={18} />
            </button>

          </div>


          {/* CONNECTION TOKEN MODAL */}
          {connectionModalOpen && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-[#121212] border border-white/10 rounded-xl w-[500px] p-6 space-y-4">
                <h2 className="text-xl font-semibold text-emerald-400">Connect Your Extension</h2>
                <p className="text-sm text-gray-400">
                  Copy the secure token below and paste it into your DeepFocus Chrome Extension popup.
                  This token is shown only once and ensures a permanent, secure connection.
                </p>

                <div className="bg-[#0B0B0B] border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <code className="text-emerald-300 font-mono text-sm break-all">
                    {generatedToken}
                  </code>
                  <button
                    onClick={copyTokenToClipboard}
                    className={`ml-4 px-3 py-1 rounded transition flex items-center gap-2 text-xs font-medium ${copied
                      ? 'bg-emerald-500 text-black'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                      }`}
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Link size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setConnectionModalOpen(false);
                      setGeneratedToken(null);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTES MODAL */}

          {notesModal.open && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6 md:p-16 selection:bg-white selection:text-black">
              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="bg-[#000000] border border-[#111] rounded-none w-full max-w-[1400px] h-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.9)] relative"
              >
                {/* header: Vercel Core UI */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-[#111] bg-black">
                  <div className="flex items-center gap-12">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white flex items-center justify-center">
                        <div className="w-3 h-3 bg-black transform rotate-45" />
                      </div>
                      <h2 className="text-xs font-bold text-white tracking-[0.2em] uppercase">DeepFocus Notes</h2>
                    </div>

                    <div className="flex items-center gap-1 border border-[#111] p-1 bg-[#050505]">
                      {['brute', 'better', 'optimal'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setNotesModal({ ...notesModal, activeTab: tab })}
                          className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${notesModal.activeTab === tab
                            ? 'bg-white text-black'
                            : 'text-[#666] hover:text-white'
                            }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setNotesModal({ ...notesModal, open: false })}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#111] transition-all border border-transparent hover:border-[#222]"
                  >
                    <X size={16} className="text-[#666]" />
                  </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Sidebar: Vercel Parameters */}
                  <div className="w-[300px] border-r border-[#111] p-8 flex flex-col gap-10 bg-black">
                    <div className="space-y-8">
                      <label className="text-[10px] font-bold text-[#444] uppercase tracking-[0.2em]">Complexities</label>
                      <div className="space-y-8">
                        <div className="space-y-2">
                          <div className="text-[9px] font-medium text-[#666] uppercase tracking-wider">Time</div>
                          <input
                            value={notesModal[`${notesModal.activeTab}Time`] || ""}
                            onChange={(e) => setNotesModal({ ...notesModal, [`${notesModal.activeTab}Time`]: e.target.value })}
                            placeholder="O(1)"
                            className="w-full bg-transparent border-b border-[#111] focus:border-white py-2 text-sm font-mono text-white outline-none transition-all placeholder:text-[#222]"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-[9px] font-medium text-[#666] uppercase tracking-wider">Space</div>
                          <input
                            value={notesModal[`${notesModal.activeTab}Space`] || ""}
                            onChange={(e) => setNotesModal({ ...notesModal, [`${notesModal.activeTab}Space`]: e.target.value })}
                            placeholder="O(n)"
                            className="w-full bg-transparent border-b border-[#111] focus:border-white py-2 text-sm font-mono text-white outline-none transition-all placeholder:text-[#222]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-[#111] pt-6">

                    </div>
                  </div>

                  {/* Canvas: Focused Editor */}
                  <div className="flex-1 flex flex-col bg-[#050505] selection:bg-white selection:text-black">
                    <textarea
                      value={notesModal[notesModal.activeTab] || ""}
                      onChange={(e) => setNotesModal({ ...notesModal, [notesModal.activeTab]: e.target.value })}
                      placeholder={`// ${notesModal.activeTab.toUpperCase()} APPROACH\n// Start documenting implementation logic...`}
                      className="flex-1 bg-transparent px-12 py-10 text-[16px] font-mono text-[#888] focus:text-white focus:outline-none resize-none placeholder:text-[#222] leading-relaxed caret-white"
                      spellCheck="false"
                    />

                    {/* Footer: Vercel Actions */}
                    <div className="px-8 py-6 border-t border-[#111] flex items-center justify-between bg-black">
                      <div className="flex items-center gap-4 text-[10px] text-[#444] font-bold tracking-widest">
                        <span className="text-white/20 uppercase">Stores in Local Storage</span>
                      </div>

                      <div className="flex items-center gap-8">
                        <button
                          onClick={() => setNotesModal({ ...notesModal, open: false })}
                          className="text-[10px] font-bold text-[#666] hover:text-white transition-all uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveNotes}
                          className="bg-white text-black px-10 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#eaeaea] active:translate-y-[1px] transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

        </div>

      </div>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className="fixed top-6 right-6 z-[100] bg-[#121212]/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]"
          >
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-emerald-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Token Copied</h3>
              <p className="text-[11px] text-gray-400">Paste it into the DeepFocus Extension.</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="ml-auto text-gray-500 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );

}


/* SORT HEADER */

function SortableHeader({ label, column, sortConfig, requestSort }) {

  return (

    <th
      onClick={() => requestSort(column)}
      className="p-4 text-left cursor-pointer hover:text-white"
    >

      <div className="flex items-center gap-1">

        {label}

        {sortConfig.key === column && (
          sortConfig.direction === "asc"
            ? <ChevronUp size={14} />
            : <ChevronDown size={14} />
        )}

      </div>

    </th>

  );

}


/* FILTER DROPDOWN */

function FilterDropdown({ label, value, options, onChange }) {

  const [open, setOpen] = useState(false);

  return (

    <div className="relative">

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121212] border border-white/10 text-sm"
      >

        <span className="text-gray-300">
          {value === "all" ? label : value}
        </span>

        <ChevronDown size={16} />

      </button>

      {open && (

        <div className="absolute mt-2 w-44 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">

          {options.map(option => (

            <button
              key={option}
              onClick={() => { onChange(option); setOpen(false); }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-white/5"
            >

              <span className={value === option ? "text-yellow-400" : "text-gray-300"}>
                {option}
              </span>

              {value === option && (
                <CheckCircle2 size={16} className="text-yellow-400" />
              )}

            </button>

          ))}

        </div>

      )}

    </div>

  );

}


/* STATUS */

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


/* STAT */

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