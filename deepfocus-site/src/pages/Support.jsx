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
  <div className="break-inside-avoid relative flex flex-col overflow-hidden rounded-[28px] border border-white/5 bg-[#0D0D11]/40 animate-pulse h-[240px] p-6">
    <div className="flex-grow space-y-3">
      <div className="h-4 bg-zinc-800 rounded w-5/6" />
      <div className="h-4 bg-zinc-800 rounded w-4/6" />
      <div className="h-4 bg-zinc-800 rounded w-2/6" />
    </div>
    <div className="h-10 border-t border-white/5 pt-4 flex items-center justify-between mt-auto">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800" />
        <div className="space-y-1.5">
          <div className="h-3 bg-zinc-800 rounded w-16" />
          <div className="h-2 bg-zinc-800 rounded w-10" />
        </div>
      </div>
      <div className="h-6 bg-zinc-800 rounded-full w-12" />
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
  "bg-gradient-to-br from-[#1b0b2e] to-[#0a0412] text-[#e8d5ff]", // Deep Purple
  "bg-gradient-to-br from-[#0a2416] to-[#030d08] text-[#d1f4e0]", // Forest Green
  "bg-gradient-to-br from-[#0c1a36] to-[#040914] text-[#d6e4ff]", // Navy Blue
  "bg-gradient-to-br from-[#330d12] to-[#140507] text-[#ffdce0]", // Wine Red
  "bg-gradient-to-br from-[#291700] to-[#120a00] text-[#ffe8cc]", // Amber
  "bg-gradient-to-br from-[#082226] to-[#030d0e] text-[#ccf2f5]", // Dark Teal
];

const DECORATIONS = ['⚡', '✨', '⭐', '💜', '❤️', '😊', '☕️', '💻', '🚀', '🎯', '🌙', '🔥', '🎉'];

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
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 relative font-sans selection:bg-violet-500/30">
      
      {/* ─── PREMIUM SAAS BACKGROUND FX ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMGg0MHYxSDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDExKSIvPgo8L3N2Zz4=')] opacity-50 mix-blend-overlay" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-[140px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/5 rounded-full blur-[160px] mix-blend-screen" />
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
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 shadow-[0_0_15px_rgba(124,58,237,0.05)]">
                <Users size={14} className="text-violet-400" />
                {loadingStats ? (
                  <div className="h-3 w-12 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <span className="text-xs font-bold text-zinc-350 landing-copy">{totalSupporters} Supporters</span>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]">
                <Flame size={14} className="text-purple-400" />
                {loadingStats ? (
                  <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  <span className="text-xs font-bold text-zinc-350 landing-copy">₹{totalAmount.toLocaleString("en-IN")} Raised</span>
                )}
              </div>
            </div>

            {/* Main Support Card */}
            <div className="rounded-[32px] bg-[#0E0E11] border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
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
                    className={`relative py-4 rounded-[16px] border transition-all flex items-center justify-between px-5 gap-3 group active:scale-[0.98] cursor-pointer ${
                      selectedPreset === preset.id
                        ? "bg-violet-950/20 border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.15)] z-10 text-white"
                        : "border-white/5 bg-black/35 hover:border-white/10 hover:bg-black/50 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <preset.Icon size={15} className={selectedPreset === preset.id ? "text-violet-300" : "text-zinc-500 group-hover:text-zinc-400 transition-colors"} />
                      <span className="text-xs font-bold uppercase tracking-wider">{preset.label}</span>
                    </div>
                    <span className="text-xs font-black">
                      {preset.id === "custom" ? "..." : `₹${preset.amount}`}
                    </span>
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
                      <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Custom Amount (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">₹</span>
                        <input
                          type="number"
                          required min={10} max={100000}
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Enter amount (10 - 100,000)"
                          className="w-full pl-8 pr-5 py-3.5 rounded-[16px] border border-white/5 bg-black/45 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600 shadow-inner"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <User size={10} className="text-zinc-600" /> Name or Twitter
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={anonymous}
                    placeholder="Name or @twitter (optional)"
                    className="w-full px-5 py-3.5 rounded-[16px] border border-white/5 bg-black/45 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all disabled:opacity-30 placeholder:text-zinc-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Mail size={10} className="text-zinc-600" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com (optional)"
                    className="w-full px-5 py-3.5 rounded-[16px] border border-white/5 bg-black/45 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600 shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <MessageSquare size={10} className="text-zinc-600" /> Backer Message
                  </label>
                  <div className="relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                      placeholder="Say something nice... (optional)"
                      rows={3}
                      className="w-full px-5 py-3.5 rounded-[16px] border border-white/5 bg-black/45 text-white text-sm font-medium focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-zinc-600 shadow-inner"
                    />
                    <span className="absolute bottom-3 right-4 text-[9px] font-bold text-zinc-600">{message.length}/150</span>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer group py-2 w-max">
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
                  <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
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
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white rounded-[16px] font-bold text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_4px_30px_rgba(124,58,237,0.45)] active:scale-[0.98] flex items-center justify-center cursor-pointer border border-violet-400/20"
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
            <div className="mt-4 rounded-[24px] bg-[#0E0E11] border border-white/5 p-6 flex items-center justify-between shadow-lg">
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
              <div className="mb-12 border border-white/5 bg-[#0E0E11]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden animate-pulse">
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
            ) : (
              top3.length > 0 && (
              <div className="mb-12 border border-white/5 bg-[#0E0E11]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-center mb-8 flex items-center justify-center gap-2">
                  <Trophy size={14} className="text-amber-400 animate-bounce" /> Hall of Fame Leaderboard
                </h3>
                <div className="grid grid-cols-3 gap-3 items-end max-w-sm mx-auto h-[160px] pb-2">
                  {/* 2nd Place Slot */}
                  {top3[1] ? (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-2">
                        {renderAvatar(top3[1], "w-10 h-10 border border-zinc-500/40", 16)}
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-zinc-650 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">2</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                        {top3[1].anonymous ? "Anonymous" : top3[1].name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-black">₹{top3[1].amount}</span>
                      <div className="w-full bg-zinc-800/40 border border-zinc-700/50 h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-400 text-xs font-bold shadow-lg">2nd</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 flex items-center justify-center mb-2">
                        <User size={14} className="text-zinc-600" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">Claim 2nd</span>
                      <div className="w-full border border-dashed border-zinc-700/50 h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-600 text-xs font-bold">Empty</div>
                    </div>
                  )}
                  
                  {/* 1st Place Slot */}
                  {top3[0] ? (
                    <div className="flex flex-col items-center">
                      <div className="relative mb-2">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400">
                          <Crown size={14} className="animate-pulse" />
                        </div>
                        {renderAvatar(top3[0], "w-12 h-12 border-2 border-amber-400", 20)}
                        <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500 text-black border border-amber-400 rounded-full w-5 h-5 flex items-center justify-center font-black">1</span>
                      </div>
                      <span className="text-xs font-black text-white truncate max-w-[90px]">
                        {top3[0].anonymous ? "Anonymous" : top3[0].name}
                      </span>
                      <span className="text-xs font-black text-amber-400">₹{top3[0].amount}</span>
                      <div className="w-full bg-gradient-to-t from-amber-600/30 to-amber-500/20 border border-amber-500/30 h-24 rounded-t-2xl mt-2 flex items-center justify-center text-amber-300 text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">1st</div>
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
                    <div className="flex flex-col items-center">
                      <div className="relative mb-2">
                        {renderAvatar(top3[2], "w-10 h-10 border border-amber-600/30", 16)}
                        <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">3</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                        {top3[2].anonymous ? "Anonymous" : top3[2].name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-black">₹{top3[2].amount}</span>
                      <div className="w-full bg-amber-900/10 border border-amber-900/30 h-12 rounded-t-lg mt-2 flex items-center justify-center text-amber-700 text-xs font-bold">3rd</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <div className="w-10 h-10 rounded-full border border-dashed border-amber-700/50 flex items-center justify-center mb-2">
                        <User size={14} className="text-amber-700/40" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-700/60">Claim 3rd</span>
                      <div className="w-full border border-dashed border-amber-900/20 h-12 rounded-t-lg mt-2 flex items-center justify-center text-amber-700/50 text-xs font-bold">Empty</div>
                    </div>
                  )}
                </div>
              </div>
            )
            )}

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
                    ? "bg-zinc-850 text-white border border-white/10 shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                Recent Backers
              </button>
              <button
                onClick={() => setFilterTab("top")}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filterTab === "top"
                    ? "bg-zinc-850 text-white border border-white/10 shadow-lg"
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
                whileHover={{ y: -4, rotate: -1 }}
                className="break-inside-avoid relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#200b3e] to-[#0e041e] border border-violet-500/20 p-8 shadow-2xl min-h-[220px] flex flex-col items-center justify-center group cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <div className="absolute top-6 right-6 opacity-40">
                  <Sparkles size={24} className="text-violet-300" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-white">
                  <Coffee size={20} className="text-violet-400" />
                  <h3 className="text-xl font-serif italic">“Fuel the Project...”</h3>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300 mb-6 text-center max-w-[200px] leading-relaxed">
                  Every support keeps servers running and code clean.
                </p>
                <div className="px-6 py-2 rounded-full border border-violet-400/30 bg-violet-500/10 text-white text-sm font-medium transition-colors group-hover:bg-violet-500/20">
                  Buy me a coffee
                </div>
              </motion.div>

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
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: idx * 0.05 }}
                    whileHover={{ y: -6, rotate: idx % 2 === 0 ? 1 : -1, filter: "brightness(1.1)" }}
                    className={`break-inside-avoid relative flex flex-col overflow-hidden rounded-[28px] border border-white/5 shadow-xl min-h-[240px] ${theme}`}
                  >
                    {/* Floating Decorations */}
                    <div className="absolute top-6 right-6 text-xl opacity-60 pointer-events-none select-none">{dec1}</div>
                    <div className="absolute bottom-20 left-6 text-2xl opacity-40 pointer-events-none select-none">{dec2}</div>
                    
                    {/* Message Area */}
                    <div className="flex-grow flex items-center justify-center p-8 text-center relative z-10">
                      <p className="font-semibold text-[15px] sm:text-base leading-relaxed tracking-wide">
                        {supporter.message || "Supported the mission!"}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="h-[68px] bg-[#0A0A0C]/50 backdrop-blur-md px-6 flex items-center justify-between border-t border-white/5 z-10">
                      <div className="flex items-center gap-3">
                        {renderAvatar(supporter, "w-8 h-8", 14)}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white truncate max-w-[120px]">
                            {supporter.anonymous ? (
                              "Anonymous"
                            ) : supporter.name && supporter.name.startsWith("@") ? (
                              <a 
                                href={`https://twitter.com/${supporter.name.slice(1)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:text-violet-400 transition-colors underline decoration-dotted decoration-violet-500/50"
                              >
                                {supporter.name}
                              </a>
                            ) : (
                              supporter.name || "Generous Supporter"
                            )}
                          </span>
                          <span className="text-[10px] text-white/40 font-medium">
                            {getRelativeDate(supporter.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs font-black text-violet-400 bg-violet-400/10 px-3 py-1.5 rounded-full border border-violet-500/20">
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
                <button className="px-6 py-3 rounded-full bg-[#111113] border border-white/5 text-sm font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
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