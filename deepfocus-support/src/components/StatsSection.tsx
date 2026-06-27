'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Coins, Flame, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Donation } from '@/types';

interface StatsSectionProps {
  initialStats: {
    totalSupporters: number;
    totalAmountRaised: number;
    latestDonation: Donation | null;
  };
}

export default function StatsSection({ initialStats }: StatsSectionProps) {
  const [totalSupporters, setTotalSupporters] = useState(initialStats.totalSupporters);
  const [totalAmount, setTotalAmount] = useState(initialStats.totalAmountRaised);
  const [latestDonation, setLatestDonation] = useState<Donation | null>(initialStats.latestDonation);

  const goalAmount = 50000;
  const progressPercent = Math.min(Math.round((totalAmount / goalAmount) * 100), 100);

  useEffect(() => {
    // Realtime subscription to automatically update statistics on new successful payments
    const channel = supabase
      .channel('realtime-donations-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        (payload) => {
          const oldRecord = payload.old as Donation;
          const newRecord = payload.new as Donation;

          // Case 1: New donation directly created as success (unlikely, but handled)
          if (payload.eventType === 'INSERT' && newRecord.status === 'success') {
            setTotalSupporters((prev) => prev + 1);
            setTotalAmount((prev) => prev + newRecord.amount);
            setLatestDonation(newRecord);
          }

          // Case 2: Donation updated from pending to success (standard signature verification flow)
          if (
            payload.eventType === 'UPDATE' &&
            oldRecord.status !== 'success' &&
            newRecord.status === 'success'
          ) {
            setTotalSupporters((prev) => prev + 1);
            setTotalAmount((prev) => prev + newRecord.amount);
            setLatestDonation(newRecord);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 mb-16">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {/* Total Supporters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 text-zinc-500 mb-3">
            <Users size={16} className="text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Supporters</span>
          </div>
          <div className="text-3xl font-black text-white">{totalSupporters}</div>
          <div className="text-xs text-zinc-500 mt-1">Developers backed DeepFocus</div>
        </motion.div>

        {/* Total Raised */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 text-zinc-500 mb-3">
            <Coins size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Amount Raised</span>
          </div>
          <div className="text-3xl font-black text-white">₹{totalAmount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-zinc-500 mt-1">Of ₹{goalAmount.toLocaleString('en-IN')} server goal</div>
        </motion.div>

        {/* Latest Donation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl p-5"
        >
          <div className="flex items-center gap-3 text-zinc-500 mb-3">
            <Flame size={16} className="text-rose-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Support</span>
          </div>
          <div className="text-lg font-bold text-white truncate">
            {latestDonation ? (
              latestDonation.anonymous ? (
                'Anonymous ❤️'
              ) : (
                latestDonation.name || 'Friend'
              )
            ) : (
              'Be the first! ❤️'
            )}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {latestDonation ? `Contributed ₹${latestDonation.amount}` : 'Awaiting developer support'}
          </div>
        </motion.div>
      </div>

      {/* Goal Progress Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="border border-white/[0.06] bg-[#0c0c0e]/40 backdrop-blur-md rounded-2xl p-6"
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Heart size={12} className="text-red-400 fill-red-400/20" /> Server Goal Progress
          </span>
          <span className="text-white">{progressPercent}%</span>
        </div>

        {/* Progress track */}
        <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.02]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400"
          />
        </div>

        <div className="flex justify-between text-[10px] text-zinc-500 font-bold mt-2">
          <span>₹0</span>
          <span>Goal: ₹{goalAmount.toLocaleString('en-IN')}</span>
        </div>
      </motion.div>
    </div>
  );
}
