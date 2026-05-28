import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabaseClient';
import { getRevisionProblems } from '../services/revisionService';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeepFocusLoader from "../components/DeepFocusLoader";

/* ==========================================
   PREMIUM 3D-FEEL METALLIC SVG BADGES
   ========================================== */
const PremiumCoinIcon = ({ width = 20, className }) => (
  <svg width={width} height={width} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Rim */}
    <circle cx="12" cy="12" r="11" fill="#B45309"/>
    <circle cx="12" cy="12" r="10" fill="url(#lc-grad)"/>
    {/* Inner Rim */}
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FBBF24" strokeWidth="1"/>
    <circle cx="12" cy="12" r="6" fill="#D97706"/>
    <circle cx="12" cy="12" r="5" fill="url(#lc-inner-grad)"/>
    {/* Reflection highlights */}
    <path d="M7 7C8.5 5.5 10.5 4.5 12 4.5" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="lc-grad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FEF08A" />
        <stop offset="0.4" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="lc-inner-grad" x1="7" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#FEF08A" />
      </linearGradient>
    </defs>
  </svg>
);

const FirstBloodBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(184,115,51,0.2)]">
      <defs>
         <linearGradient id="bronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d5a176" />
            <stop offset="50%" stopColor="#b87333" />
            <stop offset="100%" stopColor="#804a00" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      {/* Outer shield boundary */}
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#bronze)" : "url(#metalDark)"} stroke={unlocked ? "#d5a176" : "#404040"} strokeWidth="2" />
      {/* Inner shield */}
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#804a00" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Sword element */}
      <path d="M50,20 L50,68 M44,30 L56,30" stroke={unlocked ? "url(#bronze)" : "#404040"} strokeWidth="4" strokeLinecap="round" />
      {/* Star element */}
      <polygon points="50,60 53,67 60,67 55,72 57,79 50,75 43,79 45,72 40,67 47,67" fill={unlocked ? "#ffffff" : "#404040"} />
   </svg>
);

const FocusMasterBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(139,92,246,0.2)]">
      <defs>
         <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#purpleGlow)" : "url(#metalDark)"} stroke={unlocked ? "#c084fc" : "#404040"} strokeWidth="2" />
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#6b21a8" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Target concentric rings */}
      <circle cx="50" cy="50" r="22" stroke={unlocked ? "url(#purpleGlow)" : "#404040"} strokeWidth="2.5" fill="none" />
      <circle cx="50" cy="50" r="14" stroke={unlocked ? "#ffffff" : "#404040"} strokeWidth="1.5" fill="none" />
      <circle cx="50" cy="50" r="5" fill={unlocked ? "#a855f7" : "#404040"} />
   </svg>
);

const TheGrinderBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(244,63,94,0.2)]">
      <defs>
         <linearGradient id="ruby" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#ruby)" : "url(#metalDark)"} stroke={unlocked ? "#fb7185" : "#404040"} strokeWidth="2" />
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#be123c" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Dimensional fire vector */}
      <path d="M50,22 C53,30 65,38 65,52 C65,62 57,68 50,68 C43,68 35,62 35,52 C35,42 42,32 50,22 Z" fill={unlocked ? "url(#ruby)" : "#404040"} />
      <path d="M50,35 C52,40 58,45 58,54 C58,60 54,64 50,64 C46,64 42,60 42,54 C42,47 46,42 50,35 Z" fill={unlocked ? "#ffffff" : "#555"} />
   </svg>
);

const ArchitectBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(251,191,36,0.2)]">
      <defs>
         <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#854d0e" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#gold)" : "url(#metalDark)"} stroke={unlocked ? "#fde047" : "#404040"} strokeWidth="2" />
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#854d0e" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Crown outline and peaks */}
      <path d="M30,62 L70,62 L75,38 L60,48 L50,30 L40,48 L25,38 Z" fill={unlocked ? "url(#gold)" : "#404040"} />
      <circle cx="50" cy="30" r="3" fill={unlocked ? "#ffffff" : "#666"} />
      <circle cx="25" cy="38" r="3" fill={unlocked ? "#ffffff" : "#666"} />
      <circle cx="75" cy="38" r="3" fill={unlocked ? "#ffffff" : "#666"} />
   </svg>
);

const UnbreakableBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(34,211,238,0.2)]">
      <defs>
         <linearGradient id="cyanStreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#cyanStreak)" : "url(#metalDark)"} stroke={unlocked ? "#67e8f9" : "#404040"} strokeWidth="2" />
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#0891b2" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Lightning bolt core */}
      <polygon points="52,20 32,46 48,46 44,76 66,42 50,42" fill={unlocked ? "url(#cyanStreak)" : "#404040"} />
   </svg>
);

const ConsistencyBadge = ({ unlocked }) => (
   <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_4px_10px_rgba(59,130,246,0.2)]">
      <defs>
         <linearGradient id="sapphire" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
         </linearGradient>
         <linearGradient id="metalDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#404040" />
            <stop offset="100%" stopColor="#1a1a1a" />
         </linearGradient>
      </defs>
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill={unlocked ? "url(#sapphire)" : "url(#metalDark)"} stroke={unlocked ? "#93c5fd" : "#404040"} strokeWidth="2" />
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#09090b" stroke={unlocked ? "#1d4ed8" : "#2a2a2a"} strokeWidth="1.5" />
      {/* Calendar grid/arches */}
      <rect x="32" y="32" width="36" height="36" rx="4" fill="none" stroke={unlocked ? "url(#sapphire)" : "#404040"} strokeWidth="3" />
      <line x1="32" y1="44" x2="68" y2="44" stroke={unlocked ? "url(#sapphire)" : "#404040"} strokeWidth="2" />
      <circle cx="41" cy="53" r="2.5" fill={unlocked ? "#ffffff" : "#404040"} />
      <circle cx="50" cy="53" r="2.5" fill={unlocked ? "#ffffff" : "#404040"} />
      <circle cx="59" cy="53" r="2.5" fill={unlocked ? "#ffffff" : "#404040"} />
      <circle cx="41" cy="61" r="2.5" fill={unlocked ? "#ffffff" : "#404040"} />
      <circle cx="50" cy="61" r="2.5" fill={unlocked ? "#ffffff" : "#404040"} />
   </svg>
);

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-xl bg-black/20 text-center w-full">
      <Icon icon="solar:history-bold-duotone" width="32" className="text-zinc-600 mb-2" />
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{message}</span>
    </div>
  );
}

export default function Analytics() {
   const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [data, setData] = useState({ sessions: [], problems: [] });
   const [loading, setLoading] = useState(true);
   const [hoveredDay, setHoveredDay] = useState(null);
   const [selectedBadge, setSelectedBadge] = useState(null);

   useEffect(() => {
      async function loadData() {
         const { data: { user: supabaseUser } } = await supabase.auth.getUser();
         if (!supabaseUser) return;
         setUser(supabaseUser);

         const [sRes, pRes] = await Promise.all([
            supabase.from('focus_sessions').select('*').eq('user_id', supabaseUser.id).order('start_time', { ascending: true }),
            getRevisionProblems()
         ]);

         setData({ sessions: sRes.data || [], problems: pRes || [] });
      }

      const init = async () => {
         setLoading(true);
         await loadData();
         setLoading(false);
      };

      init();

      const channel = supabase
        .channel('analytics_sync_profile')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => loadData())
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
   }, []);

   const intelligence = useMemo(() => {
      const { sessions, problems } = data;

      const solved = problems.length;
      const easy = problems.filter(p => ((p.difficulty || '').startsWith('E') || (p.difficulty || '').toLowerCase() === 'easy')).length;
      const med = problems.filter(p => ((p.difficulty || '').startsWith('M') || (p.difficulty || '').toLowerCase() === 'medium')).length;
      const hard = problems.filter(p => ((p.difficulty || '').startsWith('H') || (p.difficulty || '').toLowerCase() === 'hard')).length;
      const totalFocusTime = sessions.reduce((acc, s) => acc + (s.focus_duration || 0), 0);
      
      const avgFocusScore = (() => {
         const problemScores = problems.filter(p => p.focus_score !== undefined && p.focus_score !== null);
         if (problemScores.length > 0) {
            return Math.round(problemScores.reduce((acc, p) => acc + p.focus_score, 0) / problemScores.length);
         }
         if (sessions.length > 0) {
            return Math.round(sessions.reduce((acc, s) => acc + (s.focus_score || 0), 0) / sessions.length);
         }
         return 0;
      })();
      const tabSwitches = problems.reduce((acc, p) => acc + (p.switches || 0), 0);

      const activityMap = {};
      problems.forEach(p => {
         const dateKey = dayjs(p.created_at).format('YYYY-MM-DD');
         activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      });
      sessions.forEach(s => {
         const dateKey = dayjs(s.start_time || s.created_at).format('YYYY-MM-DD');
         activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      });

      // Gamification: Streak Calculation
      let currentStreak = 0;
      let maxStreak = 0;
      
      const ascDates = Object.keys(activityMap).sort((a, b) => new Date(a) - new Date(b));
      if (ascDates.length > 0) {
          let curr = 1;
          let max = 1;
          for (let i = 1; i < ascDates.length; i++) {
              const prevDate = dayjs(ascDates[i-1]);
              const currDate = dayjs(ascDates[i]);
              if (currDate.diff(prevDate, 'day') === 1) {
                  curr++;
                  max = Math.max(max, curr);
              } else if (currDate.diff(prevDate, 'day') > 1) {
                  curr = 1;
              }
          }
          maxStreak = max;
      }

      const today = dayjs().format('YYYY-MM-DD');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      if (activityMap[today] || activityMap[yesterday]) {
         let checkDate = activityMap[today] ? dayjs(today) : dayjs(yesterday);
         while (activityMap[checkDate.format('YYYY-MM-DD')]) {
             currentStreak++;
             checkDate = checkDate.subtract(1, 'day');
         }
      }

      // Rank Calculation
      const rankInfo = solved >= 150 ? { name: 'Guardian', color: 'text-rose-400', icon: 'solar:shield-user-bold-duotone' } : 
                       solved >= 50 ? { name: 'Knight', color: 'text-amber-400', icon: 'solar:shield-star-bold-duotone' } : 
                       solved >= 15 ? { name: 'Specialist', color: 'text-emerald-400', icon: 'solar:shield-check-bold-duotone' } : 
                       { name: 'Novice', color: 'text-zinc-400', icon: 'solar:shield-minimalistic-bold-duotone' };

      const cheatedProblems = problems
         .filter(p => p.focus_status === 'Cheated' || (p.switches || 0) >= 10)
         .sort((a, b) => (b.switches || 0) - (a.switches || 0))
         .slice(0, 4);

      // Trophy Room Badges
      const badges = [
         { id: 'first_blood', name: 'First Blood', description: 'Solve 1 Problem', component: FirstBloodBadge, unlocked: solved >= 1 },
         { id: 'focus_master', name: 'Focus Master', description: '90%+ Focus Score', component: FocusMasterBadge, unlocked: avgFocusScore >= 90 && solved >= 5 },
         { id: 'grinder', name: 'The Grinder', description: 'Solve 50 Problems', component: TheGrinderBadge, unlocked: solved >= 50 },
         { id: 'architect', name: 'Architect', component: ArchitectBadge, description: 'Solve 10 Hard', unlocked: hard >= 10 },
         { id: 'unbreakable', name: 'Unbreakable', component: UnbreakableBadge, description: '7 Day Streak', unlocked: currentStreak >= 7 },
         { id: 'consistency', name: 'Consistency', component: ConsistencyBadge, description: '30 Day Streak', unlocked: maxStreak >= 30 }
      ];

      // Advanced Focus Coins Algorithm (Perfect SaaS Logic)
      let totalCoins = 0;
      let goldCoins = 0;
      let silverCoins = 0;

      problems.forEach(p => {
         if (p.focus_status === 'Cheated') return; // Penalty: 0 coins
         
         // Exactly 1 coin per unique problem task
         totalCoins += 1; 
         
         // Perfect Logic: 
         // Excellent Focus (>= 80) OR Hard Difficulty = Gold Coin
         // Low Focus (< 80) = Silver Coin
         if (p.focus_score >= 80 || (p.difficulty || '').toLowerCase().startsWith('h')) {
             goldCoins++;
         } else {
             silverCoins++;
         }
      });

      return { solved, easy, med, hard, totalFocusTime, avgFocusScore, tabSwitches, cheatedProblems, activityMap, currentStreak, maxStreak, rankInfo, badges, xp: totalCoins, goldCoins, silverCoins };
   }, [data]);

   // Auto-show newly unlocked badges
   useEffect(() => {
      const unlockedBadges = intelligence.badges.filter(b => b.unlocked);
      if (unlockedBadges.length > 0) {
         try {
            const seenStr = localStorage.getItem('df_seen_badges');
            const seenBadges = seenStr ? JSON.parse(seenStr) : [];
            
            const newBadge = unlockedBadges.find(b => !seenBadges.includes(b.id));
            if (newBadge) {
               // Slight delay for dramatic effect after page load
               const timer = setTimeout(() => {
                  setSelectedBadge(newBadge);
                  seenBadges.push(newBadge.id);
                  localStorage.setItem('df_seen_badges', JSON.stringify(seenBadges));
               }, 600);
               return () => clearTimeout(timer);
            }
         } catch (e) {
            console.error("Failed to parse seen badges", e);
         }
      }
   }, [intelligence.badges]);

   // Solved circular calculations (LeetCode style center gauge)
   const totalCatalog = 1000;
   const radius = 58;
   const circumference = 2 * Math.PI * radius;
   
   // Segments calculations for exact LeetCode segmented circle style
   const easyRatio = intelligence.easy / totalCatalog;
   const medRatio = intelligence.med / totalCatalog;
   const hardRatio = intelligence.hard / totalCatalog;
   
   const easyLength = easyRatio * circumference;
   const medLength = medRatio * circumference;
   const hardLength = hardRatio * circumference;

    if (loading) return <DeepFocusLoader message="Rendering gamification profile..." />;

   return (
      <div className="max-w-[1400px] mx-auto space-y-8 text-zinc-100 font-['Inter',sans-serif] pb-20">
         
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ========================================================
               LEFT COLUMN: PROFILE PANEL (LeetCode-Style User details)
               ======================================================== */}
            <div className="lg:col-span-4 space-y-6">
               <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl relative shadow-2xl flex flex-col items-center text-center">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-violet-600/10 to-transparent rounded-t-2xl pointer-events-none" />
                  
                  {/* Large Profile Avatar */}
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border-2 border-white/10 flex items-center justify-center overflow-hidden mb-4 mt-4 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                     {user ? (
                        <span className="text-3xl font-extrabold text-white uppercase tracking-wider">
                           {user.email ? user.email[0] : 'N'}
                        </span>
                     ) : (
                        <span className="text-3xl font-extrabold text-white uppercase">U</span>
                     )}
                  </div>

                  <h2 className="text-lg font-bold text-white tracking-tight">{user ? user.email.split('@')[0] : 'Saicharan'}</h2>
                  <p className="text-zinc-500 text-xs font-semibold mt-1">{user?.email || 'nagillasaicharan775@gmail.com'}</p>

                  <div className="w-full h-px bg-white/5 my-6" />

                  {/* Streak Stats block */}
                  <div className="grid grid-cols-2 gap-4 w-full mb-6">
                     <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-center group hover:border-amber-400/20 transition-colors">
                        <Icon icon="solar:bolt-bold-duotone" width="20" className="text-amber-400 mx-auto mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Streak</span>
                        <div className="text-lg font-black text-white mt-0.5">{intelligence.currentStreak} Days</div>
                     </div>
                     <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-center group hover:border-amber-400/20 transition-colors relative">
                        <div className="absolute top-0 right-0 p-1 flex gap-1 z-10">
                           <div className="flex items-center gap-0.5" title="Gold Focus Coins">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#fbbf24]"></span>
                              <span className="text-[8px] font-bold text-amber-400">{intelligence.goldCoins}</span>
                           </div>
                           <div className="flex items-center gap-0.5" title="Silver Focus Coins">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shadow-[0_0_4px_#d4d4d8]"></span>
                              <span className="text-[8px] font-bold text-zinc-300">{intelligence.silverCoins}</span>
                           </div>
                        </div>
                        <PremiumCoinIcon width={24} className="mx-auto mb-2 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                        <div className="flex items-center justify-center gap-1">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Focus Coins</span>
                           <div className="group/tooltip relative inline-block">
                              <span className="cursor-help text-zinc-500 hover:text-zinc-300 transition-colors">
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"></path>
                                 </svg>
                              </span>
                              <div className="pointer-events-none absolute bottom-full right-[-25px] z-50 mb-2.5 w-[260px] translate-x-0 scale-95 rounded-xl border border-white/10 bg-[#09090b] p-3.5 text-left text-[9px] text-zinc-400 opacity-0 shadow-[0_10px_35px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-200 group-hover/tooltip:pointer-events-auto group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100">
                                 <div className="font-bold text-white mb-2.5 tracking-wider uppercase text-[9px] border-b border-white/5 pb-1">Focus Coins Rules</div>
                                 <div className="grid grid-cols-[78px_1fr] gap-x-2 gap-y-2 leading-relaxed">
                                    <span className="text-amber-400 font-bold whitespace-nowrap">Gold (1 Coin):</span>
                                    <span>Hard tasks OR Excellent Focus (≥ 80%).</span>
                                    
                                    <span className="text-zinc-300 font-bold whitespace-nowrap">Silver (1 Coin):</span>
                                    <span>Easy/Med tasks with low focus (&lt; 80%).</span>
                                    
                                    <span className="text-rose-400 font-bold whitespace-nowrap">0 Coins:</span>
                                    <span>Any session flagged with Cheated status.</span>
                                 </div>
                                 <div className="absolute top-full right-[28px] border-4 border-transparent border-t-[#09090b]"></div>
                              </div>
                           </div>
                        </div>
                        <div className="text-lg font-black text-white mt-0.5">{intelligence.xp}</div>
                     </div>
                  </div>

                  <div className="w-full flex items-center justify-between p-3 bg-black/60 border border-white/5 rounded-xl text-sm">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Focus Rank</span>
                     <div className="flex items-center gap-1.5">
                        <Icon icon={intelligence.rankInfo.icon} width="16" className={intelligence.rankInfo.color} />
                        <span className={`text-xs font-extrabold tracking-wider uppercase ${intelligence.rankInfo.color}`}>{intelligence.rankInfo.name}</span>
                     </div>
                  </div>

                  {/* Active Badges Shelf */}
                  <div className="w-full mt-6">
                     <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">
                        <span>Active Showcase</span>
                        <span>{intelligence.badges.filter(b => b.unlocked).length} Earned</span>
                     </div>
                     <div className="flex items-center justify-center gap-2 py-2 bg-black/20 border border-white/5 rounded-xl min-h-[64px]">
                        {intelligence.badges.filter(b => b.unlocked).slice(0, 4).map(b => (
                           <div 
                              key={b.id} 
                              title={b.name} 
                              onClick={() => setSelectedBadge(b)}
                              className="hover:scale-110 transition-transform cursor-pointer"
                           >
                              <b.component unlocked={true} />
                           </div>
                        ))}
                        {intelligence.badges.filter(b => b.unlocked).length === 0 && (
                           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">No active badges yet</span>
                        )}
                     </div>
                  </div>

               </div>

               {/* REQUIRES REVISION IN THE LEFT COLUMN TO FILL FREE SPACE */}
               {intelligence.cheatedProblems.length > 0 && (
                  <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl shadow-2xl">
                     <div className="flex items-center gap-3 mb-6">
                        <Icon icon="solar:danger-triangle-bold-duotone" width="20" className="text-rose-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Requires Revision</h3>
                     </div>
                     <div className="space-y-2">
                        {intelligence.cheatedProblems.map((p, i) => (
                           <a
                              key={i}
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between group py-3 px-4 border border-white/5 rounded-xl bg-black/40 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all shadow-sm"
                           >
                              <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white truncate pr-4 tracking-wide">{p.title || p.problem_name}</span>
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Review</span>
                           </a>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* ========================================================
               RIGHT COLUMN: REDESIGNED LEETCODE MAIN DASHBOARD
               ======================================================== */}
            <div className="lg:col-span-8 space-y-6">
               
               {/* 100% LEETCODE PROBLEM SOLVING CIRCULAR CARD */}
               <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl shadow-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Left Circle Segment */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center border-r border-white/5 pr-0 md:pr-8 py-4">
                     <div className="relative w-36 h-36 flex items-center justify-center">
                        {/* Premium Radial Glow behind center text */}
                        <div className="absolute w-24 h-24 bg-gradient-to-tr from-violet-600/5 to-amber-500/5 rounded-full blur-xl pointer-events-none" />

                        <svg className="absolute w-full h-full transform -rotate-90">
                           {/* Base Background Track Circle */}
                           <circle cx="72" cy="72" r={radius} fill="transparent" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="8" />
                           
                           {/* Easy solves segment (emerald-500) */}
                           {easyLength > 0 && (
                              <motion.circle
                                 cx="72"
                                 cy="72"
                                 r={radius}
                                 fill="transparent"
                                 stroke="#10b981"
                                 strokeWidth="8"
                                 strokeDasharray={`${easyLength} ${circumference - easyLength}`}
                                 strokeDashoffset="0"
                                 initial={{ strokeDashoffset: circumference }}
                                 animate={{ strokeDashoffset: 0 }}
                                 transition={{ duration: 1.2, ease: "easeOut" }}
                                 strokeLinecap="round"
                              />
                           )}
                           
                           {/* Medium solves segment (amber-500) */}
                           {medLength > 0 && (
                              <motion.circle
                                 cx="72"
                                 cy="72"
                                 r={radius}
                                 fill="transparent"
                                 stroke="#f59e0b"
                                 strokeWidth="8"
                                 strokeDasharray={`${medLength} ${circumference - medLength}`}
                                 strokeDashoffset={-easyLength}
                                 initial={{ strokeDashoffset: circumference }}
                                 animate={{ strokeDashoffset: -easyLength }}
                                 transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                                 strokeLinecap="round"
                              />
                           )}
                           
                           {/* Hard solves segment (rose-500) */}
                           {hardLength > 0 && (
                              <motion.circle
                                 cx="72"
                                 cy="72"
                                 r={radius}
                                 fill="transparent"
                                 stroke="#f43f5e"
                                 strokeWidth="8"
                                 strokeDasharray={`${hardLength} ${circumference - hardLength}`}
                                 strokeDashoffset={-(easyLength + medLength)}
                                 initial={{ strokeDashoffset: circumference }}
                                 animate={{ strokeDashoffset: -(easyLength + medLength) }}
                                 transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                 strokeLinecap="round"
                              />
                           )}
                        </svg>
                        
                        {/* 100% LeetCode Styled Center Text Gauge */}
                        <div className="flex flex-col items-center text-center relative z-10">
                           <span className="text-4xl font-black text-white tracking-tighter leading-none">{intelligence.solved}</span>
                           <div className="w-10 h-px bg-white/10 my-1.5" />
                           <span className="text-[10px] text-zinc-500 font-bold tracking-tight">/ {totalCatalog}</span>
                           <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-[0.2em] mt-1">Solved</span>
                        </div>
                     </div>
                  </div>

                  {/* Right Progress Bars Segment */}
                  <div className="md:col-span-7 space-y-4 py-2">
                     <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <span>Difficulty Arsenal</span>
                        <span>Total Solve Cap</span>
                     </div>
                     
                     {[
                        { label: 'Easy', val: intelligence.easy, cap: 300, color: 'bg-emerald-500', barColor: 'bg-emerald-500/10 border-emerald-500/20', textColor: 'text-emerald-400' },
                        { label: 'Medium', val: intelligence.med, cap: 450, color: 'bg-amber-500', barColor: 'bg-amber-500/10 border-amber-500/20', textColor: 'text-amber-400' },
                        { label: 'Hard', val: intelligence.hard, cap: 250, color: 'bg-rose-500', barColor: 'bg-rose-500/10 border-rose-500/20', textColor: 'text-rose-400' }
                     ].map((l, idx) => {
                        const ratio = Math.max(2, (l.val / l.cap) * 100);
                        return (
                           <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                 <span className={`${l.textColor} uppercase text-[10px] font-bold tracking-widest`}>{l.label}</span>
                                 <div className="flex items-baseline gap-1">
                                    <span className="text-white font-bold">{l.val}</span>
                                    <span className="text-[9px] text-zinc-600 font-bold">/ {l.cap}</span>
                                 </div>
                              </div>
                              <div className={`w-full h-2 rounded-full ${l.barColor} border overflow-hidden`}>
                                 <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ratio}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: idx * 0.1 }}
                                    className={`h-full rounded-full ${l.color}`}
                                 />
                              </div>
                           </div>
                        );
                     })}
                  </div>

               </div>

               {/* REAL-FEEL BADGES CABINET (Trophy Room grid of exact custom SVGs) */}
               <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <Icon icon="solar:cup-star-bold-duotone" width="20" className="text-amber-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Trophy Room</h3>
                     </div>
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                        {intelligence.badges.filter(b => b.unlocked).length} / 6 Unlocked
                     </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                     {intelligence.badges.map(b => (
                        <div
                           key={b.id}
                           onClick={() => b.unlocked && setSelectedBadge(b)}
                           className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2.5 transition-all duration-300
                              ${b.unlocked ? 'border-white/10 bg-black/40 hover:border-violet-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)] cursor-pointer' : 'border-white/5 bg-black/20 opacity-30'}
                           `}
                        >
                           <b.component unlocked={b.unlocked} />
                           <div>
                              <div className="text-[10px] font-extrabold text-white tracking-tight leading-tight mb-1">{b.name}</div>
                              <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider leading-none">{b.description}</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* YEARLY CONSISTENCY GRID */}
               <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl shadow-2xl relative">
                  <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                        <Icon icon="solar:calendar-date-bold-duotone" width="20" className="text-emerald-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Yearly Consistency</h3>
                     </div>
                     <div className="flex items-center gap-1 px-2 py-1 bg-black border border-white/5 rounded-md">
                        {[0.1, 0.4, 0.7, 1].map(v => (
                           <div key={v} className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: `rgba(16, 185, 129, ${v})` }} />
                        ))}
                     </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide w-full py-1">
                     <div className="grid grid-rows-7 grid-flow-col gap-[3.5px] h-28 min-w-[620px] relative">
                        {Array.from({ length: 364 }).map((_, i) => {
                           const date = dayjs().subtract(363 - i, 'day').format('YYYY-MM-DD');
                           const count = intelligence.activityMap[date] || 0;
                           const opacity = count === 0 ? 0.05 : (count === 1 ? 0.4 : (count === 2 ? 0.7 : 1));
                           return (
                              <motion.div
                                 key={i}
                                 className={`w-full h-full bg-emerald-500 rounded-[2px] ${count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                                 style={{ opacity }}
                                 whileHover={count > 0 ? { scale: 1.6, zIndex: 50, opacity: 1, boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)' } : {}}
                                 onMouseEnter={() => count > 0 && setHoveredDay({ date, count })}
                                 onMouseLeave={() => setHoveredDay(null)}
                              />
                           );
                        })}

                        <AnimatePresence>
                           {hoveredDay && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                 className="absolute -top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-[#000000] border border-white/10 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap"
                              >
                                 <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${hoveredDay.count > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-800'}`} />
                                    <div className="flex flex-col">
                                       <span className="text-[11px] font-bold text-white tracking-tight">
                                          {hoveredDay.count} {hoveredDay.count === 1 ? 'problem' : 'problems'} solved
                                       </span>
                                       <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {dayjs(hoveredDay.date).format('MMMM DD, YYYY')}
                                       </span>
                                    </div>
                                 </div>
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>
                  </div>
               </div>

                {/* RECENT ACTIVITY LOG */}
                <div className="p-6 border border-white/5 bg-[#09090b]/80 backdrop-blur-md rounded-2xl shadow-2xl">
                   <div className="flex items-center gap-3 mb-6">
                      <Icon icon="solar:history-bold-duotone" width="20" className="text-zinc-400" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recent Activity Log</h3>
                   </div>

                   {data.problems.length === 0 ? (
                      <EmptyState message="No recent activity logs available." />
                   ) : (
                      <div className="space-y-2">
                         {data.problems.slice(0, 5).map((p, i) => {
                            const diffColor = (p.difficulty || '').toLowerCase().startsWith('e')
                               ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10'
                               : (p.difficulty || '').toLowerCase().startsWith('m')
                                  ? 'text-amber-400 border-amber-400/20 bg-amber-400/10'
                                  : 'text-rose-400 border-rose-400/20 bg-rose-400/10';

                            return (
                               <a
                                  key={i}
                                  href={p.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between group py-3 px-4 border border-white/5 rounded-xl bg-black/40 hover:bg-white/[0.02] hover:border-white/10 transition-all"
                               >
                                  <div className="flex items-center gap-4 min-w-0">
                                     <div className={`w-2.5 h-2.5 rounded-full ${p.focus_status === 'Cheated' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : (p.focus_status === 'Solved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-700')}`} />
                                     <div className="text-xs font-bold text-zinc-300 group-hover:text-white truncate tracking-tight">{p.title || p.problem_name}</div>
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0">
                                     <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{dayjs(p.solved_at || p.created_at).format('DD MMM')}</div>
                                     <div className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-0.5 rounded border ${diffColor} opacity-90 group-hover:opacity-100 transition-opacity w-20 text-center`}>
                                        {p.difficulty}
                                     </div>
                                  </div>
                               </a>
                            );
                         })}
                      </div>
                   )}
                </div>
             </div>
          </div>
          {/* NEXT-LEVEL LEETCODE BADGE SHOWCASE ANIMATION MODAL */}
          <AnimatePresence>
             {selectedBadge && (
                <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="fixed inset-0 bg-[#000000]/95 backdrop-blur-[32px] z-[200] flex flex-col items-center justify-center overflow-hidden"
                >
                   {/* Local styles injection for cosmic premium shader and sparkles */}
                   <style dangerouslySetInnerHTML={{__html: `
                      @keyframes float-spark {
                         0% { transform: translateY(180px) scale(0.3) rotate(0deg); opacity: 0; }
                         15% { opacity: 0.8; }
                         85% { opacity: 0.8; }
                         100% { transform: translateY(-280px) scale(1.3) rotate(360deg); opacity: 0; filter: blur(0.5px); }
                      }
                      @keyframes pulse-glow {
                         0%, 100% { transform: scale(1); opacity: 0.6; filter: blur(60px); }
                         50% { transform: scale(1.1); opacity: 0.85; filter: blur(80px); }
                      }
                      @keyframes ring-spin {
                         0% { transform: rotate(0deg); }
                         100% { transform: rotate(360deg); }
                      }
                   `}} />

                   {/* Spotlight Background Column */}
                   <div className="absolute w-[300px] h-[550px] bg-gradient-to-b from-violet-600/5 via-amber-400/5 to-transparent blur-2xl opacity-60 pointer-events-none" />

                   {/* Sparkles / Cosmic Star Particles Container */}
                   <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center">
                      <div className="absolute w-80 h-[400px] bottom-1/4 pointer-events-none">
                         {Array.from({ length: 28 }).map((_, idx) => {
                            const size = Math.random() * 3 + 2;
                            const left = Math.random() * 80 + 10;
                            const delay = Math.random() * 2.5;
                            const duration = Math.random() * 2.5 + 2;
                            return (
                               <div
                                  key={idx}
                                  className="absolute rounded-full pointer-events-none"
                                  style={{
                                     width: size + 'px',
                                     height: size + 'px',
                                     left: left + '%',
                                     bottom: '0%',
                                     background: 'radial-gradient(circle, #fde047 0%, #a855f7 80%, transparent 100%)',
                                     boxShadow: '0 0 6px rgba(253,224,71,0.5), 0 0 12px rgba(168,85,247,0.5)',
                                     animation: 'float-spark ' + duration + 's ease-out ' + delay + 's infinite'
                                  }}
                               />
                            );
                         })}
                      </div>
                   </div>

                   {/* Premium Volumetric Spotlight Portal Rings behind the badge */}
                   <div className="absolute w-80 h-80 pointer-events-none flex items-center justify-center">
                      {/* Atmospheric Glow Aura */}
                      <div className="absolute w-48 h-48 bg-gradient-to-tr from-amber-500/20 to-violet-600/20 rounded-full opacity-70 animate-[pulse-glow_4s_infinite]" />

                      {/* Concentric Rotating Engineered Rings */}
                      <div 
                         className="absolute w-64 h-64 border border-violet-500/10 rounded-full" 
                         style={{ animation: 'ring-spin 16s linear infinite' }}
                      >
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400/40 shadow-[0_0_8px_#a855f7]" />
                      </div>
                      <div 
                         className="absolute w-72 h-72 border border-dashed border-amber-400/5 rounded-full" 
                         style={{ animation: 'ring-spin 24s linear infinite reverse' }}
                      >
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-400/40 shadow-[0_0_8px_#fde047]" />
                      </div>
                      <div 
                         className="absolute w-80 h-80 border border-white/5 rounded-full" 
                         style={{ animation: 'ring-spin 32s linear infinite' }}
                      />
                   </div>

                   {/* Golden Spinning Badge Showcase */}
                   <motion.div
                      initial={{ scale: 0.1, rotate: -720, y: 120, filter: 'brightness(0)' }}
                      animate={{ 
                         scale: 2.2, 
                         rotate: 0, 
                         y: -30, 
                         filter: 'brightness(1.1) drop-shadow(0 0 35px rgba(251,191,36,0.8))' 
                      }}
                      exit={{ scale: 0.1, rotate: 720, y: 120, opacity: 0 }}
                      transition={{ 
                         type: "spring", 
                         damping: 14, 
                         stiffness: 60, 
                         duration: 1.3 
                      }}
                      className="z-10 cursor-pointer"
                   >
                      <selectedBadge.component unlocked={true} />
                   </motion.div>

                   {/* Congrats Dialog Panel */}
                   <motion.div
                      initial={{ opacity: 0, y: 50, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 30, scale: 0.95 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="text-center max-w-sm mt-12 z-10 px-6 flex flex-col items-center"
                   >
                      <span className="text-[9px] font-extrabold tracking-[0.25em] text-amber-400 uppercase bg-amber-400/10 border border-amber-400/25 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                         Achievement Unlocked
                      </span>
                      <h2 className="text-3xl font-black text-white mt-4 tracking-tight leading-none drop-shadow-md">
                         {selectedBadge.name}
                      </h2>
                      <p className="text-zinc-400 text-[11px] font-medium mt-3 px-4 leading-relaxed">
                         {selectedBadge.description}
                      </p>
                      
                      <div className="flex items-center justify-center gap-6 mt-6 py-3 px-5 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-xl w-full">
                         <div className="text-center">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Date Earned</span>
                            <div className="text-xs font-black text-zinc-200 mt-0.5">17 May 2026</div>
                         </div>
                         <div className="w-px h-6 bg-white/10" />
                         <div className="text-center">
                             <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Bonus Reward</span>
                             <div className="text-xs font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                                +1 Gold Coin <PremiumCoinIcon width={12} />
                             </div>
                         </div>
                      </div>

                      <button
                         onClick={() => setSelectedBadge(null)}
                         className="w-full mt-6 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-[10px] uppercase tracking-[0.25em] shadow-[0_8px_25px_rgba(245,158,11,0.25)] active:scale-[0.97] hover:scale-[1.015] transition-all duration-300 cursor-pointer flex items-center justify-center border border-amber-400/20"
                      >
                         <span>CLAIM REWARD</span>
                      </button>
                   </motion.div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    );
 }
