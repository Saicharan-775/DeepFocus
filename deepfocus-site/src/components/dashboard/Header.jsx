import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGamification } from '../../hooks/useGamification';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';

const PremiumCoinIcon = ({ width = 16, className }) => (
  <svg width={width} height={width} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="11" fill="#B45309"/>
    <circle cx="12" cy="12" r="10" fill="url(#hdr-lc-grad)"/>
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FBBF24" strokeWidth="1"/>
    <circle cx="12" cy="12" r="6" fill="#D97706"/>
    <circle cx="12" cy="12" r="5" fill="url(#hdr-lc-inner-grad)"/>
    <path d="M7 7C8.5 5.5 10.5 4.5 12 4.5" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="hdr-lc-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="0.4" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="hdr-lc-inner-grad" x1="7" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#FEF08A" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { streak, coins, goldCoins, silverCoins } = useGamification();
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAvatarDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/revision': return 'Revision Sheet';
      case '/planner': return 'AI Planner';
      case '/tutor': return 'AI Tutor';
      case '/analytics': return 'Profile';
      case '/library': return 'Library';
      case '/settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  const getInitial = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const handleSignOut = async () => {
    setAvatarDropdownOpen(false);
    await signOut();
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#000000]/80 backdrop-blur-md sticky top-0 z-30">
      
      {/* Breadcrumbs / Page Title */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 font-medium">DeepFocus</span>
        <ChevronRight size={14} className="text-gray-600" />
        <span className="text-gray-200 font-semibold">{getPageTitle()}</span>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex items-center max-w-md w-full mx-4">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search anything (Cmd+K)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#09090B] border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-4">
        
        {/* Dynamic Streak / Focus Coins Badge (LeetCode Style) */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-[#09090B] border border-white/5 rounded-lg shadow-inner cursor-default">
           <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
             <Icon icon="solar:bolt-bold" width="14" className="text-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.4)]" />
             <span>{streak} Day</span>
           </div>
           <div className="w-px h-3 bg-white/10" />
           <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
             <PremiumCoinIcon width={16} className="drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
             <span>{coins}</span>
           </div>
        </div>

        {/* Notification Bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-400 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.8)]"></span>
        </button>

        {/* Avatar trigger button & dropdown */}
        <div className="relative" ref={dropdownRef}>
          {/*
            <div
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setAvatarDropdownOpen(false)}
            />
          */}

          <button 
            onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border border-white/10 text-white flex items-center justify-center text-xs font-bold hover:border-violet-400 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all z-50 relative active:scale-95 cursor-pointer"
          >
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>{getInitial()}</span>
            )}
          </button>

          {/* Simple Dropdown Menu */}
          <AnimatePresence>
            {avatarDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-3 w-52 p-2 rounded-2xl bg-zinc-950/95 border border-white/[0.08] backdrop-blur-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.9)] flex flex-col gap-0.5 z-50 overflow-hidden text-gray-200"
              >
                <div className="px-3 py-2 flex flex-col">
                  <span className="text-[9px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
                    Account
                  </span>
                  <span className="text-[11px] font-medium text-zinc-300 truncate mt-0.5">
                    {user?.email}
                  </span>
                </div>

                <div className="h-[1px] bg-white/[0.06] my-1" />

                <Link
                  to="/analytics"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03] flex items-center justify-between"
                >
                  <span>Profile Page</span>
                  <Icon icon="solar:user-bold-duotone" width="14" className="text-zinc-500" />
                </Link>

                <Link
                  to="/revision"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]"
                >
                  Revision Sheet
                </Link>
                
                <Link
                  to="/settings"
                  onClick={() => setAvatarDropdownOpen(false)}
                  className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]"
                >
                  Settings
                </Link>

                <div className="h-[1px] bg-white/[0.06] my-1" />

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/[0.04] transition-colors rounded-xl cursor-pointer"
                >
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </header>
  );
}
