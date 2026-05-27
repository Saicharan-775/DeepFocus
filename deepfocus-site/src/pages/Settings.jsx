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

const DEMO_AI_DAILY_LIMIT = 5;
const DEMO_AI_TRIAL_DAYS = 3;

function getDemoAiStatus() {
  const today = new Date().toISOString().split("T")[0];
  let startedAt = Number(localStorage.getItem("df_demo_ai_started_at") || 0);

  if (!startedAt) {
    startedAt = Date.now();
    localStorage.setItem("df_demo_ai_started_at", String(startedAt));
  }

  const elapsedDays = Math.floor((Date.now() - startedAt) / 86400000);
  const daysLeft = Math.max(0, DEMO_AI_TRIAL_DAYS - elapsedDays);
  const storedDate = localStorage.getItem("df_demo_ai_usage_date");
  const usedToday = storedDate === today ? Number(localStorage.getItem("df_demo_ai_usage_count") || 0) : 0;

  return {
    daysLeft,
    usedToday,
    remainingToday: Math.max(0, DEMO_AI_DAILY_LIMIT - usedToday)
  };
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
    localStorage.getItem("df_ai_provider") || "demo"
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

  const [saveState, setSaveState] = useState("saved");
  const [demoAiStatus, setDemoAiStatus] = useState(() => getDemoAiStatus());

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
  }, [dailyGoal, openAiKey, openrouterApiKey, groqApiKey, aiProvider]);

  useEffect(() => {
    const refreshDemoStatus = () => setDemoAiStatus(getDemoAiStatus());
    refreshDemoStatus();
    window.addEventListener("focus", refreshDemoStatus);
    window.addEventListener("storage", refreshDemoStatus);

    return () => {
      window.removeEventListener("focus", refreshDemoStatus);
      window.removeEventListener("storage", refreshDemoStatus);
    };
  }, [activeTab]);

  const checkExtensionConnection = async (userId) => {
    const { data: conn } = await supabase
      .from("extension_connections")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle();

    setExtensionLinked(!!conn);
  };

  const saveSettings = () => {
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
      aiKeyMode: hasUserKey ? "byok" : "demo"
    }, "*");

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

      window.postMessage(
        {
          type: "DEEPFOCUS_CONNECT",
          token: rawToken,
        },
        "*"
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
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-xl font-semibold">
                            {user?.email?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c0c] bg-emerald-500" />
                        </div>
                        <div>
                          <div className="text-base font-medium text-white flex items-center gap-2">
                            {user?.user_metadata?.full_name || "DeepFocus User"}
                            <div className="flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-300">
                              <ShieldCheck size={10} />
                              Verified
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-zinc-500">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      <button className="h-9 px-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-white hover:bg-white/[0.08] transition-colors">
                        Edit Profile
                      </button>
                    </div>

                    <div className="px-6 py-5 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-white">Current Plan</div>
                        <div className="text-sm text-zinc-500 mt-0.5">You are currently on the Pro tier</div>
                      </div>
                      <div className="text-sm font-medium text-white px-3 py-1 bg-white/[0.06] rounded-md border border-white/[0.06]">
                        Pro Plan
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
                    Configure inference providers, API keys, and reasoning models.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Demo uses left</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{demoAiStatus.remainingToday}</div>
                    <div className="mt-1 text-xs text-zinc-500">of {DEMO_AI_DAILY_LIMIT} today</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Trial days left</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{demoAiStatus.daysLeft}</div>
                    <div className="mt-1 text-xs text-zinc-500">of {DEMO_AI_TRIAL_DAYS} demo days</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Current mode</div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {openrouterApiKey.trim() || groqApiKey.trim() || openAiKey.trim() ? "Own key" : "Demo"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {openrouterApiKey.trim() || groqApiKey.trim() || openAiKey.trim() ? "No demo limit" : "Limited access"}
                    </div>
                  </div>
                </div>

                {/* PROVIDER SETTINGS */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Inference Provider</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {[
                        { id: "demo", name: "Demo Credits", desc: "3 days, 5/day" },
                        { id: "openrouter", name: "OpenRouter", desc: "Your API key" },
                        { id: "groq", name: "Groq", desc: "Fast fallback" },
                        { id: "openai", name: "OpenAI", desc: "GPT key" },
                      ].map((provider) => (
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
                              Stored locally in your browser and synced to the extension on this device.
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
                            Stored locally in your browser and synced to the extension on this device.
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
                            Stored locally in your browser and synced to the extension on this device.
                          </p>
                        </div>
                      </div>
                    )}

                    {aiProvider === "demo" && (
                      <div className="p-6">
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4 text-sm text-zinc-400 leading-relaxed">
                          Demo mode uses the DeepFocus environment key for AI analysis and pseudocode generation. 
                          Free demo access lasts 3 days and allows 5 successful AI actions per day. Adding your own OpenRouter, Groq, or OpenAI key removes the DeepFocus usage limit.
                        </div>
                      </div>
                    )}
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
