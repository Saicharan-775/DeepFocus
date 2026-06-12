import { motion } from "framer-motion";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="group-hover:translate-x-1 transition-transform">
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

export default function FinalCTA() {
  return (
    <section id="final-cta" className="landing-section">
      <div className="pointer-events-none absolute bottom-[-18rem] right-[-10rem] h-[860px] w-[860px] rounded-full bg-[rgba(139,125,255,0.10)] blur-[320px]" />
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5, scale: 1.006 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-card relative overflow-hidden rounded-[40px] p-10 text-center md:p-16 lg:p-20"
        >
          <p className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            The final step
          </p>

          <h2 className="landing-display mx-auto mb-7 max-w-4xl text-4xl leading-[1.05] text-[#F8FAFC] md:text-6xl lg:text-7xl">
            Build interview-grade discipline.
            <span className="landing-soft-gradient mt-2 inline-block">Before your next interview.</span>
          </h2>

          <p className="landing-copy mx-auto mb-12 max-w-2xl text-lg leading-8 md:text-xl">
            Install DeepFocus, start a problem, and force your brain to solve it before looking up answers.
            Real engineering growth starts where the shortcuts end.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F8FAFC] px-10 py-5 text-base font-semibold text-[#040816] shadow-[0_18px_44px_rgba(0,0,0,0.32)] transition-all hover:bg-zinc-200 active:scale-[0.98] sm:w-auto">
              Install for Chrome
              <ArrowIcon />
            </a>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-400 font-medium border-t border-white/10 pt-8">
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> No solution peeking</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Auto revision queue</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Focus-first workflow</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
