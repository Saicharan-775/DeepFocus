import { motion } from "framer-motion";

const traps = [
  {
    title: "The Quick Peek",
    desc: "You open solutions after a few failed tries and call it learning. The pattern never forms in your brain.",
    tone: "Weak retention",
  },
  {
    title: "Context Switching",
    desc: "One syntax search turns into consuming full approaches. Focus breaks before deep work even starts.",
    tone: "Focus leak",
  },
  {
    title: "Copy Paste Coding",
    desc: "You borrow chunks that pass today but fail tomorrow because the core reasoning was never built.",
    tone: "Shallow understanding",
  },
  {
    title: "False Confidence",
    desc: "Accepted once, forgotten next week. Real interviews expose the gap between a green checkmark and actual mastery.",
    tone: "Interview risk",
  },
];

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-red-400">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-amber-400">
      <rect x="3" y="5" width="18" height="14" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M8 5v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-orange-400">
      <rect x="6" y="5" width="12" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5.5h6M9.5 10.2h5M9.5 13.2h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-purple-400">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8.5 16c.9-.8 2.1-1.2 3.5-1.2s2.6.4 3.5 1.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const icons = [EyeIcon, TabIcon, ClipboardIcon, SadIcon];

export default function ProblemSection() {
  return (
    <section id="problem-section" className="py-10 md:py-16 px-6 border-t border-white/5 relative overflow-hidden">

      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-violet-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="inline-flex px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-semibold uppercase tracking-widest mb-6 border border-red-500/20">
            The Illusion of Progress
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-6 leading-tight">
            You aren't learning. <br className="hidden md:block" />
            You are just reading solutions.
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Most developers fall into silent discipline traps. You think you are studying, but you are actively sabotaging your ability to recall information under interview pressure.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {traps.map((trap, index) => {
            const TrapIcon = icons[index];
            return (
              <motion.article
                key={trap.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col h-full glass-card p-8 rounded-[24px] hover:-translate-y-1 transition-transform group bg-white/[0.02] border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.04]"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors shrink-0">
                  <TrapIcon />
                </div>

                <h3 className="text-xl font-medium text-white mb-3 tracking-tight shrink-0">
                  {trap.title}
                </h3>

                <p className="text-sm text-gray-400 leading-relaxed mb-8 grow">
                  {trap.desc}
                </p>

                <div className="mt-auto pt-5 border-t border-white/10 shrink-0 min-h-[64px]">
                  <div className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] flex flex-wrap gap-1">
                    RESULT: <span className="text-gray-200">{trap.tone}</span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
