import React from 'react';
import { motion } from 'framer-motion';

export default function InsightsCard({ title, content }) {
  return (
    <motion.div className="glass-card p-6 mb-6" whileHover={{ y: -2 }}>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-300 text-sm">{content}</p>
    </motion.div>
  );
}
