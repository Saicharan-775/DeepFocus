import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Coffee, Heart, ArrowRight } from "lucide-react";

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

export default function WallOfFame({
  supporters,
  loadingStats,
  filterTab,
  setFilterTab,
  renderAvatar,
  getRelativeDate,
}) {
  return (
    <div className="flex flex-col">
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
  );
}
