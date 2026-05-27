import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Sparkles, Brain, CheckCircle2, ShieldAlert, Code, Zap, ChevronLeft, ChevronDown, Check, Save, Copy,
  ExternalLink, RefreshCw, Calendar, Flame, AlertCircle, ArrowUpRight, Folder, Award, Layout, BookOpen,
  Clock, Code2, AlertTriangle, ArrowLeft, Lightbulb, Trash2, Heart, Search, Terminal, Database, Star, Target, Compass,
  AlignLeft, AlignCenter, AlignRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getRevisionProblems, addRevisionProblem } from "../services/revisionService";
import { getProblemPattern, patternPriorityMap, normalizeTitle, getSlugFromLink } from "../utils/patternMatcher";
import { getAiSummary, getAiPseudoCode } from "../services/aiService";
import ReactMarkdown from "react-markdown";
import curatedQuestions from '../constants/Patterns/curated_questions.json';

// Helper function to parse notes from database string format
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

// Helper to parse the AI summary into mistake, cause, and tip sections
function parseAiSummary(text) {
  if (!text) return null;

  function cleanText(txt) {
    if (!txt) return "";
    return txt
      .replace(/\*\*/g, "") // remove bold formatting
      .replace(/##+/g, "") // remove heading characters
      .replace(/^\s*[:\-\s*•]+\s*/gm, "") // remove bullet/dash list prefixes
      .trim();
  }

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

  let res = null;

  if (part1 !== -1 && part2 !== -1 && part3 !== -1) {
    res = {
      mistake: text.substring(part1 + len1, part2).trim().replace(/^:\s*/, ""),
      cause: text.substring(part2 + len2, part3).trim().replace(/^:\s*/, ""),
      tip: text.substring(part3 + len3).trim().replace(/^:\s*/, "")
    };
  } else {
    const parts = text.split(/(?:1\.|2\.|3\.)/);
    if (parts.length >= 4) {
      res = {
        mistake: parts[1].replace(/^\s*\*\*Code Review & Mistake\*\*:\s*/i, "").trim().replace(/^\s*\*Code Review & Mistake\*:\s*/i, "").trim().replace(/^\s*Code Review & Mistake:\s*/i, "").trim(),
        cause: parts[2].replace(/^\s*\*\*Cognitive Root Cause \("What made you think like this\?"\)\*\*:\s*/i, "").trim().replace(/^\s*Cognitive Root Cause \("What made you think like this\?"\):\s*/i, "").trim(),
        tip: parts[3].replace(/^\s*\*\*Correct Approach Tip\*\*:\s*/i, "").trim().replace(/^\s*Correct Approach Tip:\s*/i, "").trim()
      };
    } else {
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
        res = {
          mistake: result.mistake.trim().replace(/^:\s*/, ""),
          cause: result.cause.trim().replace(/^:\s*/, ""),
          tip: result.tip.trim().replace(/^:\s*/, "")
        };
      } else {
        res = {
          mistake: text,
          cause: "",
          tip: ""
        };
      }
    }
  }

  return {
    mistake: cleanText(res.mistake),
    cause: cleanText(res.cause),
    tip: cleanText(res.tip)
  };
}

export default function RevisionWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const problemId = searchParams.get("id");

  // Problem lists
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Workspace UI states
  const [activeProblem, setActiveProblem] = useState(null);
  const [activeTab, setActiveTab] = useState("brute"); // 'brute', 'better', 'optimal', 'code'
  
  // Note & Code state
  const [brute, setBrute] = useState("");
  const [bruteTime, setBruteTime] = useState("");
  const [bruteSpace, setBruteSpace] = useState("");
  const [better, setBetter] = useState("");
  const [betterTime, setBetterTime] = useState("");
  const [betterSpace, setBetterSpace] = useState("");
  const [optimal, setOptimal] = useState("");
  const [optimalTime, setOptimalTime] = useState("");
  const [optimalSpace, setOptimalSpace] = useState("");
  const [pseudoCode, setPseudoCode] = useState("");
  const [pseudoCodeAlign, setPseudoCodeAlign] = useState("left");
  const [pseudoCodeLoading, setPseudoCodeLoading] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [insightPanelOpen, setInsightPanelOpen] = useState(true);
  const [insightTab, setInsightTab] = useState("mistake");
  const [code, setCode] = useState("");
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // AI states
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");

  // Collapsible insights state
  const [collapsedCards, setCollapsedCards] = useState({
    mistake: false,
    cause: false,
    tip: false
  });

  // Problem selector dropdown
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState("");
  const [alertModal, setAlertModal] = useState({ open: false, message: "" });

  // Refs for custom Pseudo Code line numbering scroll sync
  const gutterRef = React.useRef(null);
  const textareaRef = React.useRef(null);

  // Load and parse notes when a problem is selected
  const selectProblem = (problem) => {
    setActiveProblem(problem);
    setSearchParams({ id: problem.id });
    
    // Parse notes
    const parsed = parseDbNotes(problem.dbNotes);
    const dbUserNotes = parsed.userNotes || {};
    
    // Local storage details
    const localNotes = JSON.parse(localStorage.getItem('df_notes') || '{}')[problem.id] || {};
    
    setBrute(dbUserNotes.brute || localNotes.brute || "");
    setBruteTime(dbUserNotes.bruteTime || localNotes.bruteTime || "");
    setBruteSpace(dbUserNotes.bruteSpace || localNotes.bruteSpace || "");
    setBetter(dbUserNotes.better || localNotes.better || "");
    setBetterTime(dbUserNotes.betterTime || localNotes.betterTime || "");
    setBetterSpace(dbUserNotes.betterSpace || localNotes.betterSpace || "");
    setOptimal(dbUserNotes.optimal || localNotes.optimal || "");
    setOptimalTime(dbUserNotes.optimalTime || localNotes.optimalTime || "");
    setOptimalSpace(dbUserNotes.optimalSpace || localNotes.optimalSpace || "");
    setPseudoCode(dbUserNotes.pseudoCode || dbUserNotes.mentalModel || localNotes.pseudoCode || localNotes.mentalModel || "");
    setPseudoCodeAlign(dbUserNotes.pseudoCodeAlign || localNotes.pseudoCodeAlign || "left");
    setShowFullSummary(false);
    
    setCode(problem.code || "");
    setIsEditingCode(!problem.code);
    
    let summary = parsed.aiSummary;
    if (!summary) {
      const cached = JSON.parse(localStorage.getItem('df_ai_summaries') || '{}');
      summary = cached[problem.id] || "";
    }
    setAiSummary(summary);
    setAiError("");
    setAiLoading(false);
    setIsSaved(true);
    setSaveMessage("");
    
    // Select best initial tab
    if (problem.code) {
      setActiveTab("optimal");
    } else if (dbUserNotes.brute || localNotes.brute) {
      setActiveTab("brute");
    } else {
      setActiveTab("optimal");
    }
  };

  async function loadProblems(silent = false) {
    if (!silent) setLoading(true);
    try {
      const dbProblems = await getRevisionProblems();
      const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
      
      const mapped = dbProblems.map(p => {
        const normTitle = normalizeTitle(p.title);
        const normSlug = getSlugFromLink(p.link);
        
        let cqMatch = null;
        for (const cq of curatedQuestions) {
          const normCqTitle = normalizeTitle(cq.title);
          const cqSlug = cq.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const normCqSlug = getSlugFromLink(`/problems/${cqSlug}/`);
          if (normTitle === normCqTitle || normSlug === normCqSlug) {
            cqMatch = cq;
            break;
          }
        }

        return {
          ...p,
          id: p.id,
          isCurated: !!cqMatch,
          revised: masteredIds.includes(p.id),
          pattern: cqMatch ? cqMatch.primary_pattern : getProblemPattern(p.title),
          dbNotes: p.notes || "",
          code: p.code || "",
          added: p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''
        };
      });

      setProblems(mapped);
    } catch (e) {
      console.error("Error loading problems for workspace:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    loadProblems(false);
    const channel = supabase
      .channel('workspace_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => {
        loadProblems(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle auto-selection and URL parameter transitions
  useEffect(() => {
    if (problems.length > 0) {
      if (problemId) {
        const found = problems.find(p => String(p.id) === String(problemId));
        if (found) {
          if (!activeProblem || String(activeProblem.id) !== String(problemId)) {
            selectProblem(found);
          }
        } else if (String(problemId).startsWith("cq-")) {
          const leetcodeId = String(problemId).replace("cq-", "");
          const cq = curatedQuestions.find(q => String(q.leetcode_id) === leetcodeId);
          const problemName = cq ? cq.title : "this curated question";
          
          setAlertModal({
            open: true,
            message: `You need to solve or attempt "${problemName}" using the DeepFocus extension first before viewing it in the workspace.`
          });
          
          // Select first available problem
          const firstProblem = problems[0];
          if (firstProblem) {
            selectProblem(firstProblem);
          }
        } else {
          // Normal ID not found, select first
          const firstProblem = problems[0];
          if (firstProblem) {
            selectProblem(firstProblem);
          }
        }
      } else {
        // No problemId in query param, redirect to the first available problem
        const firstProblem = problems[0];
        if (firstProblem) {
          selectProblem(firstProblem);
        }
      }
    }
  }, [problemId, problems]);

  // Keep activeProblem metadata updated from background changes without overwriting editor inputs
  useEffect(() => {
    if (activeProblem && problems.length > 0) {
      const latest = problems.find(p => String(p.id) === String(activeProblem.id));
      if (latest && (
        latest.focus_status !== activeProblem.focus_status || 
        latest.focus_score !== activeProblem.focus_score || 
        latest.revised !== activeProblem.revised
      )) {
        setActiveProblem(latest);
      }
    }
  }, [problems, activeProblem]);

  // Detect state changes to indicate unsaved status
  const handleTextChange = (field, value) => {
    setIsSaved(false);
    if (field === "brute") setBrute(value);
    if (field === "bruteTime") setBruteTime(value);
    if (field === "bruteSpace") setBruteSpace(value);
    if (field === "better") setBetter(value);
    if (field === "betterTime") setBetterTime(value);
    if (field === "betterSpace") setBetterSpace(value);
    if (field === "optimal") setOptimal(value);
    if (field === "optimalTime") setOptimalTime(value);
    if (field === "optimalSpace") setOptimalSpace(value);
    if (field === "pseudoCode" || field === "mentalModel") setPseudoCode(value);
    if (field === "code") setCode(value);
  };

  const handlePseudoCodeAlignChange = (alignment) => {
    setPseudoCodeAlign(alignment);
    setIsSaved(false);
  };

  // Save implementation
  async function handleSave(silent = false, overrides = {}) {
    if (!activeProblem) return;
    
    const finalBrute = overrides.hasOwnProperty('brute') ? overrides.brute : brute;
    const finalBruteTime = overrides.hasOwnProperty('bruteTime') ? overrides.bruteTime : bruteTime;
    const finalBruteSpace = overrides.hasOwnProperty('bruteSpace') ? overrides.bruteSpace : bruteSpace;
    const finalBetter = overrides.hasOwnProperty('better') ? overrides.better : better;
    const finalBetterTime = overrides.hasOwnProperty('betterTime') ? overrides.betterTime : betterTime;
    const finalBetterSpace = overrides.hasOwnProperty('betterSpace') ? overrides.betterSpace : betterSpace;
    const finalOptimal = overrides.hasOwnProperty('optimal') ? overrides.optimal : optimal;
    const finalOptimalTime = overrides.hasOwnProperty('optimalTime') ? overrides.optimalTime : optimalTime;
    const finalOptimalSpace = overrides.hasOwnProperty('optimalSpace') ? overrides.optimalSpace : optimalSpace;
    const finalPseudoCode = overrides.hasOwnProperty('pseudoCode') ? overrides.pseudoCode : pseudoCode;
    const finalPseudoCodeAlign = overrides.hasOwnProperty('pseudoCodeAlign') ? overrides.pseudoCodeAlign : pseudoCodeAlign;
    const finalCode = overrides.hasOwnProperty('code') ? overrides.code : code;
    const finalAiSummary = overrides.hasOwnProperty('aiSummary') ? overrides.aiSummary : aiSummary;

    const noteObj = {
      brute: finalBrute,
      bruteTime: finalBruteTime,
      bruteSpace: finalBruteSpace,
      better: finalBetter,
      betterTime: finalBetterTime,
      betterSpace: finalBetterSpace,
      optimal: finalOptimal,
      optimalTime: finalOptimalTime,
      optimalSpace: finalOptimalSpace,
      pseudoCode: finalPseudoCode,
      pseudoCodeAlign: finalPseudoCodeAlign,
      mentalModel: finalPseudoCode
    };
    
    // 1. Save locally in localStorage
    const allNotes = JSON.parse(localStorage.getItem('df_notes') || '{}');
    allNotes[activeProblem.id] = noteObj;
    localStorage.setItem('df_notes', JSON.stringify(allNotes));
    
    const finalDbNotes = JSON.stringify(noteObj) + (finalAiSummary ? "\n\n### AI Summary\n" + finalAiSummary : "");

    // 2. Database strategy
    const isCuratedQ = String(activeProblem.id).startsWith("cq-");
    
    if (isCuratedQ) {
      // Do not write unattempted curated questions to DB immediately unless user requests it.
      // We keep it in local storage until focus session completion or submission.
      if (!silent) {
        setSaveMessage("Saved locally! Attempt this question to link to cloud vault.");
        setTimeout(() => setSaveMessage(""), 4000);
      }
    } else {
      // Real problem: update DB
      try {
        const { error } = await supabase
          .from('revision_problems')
          .update({ 
            notes: finalDbNotes, 
            code: finalCode 
          })
          .eq('id', activeProblem.id);
          
        if (error) throw error;
        
        // Also update local loaded lists representation
        setProblems(prev => prev.map(p => p.id === activeProblem.id ? { ...p, dbNotes: finalDbNotes, code: finalCode } : p));
        
        if (!silent) {
          setSaveMessage("Changes synced to cloud successfully!");
          setTimeout(() => setSaveMessage(""), 3000);
        }
      } catch (err) {
        console.error("DB Sync error:", err);
        if (!silent) {
          setSaveMessage("Failed to sync to cloud. Kept in local session.");
          setTimeout(() => setSaveMessage(""), 4000);
        }
      }
    }

    setIsSaved(true);

    // Sync Auth user metadata for local backup
    supabase.auth.updateUser({
      data: { df_notes: allNotes }
    }).catch(console.error);
  }

  // Explicit save/push to DB for curated questions
  async function pushToDatabase() {
    if (!activeProblem || !String(activeProblem.id).startsWith("cq-")) return;
    
    try {
      const noteObj = {
        brute, bruteTime, bruteSpace,
        better, betterTime, betterSpace,
        optimal, optimalTime, optimalSpace,
        pseudoCode,
        mentalModel: pseudoCode
      };
      
      const finalDbNotes = JSON.stringify(noteObj) + (aiSummary ? "\n\n### AI Summary\n" + aiSummary : "");

      const created = await addRevisionProblem({
        title: activeProblem.title,
        link: activeProblem.link,
        difficulty: activeProblem.difficulty,
        focusStatus: 'Unattempted',
        focusScore: 0,
        notes: finalDbNotes,
        code: code
      });

      if (created) {
        // Swap active problem representation with the new created DB entry
        const dbProblem = {
          ...created,
          id: created.id,
          isCurated: false,
          revised: false,
          pattern: getProblemPattern(created.title),
          dbNotes: created.notes,
          code: created.code,
          added: new Date(created.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
        };
        
        // Re-load to update list
        await loadProblems();
        selectProblem(dbProblem);
        
        setSaveMessage("Problem added to your Cloud Revision Vault!");
        setTimeout(() => setSaveMessage(""), 4000);
      }
    } catch (e) {
      console.error(e);
      setSaveMessage("Could not add to vault.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  }

  // AI analysis trigger
  async function handleAnalyze() {
    if (!activeProblem) return;
    
    setAiLoading(true);
    setAiError("");
    
    try {
      const activeText =
        activeTab === 'code' ? code :
        activeTab === 'brute' ? brute :
        activeTab === 'better' ? better :
        optimal;

      const reviewSource = code.trim()
        ? `Submitted Code:\n${code}`
        : activeText.trim()
        ? `${activeApproachLabel} Notes:\n${activeText}`
        : [optimal, better, brute].filter(Boolean).join('\n\n');
      
      const summaryText = await getAiSummary({
        title: activeProblem.title,
        difficulty: activeProblem.difficulty,
        focusStatus: activeProblem.focus_status || "Attempted",
        codeOrNotes: reviewSource || "User requested analysis of notes workspace."
      });
      
      setAiSummary(summaryText);
      setIsSaved(false);

      // Save summary locally
      const cached = JSON.parse(localStorage.getItem('df_ai_summaries') || '{}');
      cached[activeProblem.id] = summaryText;
      localStorage.setItem('df_ai_summaries', JSON.stringify(cached));
      
      // Auto-save the notes with the new AI summary immediately
      await handleSave(true, { aiSummary: summaryText });

    } catch (e) {
      console.error(e);
      setAiError(e.message || "Could not review this approach. Check your key configuration.");
    } finally {
      setAiLoading(false);
    }
  }

  // Helper to format inline code (backticks) in Mentor Insights text
  const renderParagraph = (line, idx) => {
    if (!line) return null;
    const parts = line.split(/(`[^`]+`)/g);
    return (
      <p key={idx} className="mt-2 text-zinc-300 leading-relaxed font-sans text-xs">
        {parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} className="px-1.5 py-0.5 rounded bg-zinc-950 border border-white/[0.06] text-[10px] text-violet-300 font-mono mx-0.5 font-bold">
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
      </p>
    );
  };

  // Copy Pseudo Code to clipboard
  const handleCopy = () => {
    if (!pseudoCode) return;
    navigator.clipboard.writeText(pseudoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate Pseudo Code via AI
  async function handleGeneratePseudoCode() {
    if (!activeProblem) return;
    setPseudoCodeLoading(true);
    setAiError("");
    try {
      const generated = await getAiPseudoCode({
        title: activeProblem.title,
        difficulty: activeProblem.difficulty,
        code: code || optimal || better || brute || ""
      });
      setPseudoCode(generated);
      setIsSaved(false);
      
      // Auto-save the notes with the new Pseudo Code immediately
      await handleSave(true, { pseudoCode: generated });
    } catch (e) {
      console.error(e);
      setAiError(e.message || "Failed to generate pseudo code. Check API key configuration.");
    } finally {
      setPseudoCodeLoading(false);
    }
  }

  // Scroll sync handler for Pseudo Code line numbers
  const handleTextareaScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleManualPseudoCode = () => {
    textareaRef.current?.focus();
  };

  // Compute tabs checkmarks states
  const tabStatus = useMemo(() => {
    return {
      brute: !!brute.trim() || !!bruteTime.trim() || !!bruteSpace.trim(),
      better: !!better.trim() || !!betterTime.trim() || !!betterSpace.trim(),
      optimal: !!optimal.trim() || !!optimalTime.trim() || !!optimalSpace.trim(),
      code: !!code.trim()
    };
  }, [brute, bruteTime, bruteSpace, better, betterTime, betterSpace, optimal, optimalTime, optimalSpace, code]);



  // Filter problems inside the selector search box
  const filteredProblems = useMemo(() => {
    if (!selectorSearch) return problems;
    const q = selectorSearch.toLowerCase();
    return problems.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.pattern.toLowerCase().includes(q)
    );
  }, [problems, selectorSearch]);

  const parsedAi = useMemo(() => {
    return parseAiSummary(aiSummary);
  }, [aiSummary]);

  const activeApproachText = activeTab === 'brute' ? brute : activeTab === 'better' ? better : optimal;
  const activeApproachTime = activeTab === 'brute' ? bruteTime : activeTab === 'better' ? betterTime : optimalTime;
  const activeApproachSpace = activeTab === 'brute' ? bruteSpace : activeTab === 'better' ? betterSpace : optimalSpace;
  const activeApproachLabel = activeTab === 'brute' ? 'Brute' : activeTab === 'better' ? 'Better' : activeTab === 'optimal' ? 'Optimal' : 'Submitted';
  const approachMeta = {
    brute: {
      kicker: 'First valid path',
      title: 'Build the baseline without hiding the cost.',
      placeholder: 'Capture the direct idea, the loops or state you tried, where it becomes expensive, and the first edge case that exposes the weakness...',
      focus: 'Failed intuition',
    },
    better: {
      kicker: 'Transition layer',
      title: 'Record the observation that removes repeated work.',
      placeholder: 'Describe the improvement, the tradeoff it introduces, and the exact transition from brute force to a cleaner state or data structure...',
      focus: 'Optimization reasoning',
    },
    optimal: {
      kicker: 'Final mental model',
      title: 'Distill the invariant that makes the solution feel inevitable.',
      placeholder: 'Write the invariant, pattern, proof idea, complexity reasoning, and why each pointer, state, or recurrence moves safely...',
      focus: 'Clean reasoning',
    }
  };
  const activeMeta = approachMeta[activeTab] || approachMeta.optimal;
  const insightBody = insightTab === 'mistake'
    ? [parsedAi?.mistake, parsedAi?.cause].filter(Boolean).join('\n\n')
    : (parsedAi?.tip || '');

  // Render empty state if loading or no problems
  if (loading && problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-zinc-400">
        <RefreshCw className="animate-spin text-violet-500 mb-4" size={32} />
        <p className="font-mono text-sm tracking-wider uppercase">Initializing Personal DSA Workspace...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070708] pb-10 font-['Outfit','Inter',sans-serif] text-zinc-100 antialiased selection:bg-indigo-400/20 selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#070708]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent_34%,_rgba(255,255,255,0.018))]" />
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, transparent, black 14%, black 80%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 14%, black 80%, transparent)'
          }}
        />
      </div>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#09090a]/82 px-6 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
          
          {/* Left info & Dropdown Selector */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5 text-zinc-400 transition-all hover:border-white/[0.1] hover:bg-white/[0.055] hover:text-white active:scale-95"
              title="Go back"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm transition-all hover:border-white/[0.1] hover:bg-white/[0.055] hover:text-white"
              >
                <Compass size={14} className="text-zinc-500" />
                <span>{activeProblem ? activeProblem.title : "Select Problem"}</span>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${selectorOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {selectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 350, damping: 26 }}
                      className="absolute left-0 mt-2 w-72 md:w-80 rounded-xl border border-white/[0.08] bg-[#07070a]/95 backdrop-blur-md shadow-2xl p-2 z-50 overflow-hidden"
                    >
                      <div className="relative mb-2">
                        <input
                          autoFocus
                          value={selectorSearch}
                          onChange={(e) => setSelectorSearch(e.target.value)}
                          placeholder="Search workspace index..."
                          className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg py-2 pl-8 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.04] transition-all font-mono"
                        />
                        <Search size={12} className="absolute left-3 top-3 text-zinc-500 pointer-events-none" />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                        {filteredProblems.map((p) => {
                          const isActive = activeProblem?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                selectProblem(p);
                                setSelectorOpen(false);
                                setSelectorSearch("");
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${isActive ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium' : 'text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200 border border-transparent'}`}
                            >
                              <div className="truncate flex-1 pr-2">
                                <p className="font-semibold truncate">{p.title}</p>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{p.pattern}</p>
                              </div>
                              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold border ${p.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : p.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {p.difficulty}
                              </span>
                            </button>
                          );
                        })}
                        {filteredProblems.length === 0 && (
                          <div className="p-3 text-center text-[10px] text-zinc-600 font-mono">No matching indexed items</div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Middle Meta Info */}
          {activeProblem && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                activeProblem.difficulty === 'Easy'
                  ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                  : activeProblem.difficulty === 'Medium'
                  ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/5 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`w-1 h-1 rounded-full ${
                  activeProblem.difficulty === 'Easy' ? 'bg-emerald-400' : activeProblem.difficulty === 'Medium' ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                {activeProblem.difficulty}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.01] border border-white/[0.05] text-[10px] text-zinc-400 font-mono shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                {activeProblem.pattern}
              </span>
              {activeProblem.focus_status && activeProblem.focus_status !== 'Unattempted' && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border flex items-center gap-1.5 ${
                  activeProblem.focus_status === 'Cheated'
                    ? 'bg-rose-500/5 text-rose-400 border-rose-500/20'
                    : activeProblem.focus_status === 'Give Up'
                    ? 'bg-amber-500/5 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${
                    activeProblem.focus_status === 'Cheated' ? 'bg-rose-400' : activeProblem.focus_status === 'Give Up' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  {activeProblem.focus_status} / Score {activeProblem.focus_score}%
                </span>
              )}
              {activeProblem.isCurated && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-400/[0.08] text-indigo-200 border border-indigo-300/15 text-[10px] font-bold">
                  Curated Sheet
                </span>
              )}
            </div>
          )}

          {/* Save/Status indicators */}
          <div className="flex items-center gap-3 self-end md:self-auto font-mono text-xs">
            <AnimatePresence>
              {saveMessage && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-violet-400 text-[11px]"
                >
                  {saveMessage}
                </motion.span>
              )}
            </AnimatePresence>
            {!isSaved && (
              <span className="text-zinc-500 animate-pulse text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved modifications
              </span>
            )}
            
            {activeProblem && String(activeProblem.id).startsWith("cq-") && (
              <button
                onClick={pushToDatabase}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-bold transition-all text-xs cursor-pointer shadow-lg shadow-violet-500/10"
                title="Saves this curated problem to your personal cloud DB"
              >
                <ArrowUpRight size={13} />
                <span>Add to Cloud Vault</span>
              </button>
            )}

            <button
              onClick={() => handleSave(false)}
              disabled={isSaved}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${isSaved ? 'cursor-not-allowed border border-white/[0.04] bg-white/[0.01] text-zinc-600' : 'border border-indigo-300/20 bg-indigo-300/[0.14] text-indigo-50 hover:bg-indigo-300/[0.2] active:scale-95'}`}
            >
              <Save size={13} />
              <span>Sync Changes</span>
            </button>
          </div>

        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      {activeProblem ? (
        <main className="relative z-10 mx-auto max-w-[1500px] px-4 py-5 md:px-6">
          <div className="grid min-h-[calc(100vh-158px)] grid-cols-1 gap-3 lg:grid-cols-[minmax(420px,0.92fr)_minmax(560px,1.08fr)]">
            <section className="flex min-h-[700px] flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#101012]/92 shadow-[0_22px_60px_rgba(0,0,0,0.34)]">
              <div className="flex min-h-12 items-center gap-1 border-b border-white/[0.06] bg-[#0d0d0f] px-2">
                {[
                  { key: 'brute', label: 'Brute', icon: Brain },
                  { key: 'better', label: 'Better', icon: Zap },
                  { key: 'optimal', label: 'Optimal', icon: Target },
                  { key: 'code', label: 'Submitted', icon: Code2 }
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative flex h-10 items-center gap-2 rounded-md px-3 text-sm transition-all ${
                        isActive ? 'bg-white/[0.055] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]' : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-300'
                      }`}
                    >
                      <IconComponent size={14} className={isActive ? 'text-violet-300' : 'text-zinc-600'} />
                      <span>{tab.label}</span>
                      {tabStatus[tab.key] && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-emerald-400/80" />}
                      {isActive && (
                        <motion.span
                          layoutId="workspace-tab-line"
                          className="absolute inset-x-3 bottom-0 h-px bg-indigo-300/80"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto bg-[#101012] px-5 py-5">
                <div className="mb-5 border-b border-white/[0.06] pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">Revision Workspace</p>
                      <h1 className="text-[26px] font-semibold leading-tight text-white">{activeProblem.title}</h1>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${
                          activeProblem.difficulty === 'Easy'
                            ? 'bg-emerald-400/[0.08] text-emerald-300'
                            : activeProblem.difficulty === 'Hard'
                            ? 'bg-rose-400/[0.08] text-rose-300'
                            : 'bg-amber-400/[0.08] text-amber-300'
                        }`}>
                          {activeProblem.difficulty}
                        </span>
                        <span className="rounded-full bg-white/[0.035] px-2.5 py-1 text-zinc-400">{activeProblem.pattern}</span>
                        {activeProblem.focus_status && activeProblem.focus_status !== 'Unattempted' && (
                          <span className="rounded-full bg-indigo-400/10 px-2.5 py-1 text-indigo-200">
                            {activeProblem.focus_status} - {activeProblem.focus_score}%
                          </span>
                        )}
                      </div>
                    </div>
                    {activeProblem.link && (
                      <a
                        href={activeProblem.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                        title="Open problem"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>

                {activeTab === 'code' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">Submitted</p>
                        <h2 className="mt-1 text-lg font-semibold text-zinc-100">Final implementation</h2>
                      </div>
                      {code.trim() && (
                        <button
                          onClick={() => setIsEditingCode(!isEditingCode)}
                          className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                        >
                          {isEditingCode ? 'Preview' : 'Edit'}
                        </button>
                      )}
                    </div>
                    {isEditingCode || !code.trim() ? (
                      <textarea
                        value={code}
                        onChange={(e) => handleTextChange("code", e.target.value)}
                        placeholder="No submitted code was captured yet. Paste the final submitted code here."
                        className="min-h-[548px] w-full resize-none rounded-lg border border-white/[0.06] bg-[#09090b] p-5 font-mono text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-300/35"
                      />
                    ) : (
                      <div className="max-h-[610px] overflow-auto rounded-lg border border-white/[0.06] bg-[#09090b] text-sm">
                        <pre className="min-h-[548px] whitespace-pre-wrap break-words p-5 font-mono text-sm leading-6 text-zinc-100">
                          <code>{code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-600">{activeMeta.kicker}</p>
                        <h2 className="mt-1 text-lg font-semibold text-zinc-100">{activeMeta.title}</h2>
                      </div>
                      <span className="mt-1 rounded-full bg-white/[0.035] px-2.5 py-1 text-xs text-zinc-500">{activeApproachText.trim() ? 'Stored' : 'Empty'}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1.2fr]">
                      <label className="space-y-1.5 rounded-lg border border-white/[0.055] bg-white/[0.025] p-3">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">Time</span>
                        <input
                          value={activeApproachTime}
                          onChange={(e) => handleTextChange(`${activeTab}Time`, e.target.value)}
                          placeholder="O(n)"
                          className="w-full border-0 bg-transparent px-0 py-1 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-700"
                        />
                      </label>
                      <label className="space-y-1.5 rounded-lg border border-white/[0.055] bg-white/[0.025] p-3">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">Space</span>
                        <input
                          value={activeApproachSpace}
                          onChange={(e) => handleTextChange(`${activeTab}Space`, e.target.value)}
                          placeholder="O(1)"
                          className="w-full border-0 bg-transparent px-0 py-1 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-700"
                        />
                      </label>
                      <div className="rounded-lg border border-white/[0.055] bg-white/[0.025] p-3">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">Focus</p>
                        <p className="mt-1.5 text-sm text-zinc-300">{activeMeta.focus}</p>
                      </div>
                    </div>

                    <textarea
                      value={activeApproachText}
                      onChange={(e) => handleTextChange(activeTab, e.target.value)}
                      placeholder={
                        activeTab === 'brute'
                          ? activeMeta.placeholder
                          : activeTab === 'better'
                          ? activeMeta.placeholder
                          : activeMeta.placeholder
                      }
                      className="min-h-[430px] w-full resize-none rounded-lg border border-white/[0.06] bg-[#0b0b0d] p-5 text-[15px] leading-7 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-indigo-300/35"
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="flex min-h-[700px] flex-col overflow-hidden rounded-lg border border-white/[0.07] bg-[#0f0f11]/94 shadow-[0_22px_60px_rgba(0,0,0,0.34)]">
              <div className="flex min-h-12 items-center justify-between border-b border-white/[0.06] bg-[#0d0d0f] px-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Code2 size={16} className="text-indigo-300" />
                  <span>Pseudocode</span>
                  <span className="hidden text-xs font-normal text-zinc-600 sm:inline">editorial reasoning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleManualPseudoCode}
                    className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                    title="Write manually"
                    aria-label="Write pseudocode manually"
                  >
                    <Code size={13} />
                    <span>Manual</span>
                  </button>
                  <div className="hidden items-center rounded-md bg-black/20 p-0.5 sm:flex">
                    {[
                      { value: 'left', label: 'Align left', icon: AlignLeft },
                      { value: 'center', label: 'Align center', icon: AlignCenter },
                      { value: 'right', label: 'Align right', icon: AlignRight }
                    ].map(({ value, label, icon: IconComponent }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handlePseudoCodeAlignChange(value)}
                        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                          pseudoCodeAlign === value ? 'bg-white/[0.08] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title={label}
                        aria-label={label}
                      >
                        <IconComponent size={14} />
                      </button>
                    ))}
                  </div>
                  {pseudoCode.trim() && (
                    <button
                      onClick={handleCopy}
                      className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                      title="Copy"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleGeneratePseudoCode}
                    disabled={pseudoCodeLoading}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-indigo-400/[0.12] px-2.5 text-xs font-medium text-indigo-100 transition-colors hover:bg-indigo-400/[0.18] disabled:text-zinc-600"
                  >
                    {pseudoCodeLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{pseudoCodeLoading ? 'Drafting' : 'AI Draft'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden bg-[#09090b]">
                <div
                  ref={gutterRef}
                  className="w-14 shrink-0 select-none overflow-hidden border-r border-white/[0.055] bg-[#0d0d0f] py-5 pr-3 text-right font-mono text-xs text-zinc-700"
                >
                  {Array.from({ length: Math.max(pseudoCode.split('\n').length, 24) }).map((_, i) => (
                    <div key={i} className="h-7 leading-7">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={pseudoCode}
                  onScroll={handleTextareaScroll}
                  onChange={(e) => handleTextChange("pseudoCode", e.target.value)}
                  placeholder={"Generate with AI or write manually.\n\nExample:\n1. Track the invariant\n2. Move the pointer/state only when the condition changes\n3. Return the final accumulated answer"}
                  className="h-full min-h-[648px] flex-1 resize-none border-0 bg-transparent p-6 font-mono text-[15px] leading-7 text-zinc-100 outline-none placeholder:text-zinc-600"
                  style={{ textAlign: pseudoCodeAlign }}
                />
              </div>
            </section>
          </div>

          <section className="mt-3 overflow-hidden rounded-lg border border-white/[0.07] bg-[#101012]/92 shadow-[0_14px_44px_rgba(0,0,0,0.28)]">
            <div className="flex min-h-11 items-center justify-between border-b border-white/[0.06] bg-[#0d0d0f] px-3">
              <div className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => setInsightTab('mistake')}
                  className={`relative flex h-10 items-center gap-2 rounded-md px-3 font-medium transition-colors ${insightTab === 'mistake' ? 'bg-rose-300/[0.06] text-rose-200' : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-300'}`}
                >
                  <ShieldAlert size={14} />
                  Mistake
                  {insightTab === 'mistake' && <motion.span layoutId="insight-tab-line" className="absolute inset-x-3 bottom-0 h-px bg-rose-300/70" />}
                </button>
                <button
                  onClick={() => setInsightTab('fix')}
                  className={`relative flex h-10 items-center gap-2 rounded-md px-3 font-medium transition-colors ${insightTab === 'fix' ? 'bg-emerald-300/[0.06] text-emerald-200' : 'text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-300'}`}
                >
                  <Lightbulb size={14} />
                  Fix
                  {insightTab === 'fix' && <motion.span layoutId="insight-tab-line" className="absolute inset-x-3 bottom-0 h-px bg-emerald-300/70" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {aiError && <span className="hidden text-xs text-rose-300 md:inline">{aiError}</span>}
                <button
                  onClick={handleAnalyze}
                  disabled={aiLoading}
                  className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-100 disabled:text-zinc-600"
                >
                  <RefreshCw size={13} className={aiLoading ? 'animate-spin' : ''} />
                  <span>{aiLoading ? 'Reviewing' : 'Analyze'}</span>
                </button>
                <button
                  onClick={() => setInsightPanelOpen(prev => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
                  aria-label={insightPanelOpen ? 'Collapse insights' : 'Expand insights'}
                >
                  <ChevronDown size={15} className={`transition-transform ${insightPanelOpen ? '' : '-rotate-90'}`} />
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {insightPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4">
                    <div className={`min-h-28 rounded-lg border p-5 ${
                      insightTab === 'mistake'
                        ? 'border-rose-300/[0.12] bg-rose-300/[0.025]'
                        : 'border-emerald-300/[0.12] bg-emerald-300/[0.025]'
                    }`}>
                      <div className={`mb-3 flex items-center gap-2 text-sm font-medium ${insightTab === 'mistake' ? 'text-rose-200' : 'text-emerald-200'}`}>
                        {insightTab === 'mistake' ? <ShieldAlert size={15} /> : <Lightbulb size={15} />}
                        <span>{insightTab === 'mistake' ? 'Where thinking drifted' : 'Corrected transition'}</span>
                      </div>
                      {aiLoading ? (
                        <div className="space-y-2 pt-1">
                          <div className="h-3 w-4/5 rounded bg-white/[0.06] animate-pulse" />
                          <div className="h-3 w-3/5 rounded bg-white/[0.05] animate-pulse" />
                        </div>
                      ) : insightBody ? (
                        <div className="max-w-5xl space-y-1 text-sm leading-6 text-zinc-200">
                          {insightBody.split('\n').map((line, idx) => renderParagraph(line, idx))}
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-zinc-400">
                          {insightTab === 'mistake'
                            ? 'Analyze the submitted solution to surface the exact skipped logic or wrong transition.'
                            : 'Analyze the submitted solution to turn the correction into a clean mental move.'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      ) : (
        /* NO PROBLEMS REGISTERED */
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <BookOpen className="text-zinc-700 mb-3" size={40} />
          <h3 className="text-sm font-semibold tracking-wider font-mono text-zinc-300 uppercase">Vault Registry Index Empty</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
            There are no active problems linked to your account yet. Complete problem attempts using the DeepFocus extension or register items in the Curriculum Sheet.
          </p>
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
  );
}
