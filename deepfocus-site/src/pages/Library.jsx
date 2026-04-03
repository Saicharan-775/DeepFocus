import React, { useState, useEffect } from "react";
import DashboardNav from "../components/DashboardNav";
import { 
  Search, Filter, ChevronDown, PlayCircle, FileText,
  MessageSquare, CheckCircle2, Bookmark, Clock, Star, ArrowRight 
} from "lucide-react";
import { motion } from "framer-motion";

// --- SERVICES ---
// In the future, this module interacts with `/api` instead. None of this UI needs to know about it.
import { getWeeklyRecommendations, getGroupedLibraryData } from "../services/libraryService";

// --- COMPONENTS ---

const TypeIcon = ({ type, className = "" }) => {
  if (type === "Article") return <FileText className={className} size={16} />;
  if (type === "Video") return <PlayCircle className={className} size={16} />;
  return <MessageSquare className={className} size={16} />;
};

const LevelBadge = ({ level }) => {
  const colors = {
    Beginner: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${colors[level] || colors.Medium}`}>
      {level}
    </span>
  );
};

const FocusCard = ({ card }) => {
  const isCompleted = card.state === "Completed";
  const isRecommended = card.state === "Recommended";

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={() => window.open(card.url, '_blank')}
      className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-4 h-full
        ${isRecommended ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)]" : "bg-[#0A0A0A] border-white/5 hover:border-white/20"}
        ${isCompleted && "opacity-60 grayscale hover:grayscale-0"}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl flex items-center justify-center
            ${isRecommended ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-neutral-400"}`}>
            <TypeIcon type={card.type} size={18} />
          </div>
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{card.type}</span>
            {isRecommended && <span className="ml-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">Up Next</span>}
          </div>
        </div>
        {isCompleted && <CheckCircle2 size={18} className="text-emerald-500" />}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className={`font-semibold text-base mb-1 ${isCompleted ? "text-neutral-400 line-through" : "text-neutral-100"}`}>
          {card.title}
        </h3>
        <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">
          {card.description}
        </p>
      </div>

      {/* Meta & CTA */}
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <LevelBadge level={card.level} />
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Clock size={12} />
            <span>{card.time}</span>
          </div>
        </div>

        <button className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors
          ${isCompleted ? "text-neutral-500 hover:text-neutral-300" : "text-indigo-400 hover:text-indigo-300"}`}>
          {isCompleted ? "Review" : "Start"}
          {!isCompleted && <ArrowRight size={14} />}
        </button>
      </div>
    </motion.div>
  );
};

const WeeklyFocus = ({ focusData }) => {
  if (!focusData) return null;

  const progressPercent = focusData.total > 0 ? (focusData.completed / focusData.total) * 100 : 0;

  return (
    <div className="mb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            {focusData.title}
          </h2>
          <p className="text-sm text-neutral-400">{focusData.subtitle}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            Progress <span className="text-white ml-2">{focusData.completed}/{focusData.total}</span>
          </span>
          <div className="w-full md:w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-indigo-500 rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {focusData.cards ? focusData.cards.map((card) => (
          <FocusCard key={card.id} card={card} />
        )) : null}
      </div>
    </div>
  );
};

const Filters = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-[#0A0A0A] p-2 rounded-2xl border border-white/5">
      {/* Search */}
      <div className="relative w-full md:w-1/3 flex items-center">
        <Search className="absolute left-3 text-neutral-500" size={16} />
        <input 
          type="text" 
          placeholder="Search topics, patterns..." 
          className="w-full bg-transparent border-none text-sm text-neutral-200 placeholder-neutral-600 pl-10 pr-4 py-3 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Control Pills */}
      <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
        {["Topic", "Level", "Type"].map(filter => (
          <button key={filter} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-neutral-400 transition-colors">
            {filter} <ChevronDown size={14} />
          </button>
        ))}
        
        <div className="w-[1px] h-6 bg-white/10 mx-2 hidden md:block" />
        
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
          <Filter size={14} /> Sort: Useful
        </button>
      </div>
    </div>
  );
};

const ResourceCard = ({ resource }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      onClick={() => window.open(resource.url, '_blank')}
      className={`group cursor-pointer relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200
        ${resource.isCompleted ? "bg-[#0A0A0A]/50 border-white/5 opacity-70" : "bg-[#0E0E0E] border-white/10 hover:border-white/20"}
      `}
    >
      {/* Main Info */}
      <div className="flex items-start gap-4 flex-1">
        <div className={`mt-1 flex-shrink-0 ${resource.isCompleted ? "text-neutral-600" : "text-indigo-400"}`}>
          <TypeIcon type={resource.type} size={20} />
        </div>
        
        <div>
          <h4 className={`text-base font-medium mb-1 ${resource.isCompleted ? "text-neutral-400 line-through" : "text-neutral-200 group-hover:text-white transition-colors"}`}>
            {resource.title}
          </h4>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 font-medium">
            <span className="text-neutral-400">{resource.source}</span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="flex items-center gap-1">
              <Star size={12} className="text-amber-500" /> {resource.rating}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="flex items-center gap-1">
              <Clock size={12} /> {resource.time}
            </span>
          </div>
        </div>
      </div>

      {/* Badges & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-6 ml-9 md:ml-0">
        <LevelBadge level={resource.level} />
        
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); /* Bookmark API call logic */ }}
            className={`p-2 rounded-xl transition-all hover:bg-white/10 ${resource.isSaved ? "text-indigo-400" : "text-neutral-600 hover:text-white"}`}
          >
            <Bookmark size={18} fill={resource.isSaved ? "currentColor" : "none"} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); /* Complete API call logic */ }}
            className={`p-2 rounded-xl transition-all ${resource.isCompleted ? "text-emerald-500 hover:bg-emerald-500/10" : "text-neutral-600 hover:text-white hover:bg-white/10"}`}
          >
            <CheckCircle2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Section = ({ data }) => {
  return (
    <div className="mb-10">
      <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 ml-1 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        {data.topic}
      </h3>
      <div className="flex flex-col gap-2">
        {data.resources.map(res => (
          <ResourceCard key={res.id} resource={res} />
        ))}
      </div>
    </div>
  );
};

export default function Library() {
  const [focusData, setFocusData] = useState(null);
  const [libraryData, setLibraryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Future Backend Extensibility: This entire hook remains the exact same when 
  // libraryService switches its internals to Supabase/API calls.
  useEffect(() => {
    async function loadData() {
      try {
        // e.g. Pass weak topics found from backend analytics determining weakness
        const weekRecs = await getWeeklyRecommendations(["arrays", "linkedlist"]);
        setFocusData(weekRecs);

        const libraryGrouping = await getGroupedLibraryData();
        setLibraryData(libraryGrouping);
      } catch (err) {
        console.error("Failed to load library data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 font-sans selection:bg-indigo-500/30 pt-32 pb-24 px-6 md:px-12 selection:text-white">
      <DashboardNav />

      <main className="max-w-5xl mx-auto">
        {isLoading ? (
          <div className="text-center text-neutral-500 py-32 animate-pulse">Loading core concepts, patterns, and topics...</div>
        ) : (
          <>
            <WeeklyFocus focusData={focusData} />
            
            <div className="mt-16 mb-8 border-t border-white/5 pt-12">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Resource Library</h2>
              <p className="text-sm text-neutral-400">Curated materials to master patterns and algorithms.</p>
            </div>

            <Filters />

            <div className="space-y-4">
              {libraryData.map(section => (
                <Section key={section.topic || section.id} data={section} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
