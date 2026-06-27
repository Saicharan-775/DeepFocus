import React from "react";
import { Users, Flame } from "lucide-react";

export default function MetricsPills({ loadingStats, totalSupporters, totalAmount }) {
  return (
    <div className="flex gap-4 mb-2">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E12]/50 border border-white/[0.04] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <Users size={14} className="text-violet-400" />
        {loadingStats ? (
          <div className="h-3 w-12 bg-zinc-800 animate-pulse rounded" />
        ) : (
          <span className="text-xs font-bold text-zinc-350 landing-copy">{totalSupporters} Supporters</span>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E0E12]/50 border border-white/[0.04] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        <Flame size={14} className="text-amber-400" />
        {loadingStats ? (
          <div className="h-3 w-16 bg-zinc-800 animate-pulse rounded" />
        ) : (
          <span className="text-xs font-bold text-zinc-350 landing-copy">₹{totalAmount.toLocaleString("en-IN")} Raised</span>
        )}
      </div>
    </div>
  );
}
