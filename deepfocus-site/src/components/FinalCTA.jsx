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

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M13 2L6 13h5l-1 9 8-12h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FinalCTA() {
  return (
    <section id="final-cta" className="px-6 py-28 final-cta-shell">
      <div className="final-cta-orb" aria-hidden="true" />
      <div className="max-w-5xl mx-auto">
        <div className="final-cta-card rounded-[2rem] p-8 md:p-12 lg:p-14">
          <p className="inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-white/60 border border-white/15 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 final-cta-dot" />
            Last step
          </p>

          <h2 className="mt-6 text-4xl md:text-6xl tracking-tight text-white leading-[1.05] max-w-4xl">
            Build interview-grade discipline,
            <span className="block text-white/65">one focused session at a time.</span>
          </h2>

          <p className="mt-5 text-base md:text-lg text-gray-300 max-w-2xl leading-relaxed">
            Install DeepFocus, start a problem, and force your brain to solve before it looks up answers.
            Real growth starts where shortcuts end.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a href="#" className="final-cta-btn-primary">
              <span className="inline-flex items-center gap-2">
                <BoltIcon />
                Install DeepFocus
              </span>
              <ArrowIcon />
            </a>

            <a href="#how-it-works" className="final-cta-btn-secondary">
              See how it works
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/70">
            <div className="final-cta-stat">No solution peeking</div>
            <div className="final-cta-stat">Auto revision queue</div>
            <div className="final-cta-stat">Focus-first workflow</div>
          </div>
        </div>
      </div>
    </section>
  );
}
