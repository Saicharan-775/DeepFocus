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
    <section id="final-cta" className="px-6 py-10 md:py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/10 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card rounded-[40px] p-10 md:p-16 lg:p-20 text-center relative overflow-hidden bg-gradient-to-b from-white/[0.03] to-white/[0.01]"
        >
          {/* Internal Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/20 blur-[100px] rounded-full pointer-events-none" />

          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-violet-400 mb-8 border border-violet-500/20 rounded-full px-4 py-2 bg-violet-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            The final step
          </p>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.05] max-w-4xl mx-auto mb-6">
            Build interview-grade discipline.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 mt-2">Before your next interview.</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12">
            Install DeepFocus, start a problem, and force your brain to solve it before looking up answers.
            Real engineering growth starts where the shortcuts end.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="group flex items-center justify-center gap-2 bg-white text-black px-10 py-5 rounded-2xl font-semibold text-base hover:bg-gray-100 transition-all active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.2)] w-full sm:w-auto">
              Install for Chrome
              <ArrowIcon />
            </a>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-gray-500 font-medium border-t border-white/5 pt-8">
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> No solution peeking</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Auto revision queue</span>
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Focus-first workflow</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
