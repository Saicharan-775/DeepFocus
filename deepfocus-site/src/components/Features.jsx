import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

const roasts = [
    "Oh, opening solutions again? Bold strategy.",
    "ChatGpt won't attend your interview.",
    "Interesting… cheating already?",
    "Ah yes, the famous copy-paste algorithm.",
    "Your future interviewer is disappointed.",
    "Reading solutions ≠ solving problems.",
    "Did your brain crash or what?",
    "Even ChatGPT wants you to try first.",
];

export default function Features() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % roasts.length);
        }, 3200 + Math.random() * 800); // dynamic feel

        return () => clearInterval(interval);
    }, []);

    return (
        <section id="features" className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Heading */}
                <div className="mb-16">
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-4">
                        Built for discipline.
                    </h2>
                    <p className="text-base text-gray-400">
                        Everything you need to force yourself to think.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Solution Blocker */}
                    <div className="glass-card md:col-span-2 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                <Icon icon="solar:shield-warning-linear" width="24" className="text-white" />
                            </div>

                            <h3 className="text-xl font-medium text-white mb-2 tracking-tight">
                                Solution & Editorial Blocker
                            </h3>

                            <p className="text-sm text-gray-400 max-w-md">
                                DeepFocus physically removes the Solutions tab and hides related topics until
                                your timer runs out or you submit a working solution.
                            </p>
                        </div>

                        {/* Improved Floating UI */}
                        <div className="absolute -right-10 -bottom-10 w-2/3 h-52 rounded-tl-2xl p-4 
              bg-black/60 backdrop-blur-xl border border-white/10 
              shadow-[0_0_40px_rgba(255,0,0,0.08)]
              transition-all duration-500 
              group-hover:-translate-y-3 group-hover:-translate-x-3">

                            <div className="flex gap-4 border-b border-white/10 pb-3 text-xs font-medium text-gray-500">
                                <span className="text-white">Description</span>
                                <span className="text-red-400 opacity-60 line-through">Editorial</span>
                                <span className="text-red-400 opacity-60 line-through">Solutions</span>
                            </div>

                            <div className="mt-4 flex flex-col items-center justify-center h-24 
                bg-red-500/5 rounded-lg border border-red-500/20 relative overflow-hidden">

                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-red-500/10 blur-xl animate-pulse" />

                                <span className="text-xs text-red-400 flex items-center gap-2 z-10">
                                    <Icon icon="solar:lock-linear" />
                                    Locked for 15:00
                                </span>

                                <span className="text-[10px] text-gray-500 mt-1 z-10">
                                    Focus mode active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Paste Protection */}
                    <div className="glass-card p-8 rounded-3xl">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                            <Icon icon="solar:magic-stick-3-linear" width="24" className="text-white" />
                        </div>

                        <h3 className="text-xl font-medium text-white mb-2 tracking-tight">
                            Paste Protection
                        </h3>

                        <p className="text-sm text-gray-400">
                            Prevents pasting code larger than 3 lines into the editor. You must type it to
                            build muscle memory.
                        </p>
                    </div>

                    {/* Roast Mode */}
                    <div className="glass-card p-8 rounded-3xl">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                            <Icon icon="solar:ghost-linear" width="24" className="text-white" />
                        </div>

                        <h3 className="text-xl font-medium text-white mb-2 tracking-tight">
                            Roast Mode
                        </h3>

                        <p className="text-sm text-gray-400 mb-6">
                            Attempts to cheat trigger humorous notifications to guilt you back to work.
                        </p>

                        <div className="relative h-[60px] overflow-hidden">
                            <div key={index} className="absolute w-full animate-toast">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-start gap-3 shadow-lg backdrop-blur-md">
                                    <Icon
                                        icon="solar:bell-bing-linear"
                                        width="16"
                                        className="text-yellow-500 mt-0.5"
                                    />
                                    <span className="text-xs text-gray-300 font-medium">
                                        {roasts[index]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revision Sheet */}
                    <div className="glass-card md:col-span-2 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                                <Icon icon="solar:chart-square-linear" width="24" className="text-white" />
                            </div>

                            <h3 className="text-xl font-medium text-white mb-2 tracking-tight">
                                Automated Revision Sheet
                            </h3>

                            <p className="text-sm text-gray-400 max-w-md">
                                Failed to solve it purely? Tabbed out? DeepFocus logs the problem and schedules
                                it for revision automatically.
                            </p>
                        </div>

                        <div className="mt-8 border border-white/10 rounded-xl overflow-hidden bg-black/50">
                            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-gray-500 font-medium">
                                <div className="w-1/3">Problem</div>
                                <div className="w-1/3">Trigger</div>
                                <div className="w-1/3 text-right">Status</div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 text-xs border-b border-white/5">
                                <div className="w-1/3 text-white">Valid Anagram</div>
                                <div className="w-1/3">
                                    <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded">
                                        Low Focus
                                    </span>
                                </div>
                                <div className="w-1/3 text-right text-gray-500">
                                    Add to queue
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 text-xs">
                                <div className="w-1/3 text-white">LRU Cache</div>
                                <div className="w-1/3">
                                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">
                                        Tab Switch
                                    </span>
                                </div>
                                <div className="w-1/3 text-right text-gray-500">
                                    Add to queue
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}