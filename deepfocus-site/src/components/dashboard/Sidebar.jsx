import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, BrainCircuit, MessageSquare, LineChart, Library, Settings, LogOut, Target, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';
import DeepFocusLogo from '../DeepFocusLogo';

export default function Sidebar() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Today\'s Revision', path: '/today', icon: Target },
    { name: 'Curriculum Sheet', path: '/sheet', icon: ClipboardList },
    { name: 'Revision Sheet', path: '/revision', icon: ClipboardList },
    { name: 'Revision Workspace', path: '/workspace', icon: Sparkles },
    { name: 'AI Planner', path: '/planner', icon: BrainCircuit },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Library', path: '/library', icon: Library },
  ];

  return (
    <motion.div
      animate={{ width: isOpen ? 256 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen bg-[#000000] border-r border-white/5 flex flex-col flex-shrink-0 relative z-50"
    >
      {/* Header */}
      <div className={`p-6 flex items-center justify-between ${isOpen ? '' : 'justify-center'}`}>
        <div className="flex items-center gap-3">
          <DeepFocusLogo showText={false} markClassName="h-9 w-10 rounded-xl border-white/[0.1]" />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-bold tracking-tight text-white whitespace-nowrap"
            >
              DeepFocus
            </motion.span>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`tour-sidebar-toggle p-1 rounded-full border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white transition-colors flex items-center justify-center ${isOpen ? '' : 'absolute -right-3 top-7 z-10'}`}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `tour-${item.path.replace('/', '')} flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${isActive
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02] border border-transparent'
                } ${isOpen ? '' : 'justify-center'}`
              }
              title={!isOpen ? item.name : ''}
            >
              <Icon size={18} className="shrink-0" />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `tour-settings flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${isActive
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02] border border-transparent'
            } ${isOpen ? '' : 'justify-center'}`
          }
          title={!isOpen ? 'Settings' : ''}
        >
          <Settings size={18} className="shrink-0" />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Settings
            </motion.span>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-rose-400 hover:bg-rose-400/10 hover:text-rose-300 transition-all border border-transparent ${isOpen ? '' : 'justify-center'}`}
          title={!isOpen ? 'Log out' : ''}
        >
          <LogOut size={18} className="shrink-0" />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Log out
            </motion.span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
