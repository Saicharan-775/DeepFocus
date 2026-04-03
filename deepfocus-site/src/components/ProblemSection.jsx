const traps = [
  {
    title: "The Quick Peek",
    desc: "You open solutions after a few failed tries and call it learning, but your pattern memory never forms.",
    tone: "Weak retention",
  },
  {
    title: "Context Switching",
    desc: "One syntax search turns into consuming full approaches. Focus breaks before deep work even starts.",
    tone: "Focus leak",
  },
  {
    title: "Copy Paste Coding",
    desc: "You borrow chunks that pass today but fail tomorrow because the reasoning never got built.",
    tone: "Shallow understanding",
  },
  {
    title: "False Confidence",
    desc: "Accepted once, forgotten next week. Real interviews expose the gap between result and mastery.",
    tone: "Interview risk",
  },
];

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18M8 5v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="6" y="5" width="12" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 5.5h6M9.5 10.2h5M9.5 13.2h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8.5 16c.9-.8 2.1-1.2 3.5-1.2s2.6.4 3.5 1.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const icons = [EyeIcon, TabIcon, ClipboardIcon, SadIcon];

export default function ProblemSection() {
  return (
    <section className="py-24 px-6 bg-[#030303] border-t border-white/5 problem-shell">
      <div className="problem-ambient" aria-hidden="true" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">Reality Check</p>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-4 leading-tight">
            The LeetCode Illusion
          </h2>
          <p className="text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            You are solving problems, but are you building recall under pressure? Most devs fall into these silent discipline traps.
          </p>
        </div>

        <div className="problem-rail grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {traps.map((trap, index) => {
            const TrapIcon = icons[index];
            return (
              <article
                key={trap.title}
                className="problem-card glass-card p-6 rounded-2xl"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="problem-card-top">
                  <div className="problem-icon-wrap">
                    <TrapIcon />
                  </div>
                  <span className="problem-index">0{index + 1}</span>
                </div>

                <h3 className="text-base font-medium text-white mb-2 tracking-tight">
                  {trap.title}
                </h3>

                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  {trap.desc}
                </p>

                <p className="problem-tone">{trap.tone}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="problem-stat">Distraction chain starts in under 2 min</div>
          <div className="problem-stat">Copying kills retrieval strength</div>
          <div className="problem-stat">Accepted != interview-ready</div>
        </div>
      </div>
    </section>
  );
}
