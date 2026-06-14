import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  User,
  BrainCircuit,
  Blocks,
  Check,
  ChevronDown,
  Save,
  Link2,
  ShieldCheck,
  Copy,
  Shuffle,
  Sparkles,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

const tabs = [
  {
    id: "account",
    label: "Personal",
    icon: User,
  },
  {
    id: "engine",
    label: "AI Engine",
    icon: BrainCircuit,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Blocks,
  },
];

const AI_PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", desc: "Low-cost routing" },
  { id: "groq", name: "Groq", desc: "Fast inference" },
  { id: "openai", name: "OpenAI", desc: "GPT models" },
];

const CURATED_AVATARS = [
  // Lorelei (illustrated faces)
  { id: "lorelei-1", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aria&backgroundType=gradientLinear&backgroundColor=c0aede,d1d4f9" },
  { id: "lorelei-2", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Alexander&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede" },
  { id: "lorelei-3", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya&backgroundType=gradientLinear&backgroundColor=ffdfdf,f0d5da" },
  { id: "lorelei-4", url: "https://api.dicebear.com/7.x/lorelei/svg?seed=Christian&backgroundType=gradientLinear&backgroundColor=c084fc,818cf8" },

  // Notionists (Notion minimal hand-drawn outline style)
  { id: "notion-1", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Oliver&backgroundType=gradientLinear&backgroundColor=b6e3f4,d1d4f9" },
  { id: "notion-2", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Sophia&backgroundType=gradientLinear&backgroundColor=ffd8be,fecdd3" },
  { id: "notion-3", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Lucas&backgroundType=gradientLinear&backgroundColor=d2f4ea,bbf7d0" },
  { id: "notion-4", url: "https://api.dicebear.com/7.x/notionists/svg?seed=Bella&backgroundType=gradientLinear&backgroundColor=ffdfdf,c0aede" },

  // Personas (sleek flat-vector illustrations)
  { id: "persona-1", url: "https://api.dicebear.com/7.x/personas/svg?seed=Jack&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede" },
  { id: "persona-2", url: "https://api.dicebear.com/7.x/personas/svg?seed=Lily&backgroundType=gradientLinear&backgroundColor=c0aede,d1d4f9" },
  { id: "persona-3", url: "https://api.dicebear.com/7.x/personas/svg?seed=Mason&backgroundType=gradientLinear&backgroundColor=ffdfdf,f0d5da" },
  { id: "persona-4", url: "https://api.dicebear.com/7.x/personas/svg?seed=Emma&backgroundType=gradientLinear&backgroundColor=c084fc,818cf8" },

  // Abstract / Geometric Styles
  { id: "shape-1", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Focus&backgroundType=gradientLinear&backgroundColor=c084fc,818cf8" },
  { id: "shape-2", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Deep&backgroundType=gradientLinear&backgroundColor=ec4899,8b5cf6" },
  { id: "shape-3", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Core&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede" },
  { id: "shape-4", url: "https://api.dicebear.com/7.x/shapes/svg?seed=Mind&backgroundType=gradientLinear&backgroundColor=d2f4ea,bbf7d0" },
];

function getInitialAiProvider() {
  const saved = localStorage.getItem("df_ai_provider");
  return AI_PROVIDERS.some((provider) => provider.id === saved) ? saved : "openrouter";
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  const [user, setUser] = useState(null);

  const [dailyGoal, setDailyGoal] = useState(5);

  const [openAiKey, setOpenAiKey] = useState(
    localStorage.getItem("df_openai_key") || ""
  );

  const [openrouterApiKey, setOpenrouterApiKey] = useState(
    localStorage.getItem("df_openrouter_api_key") || ""
  );

  const [groqApiKey, setGroqApiKey] = useState(
    localStorage.getItem("df_groq_api_key") || ""
  );

  const [aiProvider, setAiProvider] = useState(
    () => getInitialAiProvider()
  );

  const [stats, setStats] = useState({
    focusScore: 0,
    sessions: 0,
    dayStreak: 0,
    problems: 0,
    loading: true
  });

  const [extensionLinked, setExtensionLinked] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);

  const [generatedToken, setGeneratedToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPairToken, setShowPairToken] = useState(false);

  const [saveState, setSaveState] = useState("saved");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState("");
  const [fullName, setFullName] = useState("");

  // Custom Avatar Builder States
  const [customStyle, setCustomStyle] = useState("lorelei");
  const [customSeed, setCustomSeed] = useState("Focus");
  const [customBgType, setCustomBgType] = useState("gradientLinear");
  const [customBgColor, setCustomBgColor] = useState("c0aede,d1d4f9");

  useEffect(() => {
    let channel;

    const handleConnectionChange = (e) => {
      if (e.detail && e.detail.connected !== undefined) {
        setExtensionLinked(e.detail.connected);
      }
    };
    window.addEventListener('deepfocus_connection_changed', handleConnectionChange);

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setSelectedAvatarUrl(user.user_metadata?.avatar_url || "");
        setFullName(user.user_metadata?.full_name || "");
        checkExtensionConnection(user.id);

        const loadStats = async () => {
          const [pRes, sRes] = await Promise.all([
            supabase.from("revision_problems").select("*").eq("user_id", user.id),
            supabase.from("focus_sessions").select("*").eq("user_id", user.id)
          ]);

          const problems = pRes.data || [];
          const sessions = sRes.data || [];

          const problemScores = problems.filter(p => p.focus_score !== undefined && p.focus_score !== null);
          let avgFocusScore = 0;
          if (problemScores.length > 0) {
            avgFocusScore = Math.round(problemScores.reduce((acc, p) => acc + p.focus_score, 0) / problemScores.length);
          } else if (sessions.length > 0) {
            avgFocusScore = Math.round(sessions.reduce((acc, s) => acc + (s.focus_score || 0), 0) / sessions.length);
          }

          const activityMap = {};
          problems.forEach(p => {
             const dateKey = dayjs(p.created_at).format('YYYY-MM-DD');
             activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
          });
          sessions.forEach(s => {
             const dateKey = dayjs(s.start_time || s.created_at).format('YYYY-MM-DD');
             activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
          });

          let currentStreak = 0;
          const today = dayjs().format('YYYY-MM-DD');
          const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

          if (activityMap[today] || activityMap[yesterday]) {
             let checkDate = activityMap[today] ? dayjs(today) : dayjs(yesterday);
             while (activityMap[checkDate.format('YYYY-MM-DD')]) {
                 currentStreak++;
                 checkDate = checkDate.subtract(1, 'day');
             }
          }

          setStats({
            focusScore: avgFocusScore,
            sessions: sessions.length,
            dayStreak: currentStreak,
            problems: problems.length,
            loading: false
          });
        };

        loadStats();

        channel = supabase
          .channel('settings_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadStats())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => loadStats())
          .subscribe();
      }
    });

    setDailyGoal(
      parseInt(localStorage.getItem("dailyRevisionGoal")) || 5
    );

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('deepfocus_connection_changed', handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    setSaveState("unsaved");
  }, [dailyGoal, openAiKey, openrouterApiKey, groqApiKey, aiProvider, selectedAvatarUrl, fullName]);

  const checkExtensionConnection = async (userId) => {
    const { data: conn } = await supabase
      .from("extension_connections")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle();

    setExtensionLinked(!!conn);
  };

  const saveSettings = async () => {
    localStorage.setItem("dailyRevisionGoal", dailyGoal);

    localStorage.setItem("df_openai_key", openAiKey.trim());

    localStorage.setItem("df_openrouter_api_key", openrouterApiKey.trim());

    localStorage.setItem("df_groq_api_key", groqApiKey.trim());

    localStorage.setItem("df_ai_provider", aiProvider);

    const selectedOpenrouterKey = openrouterApiKey.trim();
    const selectedGroqKey = groqApiKey.trim();
    const selectedOpenAiKey = openAiKey.trim();
    const hasUserKey = !!(selectedOpenrouterKey || selectedGroqKey || selectedOpenAiKey);
    window.postMessage({
      type: "DEEPFOCUS_SET_AI_KEYS",
      openrouterApiKey: hasUserKey ? selectedOpenrouterKey : "",
      groqApiKey: hasUserKey ? selectedGroqKey : "",
      openAiApiKey: hasUserKey ? selectedOpenAiKey : "",
      aiKeyMode: hasUserKey ? "byok" : "none"
    }, window.location.origin);

    const metadataUpdates = {};
    let needsUpdate = false;
    if (selectedAvatarUrl !== (user?.user_metadata?.avatar_url || "")) {
      metadataUpdates.avatar_url = selectedAvatarUrl;
      needsUpdate = true;
    }
    if (fullName.trim() !== (user?.user_metadata?.full_name || "")) {
      metadataUpdates.full_name = fullName.trim();
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          data: metadataUpdates
        });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Error updating profile details:", err);
      }
    }

    setSaveState("saved");
  };

  const clearAiKeys = () => {
    setOpenrouterApiKey("");
    setGroqApiKey("");
    setOpenAiKey("");
    localStorage.removeItem("df_openrouter_api_key");
    localStorage.removeItem("df_groq_api_key");
    localStorage.removeItem("df_openai_key");
    localStorage.setItem("df_ai_provider", aiProvider);
    window.postMessage({
      type: "DEEPFOCUS_SET_AI_KEYS",
      openrouterApiKey: "",
      groqApiKey: "",
      openAiApiKey: "",
      aiKeyMode: "none"
    }, window.location.origin);
    setSaveState("saved");
  };

  const handleConnectExtension = async () => {
    setIsConnecting(true);

    try {
      const rawToken =
        "dfx_" + crypto.randomUUID().replace(/-/g, "");

      const encoder = new TextEncoder();

      const data = encoder.encode(rawToken.trim());

      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        data
      );

      const hashArray = Array.from(
        new Uint8Array(hashBuffer)
      );

      const tokenHash = hashArray
        .map((b) => ("00" + b.toString(16)).slice(-2))
        .join("");

      const { error: rpcError } = await supabase.rpc(
        "upsert_extension_token",
        {
          p_token_hash: tokenHash,
        }
      );

      if (rpcError) throw rpcError;

      setGeneratedToken(rawToken);
      setShowPairToken(false);

      window.postMessage(
        {
          type: "DEEPFOCUS_CONNECT",
          token: rawToken,
        },
        window.location.origin
      );

      setTimeout(() => {
        if (user) {
          checkExtensionConnection(user.id);
        }
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-white antialiased">
      {/* TOP BAR */}
      <div className="sticky top-0 z-50 border-b border-white/[0.04] backdrop-blur-xl bg-black/30">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Workspace
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
              <span>Settings</span>

              <span className="text-zinc-700">/</span>

              <span className="text-white">
                {
                  tabs.find((t) => t.id === activeTab)
                    ?.label
                }
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              <div
                className={`h-2 w-2 rounded-full ${
                  saveState === "saved"
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />

              <span className="text-sm text-zinc-500">
                {saveState === "saved"
                  ? "All changes saved"
                  : "Unsaved changes"}
              </span>
            </div>

            <button
              onClick={saveSettings}
              className="flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-all hover:bg-zinc-200 active:scale-[0.98]"
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="mx-auto flex max-w-[1200px] flex-col lg:flex-row lg:items-start gap-10 px-6 py-12">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-[240px] shrink-0">
          <div className="mb-6 px-1">
            <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">
              Preferences
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 ${
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <Icon size={16} className={active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"} />
                    <span className="text-sm font-medium">
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* ACCOUNT */}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Personal Profile
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    Manage your workspace profile, learning goals, and public presence.
                  </p>
                </div>

                {/* PROFILE CARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Basic Information</h3>
                  </div>
                  
                  <div className="divide-y divide-white/[0.06]">
                    <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full">
                        <div className="relative shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-xl font-semibold overflow-hidden">
                            {selectedAvatarUrl ? (
                              <img
                                src={selectedAvatarUrl}
                                alt="Avatar"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c0c] bg-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full Name</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your name..."
                                className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#151515] px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                              />
                              <div className="flex items-center gap-1 shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-300">
                                <ShieldCheck size={10} />
                                Verified
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Avatar Picker */}
                    <div className="px-6 py-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4">Choose Your Avatar</div>
                      
                      {/* Symmetrical 16 Preset Grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {CURATED_AVATARS.map((avatar) => {
                          const isSelected = selectedAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => {
                                setSelectedAvatarUrl(avatar.url);
                                setSaveState("unsaved");
                              }}
                              className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all p-0.5 bg-white/[0.03] hover:scale-105 active:scale-95 cursor-pointer ${
                                isSelected ? "border-violet-500 ring-2 ring-violet-500/20" : "border-white/[0.08] hover:border-white/[0.2]"
                              }`}
                            >
                              <img
                                src={avatar.url}
                                alt={`Avatar ${avatar.id}`}
                                className="w-full h-full object-cover rounded-full"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                                  <div className="bg-violet-500 text-white rounded-full p-0.5">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Avatar Builder Section */}
                      <div className="mt-6 pt-6 border-t border-white/[0.06]">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-violet-400" />
                          Design a Custom Avatar
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 bg-white/[0.01] border border-white/[0.04] rounded-xl p-5">
                          {/* Live Preview Column */}
                          <div className="flex flex-col items-center justify-center gap-3 shrink-0">
                            <div className="relative group">
                              <div className="absolute -inset-0.5 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-full blur opacity-30 group-hover:opacity-55 transition duration-500" />
                              <div className="relative h-24 w-24 rounded-full bg-[#151515] border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                                <img
                                  src={`https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`}
                                  alt="Custom avatar preview"
                                  className="w-full h-full object-cover rounded-full"
                                />
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newUrl = `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`;
                                setSelectedAvatarUrl(newUrl);
                                setSaveState("unsaved");
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedAvatarUrl === `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`
                                  ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                                  : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                              }`}
                            >
                              <Check size={12} />
                              {selectedAvatarUrl === `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}` ? "Selected" : "Apply Design"}
                            </button>
                          </div>

                          {/* Customizer Controls Column */}
                          <div className="flex-1 space-y-4">
                            {/* Style selector */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Style</label>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: "lorelei", label: "Lorelei" },
                                  { id: "notionists", label: "Notionist" },
                                  { id: "personas", label: "Persona" },
                                  { id: "adventurer", label: "Adventurer" },
                                  { id: "bottts-neutral", label: "Robot" },
                                  { id: "shapes", label: "Geometric" },
                                ].map((style) => (
                                  <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => setCustomStyle(style.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                      customStyle === style.id
                                        ? "bg-white/[0.08] border-white/[0.2] text-white"
                                        : "bg-transparent border-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.1]"
                                    }`}
                                  >
                                    {style.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Seed Input */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Seed / Keyphrase</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customSeed}
                                  onChange={(e) => setCustomSeed(e.target.value)}
                                  placeholder="Type anything to morph..."
                                  className="flex-1 rounded-lg border border-white/[0.08] bg-[#151515] px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const adjectives = ["Cool", "Smart", "Swift", "Focus", "Deep", "Code", "Apex", "Zero", "Nova", "Cosmic", "Byte", "Pixel"];
                                    const nouns = ["Coder", "Developer", "Hacker", "Builder", "Sage", "Ninja", "Guru", "Wizard", "Runner", "Ghost", "Alpha", "Zen"];
                                    const randSeed = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                                                     nouns[Math.floor(Math.random() * nouns.length)] + 
                                                     Math.floor(Math.random() * 100);
                                    setCustomSeed(randSeed);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                                  title="Randomize seed"
                                >
                                  <Shuffle size={12} />
                                  Random
                                </button>
                              </div>
                            </div>

                            {/* Background Gradients */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Background Gradient</label>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { label: "Ocean Sky", colors: "b6e3f4,c0aede,d1d4f9" },
                                    { label: "Sunset Coral", colors: "ffdfdf,f0d5da" },
                                    { label: "Cyber Punk", colors: "ec4899,8b5cf6" },
                                    { label: "Lavender Dream", colors: "c084fc,818cf8" },
                                    { label: "Emerald Mint", colors: "d2f4ea,bbf7d0" },
                                    { label: "Sweet Peach", colors: "ffd8be,fecdd3" },
                                    { label: "Cosmic Dark", colors: "1e1b4b,312e81" },
                                    { label: "Deep Sea", colors: "0f172a,0d9488" },
                                  ].map((bg, idx) => {
                                    const isSelected = customBgColor === bg.colors;
                                    const splitColors = bg.colors.split(",");
                                    const gradientCss = splitColors.length === 2 
                                      ? `linear-gradient(135deg, #${splitColors[0]}, #${splitColors[1]})`
                                      : splitColors.length === 3 
                                        ? `linear-gradient(135deg, #${splitColors[0]}, #${splitColors[1]}, #${splitColors[2]})`
                                        : `linear-gradient(135deg, #fff, #000)`;

                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCustomBgColor(bg.colors)}
                                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer relative ${
                                          isSelected ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "border-white/10 hover:border-white/30"
                                        }`}
                                        style={{ background: gradientCss }}
                                        title={bg.label}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* STATS CARD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    ["Focus Score", stats.loading ? "..." : `${stats.focusScore}%`],
                    ["Sessions", stats.loading ? "..." : stats.sessions.toString()],
                    ["Day Streak", stats.loading ? "..." : stats.dayStreak.toString()],
                    ["Problems", stats.loading ? "..." : stats.problems.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-5 flex flex-col justify-center items-center text-center">
                      <div className="text-2xl font-semibold text-white">
                        {value}
                      </div>
                      <div className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* DAILY GOAL CARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Learning Goals</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-sm font-medium text-white">Daily Revision Target</div>
                        <div className="text-sm text-zinc-500 mt-0.5">Set the number of problems to review per day</div>
                      </div>
                      <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-white/[0.1] bg-[#151515] text-lg font-semibold text-white">
                        {dailyGoal}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={dailyGoal}
                      onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-white"
                    />

                    <div className="mt-3 flex justify-between text-xs font-medium text-zinc-500">
                      <span>Light (1)</span>
                      <span>Balanced (7)</span>
                      <span>Intense (15)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI ENGINE */}
            {activeTab === "engine" && (
              <motion.div
                key="engine"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    AI Engine
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    Bring your own provider key. Keys stay on this device and are sent directly to the selected AI provider.
                  </p>
                </div>

                {/* PROVIDER SETTINGS */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Inference Provider</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {AI_PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setAiProvider(provider.id)}
                          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                            aiProvider === provider.id
                              ? "border-white/[0.2] bg-white/[0.04]"
                              : "border-white/[0.04] bg-transparent hover:border-white/[0.1] hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className={`text-sm font-medium ${aiProvider === provider.id ? "text-white" : "text-zinc-300"}`}>
                              {provider.name}
                            </span>
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${aiProvider === provider.id ? "border-white" : "border-zinc-700"}`}>
                              {aiProvider === provider.id && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500">{provider.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CONFIGURATION CARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Provider Configuration</h3>
                  </div>
                  
                  <div className="divide-y divide-white/[0.06]">
                    {aiProvider === "openrouter" && (
                      <>
                          <div className="p-6 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-white mb-1.5">
                                OpenRouter API Key
                              </label>
                              <input
                                type="password"
                                value={openrouterApiKey}
                                onChange={(e) => setOpenrouterApiKey(e.target.value)}
                                placeholder="sk-or-v1-..."
                                className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                              />
                              <p className="mt-2 text-xs text-zinc-500">
                                Used on this device for DeepFocus and the browser extension.
                              </p>
                            </div>
                          </div>
                      </>
                    )}

                    {aiProvider === "groq" && (
                          <div className="p-6 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-white mb-1.5">
                                Groq API Key
                              </label>
                              <input
                                type="password"
                                value={groqApiKey}
                                onChange={(e) => setGroqApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                              />
                              <p className="mt-2 text-xs text-zinc-500">
                                Used on this device for DeepFocus and the browser extension.
                              </p>
                            </div>
                          </div>
                    )}

                    {aiProvider === "openai" && (
                          <div className="p-6 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-white mb-1.5">
                                OpenAI API Key
                              </label>
                              <input
                                type="password"
                                value={openAiKey}
                                onChange={(e) => setOpenAiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                              />
                              <p className="mt-2 text-xs text-zinc-500">
                                Used on this device for DeepFocus and the browser extension.
                              </p>
                            </div>
                          </div>
                    )}

                    <div className="p-6">
                      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>Your key stays on your device and is never saved to DeepFocus servers.</span>
                        <button
                          type="button"
                          onClick={clearAiKeys}
                          className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          Remove stored keys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* INTEGRATIONS */}
            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Integrations
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    Connect external services and the DeepFocus browser extension.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Browser Extension</h3>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                          <Blocks size={20} className={extensionLinked ? "text-emerald-400" : "text-white"} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">DeepFocus Companion</div>
                          <div className="mt-1 text-sm text-zinc-500 max-w-sm">
                            Syncs your LeetCode sessions, focus metrics, and code submissions directly to your dashboard.
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                            <div className={`h-1.5 w-1.5 rounded-full ${extensionLinked ? "bg-emerald-500" : "bg-zinc-600"}`} />
                            <span className={extensionLinked ? "text-emerald-500" : "text-zinc-500"}>
                              {extensionLinked ? "Active Connection" : "Not Connected"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleConnectExtension}
                        disabled={isConnecting}
                        className={`shrink-0 flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                          extensionLinked
                            ? "bg-white/[0.06] text-white border border-white/[0.06] hover:bg-white/[0.1]"
                            : "bg-white text-black hover:bg-zinc-200"
                        }`}
                      >
                        {extensionLinked ? (
                          <>
                            <Check size={16} className="text-emerald-400" />
                            Connected
                          </>
                        ) : isConnecting ? (
                          "Connecting..."
                        ) : (
                          "Pair Extension"
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {generatedToken && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-white/[0.01]">
                            <div className="mb-2 text-sm font-medium text-white">
                              Secure Pairing Token
                            </div>
                            <div className="mb-4 text-xs text-zinc-500">
                              Paste this token into the DeepFocus extension if it doesn't automatically connect.
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#151515] px-4 py-2.5 font-mono text-sm text-zinc-300 whitespace-nowrap">
                                {generatedToken}
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedToken);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] text-white hover:bg-white/[0.1] transition-colors"
                                aria-label="Copy token"
                              >
                                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
