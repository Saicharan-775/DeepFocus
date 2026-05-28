import { motion } from "framer-motion";
import { Icon } from "@iconify/react";

const steps = [
  {
    title: "Install & Pin",
    desc: "Add DeepFocus to Chrome and pin it so focus mode is one click away.",
    time: "30 sec",
    cue: "Setup",
    icon: "solar:download-square-linear",
    gradient: "from-violet-500/20 to-purple-500/20",
    borderColor: "border-violet-500/30",
    iconColor: "text-violet-400"
  },
  {
    title: "Open the Problem",
    desc: "Start any LeetCode challenge the way you already do.",
    time: "Instant",
    cue: "Start",
    icon: "solar:play-circle-linear",
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400"
  },
  {
    title: "Lock the Noise",
    desc: "Solutions and shortcut paths stay hidden while your timer is active.",
    time: "15 min",
    cue: "Guard",
    icon: "solar:shield-warning-linear",
    gradient: "from-red-500/20 to-orange-500/20",
    borderColor: "border-red-500/30",
    iconColor: "text-red-400"
  },
  {
    title: "Queue Revisions",
    desc: "Missed attempts are logged automatically so weak areas get revisited.",
    time: "Auto",
    cue: "Review",
    icon: "solar:history-linear",
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-400"
  },
];

export default function Timeline() {
  return (
    <section id="how-it-works" className="py-10 md:py-16 px-6 relative overflow-hidden bg-[#07070b]">

      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.11),transparent_64%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[600px] bg-violet-600/[0.08] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <p className="inline-flex px-3 py-1 bg-white/[0.07] text-gray-200 rounded-full text-xs font-semibold uppercase tracking-widest mb-6 border border-white/[0.14]">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-6">
            Seamless workflow integration
          </h2>
          <p className="text-lg text-zinc-300/85 max-w-2xl mx-auto leading-relaxed">
            A clean four-step flow that keeps your process intentional, focused, and continuously reviewable.
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div className="relative max-w-4xl mx-auto">

          {/* Central Line */}
          <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent md:-translate-x-1/2" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;

              return (
                <div key={step.title} className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? '' : 'md:flex-row-reverse'}`}>

                  {/* Timeline Dot */}
                  <div className="absolute left-[28px] md:left-1/2 w-4 h-4 rounded-full bg-[#101017] border-2 border-white/30 md:-translate-x-1/2 shadow-[0_0_22px_rgba(139,92,246,0.28)] z-10 mt-6 md:mt-0" />

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
                    <div className="glass-card p-8 rounded-[24px] bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.07] transition-all group relative overflow-hidden text-left shadow-[0_24px_70px_rgba(0,0,0,0.3)]">

                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.gradient} border ${step.borderColor} flex items-center justify-center mb-6`}>
                        <Icon icon={step.icon} width="24" className={step.iconColor} />
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                          Step {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 bg-white/5 rounded-md text-gray-400 border border-white/10">
                          {step.time}
                        </span>
                      </div>

                      <h4 className="text-2xl font-semibold text-white mb-3 tracking-tight group-hover:text-violet-200 transition-colors">
                        {step.title}
                      </h4>

                      <p className="text-zinc-300/82 leading-relaxed">
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
