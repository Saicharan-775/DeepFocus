import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

const roasts = [
    "Oh, opening solutions again? Bold strategy.",
    "ChatGPT won't hold your hand in the interview.",
    "Interesting… giving up after 45 seconds?",
    "Ah yes, the famous 'copy-paste' algorithm.",
    "Your future interviewer is already disappointed.",
    "Is 'looking up the answer' your primary programming language?",
    "StackOverflow can't save you from a whiteboard.",
    "I've seen faster processors on a toaster. Keep trying.",
    "Did you just tab out? My disappointment is immeasurable.",
    "Ah, seeking external validation from an AI. Classic.",
];

const initialProblems = [
    { id: 1, title: "LRU Cache", pattern: "Design", tag: "Tab Switch", color: "amber" },
    { id: 2, title: "Two Sum", pattern: "Hash Map", tag: "Low Focus", color: "rose" },
];

export default function Features() {
    const [index, setIndex] = useState(0);
    const [problems, setProblems] = useState(initialProblems);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % roasts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setProblems(prev => {
                if (prev.length >= 3) {
                    return [initialProblems[0], initialProblems[1]];
                }
                return [
                    { id: Date.now(), title: "Merge Intervals", pattern: "Sorting", tag: "Timeout", color: "purple" },
                    ...prev
                ];
            });
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const containerVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
    };

    return (
        <section id="features" className="py-16 md:py-24 px-6 relative z-10 overflow-hidden bg-[#07070b]">
            {/* Ambient Lighting & Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-60 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_18%,transparent_100%)] pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-[800px] h-[500px] bg-violet-600/16 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[400px] bg-indigo-600/16 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-[12%] right-[8%] w-[420px] h-[300px] bg-cyan-500/8 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="mb-20 text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.055] border border-white/[0.12] backdrop-blur-md mb-8">
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                                Premium Tooling
                            </span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6 leading-[1.1]">
                            Engineered for focus.
                        </h2>
                        <p className="text-lg md:text-xl text-zinc-300/85 leading-relaxed font-light">
                            DeepFocus forces deep work by stripping away shortcuts. A disciplined environment built for real problem solvers.
                        </p>
                    </motion.div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* 1. HERO CARD — Total Solution Lockdown */}
                        <motion.div 
                            variants={itemVariants} 
                            className="md:col-span-12 lg:col-span-8 min-h-[24rem] rounded-[32px] p-8 md:p-10 relative overflow-hidden group border border-white/[0.1] hover:border-violet-400/35 transition-all duration-500 bg-gradient-to-b from-white/[0.055] to-white/[0.025] backdrop-blur-xl flex flex-col md:flex-row gap-10 shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="relative z-10 md:w-2/5 flex flex-col">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Icon icon="solar:lock-password-linear" width="24" className="text-violet-400" />
                                </div>
                                <h3 className="text-3xl font-medium text-white mb-4 tracking-tight">
                                    Total Solution Lockdown
                                </h3>
                                <p className="text-zinc-300/82 text-lg leading-relaxed font-light">
                                    The Solutions tab is physically removed and visually blocked until the timer expires. You have no choice but to think.
                                </p>
                            </div>

                            <div className="relative z-10 flex-1 md:-mr-16 md:-mb-16 mt-6 md:mt-0">
                                {/* Editor Mockup */}
                                <div className="w-full h-full min-h-[250px] bg-[#0c0c0c] rounded-tl-3xl border-t border-l border-white/[0.08] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-700 ease-out">
                                    {/* Editor Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-[#111]">
                                        <div className="flex gap-5 text-[13px] font-medium text-zinc-500">
                                            <span>Description</span>
                                            <span className="text-white border-b-2 border-white pb-4 -mb-[17px]">Solutions</span>
                                            <span>Submissions</span>
                                        </div>
                                    </div>
                                    {/* Editor Content */}
                                    <div className="p-6 relative h-full">
                                        <div className="space-y-4 font-mono text-xs text-zinc-600">
                                            <div className="w-3/4 h-3 bg-white/[0.03] rounded" />
                                            <div className="w-1/2 h-3 bg-white/[0.03] rounded" />
                                            <div className="w-5/6 h-3 bg-white/[0.03] rounded" />
                                            <div className="w-2/3 h-3 bg-white/[0.03] rounded" />
                                        </div>

                                        {/* Overlay Lockdown */}
                                        <div className="absolute inset-0 backdrop-blur-md bg-black/70 flex flex-col items-center justify-center border-t border-white/[0.05]">
                                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-4">
                                                <Icon icon="solar:lock-bold" className="text-rose-500 text-3xl" />
                                            </div>
                                            <div className="text-4xl font-mono font-semibold text-white tracking-tight mb-2">
                                                14:32
                                            </div>
                                            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-[0.2em]">Focus Mode Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 2. Paste Protection */}
                        <motion.div 
                            variants={itemVariants} 
                            className="md:col-span-6 lg:col-span-4 min-h-[24rem] rounded-[32px] p-8 md:p-10 border border-white/[0.1] hover:border-amber-400/35 transition-all duration-500 bg-gradient-to-b from-white/[0.055] to-white/[0.025] backdrop-blur-xl flex flex-col relative overflow-hidden group shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                <Icon icon="solar:magic-stick-3-linear" width="24" className="text-amber-400" />
                            </div>
                            <h3 className="text-3xl font-medium text-white mb-4 tracking-tight relative z-10">
                                Paste Protection
                            </h3>
                            <p className="text-zinc-300/82 text-lg leading-relaxed font-light relative z-10 mb-8">
                                Block copy-pasting of large code blocks. Build pure muscle memory.
                            </p>

                            <div className="mt-auto relative z-10 h-32 flex items-center justify-center">
                                {/* Shortcut Visualization */}
                                <div className="absolute w-full flex justify-center gap-3 opacity-30 group-hover:opacity-0 transition-opacity duration-500">
                                    <div className="px-5 py-4 rounded-xl border border-white/20 bg-white/5 font-mono text-lg text-white shadow-lg">⌘</div>
                                    <div className="px-5 py-4 rounded-xl border border-white/20 bg-white/5 font-mono text-lg text-white shadow-lg">V</div>
                                </div>
                                {/* Blocked Modal Mockup */}
                                <div className="absolute w-[115%] p-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-xl shadow-2xl flex items-start gap-4 transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                                    <Icon icon="solar:shield-cross-bold" className="text-amber-500 text-2xl shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[15px] font-semibold text-amber-50 mb-1">Paste Blocked</div>
                                        <div className="text-[13px] text-amber-200/80 leading-relaxed">Nice try. Ctrl+V isn't a design pattern. Time to actually write some code.</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 3. Roast Mode */}
                        <motion.div 
                            variants={itemVariants} 
                            className="md:col-span-6 lg:col-span-4 min-h-[24rem] rounded-[32px] p-8 md:p-10 border border-white/[0.1] hover:border-purple-400/35 transition-all duration-500 bg-gradient-to-b from-white/[0.055] to-white/[0.025] backdrop-blur-xl flex flex-col relative overflow-hidden group shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                <Icon icon="solar:ghost-linear" width="24" className="text-purple-400" />
                            </div>
                            <h3 className="text-3xl font-medium text-white mb-4 tracking-tight relative z-10">
                                AI Roast Mode
                            </h3>
                            <p className="text-zinc-300/82 text-lg leading-relaxed font-light relative z-10 mb-8">
                                Tab out to ChatGPT? Get instantly hit with a sarcastic reality check.
                            </p>

                            <div className="mt-auto relative z-10 bg-[#0c0c0c] border border-white/[0.08] rounded-2xl h-[120px] p-5 overflow-hidden shadow-2xl flex flex-col">
                                <div className="flex gap-2 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="font-mono text-[13px] text-purple-300/80 leading-relaxed"
                                    >
                                        <span className="text-purple-500 font-bold mr-2">&gt;</span>
                                        {roasts[index]}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="w-2 h-4 bg-purple-500/80 mt-2 animate-pulse" />
                            </div>
                        </motion.div>

                        {/* 4. Automated Spaced Repetition */}
                        <motion.div 
                            variants={itemVariants} 
                            className="md:col-span-12 lg:col-span-8 min-h-[24rem] rounded-[32px] p-8 md:p-10 relative overflow-hidden group border border-white/[0.1] hover:border-emerald-400/35 transition-all duration-500 bg-gradient-to-b from-white/[0.055] to-white/[0.025] backdrop-blur-xl flex flex-col md:flex-row gap-10 shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="relative z-10 md:w-1/2 flex flex-col">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Icon icon="solar:chart-square-linear" width="24" className="text-emerald-400" />
                                </div>
                                <h3 className="text-3xl font-medium text-white mb-4 tracking-tight">
                                    The Core Learning Engine
                                </h3>
                                <p className="text-zinc-300/82 text-[17px] leading-relaxed font-light mb-8">
                                    Blocking solutions is only half the battle. DeepFocus analyzes your failures, automatically categorizes them by pattern, and schedules precise revisions to build genuine intuition.
                                </p>

                                {/* Mini Chart/Stat */}
                                <div className="mt-auto flex gap-10">
                                    <div>
                                        <div className="text-4xl font-semibold text-white mb-2">14</div>
                                        <div className="text-[11px] uppercase tracking-[0.15em] text-emerald-500 font-semibold">Due Today</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-semibold text-white mb-2">86%</div>
                                        <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Retention</div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex-1 md:-mr-16 md:-my-4 flex items-center mt-6 md:mt-0">
                                <div className="w-full bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden group-hover:-translate-x-3 transition-transform duration-700 ease-out">
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-white/[0.02] text-[11px] uppercase tracking-[0.2em] font-semibold text-zinc-500">
                                        <span>Problem & Pattern</span>
                                        <span>Trigger</span>
                                    </div>
                                    <div className="flex flex-col relative h-[180px] overflow-hidden">
                                        <AnimatePresence>
                                            {problems.map((item) => (
                                                <motion.div 
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: -20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.4 }}
                                                    className="flex items-center justify-between px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-default"
                                                >
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[14px] font-medium text-zinc-200">{item.title}</span>
                                                        <span className="text-[10px] text-emerald-500/80 font-mono flex items-center gap-1.5 uppercase tracking-wider">
                                                            <Icon icon="solar:folder-with-files-bold" className="text-emerald-500/50 text-[12px]" />
                                                            {item.pattern}
                                                        </span>
                                                    </div>
                                                    <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                                        item.color === 'rose' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        item.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    }`}>
                                                        {item.tag}
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
}
