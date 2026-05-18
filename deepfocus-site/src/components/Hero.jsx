import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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

export default function Hero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax mapping for background elements
  const rotateX = useTransform(smoothY, [-500, 500], [5, -5]);
  const rotateY = useTransform(smoothX, [-500, 500], [-5, 5]);
  
  const bgX = useTransform(smoothX, [-500, 500], [20, -20]);
  const bgY = useTransform(smoothY, [-500, 500], [20, -20]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const moveX = clientX - window.innerWidth / 2;
      const moveY = clientY - window.innerHeight / 2;
      mouseX.set(moveX);
      mouseY.set(moveY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <section className="pt-32 pb-32 px-6 relative overflow-hidden flex flex-col items-center text-center w-full min-h-screen justify-center mb-16 md:mb-24">

      {/* Premium Dark Indigo Center Glow - Max Luminosity for All Displays */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Soft, ultra-diffuse wide ambient glow (indigo-violet) with maximized opacities */}
        <div className="absolute w-[95vw] h-[65vh] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.30)_0%,_rgba(139,92,246,0.16)_60%,_transparent_100%)] blur-[130px] transform -translate-y-[15%]" />
        {/* Concentrated luminous core (violet) to provide rich depth and excellent low-brightness visibility */}
        <div className="absolute w-[55vw] h-[40vh] bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.22)_0%,_transparent_70%)] blur-[100px] transform -translate-y-[15%]" />
      </div>

      {/* Noise Texture for Premium Grain */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Subtle, architectural grid - No heavy glows */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]"></div>

      {/* Content Wrapper with Fixed Max Width to prevent responsive shifting across browsers */}
      <div className="relative w-full max-w-[1600px] mx-auto flex items-center justify-center min-h-[600px] z-10">

        {/* Floating Mockup (Left) - Mathematically anchored to never collide with text */}
        <motion.div
          className="absolute left-[-160px] xl:left-[-100px] 2xl:left-[-40px] top-[15%] w-[260px] xl:w-[320px] 2xl:w-[440px] opacity-60 pointer-events-none hidden xl:block z-0 transform-gpu"
          style={{ 
            rotateX, 
            rotateY,
            perspective: 1200,
            transformStyle: "preserve-3d",
            willChange: "transform"
          }}
        >
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
            <div className="bg-[#09090b] border border-white/10 hover:border-violet-500/20 transition-colors duration-500 rounded-2xl p-2 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <img src="/screenshots/blocked.png" alt="Blocked Screen" className="w-full rounded-xl border border-white/5 relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none"></div>
            </div>
          </motion.div>
        </motion.div>

        {/* Floating Mockup (Right) - Mathematically anchored to never collide with text */}
        <motion.div
          className="absolute right-[-160px] xl:right-[-100px] 2xl:right-[-40px] top-[30%] w-[300px] xl:w-[340px] 2xl:w-[480px] opacity-60 pointer-events-none hidden xl:block z-0 transform-gpu"
          style={{ 
            rotateX: useTransform(smoothY, [-500, 500], [-8, 8]), 
            rotateY: useTransform(smoothX, [-500, 500], [8, -8]),
            perspective: 1200,
            transformStyle: "preserve-3d",
            willChange: "transform"
          }}
        >
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
            <div className="bg-[#09090b] border border-white/10 hover:border-violet-500/20 transition-colors duration-500 rounded-2xl p-2 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <img src="/screenshots/revisionsheet.png" alt="Revision Sheet" className="w-full rounded-xl border border-white/5 relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-tl from-white/[0.03] to-transparent pointer-events-none"></div>
            </div>
          </motion.div>
        </motion.div>

        {/* Center Content - High Contrast, Centered text guaranteed to render above side panels */}
        <div className="max-w-4xl mx-auto z-20 relative px-4 flex flex-col items-center text-center mt-12 md:mt-0">
          <motion.div 
            id="hero-content"
            initial="hidden" 
            animate="visible" 
            variants={{ 
              visible: { 
                transition: { 
                  staggerChildren: 0.12,
                  delayChildren: 0.2
                } 
              } 
            }} 
            className="flex flex-col items-center"
          >

            {/* Typography - High Contrast, Editorial Aesthetic with Mindblowing Reveal */}
            <div className="w-full flex flex-col items-center justify-center text-center mb-8 px-4">
              {/* Row 1: Build real intuition. */}
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-[88px] font-bold tracking-tight text-white leading-none flex flex-wrap justify-center mb-4">
                {"Build real intuition.".split(" ").map((word, wIdx) => (
                  <span key={wIdx} className="inline-flex overflow-hidden pb-2 mr-[0.2em]">
                    <motion.span
                      className="inline-block origin-bottom text-white"
                      variants={{
                        hidden: { y: "120%", opacity: 0, skewY: 4 },
                        visible: { 
                          y: 0, 
                          opacity: 1, 
                          skewY: 0,
                          transition: { duration: 1.0, ease: [0.19, 1.0, 0.22, 1.0] } 
                        }
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </h1>

              {/* Row 2: Stop relying on the solutions tab. */}
              <h2 className="w-full flex flex-wrap justify-center mt-2 pb-4">
                {"Stop relying on the solutions tab.".split(" ").map((word, i, arr) => (
                  <span key={i} className="inline-flex overflow-hidden pb-1 mr-[0.2em]">
                    <motion.span
                      variants={{
                        hidden: { opacity: 0, y: "100%", skewY: 2 },
                        visible: { 
                          opacity: 1, 
                          y: 0, 
                          skewY: 0,
                          transition: { duration: 1.0, ease: [0.19, 1.0, 0.22, 1.0] } 
                        }
                      }}
                      className="inline-block font-serif italic font-normal bg-gradient-to-r from-zinc-400 via-white to-zinc-400 bg-clip-text text-transparent text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[76px] tracking-normal animate-shimmer bg-[length:200%_auto]"
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </h2>
            </div>

            {/* Subheadline - Premium Blur Reveal */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
                visible: { 
                  opacity: 1, 
                  filter: "blur(0px)", 
                  y: 0, 
                  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } 
                }
              }}
            >
              <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl font-light leading-relaxed mx-auto">
                DeepFocus is a browser extension that enforces discipline by blocking LeetCode solutions, disabling copy-pasting, and intelligently scheduling your revisions.
              </p>
            </motion.div>

            {/* Premium Modern Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full sm:w-auto z-10 relative">
              {/* Primary Button - Install Extension */}
              <a href="#" className="group relative w-full sm:w-auto px-10 py-4 bg-white text-black rounded-xl font-bold text-[14px] tracking-wider uppercase overflow-hidden transition-all active:scale-95 border border-white shadow-[0_10px_30px_rgba(255,255,255,0.05)] hover:bg-zinc-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="flex items-center justify-center gap-3">
                  <DownloadIcon />
                  <span>Install Extension</span>
                </div>
              </a>

              {/* Secondary Button - Revision Sheet */}
              <Link to="/revision" className="group relative w-full sm:w-auto px-10 py-4 bg-black/40 border border-white/10 text-white rounded-xl font-bold text-[14px] tracking-wider uppercase overflow-hidden backdrop-blur-md transition-all hover:border-white/25 active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="flex items-center justify-center gap-3">
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
