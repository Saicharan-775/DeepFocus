import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ChevronRight, Megaphone, Trophy, BookOpen, AlertTriangle, Sparkles, Globe, Check, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGamification } from '../../hooks/useGamification';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import useNotifications from '../../hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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

const notifIcons = {
  system: <Globe size={14} className="text-blue-400" />,
  feature: <Sparkles size={14} className="text-emerald-400" />,
  achievement: <Trophy size={14} className="text-amber-400" />,
  revision: <BookOpen size={14} className="text-violet-400" />,
  warning: <AlertTriangle size={14} className="text-rose-400" />,
  announcement: <Megaphone size={14} className="text-cyan-400" />,
};

const notifBgColors = {
  system: 'bg-blue-500/10 border-blue-500/20',
  feature: 'bg-emerald-500/10 border-emerald-500/20',
  achievement: 'bg-amber-500/10 border-amber-500/20',
  revision: 'bg-violet-500/10 border-violet-500/20',
  warning: 'bg-rose-500/10 border-rose-500/20',
  announcement: 'bg-cyan-500/10 border-cyan-500/20',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { streak, coins } = useGamification();
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState('all');
  
  const dropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    flags,
    markAsRead,
    markAllAsRead,
    logInteraction,
  } = useNotifications();

  // Log views for all visible unread notifications when the dropdown is opened
  useEffect(() => {
    if (notifDropdownOpen && notifications.length > 0) {
      notifications.forEach((n) => {
        if (!n.is_read) {
          logInteraction(n.id, true, false);
        }
      });
    }
  }, [notifDropdownOpen, notifications, logInteraction]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAvatarDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  const getPageTitle = () => {
    if (location.pathname.startsWith('/community')) return 'Community';

    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/revision': return 'Revision Sheet';
      case '/planner': return 'Revision Planner';
      case '/analytics': return 'Profile';
      case '/library': return 'Library';
      case '/settings': return 'Settings';
      case '/feedback': return 'Feedback & Requests';
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

  const filteredNotifications = notifications.filter((n) => {
    if (activeNotifTab === 'unread') return !n.is_read;
    return true;
  });

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.cta_url) {
      await logInteraction(notif.id, true, true);
      setNotifDropdownOpen(false);
      navigate(notif.cta_url);
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#000000]/80 backdrop-blur-md sticky top-0 z-50">
      
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
        
        {/* Dynamic Streak / Focus Coins Badge */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-[#09090B] border border-white/5 rounded-lg shadow-inner cursor-default">
           <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
             <Icon icon="solar:bolt-bold" width="14" className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]" />
             <span>{streak} Day</span>
           </div>
           <div className="w-px h-3 bg-white/10" />
           <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
             <PremiumCoinIcon width={16} className="drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
             <span>{coins}</span>
           </div>
        </div>

        {/* Premium Notification Bell (Gracefully respects feature flags) */}
        {flags.notifications && (
          <div className="relative" ref={notifDropdownRef}>
            <button 
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setAvatarDropdownOpen(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative cursor-pointer"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative">{unreadCount}</span>
                </span>
              )}
            </button>

            {/* Premium Glassmorphic Dropdown */}
            <AnimatePresence>
              {notifDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-3 w-80 sm:w-96 p-2 rounded-2xl bg-zinc-950/90 border border-white/[0.08] backdrop-blur-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.9)] flex flex-col gap-0.5 z-50 text-gray-200 overflow-hidden"
                >
                  {/* Dropdown Header */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] text-zinc-400 font-medium">{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="flex px-1.5 gap-1 border-b border-white/[0.04] pb-1.5 mb-1">
                    <button 
                      onClick={() => setActiveNotifTab('all')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeNotifTab === 'all' 
                          ? 'bg-white/[0.06] text-white' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setActiveNotifTab('unread')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeNotifTab === 'unread' 
                          ? 'bg-white/[0.06] text-white' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                      }`}
                    >
                      Unread {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                  </div>

                  {/* Notifications Feed List */}
                  <div className="max-h-[360px] overflow-y-auto overflow-x-hidden flex flex-col gap-1 pr-1">
                    {notifLoading ? (
                      // Loading Skeletons
                      <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-3 animate-pulse">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.03]" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-2.5 w-1/3 bg-white/[0.05] rounded" />
                              <div className="h-2 w-5/6 bg-white/[0.03] rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredNotifications.length === 0 ? (
                      // Empty States
                      <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-600 mb-3">
                          <Bell size={18} />
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-300">All caught up!</h4>
                        <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                          {activeNotifTab === 'unread' ? 'You have no unread notifications.' : 'No notifications in this feed.'}
                        </p>
                      </div>
                    ) : (
                      // Active List Items
                      filteredNotifications.map((notif) => {
                        const icon = notifIcons[notif.type] || notifIcons.system;
                        const bgClass = notifBgColors[notif.type] || notifBgColors.system;

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`group p-3 rounded-xl border border-transparent transition-all flex gap-3 text-left relative cursor-pointer ${
                              notif.is_read 
                                ? 'hover:bg-white/[0.02] hover:border-white/[0.04]' 
                                : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Type Icon */}
                            <div className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center ${bgClass}`}>
                              {icon}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                                  {notif.title}
                                </span>
                                <span className="text-[9px] text-zinc-500 shrink-0 font-medium">
                                  {dayjs(notif.scheduled_for).fromNow()}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-normal line-clamp-3">
                                {notif.message}
                              </p>

                              {/* Rich Content: Image */}
                              {notif.image_url && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.04] bg-[#0c0c0c] max-h-24">
                                  <img 
                                    src={notif.image_url} 
                                    alt="Media content" 
                                    className="w-full h-full object-cover" 
                                    loading="lazy" 
                                  />
                                </div>
                              )}

                              {/* Rich Content: Action CTA Button */}
                              {notif.cta_text && notif.cta_url && (
                                <div className="pt-1.5 flex">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNotificationClick(notif);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/10 border border-white/[0.04] hover:border-white/[0.08] text-[9px] font-bold text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                  >
                                    {notif.cta_text}
                                    <Icon icon="solar:arrow-right-linear" width="10" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Unread dot indicator */}
                            {!notif.is_read && (
                              <div className="absolute right-3.5 top-3.5 w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Avatar trigger button & dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => {
              setAvatarDropdownOpen(!avatarDropdownOpen);
              setNotifDropdownOpen(false);
            }}
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
