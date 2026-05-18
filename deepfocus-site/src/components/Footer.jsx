import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";

export default function Footer() {
  return (
    <footer className="px-6 py-12 relative overflow-hidden border-t border-white/5 bg-transparent z-10">
      <div className="max-w-5xl mx-auto relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          
          {/* Brand & Mission */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:bg-violet-600 group-hover:text-white transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4"></circle>
                </svg>
              </div>
              <span className="text-base font-bold tracking-wide text-white">
                DeepFocus
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Forcing discipline into your daily LeetCode grind. No hacks. No shortcuts. Just focus.
            </p>
          </div>

          {/* Minimal Links Grid */}
          <div className="flex gap-12 sm:gap-20">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1">Product</p>
              <a href="#features" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Workflow</a>
              <Link to="/dashboard" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Dashboard</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1">Legal</p>
              <a href="#" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Privacy</a>
              <a href="#" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Terms</a>
              <a href="#" className="text-sm text-gray-500 hover:text-violet-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Social Pill */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-gray-600 font-medium tracking-wide">
            © {new Date().getFullYear()} DeepFocus. All rights reserved.
          </p>
          
          {/* Creative Social Pill */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-full backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <a href="#" className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-full transition-all">
              <Icon icon="hugeicons:new-twitter" width="18" />
            </a>
            <a href="#" className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-full transition-all">
              <Icon icon="mdi:github" width="20" />
            </a>
            <a href="#" className="p-2 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-full transition-all">
              <Icon icon="ic:baseline-discord" width="20" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
