'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SupportHero() {
  return (
    <div className="relative overflow-hidden pt-20 pb-12 text-center">
      {/* Background Ambient Radial Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[90px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-3xl mx-auto px-6 relative z-10"
      >
        {/* Heart Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 mb-6 backdrop-blur-md">
          <span>❤️</span> Indiedev Initiative
        </span>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
          Support{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400">
            DeepFocus
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          DeepFocus is built independently to help developers stay focused, master DSA, and prepare for interviews.
          Your support helps keep development, AI features, and servers running.
        </p>
      </motion.div>
    </div>
  );
}
