import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useState } from "react";

export default function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section id="demo" className="landing-section z-20">
      <div className="pointer-events-none absolute left-1/2 top-16 h-[760px] w-[980px] -translate-x-1/2 rounded-full bg-[rgba(139,125,255,0.08)] blur-[260px]" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Creative Heading */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-10 text-center md:mb-14"
        >
          <div className="section-kicker">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-300"></span>
            </span>
            Live Demonstration
          </div>
          <h2 className="landing-display landing-soft-gradient mb-6 text-4xl md:text-6xl">
            Watch the workflow in action.
          </h2>
          <p className="landing-copy mx-auto max-w-2xl text-lg leading-8">
            See exactly how DeepFocus integrates into your daily LeetCode grind to prevent cheating and force you to think critically.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          whileHover={{ y: -6, scale: 1.01 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="premium-surface relative rounded-[28px] p-2 md:rounded-[34px]"
        >

          {/* Aspect Ratio Video Container */}
          <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/60 shadow-2xl md:rounded-[30px]">

            <AnimatePresence mode="wait">
              {!isPlaying ? (
                <motion.div
                  key="thumbnail"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
                  onClick={() => setIsPlaying(true)}
                >
                  {/* Themed Vibrant Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.075),rgba(18,18,20,0.82)_42%,rgba(0,0,0,0.98))] transition-opacity duration-500 group-hover:opacity-90" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.075),transparent_32%),radial-gradient(circle_at_72%_76%,rgba(255,255,255,0.035),transparent_36%)]" />

                  {/* Play Button */}
                  <div className="animate-float relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-black/60 shadow-[0_18px_44px_rgba(0,0,0,0.42)] transition-all duration-500 group-hover:scale-[1.06] group-hover:border-white/30 md:h-24 md:w-24">
                    <Icon icon="solar:play-bold" className="relative z-10 translate-x-1 text-3xl text-zinc-100 md:text-4xl" />
                  </div>

                  <p className="z-10 mt-6 text-sm font-medium uppercase tracking-widest text-zinc-300 transition-colors group-hover:text-white">
                    See DeepFocus in action
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="video-player"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 w-full h-full"
                >
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src="https://www.youtube.com/embed/ud3jWjBlRGw?autoplay=1&si=P4aHSrUZocpKyNcs" 
                    title="DeepFocus Demonstration Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerPolicy="strict-origin-when-cross-origin" 
                    allowFullScreen
                    className="w-full h-full border-none"
                  ></iframe>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
