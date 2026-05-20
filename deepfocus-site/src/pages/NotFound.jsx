import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  useEffect(() => {
    // Dynamically load Google Font for that exact editorial serif aesthetic
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#000000] text-zinc-100 flex flex-col items-center justify-between select-none overflow-hidden font-['Inter',sans-serif] z-50">
      
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.015)_0%,_transparent_70%)] pointer-events-none z-0" />

      {/* TOP HEADER BAR */}
      <header className="w-full flex items-center justify-between px-8 py-6 z-20 relative">
        {/* Left: Minimal Circular Brand Logo */}
        <Link to="/" className="flex items-center gap-2 px-3 py-1 group">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-5 h-5 text-zinc-500/40 group-hover:text-violet-500/60 transition-colors duration-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
            </motion.svg>
            <svg
              className="absolute w-3.5 h-3.5 text-zinc-300 group-hover:text-violet-400 transition-colors duration-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
            </svg>
            <div className="absolute w-1.5 h-1.5 bg-violet-500 rounded-full group-hover:scale-125 transition-transform duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          </div>
          <span className="text-[12px] font-bold tracking-[0.2em] text-white uppercase group-hover:text-zinc-200 transition-colors">
            DeepFocus
          </span>
        </Link>
        {/* Right: Technical Project Label */}
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500">
          Page Not Found
        </span>
      </header>

      {/* LEFT ARCHITECTURAL WIREFRAME PANEL */}
      <div className="absolute left-0 top-0 h-full w-32 md:w-64 pointer-events-none z-10 hidden sm:block">
        <svg className="w-full h-full opacity-[0.08]" viewBox="0 0 200 800" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Vertical Grid Guides */}
          <line x1="40" y1="0" x2="40" y2="800" stroke="white" strokeWidth="0.75" />
          <line x1="160" y1="0" x2="160" y2="800" stroke="white" strokeWidth="0.75" />
          
          {/* Central Horizontal Axis */}
          <line x1="0" y1="400" x2="200" y2="400" stroke="white" strokeWidth="0.75" />
          
          {/* Intersecting Architectural Diagonals */}
          <path d="M40,0 L200,400 L40,800" stroke="white" strokeWidth="0.75" />
          <path d="M160,0 L0,400 L160,800" stroke="white" strokeWidth="0.75" />
          
          {/* Dashed Construct Lines */}
          <line x1="40" y1="200" x2="160" y2="200" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="40" y1="600" x2="160" y2="600" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* RIGHT ARCHITECTURAL WIREFRAME PANEL */}
      <div className="absolute right-0 top-0 h-full w-32 md:w-64 pointer-events-none z-10 hidden sm:block">
        <svg className="w-full h-full opacity-[0.08] transform scale-x-[-1]" viewBox="0 0 200 800" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Vertical Grid Guides */}
          <line x1="40" y1="0" x2="40" y2="800" stroke="white" strokeWidth="0.75" />
          <line x1="160" y1="0" x2="160" y2="800" stroke="white" strokeWidth="0.75" />
          
          {/* Central Horizontal Axis */}
          <line x1="0" y1="400" x2="200" y2="400" stroke="white" strokeWidth="0.75" />
          
          {/* Intersecting Architectural Diagonals */}
          <path d="M40,0 L200,400 L40,800" stroke="white" strokeWidth="0.75" />
          <path d="M160,0 L0,400 L160,800" stroke="white" strokeWidth="0.75" />
          
          {/* Dashed Construct Lines */}
          <line x1="40" y1="200" x2="160" y2="200" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="40" y1="600" x2="160" y2="600" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* CENTER TEXT / HERO CONTENT */}
      <main className="flex flex-col items-center justify-center text-center max-w-4xl px-6 relative z-20 flex-1">
        
        {/* Luxury serif headline */}
        <h1 className="font-['Cormorant_Garamond',serif] leading-[1.05] tracking-tight text-white mb-8 select-none">
          <div className="text-4xl sm:text-5xl md:text-[68px] font-normal uppercase text-[#b6b6ae] tracking-wider mb-2">
            The Page
          </div>
          <div className="text-4xl sm:text-5xl md:text-[68px] font-normal uppercase text-[#b6b6ae] tracking-wider mb-4">
            You're Looking For
          </div>
          <div className="text-4xl sm:text-5xl md:text-[84px] font-light italic text-[#deded9] lowercase font-serif">
            doesn't exist
          </div>
        </h1>

        {/* Small Elegant Subtext */}
        <p className="text-[9px] md:text-[10px] text-zinc-500 font-medium tracking-[0.25em] leading-relaxed uppercase max-w-md mb-12 select-none">
          Please check the URL or return to the homepage to continue browsing.
        </p>

        {/* Pill-shaped light-cream action button */}
        <Link to="/">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="px-8 py-3.5 rounded-full bg-[#d6d6ce] hover:bg-[#c9c9c1] text-zinc-950 font-bold text-[10px] uppercase tracking-[0.2em] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-colors duration-300 cursor-pointer flex items-center justify-center border border-white/20"
          >
            Back to Homepage
          </motion.button>
        </Link>

      </main>

      {/* FOOTER PUSH */}
      <footer className="w-full py-8 text-center z-20 relative">
        <span className="text-[9px] tracking-[0.2em] text-zinc-600 font-semibold uppercase">
          © 2026 DeepFocus
        </span>
      </footer>

    </div>
  );
}
