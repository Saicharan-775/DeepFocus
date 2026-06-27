import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ArrowRight, User, Mail, MessageSquare, ShieldCheck, AlertCircle,
  Users, Coins, Flame, Heart, Trophy, Globe, BookOpen
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ─── LOCAL PRESETS ───
const PRESETS = [
  { id: "coffee", label: "☕ Buy a Coffee", amount: 99 },
  { id: "development", label: "🚀 Support Development", amount: 299 },
  { id: "growing", label: "💙 Keep Growing", amount: 499 },
  { id: "sponsor", label: "🔥 Sponsor DeepFocus", amount: 999 },
];

export default function Support() {
  // Page load & Data states
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalSupporters, setTotalSupporters] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [latestDonation, setLatestDonation] = useState(null);
  const [supporters, setSupporters] = useState([]);

  // Form states
  const [selectedPreset, setSelectedPreset] = useState("coffee");
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  // Status & Feedback states
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const activeAmount = selectedPreset === "custom" ? Number(customAmount) : (PRESETS.find(p => p.id === selectedPreset)?.amount || 0);
  const goalAmount = 50000;
  const progressPercent = Math.min(Math.round((totalAmount / goalAmount) * 100), 100);

  // ─── INITIAL DATA FETCH ───
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Fetch all success donations for aggregates
        const { data: donationsData, error: dbError } = await supabase
          .from("donations")
          .select("amount")
          .eq("status", "success");

        if (dbError) throw dbError;

        if (donationsData) {
          setTotalSupporters(donationsData.length);
          setTotalAmount(donationsData.reduce((sum, d) => sum + Number(d.amount), 0));
        }

        // Fetch latest single donation
        const { data: latestData } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestData && latestData.length > 0) {
          setLatestDonation(latestData[0]);
        }

        // Fetch latest 30 supporters for the wall
        const { data: supportersData } = await supabase
          .from("donations")
          .select("*")
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(30);

        if (supportersData) {
          setSupporters(supportersData);
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

          // Case 1: New successful donation inserted directly
          if (payload.eventType === "INSERT" && newRecord.status === "success") {
            handleLiveUpdate(newRecord);
          }

          // Case 2: Existing donation updated to success
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

  const handleLiveUpdate = (newRecord) => {
    setTotalSupporters((prev) => prev + 1);
    setTotalAmount((prev) => prev + Number(newRecord.amount));
    setLatestDonation(newRecord);
    setSupporters((prev) => {
      if (prev.some((d) => d.id === newRecord.id)) return prev;
      return [newRecord, ...prev.slice(0, 29)];
    });
  };

  // Helper to load Razorpay library
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    // Form validation
    if (activeAmount < 10 || activeAmount > 100000) {
      setStatusMessage({
        type: "error",
        text: "Donation amount must be between ₹10 and ₹100,000.",
      });
      setLoading(false);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      setLoading(false);
      return;
    }

    // Load Razorpay
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setStatusMessage({
        type: "error",
        text: "Failed to load Razorpay. Please check your internet connection.",
      });
      setLoading(false);
      return;
    }

    try {
      // 1. Create order on serverless API
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: activeAmount,
          name: name || null,
          email: email || null,
          message: message || null,
          anonymous,
        }),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error || "Failed to initialize checkout.");
      }

      // 2. Configure checkout options
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
        theme: {
          color: "#7c3aed", // violet 600
        },
        handler: async function (response) {
          setLoading(true);
          try {
            // 3. Verify signature on serverless API
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setStatusMessage({
                type: "success",
                text: "Payment verified successfully! Thank you for backing DeepFocus. ❤️",
              });
              setCustomAmount("");
              setName("");
              setEmail("");
              setMessage("");
            } else {
              throw new Error(verifyData.error || "Signature verification failed.");
            }
          } catch (verifyErr) {
            setStatusMessage({
              type: "error",
              text: verifyErr.message || "Verification failed. Contact support if debited.",
            });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setStatusMessage({
              type: "info",
              text: "Payment cancelled.",
            });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setLoading(false);
        setStatusMessage({
          type: "error",
          text: resp.error.description || "Payment failed.",
        });
      });
      rzp.open();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Payment pipeline error.",
      });
      setLoading(false);
    }
  };

  const getRelativeTime = (utcString) => {
    const now = new Date();
    const created = new Date(utcString);
    const diffMs = now.getTime() - created.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 relative pb-16">
      {/* Grid Pattern and Ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0e_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 pt-24 relative z-10">
        {/* HERO */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 mb-6 backdrop-blur-md">
            <span>❤️</span> Indiedev Initiative
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-6">
            Support{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">
              DeepFocus
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            DeepFocus is built independently to help developers stay focused, master DSA, and prepare for interviews.
            Your support helps keep development, AI features, and servers running.
          </p>
        </div>

        {/* STATISTICS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Users size={16} className="text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Supporters</span>
            </div>
            <div className="text-3xl font-black text-white">{totalSupporters}</div>
            <div className="text-xs text-zinc-500 mt-1">Developers backed DeepFocus</div>
          </div>

          <div className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Coins size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Amount Raised</span>
            </div>
            <div className="text-3xl font-black text-white">₹{totalAmount.toLocaleString("en-IN")}</div>
            <div className="text-xs text-zinc-500 mt-1">Of ₹{goalAmount.toLocaleString("en-IN")} server goal</div>
          </div>

          <div className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5">
            <div className="flex items-center gap-3 text-zinc-500 mb-3">
              <Flame size={16} className="text-rose-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Latest Support</span>
            </div>
            <div className="text-lg font-bold text-white truncate">
              {latestDonation ? (
                latestDonation.anonymous ? "Anonymous ❤️" : latestDonation.name || "Friend"
              ) : (
                "Be the first! ❤️"
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {latestDonation ? `Contributed ₹${latestDonation.amount}` : "Awaiting developer support"}
            </div>
          </div>
        </div>

        {/* GOAL PROGRESS */}
        <div className="border border-white/[0.06] bg-[#0c0c0e]/40 backdrop-blur-md rounded-2xl p-6 mb-12">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-3">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Heart size={12} className="text-red-400 fill-red-400/20" /> Server Goal Progress
            </span>
            <span className="text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.02]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold mt-2">
            <span>₹0</span>
            <span>Goal: ₹{goalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* DONATION CARD FORM */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="border border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => { setSelectedPreset(preset.id); setStatusMessage(null); }}
                  className={`p-4 rounded-xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                    selectedPreset === preset.id
                      ? "border-violet-500 bg-violet-500/5 text-white"
                      : "border-white/[0.04] bg-white/[0.01] text-zinc-400 hover:border-white/10 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xs font-semibold">{preset.label}</span>
                  <span className="text-sm font-black text-white">₹{preset.amount}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setSelectedPreset("custom"); setStatusMessage(null); }}
              className={`w-full p-4 rounded-xl border text-center transition-all mb-6 cursor-pointer ${
                selectedPreset === "custom"
                  ? "border-violet-500 bg-violet-500/5 text-white"
                  : "border-white/[0.04] bg-white/[0.01] text-zinc-400 hover:border-white/10 hover:text-zinc-200"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Custom Amount</span>
            </button>

            <form onSubmit={handleDonate} className="space-y-5">
              {selectedPreset === "custom" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">₹</span>
                    <input
                      type="number"
                      required
                      min={10}
                      max={100000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Enter amount between 10 and 100,000"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm font-semibold focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Your Name (Optional)</label>
                  <div className="relative">
                    <User size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={anonymous}
                      placeholder={anonymous ? "Anonymous" : "e.g. Alex Rivera"}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. alex@rivera.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex justify-between">
                  <span>Message (Optional)</span>
                  <span className="text-[9px] text-zinc-600">{message.length}/200</span>
                </label>
                <div className="relative">
                  <MessageSquare size={13} className="absolute left-4 top-3.5 text-zinc-500" />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                    placeholder="Write a message of support..."
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.06] bg-black/40 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group py-1">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="rounded border-white/10 bg-black text-violet-600 focus:ring-violet-500/20"
                />
                <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  Donate anonymously (Hide name on the wall)
                </span>
              </label>

              {statusMessage && (
                <div
                  className={`p-4 rounded-xl border text-xs flex gap-3 ${
                    statusMessage.type === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : statusMessage.type === "error"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  {statusMessage.type === "error" ? (
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                  )}
                  <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-650 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {loading ? (
                  "Processing Secure Order..."
                ) : (
                  <>
                    <Sparkles size={14} />
                    Support DeepFocus (₹{activeAmount})
                    <ArrowRight size={14} className="ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* CONTRIBUTOR WALL */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Supporter Wall of Fame
            </h3>
          </div>

          {supporters.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <Sparkles className="h-6 w-6 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No supporters registered yet</p>
              <p className="text-xs text-zinc-500 mt-1">Be the first to keep development running!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {supporters.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col justify-between border border-white/[0.06] bg-[#0c0c0e]/40 backdrop-blur-md rounded-xl p-4 hover:border-white/10 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-bold text-zinc-200 truncate max-w-[120px]">
                          {s.anonymous ? "Anonymous ❤️" : s.name || "Friend"}
                        </span>
                        <span className="text-xs font-black text-violet-400 shrink-0 bg-violet-400/10 px-2 py-0.5 rounded">
                          ₹{s.amount}
                        </span>
                      </div>
                      {s.message && (
                        <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-white/10 pl-2.5 my-3 break-words">
                          "{s.message}"
                        </p>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2 text-right">
                      {getRelativeTime(s.created_at)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
