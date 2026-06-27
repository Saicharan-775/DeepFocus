'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Donation } from '@/types';

interface ContributorWallProps {
  initialSupporters: Donation[];
}

export default function ContributorWall({ initialSupporters }: ContributorWallProps) {
  const [supporters, setSupporters] = useState<Donation[]>(initialSupporters);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Realtime subscription to prepend new supporters instantly to the wall
    const channel = supabase
      .channel('realtime-contributors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        (payload) => {
          const oldRecord = payload.old as Donation;
          const newRecord = payload.new as Donation;

          if (payload.eventType === 'INSERT' && newRecord.status === 'success') {
            setSupporters((prev) => {
              if (prev.some((d) => d.id === newRecord.id)) return prev;
              return [newRecord, ...prev.slice(0, 29)];
            });
          }

          if (
            payload.eventType === 'UPDATE' &&
            oldRecord.status !== 'success' &&
            newRecord.status === 'success'
          ) {
            setSupporters((prev) => {
              if (prev.some((d) => d.id === newRecord.id)) return prev;
              return [newRecord, ...prev.slice(0, 29)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function getRelativeTime(utcString: string) {
    if (!mounted) return 'some time ago';
    const now = new Date();
    const created = new Date(utcString);
    const diffMs = now.getTime() - created.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 mb-24">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={18} className="text-amber-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Supporter Wall of Fame
        </h3>
      </div>

      {supporters.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <Sparkles className="h-6 w-6 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No supporters registered yet</p>
          <p className="text-xs text-zinc-500 mt-1">Be the first to keep development running!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {supporters.map((s, idx) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col justify-between border border-white/[0.06] bg-[#0c0c0e]/40 backdrop-blur-md rounded-xl p-4 hover:border-white/10 transition-colors"
              >
                <div>
                  {/* Name and Amount */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-bold text-zinc-200 truncate max-w-[120px]">
                      {s.anonymous ? 'Anonymous ❤️' : s.name || 'Friend'}
                    </span>
                    <span className="text-xs font-black text-violet-400 shrink-0 bg-violet-400/10 px-2 py-0.5 rounded">
                      ₹{s.amount}
                    </span>
                  </div>

                  {/* Optional Message */}
                  {s.message && (
                    <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-white/10 pl-2.5 my-3 break-words">
                      "{s.message}"
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2 text-right">
                  {getRelativeTime(s.created_at)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
