import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useState } from "react";

export default function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="demo" className="py-10 md:py-16 px-6 relative z-20 overflow-hidden bg-[#07070b]">
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,0.09),transparent_64%)] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[500px] bg-violet-600/[0.09] blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-0 right-[-10%] w-[40vw] h-[400px] bg-fuchsia-600/[0.07] blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Creative Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-400 rounded-full text-xs font-semibold uppercase tracking-widest mb-6 border border-violet-500/20 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            Live Demonstration
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Watch the workflow in action.
          </h2>
          <p className="text-lg text-zinc-300/85 max-w-2xl mx-auto leading-relaxed">
            See exactly how DeepFocus integrates into your daily LeetCode grind to prevent cheating and force you to think critically.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative rounded-[32px] md:rounded-[40px] p-2 bg-white/[0.045] border border-white/10 shadow-[0_0_90px_rgba(139,92,246,0.12)] backdrop-blur-2xl"
        >
          {/* Inner Glow to make the border pop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/16 via-transparent to-fuchsia-500/14 rounded-[32px] md:rounded-[40px] pointer-events-none opacity-70" />

          {/* Aspect Ratio Video Container */}
          <div className="relative aspect-video rounded-[28px] md:rounded-[36px] overflow-hidden bg-violet-950/40 border border-violet-400/30 shadow-2xl">

            <AnimatePresence mode="wait">
              {!isPlaying ? (
                <motion.div
                  key="thumbnail"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
                  onClick={() => setIsPlaying(true)}
                >
                  {/* Themed Vibrant Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-900/40 to-[#0A0B0E] group-hover:opacity-80 transition-opacity duration-500" />

                  {/* Engineering Grid Subtle Overlay */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                      backgroundSize: '2rem 2rem',
                      maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
                      WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
                    }}
                  />

                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500/20 via-[#0A0B0E]/0 to-[#0A0B0E]/0" />

                  {/* Play Button */}
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-violet-500/10 backdrop-blur-md border border-violet-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600/40 group-hover:border-violet-500/50 transition-all duration-500 shadow-[0_0_40px_rgba(139,92,246,0)] group-hover:shadow-[0_0_60px_rgba(139,92,246,0.4)] relative overflow-hidden">
                    <Icon icon="solar:play-bold" className="text-violet-100 text-3xl md:text-4xl translate-x-1 relative z-10" />
                  </div>

                  <p className="mt-6 text-sm font-medium tracking-widest text-violet-300 uppercase group-hover:text-violet-100 transition-colors z-10">
                    See DeepFocus in action
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black"
                >
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                    title="DeepFocus Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
