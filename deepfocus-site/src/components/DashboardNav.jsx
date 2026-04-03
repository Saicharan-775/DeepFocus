import React from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { LogOut, Layout, ClipboardList, BarChart3, Binary, BookOpen } from "lucide-react";

export default function DashboardNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { label: "Mission", href: "/today", icon: Binary },
    { label: "Sheet", href: "/revision", icon: ClipboardList },
    { label: "Library", href: "/library", icon: BookOpen },
    { label: "Insights", href: "/insights", icon: BarChart3 },
  ];

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
      
      {/* UNIQUE FLOATING BAR */}
      <nav className="relative px-2 py-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-1 overflow-hidden ring-1 ring-white/5">
        
        {/* BRAND LOGO */}
        <div className="px-3 mr-1 border-r border-white/10">
          <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center font-black text-[10px] tracking-tighter shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            DF
          </div>
        </div>

        {navItems.map((item) => {
          const isActive = path === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`relative px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 group ${
                isActive ? "text-white" : "text-[#555] hover:text-[#888]"
              }`}
            >
              <Icon size={14} className={isActive ? "text-indigo-400" : "text-[#333] group-hover:text-[#555] transition-colors"} />
              <span className="hidden md:inline">{item.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-xl z-[-1]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}

        <div className="w-[1px] h-4 bg-white/10 mx-2" />

        <button 
          onClick={() => supabase.auth.signOut()}
          className="p-2 text-[#444] hover:text-rose-500 transition-all hover:bg-rose-500/5 rounded-lg active:scale-95"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </nav>

      {/* UNIQUE UNDER-LINE INDICATOR (DeepFocus Signature) */}
      <div className="mt-2 w-full max-w-[120px] h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20 blur-[1px]" />
    </div>
  );
}
