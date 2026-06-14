import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, CheckCircle2, History, Upload, X, Image, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";

const CATEGORIES = [
  { id: "bug", label: "Bug Report" },
  { id: "feature", label: "Feature Request" },
  { id: "improvement", label: "Improvement Suggestion" },
  { id: "general", label: "General Feedback" },
];

export default function Feedback() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [category, setCategory] = useState("bug");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("medium");
  const [email, setEmail] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, size, type, dataUrl }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Autofill user email when user metadata changes
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem("df_feedback_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse feedback history:", err);
      }
    }
  }, []);

  const handleFileChange = (file) => {
    if (!file) return;

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    if (rating === 0) {
      return "Please select a satisfaction rating.";
    }
    if (subject.trim().length < 4 || subject.trim().length > 120) {
      return "Subject must be between 4 and 120 characters.";
    }
    if (details.trim().length < 10 || details.trim().length > 2000) {
      return "Details description must be between 10 and 2000 characters.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Check validation
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setIsSuccess(false);

    // Rate Limiting (Prevent submissions within 15 seconds)
    const lastSubmission = localStorage.getItem("df_last_feedback_time");
    if (lastSubmission && Date.now() - parseInt(lastSubmission) < 15000) {
      setErrorMessage("Please wait 15 seconds before submitting feedback again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        category,
        rating,
        subject: subject.trim(),
        details: details.trim(),
        priority,
        email: email.trim() || null,
        attachment,
        browserInfo: navigator.userAgent,
        pageUrl: window.location.href,
      };

      const response = await fetch("/api/send-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Safely read response text and parse JSON to prevent crash on HTML error pages
      const responseText = await response.text();
      let result = {};
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // Fallback for non-JSON responses (like local Vite 404 pages or Vercel Gateway errors)
      }

      if (!response.ok) {
        // If a 404 occurs on a local address, guide the developer to use 'vercel dev'
        const isLocalHost = window.location.hostname === "localhost" || 
                            window.location.hostname === "127.0.0.1" || 
                            window.location.hostname.startsWith("192.168.");
        
        if (response.status === 404 && isLocalHost) {
          throw new Error("API endpoint not found (404). Note: Vite local dev server does not host serverless API functions. Please test using 'vercel dev' instead of 'npm run dev'.");
        }
        throw new Error(result.error || `Server returned error ${response.status}${responseText ? `: ${responseText.substring(0, 100)}` : ""}`);
      }

      // Record last submission time for rate limiting
      localStorage.setItem("df_last_feedback_time", Date.now().toString());

      // Save to local history list
      const savedItem = {
        id: result.messageId || `fb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category,
        rating,
        subject: subject.trim(),
        details: details.trim(),
        priority,
        attachment,
        status: "Received",
      };

      const updatedHistory = [savedItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("df_feedback_history", JSON.stringify(updatedHistory));

      // Success celebration!
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#8b5cf6", "#d8b4fe", "#ec4899"],
      });

      setIsSuccess(true);
      // Reset Form fields (except category & email for convenience)
      setSubject("");
      setDetails("");
      setRating(0);
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("[Feedback Submission Error]:", err);
      setErrorMessage(err.message || "Something went wrong while sending your feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl py-6 space-y-8 relative">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-violet-600/[0.02] blur-[100px] pointer-events-none z-0" />

      {/* HEADER */}
      <div className="text-center space-y-2 relative z-10">
        <h1 className="text-2xl font-bold tracking-tight text-white">Share Feedback</h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Let us know how we can improve DeepFocus. We read every submission and use your ideas to shape our roadmap.
        </p>
      </div>

      {/* FORM CARD */}
      <div className="relative z-10 rounded-2xl border border-white/5 bg-zinc-950/40 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Category Tabs */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Feedback Category
            </label>
            <div className="flex flex-wrap gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex-1 min-w-[120px] py-2 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white/[0.06] text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Satisfaction Rating
            </label>
            <div className="flex items-center gap-1.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Star
                    size={22}
                    className={`transition-all duration-150 ${
                      star <= (hoveredRating || rating)
                        ? "fill-violet-400 text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.3)]"
                        : "text-zinc-700"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs font-semibold text-zinc-400 ml-2">
                  {rating === 1 ? "Disappointed" : rating === 2 ? "Could be better" : rating === 3 ? "Satisfied" : rating === 4 ? "Very happy" : "Amazing"}
                </span>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Subject Summary
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this about?"
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700"
            />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Details
            </label>
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please share your thoughts, feature requests, or report details here..."
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 px-3.5 text-sm leading-6 text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700 resize-none"
            />
          </div>

          {/* Optional Email Address */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Your Email Address (Optional)
            </label>
            <input
              type="email"
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700"
            />
          </div>

          {/* File / Image Attachment Zone */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Upload Screenshot or Log (Optional)
            </label>
            
            {!attachment ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-violet-400 bg-violet-500/[0.04]"
                    : "border-white/10 hover:border-white/20 bg-white/[0.01]"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  accept="image/*,application/pdf,text/plain"
                  className="hidden"
                />
                <Upload size={20} className={isDragging ? "text-violet-400" : "text-zinc-500"} />
                <div className="text-xs font-semibold text-zinc-300">
                  Click to upload or drag & drop
                </div>
                <div className="text-[10px] text-zinc-500">
                  Supports PNG, JPG, JPEG, PDF, TXT (Max 5MB)
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  {attachment.type.startsWith("image/") ? (
                    <img
                      src={attachment.dataUrl}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400">
                      <FileText size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{attachment.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{attachment.size}</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={removeAttachment}
                  className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 focus:outline-none"
            >
              <History size={14} />
              <span>{showHistory ? "Hide past submissions" : `View history (${history.length})`}</span>
            </button>

            <button
              type="submit"
              disabled={rating === 0 || !subject.trim() || !details.trim() || isSubmitting}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                (rating === 0 || !subject.trim() || !details.trim() || isSubmitting)
                  ? "border border-white/[0.04] bg-white/[0.01] text-zinc-600 cursor-not-allowed"
                  : "bg-white text-black hover:bg-zinc-200 active:scale-95 cursor-pointer shadow-md shadow-white/5"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={12} />
                  <span>Send Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error State with Retry Button */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-xl border border-rose-500/10 bg-rose-500/[0.01] p-4 flex gap-3.5 items-start relative overflow-hidden"
          >
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-xs font-bold text-rose-300">Submission failed</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {errorMessage}
              </p>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => handleSubmit(null)}
                  disabled={isSubmitting}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 focus:outline-none"
                >
                  <RefreshCw size={10} className={isSubmitting ? "animate-spin" : ""} />
                  Retry Submission
                </button>
                <button
                  onClick={() => setErrorMessage("")}
                  className="text-[10px] text-zinc-500 hover:text-zinc-400 font-bold focus:outline-none"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success State */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.01] p-4 flex gap-3.5 items-start relative overflow-hidden"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CheckCircle2 size={16} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-emerald-300">Success</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Thank you for your feedback. Our team has received your message.
              </p>
              <button
                onClick={() => setIsSuccess(false)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline mt-1 block focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COLLAPSED HISTORY VIEW */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 relative z-10"
          >
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 pt-2">
              <History size={13} />
              Your Submissions ({history.length})
            </h3>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent">
              {history.map((fb) => {
                const catLabel = CATEGORIES.find(c => c.id === fb.category)?.label || "Feedback";
                return (
                  <div key={fb.id} className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-[9px] font-bold uppercase text-zinc-400">
                          {catLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold uppercase text-violet-400">
                          {fb.status || "Received"}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(fb.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-white leading-relaxed">{fb.subject}</h4>
                        <p className="text-zinc-400 text-[11px] leading-relaxed whitespace-pre-wrap mt-0.5">{fb.details}</p>
                      </div>

                      {/* Display attachment if exists in history */}
                      {fb.attachment && (
                        <div className="pt-2 border-t border-white/[0.02] flex items-center gap-2">
                          {fb.attachment.type.startsWith("image/") ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] text-zinc-500 uppercase font-mono">Attachment Preview:</span>
                              <a href={fb.attachment.dataUrl} target="_blank" rel="noreferrer" className="block w-24 h-16 rounded border border-white/10 overflow-hidden hover:opacity-80 transition-opacity">
                                <img src={fb.attachment.dataUrl} alt="Attached screenshot" className="w-full h-full object-cover" />
                              </a>
                            </div>
                          ) : (
                            <a
                              href={fb.attachment.dataUrl}
                              download={fb.attachment.name}
                              className="text-violet-400 hover:underline inline-flex items-center gap-1.5 text-[10px] font-medium"
                            >
                              <FileText size={11} />
                              <span>Download {fb.attachment.name} ({fb.attachment.size})</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {history.length === 0 && (
                <div className="p-8 border border-dashed border-white/[0.06] rounded-xl text-center text-zinc-600 text-xs">
                  No submissions recorded yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
