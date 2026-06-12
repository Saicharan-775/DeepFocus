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
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-zinc-300">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-zinc-300">
      <rect x="3" y="5" width="18" height="14" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18M8 5v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-zinc-300">
      <rect x="6" y="5" width="12" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5.5h6M9.5 10.2h5M9.5 13.2h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="text-zinc-300">
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
    <section id="problem-section" className="landing-section">
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto mb-10 max-w-3xl text-center md:mb-14"
        >
          <p className="section-kicker">
            The Illusion of Progress
          </p>
          <h2 className="landing-display mb-7 text-4xl leading-[1.08] text-[#F8FAFC] md:text-6xl">
            You aren't learning. <br className="hidden md:block" />
            <span className="landing-soft-gradient">You are just reading solutions.</span>
          </h2>
          <p className="landing-copy mx-auto max-w-2xl text-base leading-8 md:text-lg">
            Most developers fall into silent discipline traps. You think you are studying, but you are actively sabotaging your ability to recall information under interview pressure.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {traps.map((trap, index) => {
            const TrapIcon = icons[index];
            return (
              <motion.article
                key={trap.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: index * 0.06, ease: "easeOut" }}
                className="glass-card group relative flex min-h-[320px] flex-col overflow-hidden rounded-[18px] p-6 transition-all duration-300 hover:-translate-y-1 md:p-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.16]" />

                <div className="relative mb-7">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/45 text-zinc-300">
                    <TrapIcon />
                  </div>
                </div>

                <h3 className="landing-display relative mb-3 text-[20px] font-semibold text-white">
                  {trap.title}
                </h3>

                <p className="landing-copy relative mb-7 grow text-sm leading-6">
                  {trap.desc}
                </p>

                <div className="relative mt-auto shrink-0 border-t border-white/[0.1] pt-5">
                  <div className="min-h-[38px]">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                      Result
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold uppercase tracking-[0.1em] text-zinc-200">
                      {trap.tone}
                    </span>
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
