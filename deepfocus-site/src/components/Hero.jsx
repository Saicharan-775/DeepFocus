import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { FlipWords } from "./ui/flip-words";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="group-hover:translate-x-1 transition-transform">
      <path d="M7 12h10m0 0l-4-4m4 4l-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="group-hover:-translate-y-0.5 transition-transform">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 18h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const cyclePhrases = [
  "solutions tab.",
  "ChatGPT solutions.",
  "copy-pasting.",
  "video editorials."
];

const HERO_VIDEO_SRC = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export default function Hero() {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Video autoplay failed or was blocked by browser policies:", error);
        });
      }
    }
  }, []);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const titleWordsLine1 = "Build real intuition.".split(" ");

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden bg-[#030305] select-none">
      
      <div className="absolute inset-0 w-full h-full z-10 overflow-hidden pointer-events-none">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${videoReady ? "opacity-0" : "opacity-100"}`}
          style={{
            background:
              "radial-gradient(circle at 50% 28%, rgba(30, 100, 130, 0.42), transparent 34%), linear-gradient(180deg, #07151c 0%, #051014 42%, #030305 100%)",
          }}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${videoReady ? "opacity-0" : "opacity-70"}`}
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(180,220,255,.55) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(255,255,255,.35) 0 1px, transparent 1.6px)",
            backgroundPosition: "0 0, 42px 28px",
            backgroundSize: "84px 84px, 132px 132px",
          }}
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-500 ${videoReady ? "opacity-95" : "opacity-0"}`}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      </div>

      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#030305] to-transparent z-20 pointer-events-none" />
      
      <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[#030305] via-[#030305]/30 to-transparent z-20 pointer-events-none" />
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(3,3,5,0)_45%,rgba(3,3,5,0.45)_95%)] z-20 pointer-events-none" />

      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[-15%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-15%] w-[500px] h-[500px] bg-indigo-500/6 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[1200px] mx-auto flex items-center justify-center z-30">

        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          <motion.div 
            id="hero-content"
            initial="hidden" 
            animate="visible" 
            variants={containerVariants} 
            className="flex flex-col items-center"
          >

            <div className="w-full flex flex-col items-center justify-center text-center">
              
              <h1 className="font-['Plus_Jakarta_Sans'] text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white leading-none flex flex-wrap justify-center select-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">
                {titleWordsLine1.map((word, wIdx, arr) => (
                  <span key={wIdx} className="inline-flex overflow-hidden pb-2 mr-[0.25em]">
                    <motion.span
                      className="inline-block origin-bottom text-white"
                      variants={{
                        hidden: { y: "120%", opacity: 0, skewY: 4 },
                        visible: { 
                          y: 0, 
                          opacity: 1, 
                          skewY: 0,
                          transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
                        }
                      }}
                    >
                      {word}{wIdx !== arr.length - 1 && "\u00A0"}
                    </motion.span>
                  </span>
                ))}
              </h1>

              <motion.h2 
                variants={itemVariants}
                className="font-['Plus_Jakarta_Sans'] font-light text-zinc-300 text-xl sm:text-3xl md:text-4xl tracking-wide leading-tight select-none mt-2 text-center flex flex-wrap items-center justify-center gap-x-2 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              >
                <span className="text-zinc-300">Stop relying on the</span>
                <FlipWords
                  words={cyclePhrases}
                  duration={2800}
                  className="font-semibold italic text-white border-b-2 border-white/20 pb-0.5 min-w-[180px] sm:min-w-[280px] md:min-w-[360px] text-center whitespace-nowrap inline-block"
                />
              </motion.h2>
            </div>

            <motion.div 
              variants={itemVariants}
              className="w-full mt-6"
            >
              <p className="text-zinc-200 text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mb-8 select-none font-['Plus_Jakarta_Sans'] filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                DeepFocus is a browser extension that enforces discipline by blocking LeetCode solutions, disabling copy-pasting, and intelligently scheduling your revisions.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto z-10 relative font-['Plus_Jakarta_Sans']"
            >
              <a 
                href="#" 
                className="group relative w-full sm:w-auto px-9 py-4 bg-white text-black rounded-xl font-extrabold text-[12px] tracking-widest uppercase overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:bg-zinc-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <DownloadIcon />
                  <span>Install Extension</span>
                </div>
              </a>

              <Link 
                to="/revision" 
                className="group relative w-full sm:w-auto px-9 py-4 bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 text-white rounded-xl font-extrabold text-[12px] tracking-widest uppercase overflow-hidden backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <span>Revision Sheet</span>
                  <ArrowIcon />
                </div>
              </Link>
            </motion.div>

          </motion.div>
        </div>

      </div>
    </section>
  );
}
