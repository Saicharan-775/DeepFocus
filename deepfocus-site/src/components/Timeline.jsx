import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

const steps = [
  {
    title: "Install & Pin",
    desc: "Add DeepFocus to Chrome and pin it so focus mode is one click away.",
    time: "30 sec",
    cue: "Setup",
    icon: "solar:download-square-linear",
  },
  {
    title: "Open the Problem",
    desc: "Start any LeetCode challenge the way you already do.",
    time: "Instant",
    cue: "Start",
    icon: "solar:play-circle-linear",
  },
  {
    title: "Lock the Noise",
    desc: "Solutions and shortcut paths stay hidden while your timer is active.",
    time: "15 min",
    cue: "Guard",
    icon: "solar:shield-warning-linear",
  },
  {
    title: "Queue Revisions",
    desc: "Missed attempts are logged automatically so weak areas get revisited.",
    time: "Auto",
    cue: "Review",
    icon: "solar:history-linear",
  },
];

export default function Timeline() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="max-w-6xl mx-auto relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-14 text-center md:mb-[72px]"
        >
          <p className="section-kicker">
            How It Works
          </p>
          <h2 className="landing-display mb-7 text-4xl text-[#F8FAFC] md:text-6xl">
            Seamless <span className="landing-soft-gradient">workflow integration</span>
          </h2>
          <p className="landing-copy mx-auto max-w-2xl text-lg leading-8">
            A clean four-step flow that keeps your process intentional, focused, and continuously reviewable.
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div className="relative max-w-4xl mx-auto">

          {/* Central Line */}
          <div className="absolute left-[28px] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.18] to-transparent md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;

              return (
                <div key={step.title} className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? '' : 'md:flex-row-reverse'}`}>

                  {/* Timeline Dot */}
                  <div className="absolute left-[28px] z-10 mt-6 h-4 w-4 rounded-full border-2 border-white/30 bg-[#101017] shadow-[0_12px_24px_rgba(0,0,0,0.32)] md:left-1/2 md:mt-0 md:-translate-x-1/2" />

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* Card Content */}
                  <motion.div
                    initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={`w-full md:w-1/2 pl-16 pr-4 md:px-12 mt-2 md:mt-0 ${isEven ? 'md:text-right' : 'md:text-left'}`}
                  >
                    <div className="glass-card group relative overflow-hidden rounded-[24px] p-8 text-left transition-all">

                      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/45">
                        <Icon icon={step.icon} width="24" className="text-zinc-300" />
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          Step {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 bg-white/5 rounded-md text-gray-400 border border-white/10">
                          {step.time}
                        </span>
                      </div>

                      <h4 className="landing-display mb-3 text-2xl font-semibold text-white transition-colors group-hover:text-zinc-100">
                        {step.title}
                      </h4>

                      <p className="landing-copy leading-relaxed">
                        {step.desc}
                      </p>

                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
