import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getRevisionProblems } from '../services/revisionService';
import dayjs from 'dayjs';

export function useGamification() {
   const [stats, setStats] = useState({
      streak: 0,
      coins: 0,
      goldCoins: 0,
      silverCoins: 0,
      rank: 'Novice',
      badgesUnlocked: 0,
      totalBadges: 6,
      loading: true
   });

   useEffect(() => {
      async function loadStats() {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) {
            setStats(s => ({ ...s, loading: false }));
            return;
         }

         const [sRes, pRes] = await Promise.all([
            supabase.from('focus_sessions').select('*').eq('user_id', user.id),
            getRevisionProblems()
         ]);

         const problems = pRes || [];
         const sessions = sRes.data || [];

         // Advanced Focus Coins Algorithm (Perfect SaaS Logic)
         let totalCoins = 0;
         let goldCount = 0;
         let silverCount = 0;

         problems.forEach(p => {
            if (p.focus_status === 'Cheated') return; // Penalty: 0 coins
            
            // Exactly 1 coin per unique problem task
            totalCoins += 1; 
            
            // Perfect Logic: 
            // Excellent Focus (>= 80) OR Hard Difficulty = Gold Coin
            // Low Focus (< 80) = Silver Coin
            // Revising a low focus problem and doing it well upgrades the coin to Gold!
            if (p.focus_score >= 80 || (p.difficulty || '').toLowerCase().startsWith('h')) {
                goldCount++;
            } else {
                silverCount++;
            }
         });

         // Streak Calculation (Merging both problems and sessions to correctly update the streak on repeat practice)
         const activityMap = {};
         problems.forEach(p => {
            const dateKey = dayjs(p.created_at).format('YYYY-MM-DD');
            activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
         });
         sessions.forEach(s => {
            const dateKey = dayjs(s.start_time || s.created_at).format('YYYY-MM-DD');
            activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
         });

         let currentStreak = 0;
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
         const rank = problems.length >= 150 ? 'Guardian' : 
                      problems.length >= 50 ? 'Knight' : 
                      problems.length >= 15 ? 'Specialist' : 'Novice';

         // Badges Approximation (Quick sync with Insights logic)
         const hard = problems.filter(p => ((p.difficulty || '').startsWith('H') || (p.difficulty || '').toLowerCase() === 'hard')).length;
         
         let unlocked = 0;
         if (problems.length >= 1) unlocked++; // First Blood
         if (problems.length >= 50) unlocked++; // Grinder
         if (hard >= 10) unlocked++; // Architect
         if (currentStreak >= 7) unlocked++; // Unbreakable
         
         setStats({
            streak: currentStreak,
            coins: totalCoins,
            goldCoins: goldCount,
            silverCoins: silverCount,
            rank,
            badgesUnlocked: unlocked,
            totalBadges: 6,
            loading: false
         });
      }

      loadStats();
      
      const channel = supabase
        .channel('gamification_sync_nav')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'revision_problems' }, () => loadStats())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'focus_sessions' }, () => loadStats())
        .subscribe();
        
      return () => { supabase.removeChannel(channel); };
   }, []);

   return stats;
}
