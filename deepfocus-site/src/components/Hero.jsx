import { Link } from "react-router-dom";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M7 12h10m0 0l-4-4m4 4l-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 18h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="pt-36 pb-24 px-6 relative hero-shell">
      <div className="hero-ambient hero-ambient-a" aria-hidden="true" />
      <div className="hero-ambient hero-ambient-b" aria-hidden="true" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
        <div className="animate-fade-in-up">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-gray-300 mb-8 font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-400 hero-live-dot" />
            v1.0 live on Chrome Web Store
          </p>

          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-white mb-6 leading-[0.95]">
            Stop cheating yourself
            <span className="block hero-highlight-text">on LeetCode.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl font-light leading-relaxed">
            DeepFocus blocks shortcuts in real time, keeps you on one problem, and builds actual problem-solving muscle.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a href="#" className="hero-btn-primary w-full sm:w-auto">
              <DownloadIcon />
              Install Extension
            </a>

            <Link to="/revision" className="hero-btn-secondary w-full sm:w-auto">
              View Revision Sheet
              <ArrowIcon />
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/70">
            <span className="hero-chip">Blocks Solutions Tab</span>
            <span className="hero-chip">Prevents Paste Abuse</span>
            <span className="hero-chip">Auto Revision Queue</span>
          </div>
        </div>

        <div className="hero-preview glass-card rounded-3xl p-6 md:p-7 animate-fade-in-up delay-200">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Live focus session</p>
            <span className="text-xs text-emerald-300 hero-status">Protected</span>
          </div>

          <div className="hero-timer rounded-2xl p-5 mb-4">
            <p className="text-[11px] text-white/55 uppercase tracking-[0.15em] mb-2">Time remaining</p>
            <p className="text-4xl font-medium tracking-tight text-white">14:32</p>
          </div>

          <div className="space-y-3">
            <div className="hero-row">
              <span>Solutions Tab</span>
              <span className="text-red-300">Blocked</span>
            </div>
            <div className="hero-row">
              <span>Tab Switching</span>
              <span className="text-amber-200">Monitored</span>
            </div>
            <div className="hero-row">
              <span>Revision Log</span>
              <span className="text-emerald-300">Enabled</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
