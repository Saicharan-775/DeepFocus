import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, BookOpen, AlertTriangle, Megaphone, Info, X } from 'lucide-react';

const icons = {
  system: <Info size={18} className="text-blue-400" />,
  feature: <Sparkles size={18} className="text-emerald-400" />,
  achievement: <Trophy size={18} className="text-amber-400" />,
  revision: <BookOpen size={18} className="text-violet-400" />,
  warning: <AlertTriangle size={18} className="text-rose-400" />,
  announcement: <Megaphone size={18} className="text-cyan-400" />,
};

const borderColors = {
  system: 'border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]',
  feature: 'border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
  achievement: 'border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]',
  revision: 'border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.1)]',
  warning: 'border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)]',
  announcement: 'border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]',
};

const progressColors = {
  system: 'bg-blue-500',
  feature: 'bg-emerald-500',
  achievement: 'bg-amber-500',
  revision: 'bg-violet-500',
  warning: 'bg-rose-500',
  announcement: 'bg-cyan-500',
};

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || icons.system;
          const borderClass = borderColors[toast.type] || borderColors.system;
          const progressClass = progressColors[toast.type] || progressColors.system;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 100, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto flex gap-3 bg-zinc-950/85 backdrop-blur-md border ${borderClass} rounded-2xl p-4 overflow-hidden relative`}
            >
              {/* Icon Section */}
              <div className="flex-shrink-0 mt-0.5">
                {Icon}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-xs font-semibold text-zinc-100 truncate">
                  {toast.title}
                </h4>
                <p className="mt-1 text-[11px] text-zinc-400 leading-normal line-clamp-3">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-1 self-start rounded-lg hover:bg-white/5 active:scale-95 cursor-pointer"
              >
                <X size={14} />
              </button>

              {/* Premium Progress Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 ${progressClass}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
