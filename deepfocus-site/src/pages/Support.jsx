import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ArrowRight, User, Mail, MessageSquare, ShieldCheck, AlertCircle,
  Users, Flame, Heart, Share2, Coffee, Zap, Edit3, Code2, Check, Lock, Trophy,
  Sliders, Crown
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ─── SKELETON LOADER COMPONENT ───
const CardSkeleton = () => (
  <div className="break-inside-avoid relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.04] bg-[#0E0E12]/40 animate-pulse h-[220px] p-6 shadow-inner">
    <div className="flex-grow space-y-3">
      <div className="h-3.5 bg-zinc-800/80 rounded-md w-5/6" />
      <div className="h-3.5 bg-zinc-800/80 rounded-md w-4/6" />
      <div className="h-3.5 bg-zinc-800/80 rounded-md w-2/6" />
    </div>
    <div className="h-10 border-t border-white/[0.03] pt-4 flex items-center justify-between mt-auto">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-zinc-800/80" />
        <div className="space-y-1">
          <div className="h-3 bg-zinc-800/80 rounded w-16" />
          <div className="h-2.5 bg-zinc-800/80 rounded w-10" />
        </div>
      </div>
      <div className="h-5 bg-zinc-800/80 rounded-full w-12" />
    </div>
  </div>
);

// ─── LOCAL PRESETS (Aligned to Visual Design) ───
const PRESETS = [
  { id: "coffee", Icon: Coffee, amount: 99, label: "Coffee" },
  { id: "pizza", Icon: Zap, amount: 299, label: "Boost" },
  { id: "lightning", Icon: Heart, amount: 499, label: "Founder" },
  { id: "custom", Icon: Sliders, amount: 0, label: "Custom" },
];

// ─── WALL OF FAME CARD STYLES ───
const CARD_THEMES = [
  {
    body: "bg-[#140C22]/85 border-violet-500/[0.08] text-violet-100 shadow-[0_12px_40px_rgba(124,58,237,0.06)]",
    footer: "bg-[#0B0614]/80 border-violet-500/5",
    badge: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    glow: "bg-violet-500/5",
  },
  {
    body: "bg-[#091B11]/85 border-emerald-500/[0.08] text-emerald-100 shadow-[0_12px_40px_rgba(16,185,129,0.06)]",
    footer: "bg-[#040E09]/80 border-emerald-500/5",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    glow: "bg-emerald-500/5",
  },
  {
    body: "bg-[#0A1428]/85 border-blue-500/[0.08] text-blue-100 shadow-[0_12px_40px_rgba(59,130,246,0.06)]",
    footer: "bg-[#050A15]/80 border-blue-500/5",
    badge: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    glow: "bg-blue-500/5",
  },
  {
    body: "bg-[#200A0D]/85 border-rose-500/[0.08] text-rose-100 shadow-[0_12px_40px_rgba(244,63,94,0.06)]",
    footer: "bg-[#110507]/80 border-rose-500/5",
    badge: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    glow: "bg-rose-500/5",
  },
  {
    body: "bg-[#1D1305]/85 border-amber-500/[0.08] text-amber-100 shadow-[0_12px_40px_rgba(245,158,11,0.06)]",
    footer: "bg-[#0F0A02]/80 border-amber-500/5",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    glow: "bg-amber-500/5",
  },
  {
    body: "bg-[#100C24]/85 border-indigo-500/[0.08] text-indigo-100 shadow-[0_12px_40px_rgba(99,102,241,0.06)]",
    footer: "bg-[#080614]/80 border-indigo-500/5",
    badge: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    glow: "bg-indigo-500/5",
  },
];

const DECORATIONS = ['☕', '🚀', '💜', '⚡', '✨', '🎯', '😊', '🔥', '❤️'];

export default function Support() {
  // Page load & Data states
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalSupporters, setTotalSupporters] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [latestDonation, setLatestDonation] = useState(null);
  const [supporters, setSupporters] = useState([]);
  const [top3, setTop3] = useState([]);
  const [filterTab, setFilterTab] = useState("recent");

  // Form states
  const [selectedPreset, setSelectedPreset] = useState("pizza");
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  // Status & Feedback states
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const activeAmount = selectedPreset === "custom" ? Number(customAmount) : (PRESETS.find(p => p.id === selectedPreset)?.amount || 0);

  // ─── INITIAL DATA FETCH ───
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: donationsData, error: dbError } = await supabase
          .from("donations")
          .select("amount")
          .eq("status", "success");

        if (dbError) throw dbError;

        if (donationsData) {
          setTotalSupporters(donationsData.length);
          setTotalAmount(donationsData.reduce((sum, d) => sum + Number(d.amount), 0));
        }

        const { data: latestData } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestData && latestData.length > 0) {
          setLatestDonation(latestData[0]);
        }

        const { data: top3Data } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "success")
          .order("amount", { ascending: false })
          .limit(3);

        if (top3Data) {
          setTop3(top3Data);
        }
      } catch (err) {
        console.error("Error fetching donation aggregates:", err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadInitialData();

    // ─── REALTIME SOCKET SUBSCRIPTION ───
    const channel = supabase
      .channel("realtime-contributors-site")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donations" },
        (payload) => {
          const oldRecord = payload.old;
          const newRecord = payload.new;

          if (payload.eventType === "INSERT" && newRecord.status === "success") {
            handleLiveUpdate(newRecord);
          }

          if (
            payload.eventType === "UPDATE" &&
            oldRecord.status !== "success" &&
            newRecord.status === "success"
          ) {
            handleLiveUpdate(newRecord);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── SUPPORTERS LIST EFFECT ───
  useEffect(() => {
    async function loadSupportersList() {
      try {
        let query = supabase
          .from("donations")
          .select("*")
          .eq("status", "success");

        if (filterTab === "top") {
          query = query.order("amount", { ascending: false }).order("created_at", { ascending: false });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data: supportersData } = await query.limit(30);
        if (supportersData) {
          setSupporters(supportersData);
        }
      } catch (err) {
        console.error("Error fetching supporters list:", err);
      }
    }

    loadSupportersList();
  }, [filterTab]);

  const handleLiveUpdate = (newRecord) => {
    setTotalSupporters((prev) => prev + 1);
    setTotalAmount((prev) => prev + Number(newRecord.amount));
    setLatestDonation(newRecord);
    
    setTop3((prev) => {
      const merged = [newRecord, ...prev.filter(d => d.id !== newRecord.id)];
      merged.sort((a, b) => b.amount - a.amount);
      return merged.slice(0, 3);
    });

    setSupporters((prev) => {
      if (prev.some((d) => d.id === newRecord.id)) return prev;
      const updated = [newRecord, ...prev];
      if (filterTab === "top") {
        updated.sort((a, b) => b.amount - a.amount);
      } else {
        updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return updated.slice(0, 30);
    });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        if (existingScript.dataset.loaded === "true") {
          resolve(true);
          return;
        }
        const oldOnload = existingScript.onload;
        existingScript.onload = (e) => {
          if (typeof oldOnload === "function") oldOnload(e);
          resolve(true);
        };
        const oldOnerror = existingScript.onerror;
        existingScript.onerror = (e) => {
          if (typeof oldOnerror === "function") oldOnerror(e);
          resolve(false);
        };
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    if (activeAmount < 10 || activeAmount > 100000) {
      setStatusMessage({ type: "error", text: "Donation amount must be between ₹10 and ₹100,000." });
      setLoading(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatusMessage({ type: "error", text: "Please enter a valid email address." });
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setStatusMessage({ type: "error", text: "Failed to load Razorpay. Please check your internet connection." });
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res;
      try {
        res = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            amount: activeAmount,
            name: name || null,
            email: email || null,
            message: message || null,
            anonymous,
          }),
        });
      } catch (fetchErr) {
        if (fetchErr.name === "AbortError") throw new Error("Order creation timed out. Please check your network connection and try again.");
        throw new Error("Unable to connect to the payment server. Please try again later.");
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        let errorMsg = "Failed to initialize checkout.";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const orderData = await res.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DeepFocus",
        description: "Thank you for supporting developer tools.",
        order_id: orderData.order_id || orderData.id,
        prefill: {
          name: name || "",
          email: email || "",
        },
        theme: { color: "#7c3aed" },
        handler: async function (response) {
          setLoading(true);
          setStatusMessage(null);
          
          const verifyController = new AbortController();
          const verifyTimeoutId = setTimeout(() => verifyController.abort(), 15000);

          try {
            let verifyRes;
            try {
              verifyRes = await fetch("/api/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: verifyController.signal,
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
            } catch (fetchErr) {
              if (fetchErr.name === "AbortError") throw new Error("Verification timed out. Do not pay again. Check your email or profile for confirmation.");
              throw new Error("Network error during payment verification. Please contact support if your account was debited.");
            } finally {
              clearTimeout(verifyTimeoutId);
            }

            if (!verifyRes.ok) {
              let errorMsg = "Signature verification failed.";
              try {
                const errData = await verifyRes.json();
                errorMsg = errData.error || errorMsg;
              } catch (_) {}
              throw new Error(errorMsg);
            }

            setStatusMessage({ type: "success", text: "Payment verified successfully! Thank you for backing DeepFocus. ❤️" });
            setCustomAmount("");
            setName("");
            setEmail("");
            setMessage("");
          } catch (verifyErr) {
            setStatusMessage({ type: "error", text: verifyErr.message || "Verification failed. Contact support if debited." });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setStatusMessage({ type: "info", text: "Payment cancelled." });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setLoading(false);
        setStatusMessage({ type: "error", text: resp.error.description || "Payment failed." });
      });
      rzp.open();
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Payment pipeline error." });
      setLoading(false);
    }
  };

  const getRelativeDate = (utcString) => {
    const d = new Date(utcString);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name.charAt(0).toUpperCase();
  };

  const renderAvatar = (supporter, sizeClass = "w-8 h-8", iconSize = 14) => {
    const isAnon = supporter?.anonymous;
    const seed = supporter?.name || supporter?.id || "default";

    return (
      <div className={`${sizeClass} rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner`}>
        {isAnon ? (
          <User className="text-zinc-500" size={iconSize} />
        ) : (
          <img 
            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`} 
            alt="Avatar" 
            className="w-full h-full object-cover opacity-90"
          />
        )}
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 relative font-sans selection:bg-violet-500/30">
      
      {/* ─── PREMIUM SAAS BACKGROUND FX ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Fine background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
        
        {/* Faint Grain overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

        {/* Ambient radial glows */}
        <div className="absolute top-[-25%] left-[-20%] w-[800px] h-[800px] bg-violet-600/[0.04] rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] bg-indigo-500/[0.03] rounded-full blur-[180px]" />
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.02] rounded-full blur-[140px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 lg:py-20 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-12 lg:gap-20 items-start">
          
          {/* ─── LEFT COLUMN: SUPPORT PANEL ─── */}
          <div className="lg:sticky lg:top-12 flex flex-col gap-6">
            
            {/* Header / Logo */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                  <Coffee size={20} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white landing-display">DeepFocus</h1>
              </div>
              <p className="text-sm text-zinc-400 font-medium landing-copy">Building tools to help developers master their craft.</p>
            </div>

            {/* Metrics Pills */}
            <div className="flex gap-4 mb-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E12]/50 border border-white/[0.04] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <Users size={14} className="text-violet-400" />
                {loadingStats ? (
                  <div className="h-3 w-12 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <span className="text-xs font-bold text-zinc-350 landing-copy">{totalSupporters} Supporters</span>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E12]/50 border border-white/[0.04] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <Flame size={14} className="text-amber-400" />
                {loadingStats ? (
                  <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <span className="text-xs font-bold text-zinc-350 landing-copy">₹{totalAmount.toLocaleString("en-IN")} Raised</span>
                )}
              </div>
            </div>

            {/* Main Support Card */}
            <div className="relative rounded-[24px] bg-[#0E0E12]/80 backdrop-blur-xl border border-white/[0.05] p-6 sm:p-8 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Ambient glow inside */}
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-md font-bold text-white mb-6 flex items-center gap-2 landing-display">
                Support the project <span className="text-rose-500">❤️</span>
              </h2>

              {/* Preset Selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setStatusMessage(null);
                    }}
                    className={`relative py-4 rounded-[16px] border transition-all duration-300 flex flex-col items-start justify-between px-5 min-h-[82px] active:scale-[0.98] cursor-pointer group ${
                      selectedPreset === preset.id
                        ? "bg-violet-500/[0.06] border-violet-500/50 shadow-[0_0_25px_rgba(124,58,237,0.15),inset_0_1px_1px_rgba(255,255,255,0.05)] text-white"
                        : "border-white/[0.04] bg-[#09090B]/40 hover:bg-[#0E0E11]/60 hover:border-white/[0.08] text-zinc-400 hover:text-zinc-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-auto">
                      <preset.Icon size={14} className={selectedPreset === preset.id ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-400 transition-colors"} />
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]">{preset.label}</span>
                    </div>
                    <span className="text-sm font-black mt-2">
                      {preset.id === "custom" ? "..." : `₹${preset.amount}`}
                    </span>
                    {/* Selected Glow Accent Overlay */}
                    {selectedPreset === preset.id && (
                      <div className="absolute inset-px rounded-[15px] border border-violet-500/30 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>

              <form onSubmit={handleDonate} className="space-y-4">
                
                <AnimatePresence>
                  {selectedPreset === "custom" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: -10 }} 
                      animate={{ opacity: 1, height: "auto", y: 0 }} 
                      exit={{ opacity: 0, height: 0, y: -10 }} 
                      className="overflow-hidden mb-2"
                    >
                      <div className="space-y-2">
                        <label htmlFor="custom-amount-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 select-none">
                          <span>₹</span> Custom Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">₹</span>
                          <input
                            type="number"
                            required min={10} max={100000}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Enter amount (10 - 100,000)"
                            id="custom-amount-input"
                            className="w-full pl-8 pr-4 py-3 rounded-[12px] border border-white/[0.06] bg-[#09090B]/50 text-white text-sm font-black focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all shadow-inner placeholder:text-zinc-650"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label htmlFor="name-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 select-none">
                    <User size={12} className="text-zinc-500" /> Name or Twitter
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={anonymous}
                    placeholder="Name or @twitter (optional)"
                    id="name-input"
                    className="w-full px-4 py-3 rounded-[12px] border border-white/[0.06] bg-[#09090B]/50 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all disabled:opacity-30 shadow-inner placeholder:text-zinc-650"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 select-none">
                    <Mail size={12} className="text-zinc-500" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com (optional)"
                    id="email-input"
                    className="w-full px-4 py-3 rounded-[12px] border border-white/[0.06] bg-[#09090B]/50 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all shadow-inner placeholder:text-zinc-650"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message-input" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 select-none">
                    <MessageSquare size={12} className="text-zinc-500" /> Backer Message
                  </label>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                      placeholder="Say something nice... (optional)"
                      rows={3}
                      id="message-input"
                      className="w-full px-4 py-3 rounded-[12px] border border-white/[0.06] bg-[#09090B]/50 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none shadow-inner placeholder:text-zinc-650"
                    />
                    <span className="absolute bottom-3 right-4 text-[9px] font-bold text-zinc-600">{message.length}/150</span>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group py-2 w-max select-none">
                  <div className="relative flex items-center justify-center w-4 h-4">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-zinc-700 peer-checked:border-violet-500 peer-checked:bg-violet-500 transition-all flex items-center justify-center">
                      <Check size={10} strokeWidth={4} className="text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Make this private
                  </span>
                </label>

                <AnimatePresence>
                  {statusMessage && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-4 rounded-xl text-sm flex gap-3 ${
                      statusMessage.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : statusMessage.type === "error" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-white/5 text-zinc-400 border border-white/10"
                    }`}>
                      {statusMessage.type === "error" ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <ShieldCheck size={18} className="shrink-0 mt-0.5" />}
                      <span className="font-medium leading-relaxed">{statusMessage.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || activeAmount < 10 || activeAmount > 100000}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 bg-[length:200%_auto] hover:bg-right text-white rounded-[16px] font-bold text-sm tracking-wide transition-all duration-500 shadow-[0_4px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_4px_30px_rgba(124,58,237,0.45)] active:scale-[0.98] flex items-center justify-center cursor-pointer border border-violet-400/20"
                >
                  {loading 
                    ? "Processing..." 
                    : activeAmount >= 10 && activeAmount <= 100000
                      ? `Support ₹${activeAmount}` 
                      : activeAmount > 0 
                        ? "Minimum ₹10 required" 
                        : "Enter Amount"}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-medium">
              <Lock size={10} />
              Payments are secure and encrypted. Powered by Razorpay.
            </div>

            {/* Bottom Promo Box */}
            <div className="mt-4 rounded-[24px] bg-[#0E0E12]/80 backdrop-blur-xl border border-white/5 p-6 flex items-center justify-between shadow-lg">
              <div className="flex gap-3">
                 <Heart size={20} className="text-violet-500 fill-violet-500" />
                 <p className="text-sm font-medium text-zinc-300 leading-snug max-w-[200px]">
                   Your support helps us build better tools for developers worldwide.
                 </p>
              </div>
              <div className="w-16 h-16 rounded-[16px] bg-gradient-to-br from-violet-900/40 to-fuchsia-900/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                <Code2 size={24} className="text-violet-400" />
              </div>
            </div>

          </div>


          {/* ─── RIGHT COLUMN: HALL OF FAME (MASONRY) ─── */}
          <div className="flex flex-col">
            
            {/* Top 3 Supporters Podium or Loading Skeleton */}
            {loadingStats ? (
              <div className="mb-12 border border-white/[0.04] bg-[#0E0E12]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden animate-pulse">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-center mb-8 flex items-center justify-center gap-2">
                  <Trophy size={14} className="text-amber-400 animate-bounce" /> Hall of Fame Leaderboard
                </h3>
                <div className="grid grid-cols-3 gap-3 items-end max-w-sm mx-auto h-[160px] pb-2">
                  {/* 2nd Place Slot Skeleton */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-12 mb-1.5" />
                    <div className="h-2 bg-zinc-800 rounded w-8" />
                    <div className="w-full bg-zinc-800/20 border border-dashed border-zinc-800/40 h-16 rounded-t-xl mt-2" />
                  </div>
                  {/* 1st Place Slot Skeleton */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-14 mb-1.5" />
                    <div className="h-3 bg-zinc-850 rounded w-10" />
                    <div className="w-full bg-zinc-800/30 border border-dashed border-zinc-800/50 h-24 rounded-t-2xl mt-2" />
                  </div>
                  {/* 3rd Place Slot Skeleton */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 mb-2" />
                    <div className="h-3 bg-zinc-800 rounded w-12 mb-1.5" />
                    <div className="h-2 bg-zinc-800 rounded w-8" />
                    <div className="w-full bg-zinc-800/10 border border-dashed border-zinc-800/30 h-12 rounded-t-lg mt-2" />
                  </div>
                </div>
              </div>
            ) : top3.length > 0 ? (
              <div className="mb-12 border border-white/[0.04] bg-[#0E0E12]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden shadow-lg">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-center mb-8 flex items-center justify-center gap-2">
                  <Trophy size={14} className="text-amber-400 animate-bounce" /> Hall of Fame Leaderboard
                </h3>
                <div className="grid grid-cols-3 gap-3 items-end max-w-sm mx-auto h-[160px] pb-2">
                  {/* 2nd Place Slot */}
                  {top3[1] ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="relative mb-2">
                        {renderAvatar(top3[1], "w-10 h-10 border border-zinc-500/40", 16)}
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-zinc-650 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">2</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                        {top3[1].anonymous ? "Anonymous" : (top3[1].name || "Supporter")}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-black">₹{top3[1].amount}</span>
                      <div className="w-full bg-[#18181B]/60 border border-zinc-700/30 h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-400 text-xs font-bold shadow-md">2nd</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 flex items-center justify-center mb-2">
                        <User size={14} className="text-zinc-600" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">Claim 2nd</span>
                      <div className="w-full border border-dashed border-white/[0.06] h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-600 text-xs font-bold">Empty</div>
                    </div>
                  )}
                  
                  {/* 1st Place Slot */}
                  {top3[0] ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="relative mb-2">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400">
                          <Crown size={14} className="animate-pulse" />
                        </div>
                        {renderAvatar(top3[0], "w-12 h-12 border-2 border-amber-400", 20)}
                        <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500 text-black border border-amber-400 rounded-full w-5 h-5 flex items-center justify-center font-black">1</span>
                      </div>
                      <span className="text-xs font-black text-white truncate max-w-[90px]">
                        {top3[0].anonymous ? "Anonymous" : (top3[0].name || "Supporter")}
                      </span>
                      <span className="text-xs font-black text-amber-400">₹{top3[0].amount}</span>
                      <div className="w-full bg-gradient-to-t from-amber-600/20 to-amber-500/10 border border-amber-500/20 h-24 rounded-t-2xl mt-2 flex items-center justify-center text-amber-300 text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.15)]">1st</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-12 h-12 rounded-full border border-dashed border-amber-500/50 flex items-center justify-center mb-2">
                        <Crown size={16} className="text-amber-500/50" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-500/70">Claim 1st</span>
                      <div className="w-full border border-dashed border-amber-500/30 h-24 rounded-t-2xl mt-2 flex items-center justify-center text-amber-500/50 text-sm font-black">Empty</div>
                    </div>
                  )}

                  {/* 3rd Place Slot */}
                  {top3[2] ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="relative mb-2">
                        {renderAvatar(top3[2], "w-10 h-10 border border-amber-600/30", 16)}
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">3</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                        {top3[2].anonymous ? "Anonymous" : (top3[2].name || "Supporter")}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-black">₹{top3[2].amount}</span>
                      <div className="w-full bg-[#18181B]/40 border border-amber-900/20 h-12 rounded-t-lg mt-2 flex items-center justify-center text-amber-700 text-xs font-bold shadow-sm">3rd</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-10 h-10 rounded-full border border-dashed border-amber-700/50 flex items-center justify-center mb-2">
                        <User size={14} className="text-amber-700/40" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-700/60">Claim 3rd</span>
                      <div className="w-full border border-dashed border-white/[0.06] h-12 rounded-t-lg mt-2 flex items-center justify-center text-zinc-650 text-xs font-bold">Empty</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Main Typography Header */}
            <div className="text-center mb-8 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400 mb-4 landing-copy">WALL OF BACKERS</p>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-4 landing-display">
                Fueling the Future of <span className="font-serif italic text-violet-400 font-normal">Focus</span>
              </h2>
              <p className="text-sm text-zinc-400 font-medium landing-copy max-w-xl mx-auto leading-relaxed">
                A hall of gratitude for the amazing engineers, creators, and builders who make DeepFocus possible.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-center gap-3 mb-12">
              <button
                onClick={() => setFilterTab("recent")}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "recent"
                    ? "bg-[#18181C] text-white border border-white/10 shadow-lg shadow-black/50"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Recent Backers
              </button>
              <button
                onClick={() => setFilterTab("top")}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "top"
                    ? "bg-[#18181C] text-white border border-white/10 shadow-lg shadow-black/50"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Top Backers
              </button>
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 md:columns-2 gap-6 space-y-6">
              
              {/* "Fuel the Project" CTA Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, rotate: -0.5 }}
                className="break-inside-avoid relative overflow-hidden rounded-[24px] bg-[#140C22]/80 backdrop-blur-md border border-violet-500/[0.08] p-8 shadow-[0_12px_40px_rgba(124,58,237,0.04)] min-h-[220px] flex flex-col items-center justify-center group cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="absolute top-6 right-6 opacity-30">
                  <Sparkles size={24} className="text-violet-300" />
                </div>
                <div className="flex items-center gap-2.5 mb-2 text-white">
                  <Coffee size={20} className="text-violet-400 animate-pulse" />
                  <h3 className="text-xl font-serif italic text-violet-100">“Fuel the Project...”</h3>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70 mb-6 text-center max-w-[200px] leading-relaxed">
                  Every support keeps servers running and code clean.
                </p>
                <div className="px-6 py-2 rounded-full border border-violet-500/30 bg-violet-500/5 text-white text-xs font-bold transition-all duration-300 group-hover:bg-violet-500/10">
                  Buy me a coffee
                </div>
              </motion.div>

              {/* Inviting Empty State (Collectable Card UI) */}
              {supporters.length === 0 && !loadingStats && (
                <div className="break-inside-avoid relative overflow-hidden rounded-[24px] border border-white/[0.04] bg-[#0E0E12]/40 p-8 text-center flex flex-col items-center justify-center min-h-[220px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                  <div className="absolute top-[-20%] left-[-10%] w-48 h-48 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Heart size={18} className="text-violet-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5 landing-display">Be the First Supporter</h4>
                  <p className="text-xs text-zinc-500 max-w-[240px] leading-relaxed mb-5 landing-copy">
                    Your voice and backing will echo here forever. Share your message and help build the future of DeepFocus.
                  </p>
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="px-5 py-2 rounded-full border border-violet-500/30 bg-violet-500/5 text-violet-300 text-[10px] font-bold uppercase tracking-wider hover:bg-violet-500/10 transition-all cursor-pointer"
                  >
                    Fuel the Project
                  </button>
                </div>
              )}

              {/* Supporter Cards or pulsing Skeletons */}
              {loadingStats && supporters.length === 0 ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                supporters.map((supporter, idx) => {
                  const theme = CARD_THEMES[idx % CARD_THEMES.length];
                  const dec1 = DECORATIONS[(idx * 2) % DECORATIONS.length];
                  const dec2 = DECORATIONS[(idx * 2 + 1) % DECORATIONS.length];

                  return (
                    <motion.div
                      key={supporter.id}
                      initial={{ opacity: 0, y: 30, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ type: "spring", stiffness: 90, damping: 22, delay: (idx % 4) * 0.05 }}
                      whileHover={{ y: -5, rotate: idx % 2 === 0 ? 0.5 : -0.5, shadow: "0 20px 40px rgba(0,0,0,0.4)" }}
                      className={`break-inside-avoid relative flex flex-col overflow-hidden rounded-[24px] border border-white/[0.04] shadow-xl min-h-[220px] transition-all duration-300 ${theme.body}`}
                    >
                      {/* Ambient card back-glow */}
                      <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-2xl pointer-events-none ${theme.glow}`} />
                      
                      {/* Floating Decorations */}
                      <div className="absolute top-5 right-5 text-lg opacity-25 pointer-events-none select-none">{dec1}</div>
                      <div className="absolute bottom-16 left-5 text-xl opacity-20 pointer-events-none select-none">{dec2}</div>
                      
                      {/* Message Area */}
                      <div className="flex-grow flex items-center justify-center p-6 text-center relative z-10">
                        <p className="font-semibold text-sm sm:text-base leading-relaxed tracking-wide font-sans">
                          {supporter.message || "Supported the mission!"}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className={`h-[60px] px-5 flex items-center justify-between border-t border-white/[0.03] z-10 ${theme.footer}`}>
                        <div className="flex items-center gap-2.5">
                          {renderAvatar(supporter, "w-7 h-7 border border-white/10", 12)}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white truncate max-w-[110px]">
                              {supporter.anonymous ? (
                                "Anonymous"
                              ) : supporter.name && supporter.name.startsWith("@") ? (
                                <a 
                                  href={`https://twitter.com/${supporter.name.slice(1)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="hover:text-violet-400 transition-colors underline decoration-dotted decoration-violet-500/30"
                                >
                                  {supporter.name}
                                </a>
                              ) : (
                                supporter.name || "Generous Supporter"
                              )}
                            </span>
                            <span className="text-[9px] text-white/30 font-medium">
                              {getRelativeDate(supporter.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${theme.badge}`}>
                          ₹{supporter.amount}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Load More Trigger (Visual only for 1:1 match) */}
            {supporters.length >= 30 && (
              <div className="mt-12 flex justify-center">
                <button className="px-6 py-3 rounded-full bg-[#111113] border border-white/5 text-sm font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer">
                  Load more messages <ArrowRight size={14} />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}