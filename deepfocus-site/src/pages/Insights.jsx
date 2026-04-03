import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import DashboardNav from '../components/DashboardNav';
import { supabase } from '../lib/supabaseClient';
import { getRevisionProblems } from '../services/revisionService';

// Simple, clear color scheme
const COLORS = {
   easy: '#10b981',   // Green
   med: '#f59e0b',    // Orange
   hard: '#f43f5e',   // Red
   primary: '#6366f1' // Indigo
};

const TARGETS = { easy: 300, med: 450, hard: 250 };

// Straightforward resources
const TOPIC_RESOURCES = {
   'Sliding Window': { title: 'Sliding Window Guide', icon: 'solar:window-frame-bold-duotone' },
   'Two Pointers': { title: 'Two Pointers Pattern', icon: 'solar:cursor-square-bold-duotone' },
   'Linked Lists': { title: 'Linked List Basics', icon: 'solar:link-bold-duotone' },
   'Trees & Graphs': { title: 'Tree Traversal', icon: 'solar:diagram-down-bold-duotone' },
   'Binary Search': { title: 'Binary Search Intro', icon: 'solar:magnifer-bold-duotone' },
   'Dynamic Programming': { title: 'DP Explained', icon: 'solar:database-bold-duotone' },
   'Arrays & Hashing': { title: 'Arrays & Hashing', icon: 'solar:hashtag-bold-duotone' },
   'General Logic': { title: 'Solving Common Patterns', icon: 'solar:cpu-bold-duotone' }
};

const EmptyState = ({ message }) => (
   <div className="flex flex-col items-center justify-center p-12 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[40px] group">
      <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center text-white/10 mb-6 group-hover:scale-110 transition-transform">
         <Icon icon="solar:database-bold-duotone" width="32" />
      </div>
      <h4 className="text-white/40 font-bold mb-2 tracking-tight">Data Syncing...</h4>
      <p className="text-white/20 text-sm max-w-[200px] leading-relaxed">
         Keep solving problems and your {message} will show up here.
      </p>
   </div>
);

export default function Insights() {
   const [data, setData] = useState({ sessions: [], problems: [] });
   const [loading, setLoading] = useState(true);
   const [hoveredDay, setHoveredDay] = useState(null);

   useEffect(() => {
      (async () => {
         setLoading(true);
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const [sRes, pRes] = await Promise.all([
            supabase.from('focus_sessions').select('*').eq('user_id', user.id).order('start_time', { ascending: true }),
            getRevisionProblems()
         ]);

         setData({ sessions: sRes.data || [], problems: pRes || [] });
         setLoading(false);
      })();
   }, []);

   const intelligence = useMemo(() => {
      const { sessions, problems } = data;

      // SYNC WITH LOCAL STORAGE (Mastered/Ticked Problems)
      const masteredIds = JSON.parse(localStorage.getItem('df_mastered') || '[]');
      const masteredProblems = problems.filter(p => masteredIds.includes(p.id));

      const stats = {
         solved: masteredProblems.length,
         easy: masteredProblems.filter(p => ((p.difficulty || '').startsWith('E') || (p.difficulty || '').toLowerCase() === 'easy')).length,
         med: masteredProblems.filter(p => ((p.difficulty || '').startsWith('M') || (p.difficulty || '').toLowerCase() === 'medium')).length,
         hard: masteredProblems.filter(p => ((p.difficulty || '').startsWith('H') || (p.difficulty || '').toLowerCase() === 'hard')).length,
         totalFocusTime: sessions.reduce((acc, s) => acc + (s.focus_duration || 0), 0),
         // AGGREGATE SCORES FROM PROBLEMS (Most Reliable)
         avgFocusScore: (() => {
            const problemScores = problems.filter(p => p.focus_score !== undefined && p.focus_score !== null);
            if (problemScores.length > 0) {
               return Math.round(problemScores.reduce((acc, p) => acc + p.focus_score, 0) / problemScores.length);
            }
            if (sessions.length > 0) {
               return Math.round(sessions.reduce((acc, s) => acc + (s.focus_score || 0), 0) / sessions.length);
            }
            return 0;
         })(),
         tabSwitches: problems.reduce((acc, p) => acc + (p.switches || 0), 0)
      };

      // REAL DATA ACTIVITY MAP (LeetCode Style)
      const activityMap = {};
      problems.forEach(p => {
         const dateKey = dayjs(p.solved_at || p.created_at).format('YYYY-MM-DD');
         activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
      });

      const cheatedProblems = problems
         .filter(p => p.focus_status === 'Cheated' || (p.switches || 0) >= 10)
         .sort((a, b) => (b.switches || 0) - (a.switches || 0))
         .slice(0, 4);

      return { ...stats, cheatedProblems, activityMap };
   }, [data]);

   if (loading) return (
      <div className="min-h-screen bg-black flex items-center justify-center font-['Inter',sans-serif]">
         <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
   );

   return (
      <div className="min-h-screen bg-black text-[#fafafa] pb-32 pt-28 font-['Inter',sans-serif] selection:bg-white selection:text-black">
         <DashboardNav />

         <main className="max-w-[1200px] mx-auto px-8 relative z-10">

            <header className="mb-16 border-b border-[#111] pb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
               <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/5 px-3 py-1 border border-white/5 rounded">Insights</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-white">My Summary</h1>
                  <p className="text-[#666] font-medium max-w-lg text-sm tracking-tight">
                     See how much you've solved and how well you've focused.
                  </p>
               </div>

               <div className="flex items-center gap-6 text-[10px] font-bold text-[#666] uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     <span>Data is up to date</span>
                  </div>
               </div>
            </header>

            {/* YEARLY PROGRESS (LEETCODE STYLE) */}
            <section className="mb-12 relative">
               <div className="p-8 border border-[#111] bg-black relative">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-[#444]">Yearly Progress</h3>
                     <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.02] border border-white/5 rounded-md">
                        {[0.1, 0.4, 0.7, 1].map(v => (
                           <div key={v} className="w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: `rgba(16, 185, 129, ${v})` }} />
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-[repeat(53,1fr)] gap-1 h-24 relative">
                     {Array.from({ length: 364 }).map((_, i) => {
                        const date = dayjs().subtract(363 - i, 'day').format('YYYY-MM-DD');
                        const count = intelligence.activityMap[date] || 0;
                        const opacity = count === 0 ? 0.05 : (count === 1 ? 0.4 : (count === 2 ? 0.7 : 1));
                        return (
                           <motion.div
                              key={i}
                              className={`w-full bg-[#10b981] rounded-[1px] ${count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                              style={{ opacity }}
                              whileHover={count > 0 ? { scale: 1.3, zIndex: 50, opacity: 1, boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)' } : {}}
                              onMouseEnter={() => count > 0 && setHoveredDay({ date, count })}
                              onMouseLeave={() => setHoveredDay(null)}
                           />
                        );
                     })}

                     {/* Custom Tooltip */}
                     <AnimatePresence>
                        {hoveredDay && (
                           <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              className="absolute -top-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-[#0b0b0d] border border-white/10 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap"
                           >
                              <div className="flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full ${hoveredDay.count > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-[#222]'}`} />
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-white tracking-tight">
                                       {hoveredDay.count} {hoveredDay.count === 1 ? 'problem' : 'problems'} solved
                                    </span>
                                    <span className="text-[9px] font-bold text-[#444] uppercase tracking-wider">
                                       {dayjs(hoveredDay.date).format('MMMM DD, YYYY')}
                                    </span>
                                 </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </section>
            {/* KEY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-12 border border-[#111] divide-x divide-[#111]">
               {[
                  { label: 'Focus Score', val: `${intelligence.avgFocusScore}%`, color: 'text-amber-500' },
                  { label: 'Total Solved', val: intelligence.solved, color: 'text-emerald-500' },
                  { label: 'Tab Switches', val: intelligence.tabSwitches, color: 'text-rose-500' }
               ].map((s, i) => (
                  <div key={i} className="p-8 bg-black group hover:bg-white/[0.01] transition-colors">
                     <div className="text-[10px] font-bold text-[#444] uppercase tracking-widest mb-4 group-hover:text-white transition-colors">{s.label}</div>
                     <div className={`text-4xl font-bold tracking-tighter ${s.color}`}>{s.val}</div>
                  </div>
               ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

               {/* LEFT: PROGRESS */}
               <div className="lg:col-span-8 p-10 border border-[#111] bg-black flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-12">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-[#444]">Problem Counts</h3>
                  </div>

                  {intelligence.solved === 0 ? (
                     <div className="h-64 flex items-center justify-center">
                        <EmptyState message="your stats" />
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-end">
                        {[
                           { label: 'Easy', val: intelligence.easy, cap: 300, color: '#10b981' },
                           { label: 'Medium', val: intelligence.med, cap: 450, color: '#f59e0b' },
                           { label: 'Hard', val: intelligence.hard, cap: 250, color: '#f43f5e' }
                        ].map((lvl, i) => (
                           <div key={i} className="space-y-6 group">
                              <div className="h-64 bg-white/[0.01] border border-[#111] relative overflow-hidden flex items-end">
                                 <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(lvl.val / lvl.cap) * 100}%` }}
                                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="w-full relative"
                                    style={{ backgroundColor: lvl.color, opacity: 0.2 }}
                                 />
                                 <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: lvl.color }} />
                              </div>
                              <div className="space-y-1">
                                 <div className="text-[10px] font-bold text-[#444] uppercase tracking-widest group-hover:text-white transition-colors">{lvl.label}</div>
                                 <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-white tracking-tighter">{lvl.val}</span>
                                    <span className="text-[10px] text-[#222] font-bold uppercase">/ {lvl.cap}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

               {/* RIGHT: STABILITY */}
               <div className="lg:col-span-4 p-10 border border-[#111] bg-black flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#444] mb-10">Needs Revision</h3>

                  {intelligence.cheatedProblems.length === 0 ? (
                     <EmptyState message="no issues found" />
                  ) : (
                     <div className="flex-1 space-y-1">
                        {intelligence.cheatedProblems.map((p, i) => (
                           <a
                              key={i}
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between group py-3 px-3 border-b border-[#111] last:border-0 hover:bg-rose-500/[0.03] transition-colors"
                           >
                              <span className="text-xs font-medium text-[#888] group-hover:text-white truncate pr-4">{p.title || p.problem_name}</span>
                              <div className="flex items-center gap-2">
                                 <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10">Retry</span>
                              </div>
                           </a>
                        ))}
                     </div>
                  )}

                  <div className="mt-8 p-5 bg-white/[0.01] border border-[#111]">
                     <p className="text-[9px] text-[#444] leading-relaxed font-bold uppercase tracking-widest italic">
                        RE-SOLVE THESE TO REMEMBER THE LOGIC BETTER.
                     </p>
                  </div>
               </div>

               {/* ACTIVITY LOG */}
               <div className="lg:col-span-12 p-10 border border-[#111] bg-black">
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-[#444]">Recent Added</h3>
                  </div>

                  {data.problems.length === 0 ? (
                     <EmptyState message="no activity" />
                  ) : (
                     <div className="space-y-0 divide-y divide-[#111]">
                        {data.problems.slice(0, 8).map((p, i) => {
                           const diffColor = (p.difficulty || '').toLowerCase().startsWith('e')
                              ? 'text-emerald-500'
                              : (p.difficulty || '').toLowerCase().startsWith('m')
                                 ? 'text-amber-500'
                                 : 'text-rose-500';

                           return (
                              <a
                                 key={i}
                                 href={p.link}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="flex items-center justify-between group py-4 hover:bg-white/[0.01] transition-all px-3"
                              >
                                 <div className="flex items-center gap-6 min-w-0">
                                    <div className={`w-1 h-1 rounded-full ${p.focus_status === 'Cheated' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : (p.focus_status === 'Solved' ? 'bg-emerald-500' : 'bg-[#222]')}`} />
                                    <div className="truncate">
                                       <div className="text-sm font-medium text-[#888] group-hover:text-white truncate tracking-tight">{p.title || p.problem_name}</div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-12">
                                    <div className="text-[10px] text-[#444] font-bold uppercase tracking-widest">{dayjs(p.solved_at || p.created_at).format('DD MMM')}</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-[0.2em] w-20 text-right ${diffColor} opacity-80 group-hover:opacity-100 transition-opacity`}>
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
         </main>
      </div>
   );
}