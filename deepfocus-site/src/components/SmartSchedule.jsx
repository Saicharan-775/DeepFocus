import React from 'react';
import { motion } from 'framer-motion';

export default function SmartSchedule() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return (
    <motion.div className="glass-card p-8 mb-8" whileHover={{ scale: 1.02 }}>
      <h2 className="text-xl font-bold text-white mb-4">Weekly Schedule</h2>
      <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-400">
        {days.map((day, i) => (
          <div key={i} className="font-medium text-white">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mt-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-20 bg-[#09090b]/30 rounded-xl border border-white/10 flex items-center justify-center">
            <span className="text-gray-500">Add Session</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
