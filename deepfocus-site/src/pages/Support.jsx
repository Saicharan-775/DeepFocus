import React, { useEffect, useState } from "react";
import { Coffee, Code2, Lock, Heart, User } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Import modular subcomponents
import MetricsPills from "../components/support/MetricsPills";
import SupportForm, { PRESETS } from "../components/support/SupportForm";
import LeaderboardPodium from "../components/support/LeaderboardPodium";
import WallOfFame from "../components/support/WallOfFame";

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
          body: JSON.stringify({ amount: activeAmount, name, email, message, anonymous }),
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to initiate payment");
      }

      const orderData = await res.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DeepFocus Support",
        description: message ? `Contribution: ${message.slice(0, 40)}` : "Contribution to DeepFocus",
        order_id: orderData.id,
        handler: async (response) => {
          setLoading(true);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                donation_id: orderData.donation_id,
              }),
            });

            if (!verifyRes.ok) {
              const errText = await verifyRes.text();
              throw new Error(errText || "Verification failed");
            }

            setStatusMessage({ type: "success", text: "Thank you so much for your support! ❤️" });
            setCustomAmount("");
            setName("");
            setEmail("");
            setMessage("");
            setAnonymous(false);
          } catch (verifyErr) {
            console.error("Verification error details:", verifyErr);
            setStatusMessage({
              type: "error",
              text: `Payment succeeded but verification failed: ${verifyErr.message}. Please contact support.`,
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: anonymous ? "" : name,
          email: email,
        },
        theme: {
          color: "#7C3AED",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setStatusMessage({
          type: "error",
          text: `Payment failed: ${response.error.description || "Unknown error"}`,
        });
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Initiation error details:", err);
      setStatusMessage({ type: "error", text: err.message || "Something went wrong." });
      setLoading(false);
    }
  };

  const getRelativeDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const renderAvatar = (supporter, sizeClass, size) => {
    if (supporter.anonymous || !supporter.name) {
      return (
        <div className={`${sizeClass} rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden`}>
          <User size={size} className="text-zinc-500" />
        </div>
      );
    }

    const trimmed = supporter.name.trim();
    if (trimmed.startsWith("@") && trimmed.length > 1) {
      const handle = trimmed.slice(1);
      return (
        <img
          src={`https://unavatar.io/twitter/${handle}?fallback=https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(handle)}`}
          alt={supporter.name}
          className={`${sizeClass} rounded-full object-cover shrink-0`}
          onError={(e) => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(handle)}`;
          }}
        />
      );
    }

    const seed = encodeURIComponent(trimmed);
    return (
      <img
        src={`https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=7c3aed,a855f7,c084fc`}
        alt={supporter.name}
        className={`${sizeClass} rounded-full shrink-0`}
      />
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
            <MetricsPills
              loadingStats={loadingStats}
              totalSupporters={totalSupporters}
              totalAmount={totalAmount}
            />

            {/* Main Support Form Card */}
            <SupportForm
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              message={message}
              setMessage={setMessage}
              anonymous={anonymous}
              setAnonymous={setAnonymous}
              loading={loading}
              activeAmount={activeAmount}
              statusMessage={statusMessage}
              setStatusMessage={setStatusMessage}
              handleDonate={handleDonate}
            />

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
            <LeaderboardPodium
              loadingStats={loadingStats}
              top3={top3}
              renderAvatar={renderAvatar}
            />

            {/* Main Wall of Fame Masonry */}
            <WallOfFame
              supporters={supporters}
              loadingStats={loadingStats}
              filterTab={filterTab}
              setFilterTab={setFilterTab}
              renderAvatar={renderAvatar}
              getRelativeDate={getRelativeDate}
            />

          </div>
        </div>
      </div>
    </div>
  );
}