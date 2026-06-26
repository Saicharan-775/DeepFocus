import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import DeepFocusLogo from "./DeepFocusLogo";

export default function Footer() {
  return (
    <footer className="px-6 py-12 relative overflow-hidden border-t border-white/10 bg-[#07070b] z-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-[-60%] left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full bg-white/[0.025] blur-[100px] pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          
          {/* Brand & Mission */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <DeepFocusLogo
                markClassName="h-9 w-9 rounded-xl border-white/[0.08] group-hover:border-white/20 transition-all"
                textClassName="text-base tracking-wide"
              />
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Forcing discipline into your daily LeetCode grind. No hacks. No shortcuts. Just focus.
            </p>
          </div>

          {/* Minimal Links Grid */}
          <div className="flex gap-12 sm:gap-20">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1">Product</p>
              <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">Workflow</a>
              <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1">Legal</p>
              <Link to="/privacy" className="text-sm text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-zinc-400 hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="text-sm text-zinc-400 hover:text-white transition-colors">Cookie Policy</Link>
              <Link to="/deletion" className="text-sm text-zinc-400 hover:text-white transition-colors">Data Deletion</Link>
              <Link to="/contact" className="text-sm text-zinc-400 hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Social Pill */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-zinc-500 font-medium tracking-wide">
            © {new Date().getFullYear()} DeepFocus. All rights reserved.
          </p>
          
          {/* Creative Social Pill */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 p-1 rounded-full backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <a href="#" className="p-2 text-gray-400 hover:bg-white/[0.08] hover:text-white rounded-full transition-all">
              <Icon icon="hugeicons:new-twitter" width="18" />
            </a>
            <a href="#" className="p-2 text-gray-400 hover:bg-white/[0.08] hover:text-white rounded-full transition-all">
              <Icon icon="mdi:github" width="20" />
            </a>
            <a href="#" className="p-2 text-gray-400 hover:bg-white/[0.08] hover:text-white rounded-full transition-all">
              <Icon icon="ic:baseline-discord" width="20" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
