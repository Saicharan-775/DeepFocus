import React from 'react';
import { motion } from 'framer-motion';

export default function PatternMastery() {
  return (
    <motion.div className="glass-card p-8 mb-8" whileHover={{ scale: 1.02 }}>
      <h2 className="text-xl font-bold text-white mb-4">Pattern Mastery</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#09090b]/50 rounded-xl border border-white/10">
          <p className="text-gray-400 text-sm">Algorithms Mastered</p>
          <p className="text-white text-2xl font-semibold">12</p>
        </div>
        <div className="p-4 bg-[#09090b]/50 rounded-xl border border-white/10">
          <p className="text-gray-400 text-sm">Current Streak</p>
          <p className="text-white text-2xl font-semibold">5 days</p>
        </div>
        <div className="p-4 bg-[#09090b]/50 rounded-xl border border-white/10">
          <p className="text-gray-400 text-sm">Accuracy</p>
          <p className="text-white text-2xl font-semibold">87%</p>
        </div>
      </div>
    </motion.div>
  );
}
