import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import { LogOut, ClipboardList, BarChart3, Binary, BookOpen, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import DeepFocusLogo from "./DeepFocusLogo";

export default function DashboardNav() {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const navItems = [
    { label: "Mission", href: "/today", icon: Binary },
    { label: "Sheet", href: "/revision", icon: ClipboardList },
    { label: "Library", href: "/library", icon: BookOpen },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const getInitial = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
      
      {/* UNIQUE FLOATING BAR */}
      <nav className="relative px-2 py-2 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-1 ring-1 ring-white/5">
        
        {/* BRAND LOGO */}
        <Link to="/" className="px-3 mr-1 border-r border-white/10 hover:opacity-80 transition-opacity">
          <DeepFocusLogo showText={false} markClassName="h-8 w-10 rounded-[10px] border-white/10" />
        </Link>

        {navItems.map((item) => {
          const isActive = path === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`relative px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2.5 group ${
                isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={15} className={isActive ? "text-violet-400" : "text-gray-600 group-hover:text-gray-400 transition-colors"} strokeWidth={isActive ? 2.5 : 2} />
              <span className="hidden md:inline">{item.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeDashboardTab"
                  className="absolute inset-0 bg-white/[0.04] border border-white/10 rounded-xl z-[-1]"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}

        <div className="w-[1px] h-5 bg-white/10 mx-2" />

        {/* User Profile Area */}
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold hover:bg-violet-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {getInitial()}
          </button>

          <AnimatePresence>
            {showProfile && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfile(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-3 w-56 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                >
                  <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.user_metadata?.full_name || "Focus User"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <button 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-400/10 transition-colors flex items-center gap-2 group"
                    >
                      <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* UNIQUE UNDER-LINE INDICATOR */}
      <div className="mt-3 w-full max-w-[150px] h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent blur-[1px]" />
    </div>
  );
}
