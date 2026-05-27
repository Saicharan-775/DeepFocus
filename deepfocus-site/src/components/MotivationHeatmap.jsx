import React from 'react';
import { motion } from 'framer-motion';

export default function MotivationHeatmap() {
  // Placeholder heatmap; replace with real data integration later
  const days = Array.from({ length: 14 }, (_, i) => i + 1);
  return (
    <motion.div className="glass-card p-8 mb-8" whileHover={{ scale: 1.02 }}>
      <h2 className="text-xl font-bold text-white mb-4">Consistency Heatmap</h2>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day}
            className="w-full h-8 bg-[#09090b]/30 rounded" // placeholder color
          />
        ))}
      </div>
    </motion.div>
  );
}
