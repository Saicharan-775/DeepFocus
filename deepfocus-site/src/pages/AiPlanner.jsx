import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, CheckCircle2, ChevronRight, Edit3, Target, Calendar, X, Sparkles, Clock, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function AiPlanner() {
  const [goal, setGoal] = useState("Crack FAANG Interviews");
  const [targetDate, setTargetDate] = useState("Dec 31, 2026");
  const [commitment, setCommitment] = useState("2 hours / day");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Temporary state for the modal
  const [tempGoal, setTempGoal] = useState(goal);
  const [tempDate, setTempDate] = useState(targetDate);
  const [tempCommitment, setTempCommitment] = useState(commitment);
  
  const navigate = useNavigate();
  
  const [phases, setPhases] = useState([
    {
      title: "Phase 1: Arrays & Hashing",
      description: "Master foundational concepts of array manipulation and hash maps.",
      status: "DONE",
      problems: [
        { name: "Two Sum", difficulty: "Easy" },
        { name: "Valid Anagram", difficulty: "Easy" }
      ]
    },
    {
      title: "Phase 2: Two Pointers & Sliding Window",
      description: "Optimize O(N²) solutions to O(N) using two pointers.",
      status: "ACTIVE",
      problems: [
        { name: "3Sum", difficulty: "Medium" },
        { name: "Container With Most Water", difficulty: "Medium" }
      ]
    },
    {
      title: "Phase 3: Trees & Graphs",
      description: "Traversals, paths, and graph algorithms.",
      status: "PENDING",
      problems: [
        { name: "Number of Islands", difficulty: "Medium" }
      ]
    }
  ]);

  useEffect(() => {
    const provider = localStorage.getItem('df_ai_provider') || 'demo';
    const geminiKey = localStorage.getItem('df_gemini_key');
    const openaiKey = localStorage.getItem('df_openai_key');
    setApiKey(provider === 'demo' ? 'demo_active' : (provider === 'gemini' ? geminiKey : openaiKey));
  }, []);

  const generateNewPlan = async () => {
    const provider = localStorage.getItem('df_ai_provider') || 'demo';
    const geminiKey = localStorage.getItem('df_gemini_key')?.trim();
    const openaiKey = localStorage.getItem('df_openai_key')?.trim();
    const keyToUse = provider === 'gemini' ? geminiKey : openaiKey;

    if (provider !== 'demo' && !keyToUse) {
      navigate('/settings');
      return;
    }
    
    setIsGenerating(true);
    try {
      const prompt = `Generate a 3-phase study plan to achieve this programming goal: "${goal}". Target date: ${targetDate}. Daily commitment: ${commitment}.
Return ONLY valid JSON in this EXACT array format:
[
  { 
    "title": "Phase 1: Title", 
    "description": "Short description",
    "status": "DONE",
    "problems": [ {"name": "Problem Name", "difficulty": "Easy"} ]
  },
  { 
    "title": "Phase 2: Title", 
    "description": "Short description",
    "status": "ACTIVE",
    "problems": [ {"name": "Problem Name", "difficulty": "Medium"} ]
  },
  { 
    "title": "Phase 3: Title", 
    "description": "Short description",
    "status": "PENDING",
    "problems": [ {"name": "Problem Name", "difficulty": "Hard"} ]
  }
]`;
      
      let text = "";
      if (provider === 'demo') {
        await new Promise(r => setTimeout(r, 1500));
        setPhases([
          {
            title: "Phase 1: Arrays & Hashing (Demo)",
            description: "Master foundational concepts of array manipulation and hash maps.",
            status: "DONE",
            problems: [{ name: "Two Sum", difficulty: "Easy" }, { name: "Valid Anagram", difficulty: "Easy" }]
          },
          {
            title: "Phase 2: Two Pointers (Demo)",
            description: "Optimize O(N²) solutions to O(N) using two pointers.",
            status: "ACTIVE",
            problems: [{ name: "3Sum", difficulty: "Medium" }, { name: "Container With Most Water", difficulty: "Medium" }]
          },
          {
            title: "Phase 3: Trees & Graphs (Demo)",
            description: "Traversals, paths, and graph algorithms.",
            status: "PENDING",
            problems: [{ name: "Number of Islands", difficulty: "Medium" }]
          }
        ]);
        setIsGenerating(false);
        return;
      } else if (provider === 'gemini') {
        const selectedModel = localStorage.getItem('df_gemini_model') || 'gemini-1.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      } else {
        const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        text = data.choices?.[0]?.message?.content || "[]";
      }

      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPhases(parsed);
      } else if (parsed.phases && Array.isArray(parsed.phases)) {
        setPhases(parsed.phases);
      }
    } catch (error) {
      console.error(error);
      if (/quota|limit|exceeded|429/i.test(error.message)) {
        alert("API Quota Exceeded (429).\n\nWhy is this happening with a new API key?\n1. OpenAI: New accounts require a linked credit card with a prepaid balance to use the API.\n2. Google Gemini: Your region may restrict free-tier API access, or you hit the limits.\n\nLoading a fallback study plan for now. Please check your billing dashboard.");
        setPhases([
          {
            title: "Phase 1: Foundation (Fallback)",
            description: "Master arrays, hashmaps, and basic recursion.",
            status: "DONE",
            problems: [{ name: "Two Sum", difficulty: "Easy" }]
          },
          {
            title: "Phase 2: Optimization",
            description: "Study Two Pointers and Sliding Window techniques.",
            status: "ACTIVE",
            problems: [{ name: "3Sum", difficulty: "Medium" }]
          }
        ]);
      } else {
        alert(`Failed to generate plan. Error: ${error.message}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in h-full flex flex-col relative">
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm flex flex-col items-center justify-center z-50"
          >
            <div className="w-80 h-80">
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
              className="text-violet-400 font-medium tracking-widest text-sm uppercase mt-4 animate-pulse text-center px-8"
            >
              Creating your study plan...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <BrainCircuit className="text-violet-400" size={28} />
            </div>
            AI Study Planner
          </h1>
          <p className="text-gray-400 mt-2 text-sm max-w-lg">Your personalized machine-learning roadmap, dynamically adapting to your algorithmic strengths and goals.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2.5 bg-[#09090b] hover:bg-white/5 text-gray-300 rounded-xl font-medium transition-colors text-sm border border-white/10 hover:border-white/20 flex items-center gap-2 shadow-sm"
          >
            <Edit3 size={16} /> Edit Goal
          </button>
          <button 
            onClick={generateNewPlan}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold transition-all text-sm hover:from-violet-500 hover:to-indigo-500 flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : (
              <>
                <Sparkles size={16} /> Generate New Plan
              </>
            )}
          </button>
        </div>
      </div>

      {!apiKey && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4 shadow-lg backdrop-blur-sm">
          <div className="p-2 bg-rose-500/20 rounded-lg">
            <span className="text-rose-400 text-lg">⚠️</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-400">API Connection Required</h4>
            <p className="text-sm text-rose-300/80 mt-1">Please go to Settings and link your API Key to utilize the dynamic AI planner. Alternatively, you can enable Demo Mode.</p>
          </div>
        </motion.div>
      )}

      {/* Goal Setup Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-[#09090B] to-[#111115] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Target size={14} className="text-rose-400" /> Current Goal
          </div>
          <div className="text-lg font-bold text-white relative z-10">{goal}</div>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-[#09090B] to-[#111115] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Calendar size={14} className="text-blue-400" /> Target Date
          </div>
          <div className="text-lg font-bold text-white relative z-10">{targetDate}</div>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-[#09090B] to-[#111115] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Clock size={14} className="text-emerald-400" /> Daily Commitment
          </div>
          <div className="text-lg font-bold text-white relative z-10">{commitment}</div>
        </motion.div>
        
        <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-[#09090B] to-[#111115] p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <BrainCircuit size={14} className="text-violet-400" /> Plan Progress
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Completion</span>
              <span className="text-sm font-bold text-white">35%</span>
            </div>
            <div className="w-full h-2 bg-[#000000] rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '35%' }} 
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Roadmap Timeline */}
      <div className="bg-[#09090B] p-8 rounded-2xl border border-white/5 flex-1 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-violet-500/5 blur-[120px] pointer-events-none" />
        <h2 className="text-xl font-bold text-white mb-8 relative z-10">Study Roadmap</h2>

        <div className="relative z-10">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />
          <div className="space-y-10">
            {phases.map((phase, idx) => (
              <div key={idx} className={`relative flex items-start gap-8 ${phase.status === 'PENDING' ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}`}>
                <div className="w-16 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center relative z-10 
                    ${phase.status === 'DONE' ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                      phase.status === 'ACTIVE' ? 'bg-violet-500 border-violet-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' :
                        'bg-[#000000] border-white/20 text-gray-500'}`}>
                    {phase.status === 'DONE' ? <CheckCircle2 size={16} /> :
                      phase.status === 'ACTIVE' ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
                        (idx + 1)}
                  </div>
                  <span className={`text-xs font-bold mt-2 ${phase.status === 'DONE' ? 'text-emerald-400' :
                      phase.status === 'ACTIVE' ? 'text-violet-400' :
                        'text-gray-500'}`}>{phase.status}</span>
                </div>
                <div className={`flex-1 p-6 rounded-2xl border 
                  ${phase.status === 'ACTIVE' ? 'bg-gradient-to-r from-violet-500/10 to-transparent border-violet-500/30 ring-1 ring-violet-500/10' :
                    'bg-[#000000]/80 border-white/5'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-bold ${phase.status === 'PENDING' ? 'text-gray-300' : 'text-white'} mb-2`}>{phase.title}</h3>
                      <p className={`${phase.status === 'ACTIVE' ? 'text-violet-200/70' : 'text-gray-400'} text-sm mb-4`}>{phase.description}</p>
                    </div>
                    {phase.status === 'ACTIVE' && (
                      <div className="text-right">
                        <span className="text-2xl font-bold text-violet-400">0%</span>
                        <p className="text-xs text-violet-300/50 uppercase tracking-widest">Completed</p>
                      </div>
                    )}
                  </div>

                  {phase.problems && phase.problems.length > 0 && (
                    <div className="mt-6 bg-[#000000]/60 rounded-xl border border-white/5 overflow-hidden">
                      <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Problems</span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {phase.problems.map((prob, pIdx) => (
                          <div key={pIdx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded border border-gray-600 flex items-center justify-center group-hover:border-violet-400 transition-colors" />
                              <span className="text-sm font-medium text-gray-200">{prob.name}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded font-medium 
                              ${prob.difficulty === 'Easy' ? 'bg-emerald-400/10 text-emerald-400' :
                                prob.difficulty === 'Hard' ? 'bg-rose-400/10 text-rose-400' :
                                  'bg-amber-400/10 text-amber-400'
                              }`}>{prob.difficulty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Goal Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Target size={18} className="text-violet-400" /> Edit Learning Goal</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Primary Goal</label>
                  <input 
                    type="text" 
                    value={tempGoal} 
                    onChange={(e) => setTempGoal(e.target.value)} 
                    placeholder="e.g., Crack FAANG Interviews" 
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Target Date</label>
                  <input 
                    type="text" 
                    value={tempDate} 
                    onChange={(e) => setTempDate(e.target.value)} 
                    placeholder="e.g., Dec 31, 2026" 
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Daily Commitment</label>
                  <input 
                    type="text" 
                    value={tempCommitment} 
                    onChange={(e) => setTempCommitment(e.target.value)} 
                    placeholder="e.g., 2 hours / day" 
                    className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setGoal(tempGoal);
                    setTargetDate(tempDate);
                    setCommitment(tempCommitment);
                    setIsEditModalOpen(false);
                    // Optionally trigger generateNewPlan() here
                  }} 
                  className="px-5 py-2.5 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
