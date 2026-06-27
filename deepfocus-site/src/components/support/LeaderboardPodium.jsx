import React from "react";
import { Trophy, Crown, User } from "lucide-react";

export default function LeaderboardPodium({ loadingStats, top3, renderAvatar }) {
  return (
    <>
      {loadingStats ? (
        <div className="mb-12 border border-white/[0.04] bg-[#0E0E12]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden animate-pulse">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-center mb-8 flex items-center justify-center gap-2">
            <Trophy size={14} className="text-amber-400 animate-bounce" /> Hall of Fame Leaderboard
          </h3>
          <div className="grid grid-cols-3 gap-3 items-end max-w-sm mx-auto h-[160px] pb-2">
            {/* 2nd Place Slot Skeleton */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-12 mb-1.5" />
              <div className="h-2 bg-zinc-800 rounded w-8" />
              <div className="w-full bg-zinc-800/20 border border-dashed border-zinc-800/40 h-16 rounded-t-xl mt-2" />
            </div>
            {/* 1st Place Slot Skeleton */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-zinc-800 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-14 mb-1.5" />
              <div className="h-3 bg-zinc-850 rounded w-10" />
              <div className="w-full bg-zinc-800/30 border border-dashed border-zinc-800/50 h-24 rounded-t-2xl mt-2" />
            </div>
            {/* 3rd Place Slot Skeleton */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-12 mb-1.5" />
              <div className="h-2 bg-zinc-800 rounded w-8" />
              <div className="w-full bg-zinc-800/10 border border-dashed border-zinc-800/30 h-12 rounded-t-lg mt-2" />
            </div>
          </div>
        </div>
      ) : top3.length > 0 ? (
        <div className="mb-12 border border-white/[0.04] bg-[#0E0E12]/80 backdrop-blur-md rounded-[32px] p-6 relative overflow-hidden shadow-lg">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-center mb-8 flex items-center justify-center gap-2">
            <Trophy size={14} className="text-amber-400 animate-bounce" /> Hall of Fame Leaderboard
          </h3>
          <div className="grid grid-cols-3 gap-3 items-end max-w-sm mx-auto h-[160px] pb-2">
            {/* 2nd Place Slot */}
            {top3[1] ? (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="relative mb-2">
                  {renderAvatar(top3[1], "w-10 h-10 border border-zinc-500/40", 16)}
                  <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-zinc-650 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">2</span>
                </div>
                <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                  {top3[1].anonymous ? "Anonymous" : (top3[1].name || "Supporter")}
                </span>
                <span className="text-[10px] text-zinc-500 font-black">₹{top3[1].amount}</span>
                <div className="w-full bg-[#18181B]/60 border border-zinc-700/30 h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-400 text-xs font-bold shadow-md">2nd</div>
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-40">
                <div className="w-10 h-10 rounded-full border border-dashed border-zinc-600 flex items-center justify-center mb-2">
                  <User size={14} className="text-zinc-600" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">Claim 2nd</span>
                <div className="w-full border border-dashed border-white/[0.06] h-16 rounded-t-xl mt-2 flex items-center justify-center text-zinc-600 text-xs font-bold">Empty</div>
              </div>
            )}
            
            {/* 1st Place Slot */}
            {top3[0] ? (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="relative mb-2">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400">
                    <Crown size={14} className="animate-pulse" />
                  </div>
                  {renderAvatar(top3[0], "w-12 h-12 border-2 border-amber-400", 20)}
                  <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500 text-black border border-amber-400 rounded-full w-5 h-5 flex items-center justify-center font-black">1</span>
                </div>
                <span className="text-xs font-black text-white truncate max-w-[90px]">
                  {top3[0].anonymous ? "Anonymous" : (top3[0].name || "Supporter")}
                </span>
                <span className="text-xs font-black text-amber-400">₹{top3[0].amount}</span>
                <div className="w-full bg-gradient-to-t from-amber-600/20 to-amber-500/10 border border-amber-500/20 h-24 rounded-t-2xl mt-2 flex items-center justify-center text-amber-300 text-sm font-black shadow-[0_0_20px_rgba(245,158,11,0.15)]">1st</div>
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-40">
                <div className="w-12 h-12 rounded-full border border-dashed border-amber-500/50 flex items-center justify-center mb-2">
                  <Crown size={16} className="text-amber-500/50" />
                </div>
                <span className="text-[10px] font-bold text-amber-500/70">Claim 1st</span>
                <div className="w-full border border-dashed border-amber-500/30 h-24 rounded-t-2xl mt-2 flex items-center justify-center text-amber-500/50 text-sm font-black">Empty</div>
              </div>
            )}

            {/* 3rd Place Slot */}
            {top3[2] ? (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="relative mb-2">
                  {renderAvatar(top3[2], "w-10 h-10 border border-amber-600/30", 16)}
                  <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-800 border border-amber-800 rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">3</span>
                </div>
                <span className="text-xs font-bold text-zinc-300 truncate max-w-[80px]">
                  {top3[2].anonymous ? "Anonymous" : (top3[2].name || "Supporter")}
                </span>
                <span className="text-[10px] text-zinc-500 font-black">₹{top3[2].amount}</span>
                <div className="w-full bg-[#18181B]/40 border border-amber-900/20 h-12 rounded-t-lg mt-2 flex items-center justify-center text-amber-700 text-xs font-bold shadow-sm">3rd</div>
              </div>
            ) : (
              <div className="flex flex-col items-center opacity-40">
                <div className="w-10 h-10 rounded-full border border-dashed border-amber-700/50 flex items-center justify-center mb-2">
                  <User size={14} className="text-amber-700/40" />
                </div>
                <span className="text-[10px] font-bold text-amber-700/60">Claim 3rd</span>
                <div className="w-full border border-dashed border-white/[0.06] h-12 rounded-t-lg mt-2 flex items-center justify-center text-zinc-650 text-xs font-bold">Empty</div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
