import React, { useState, useEffect, useRef } from "react";

import { 
  Search, Filter, ChevronDown, PlayCircle, FileText,
  MessageSquare, CheckCircle2, Bookmark, Clock, Star, ArrowRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LibrarySkeleton } from "../components/Boneyard";

// --- SERVICES ---
import { getWeeklyRecommendations, getGroupedLibraryData } from "../services/libraryService";
import { getRevisionProblems } from "../services/revisionService";
import { patterns } from "../data/library/patterns";
import { getProblemPattern } from "../utils/patternMatcher";

// --- COMPONENTS ---

const TypeIcon = ({ type, className = "" }) => {
  if (type === "Article") return <FileText className={className} size={16} />;
  if (type === "Video") return <PlayCircle className={className} size={16} />;
  return <MessageSquare className={className} size={16} />;
};

const LevelBadge = ({ level }) => {
  const colors = {
    Beginner: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    Medium: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    Hard: "bg-rose-400/10 text-rose-400 border-rose-400/20",
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
        ${isRecommended ? "bg-violet-500/5 border-violet-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)]" : "bg-[#0A0A0A] border-white/5 hover:border-white/20"}
        ${isCompleted && "opacity-60 grayscale hover:grayscale-0"}`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl flex items-center justify-center
            ${isRecommended ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-neutral-400"}`}>
            <TypeIcon type={card.type} size={18} />
          </div>
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{card.type}</span>
            {isRecommended && <span className="ml-2 text-[10px] font-bold text-violet-400 uppercase tracking-wider border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 rounded-md">Up Next</span>}
          </div>
        </div>
        {isCompleted && <CheckCircle2 size={18} className="text-emerald-400" />}
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
          ${isCompleted ? "text-neutral-500 hover:text-neutral-300" : "text-violet-400 hover:text-violet-300"}`}>
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
              className="h-full bg-violet-500 rounded-full"
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

const CustomDropdown = ({ value, onChange, options, defaultLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 pr-8 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-neutral-400 transition-colors focus:outline-none w-full min-w-[120px]"
      >
        <span className="truncate">{value === defaultLabel ? defaultLabel : value}</span>
        <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 min-w-full w-max bg-[#0E0E0E] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            <div className="max-h-60 overflow-y-auto">
              <button
                onClick={() => { onChange(defaultLabel); setIsOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/5
                  ${value === defaultLabel ? "text-violet-400 bg-violet-500/10" : "text-neutral-400"}`}
              >
                {defaultLabel}
              </button>
              {options.map(opt => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/5
                    ${value === opt ? "text-violet-400 bg-violet-500/10" : "text-neutral-400"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Filters = ({ 
  searchQuery, setSearchQuery, 
  selectedTopic, setSelectedTopic, 
  selectedLevel, setSelectedLevel, 
  selectedType, setSelectedType,
  topics 
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-[#0A0A0A] p-2 rounded-2xl border border-white/5 z-40 relative">
      {/* Search */}
      <div className="relative w-full md:w-1/3 flex items-center">
        <Search className="absolute left-3 text-neutral-500" size={16} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics, patterns..." 
          className="w-full bg-transparent border-none text-sm text-neutral-200 placeholder-neutral-600 pl-10 pr-4 py-3 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Control Pills */}
      <div className="w-full md:w-auto flex flex-wrap items-center gap-2 relative">
        <CustomDropdown 
          value={selectedTopic}
          onChange={setSelectedTopic}
          options={topics}
          defaultLabel="All Topics"
        />

        <CustomDropdown 
          value={selectedLevel}
          onChange={setSelectedLevel}
          options={["Beginner", "Medium", "Hard"]}
          defaultLabel="All Levels"
        />
        
        <CustomDropdown 
          value={selectedType}
          onChange={setSelectedType}
          options={["Article", "Video", "Discussion"]}
          defaultLabel="All Types"
        />
        
        <div className="w-[1px] h-6 bg-white/10 mx-2 hidden md:block" />
        
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
          <Filter size={14} /> Sort: Useful
        </button>
      </div>
    </div>
  );
};

const ResourceCard = ({ resource, onToggleSave, onToggleComplete }) => {
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
        <div className={`mt-1 flex-shrink-0 ${resource.isCompleted ? "text-neutral-600" : "text-violet-400"}`}>
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
              <Star size={12} className="text-amber-400" /> {resource.rating}
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
            onClick={(e) => { e.stopPropagation(); onToggleSave(resource.id); }}
            className={`p-2 rounded-xl transition-all hover:bg-white/10 ${resource.isSaved ? "text-violet-400" : "text-neutral-600 hover:text-white"}`}
          >
            <Bookmark size={18} fill={resource.isSaved ? "currentColor" : "none"} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleComplete(resource.id); }}
            className={`p-2 rounded-xl transition-all ${resource.isCompleted ? "text-emerald-400 hover:bg-emerald-400/10" : "text-neutral-600 hover:text-white hover:bg-white/10"}`}
          >
            <CheckCircle2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const Section = ({ data, onToggleSave, onToggleComplete }) => {
  return (
    <div className="mb-10">
      <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 ml-1 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500" />
        {data.topic}
      </h3>
      <div className="flex flex-col gap-2">
        {data.resources.map(res => (
          <ResourceCard 
            key={res.id} 
            resource={res} 
            onToggleSave={onToggleSave}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default function Library() {
  const [focusData, setFocusData] = useState(null);
  const [libraryData, setLibraryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All Topics");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [selectedType, setSelectedType] = useState("All Types");

  // Future Backend Extensibility: This entire hook remains the exact same when 
  // libraryService switches its internals to Supabase/API calls.
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch real-time revision problems from Supabase
        const problems = await getRevisionProblems();
        
        // 2. Identify weak topic IDs based on problem history
        const weakTopicsSet = new Set();
        if (problems && problems.length > 0) {
          problems.forEach(p => {
            const hasWeakFocus = (p.focus_score !== undefined && p.focus_score < 75) || 
                                 p.focus_status === 'Cheated' || 
                                 p.focus_status === 'Give Up';
            if (hasWeakFocus) {
              const patName = getProblemPattern(p.title);
              if (patName) {
                const parentPattern = patterns.find(pat => 
                  pat.name.toLowerCase() === patName.toLowerCase() || 
                  pat.id.toLowerCase() === patName.toLowerCase().replace(/[\s-]/g, "_")
                );
                if (parentPattern) {
                  weakTopicsSet.add(parentPattern.topicId);
                }
              }
            }
          });
        }
        
        // Fallback to standard topics if no weak topics found yet
        const weakTopicIds = weakTopicsSet.size > 0 ? Array.from(weakTopicsSet) : ["arrays", "linkedlist"];
        
        // 3. Load dynamic recommendations
        const weekRecs = await getWeeklyRecommendations(weakTopicIds);
        setFocusData(weekRecs);

        // 4. Load library grouping and hydrate saved/completed states from localStorage
        const savedIds = JSON.parse(localStorage.getItem("df_library_saved") || "[]");
        const completedIds = JSON.parse(localStorage.getItem("df_library_completed") || "[]");
        
        const libraryGrouping = await getGroupedLibraryData();
        const hydratedGrouping = libraryGrouping.map(section => ({
          ...section,
          resources: section.resources.map(res => ({
            ...res,
            isSaved: savedIds.includes(res.id),
            isCompleted: completedIds.includes(res.id)
          }))
        }));
        setLibraryData(hydratedGrouping);
      } catch (err) {
        console.error("Failed to load library data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleToggleSave = (resourceId) => {
    let nextSavedIds = [];
    setLibraryData(prev => prev.map(section => {
      const nextResources = section.resources.map(res => {
        if (res.id === resourceId) {
          const nextSaved = !res.isSaved;
          if (nextSaved) nextSavedIds.push(res.id);
          return { ...res, isSaved: nextSaved };
        } else {
          if (res.isSaved) nextSavedIds.push(res.id);
          return res;
        }
      });
      return { ...section, resources: nextResources };
    }));
    localStorage.setItem("df_library_saved", JSON.stringify(nextSavedIds));
  };

  const handleToggleComplete = (resourceId) => {
    let nextCompletedIds = [];
    setLibraryData(prev => prev.map(section => {
      const nextResources = section.resources.map(res => {
        if (res.id === resourceId) {
          const nextCompleted = !res.isCompleted;
          if (nextCompleted) nextCompletedIds.push(res.id);
          return { ...res, isCompleted: nextCompleted };
        } else {
          if (res.isCompleted) nextCompletedIds.push(res.id);
          return res;
        }
      });
      return { ...section, resources: nextResources };
    }));
    localStorage.setItem("df_library_completed", JSON.stringify(nextCompletedIds));
  };

  const getTopicsList = () => {
    return Array.from(new Set(libraryData.map(s => s.topic)));
  };

  const getFilteredData = () => {
    return libraryData.map(section => {
      // Topic filter
      if (selectedTopic !== "All Topics" && section.topic !== selectedTopic) {
        return { ...section, resources: [] };
      }

      const filteredResources = section.resources.filter(res => {
        // Search filter
        const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              res.source.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Level filter
        const matchesLevel = selectedLevel === "All Levels" || res.level === selectedLevel;

        // Type filter
        const matchesType = selectedType === "All Types" || res.type === selectedType;

        return matchesSearch && matchesLevel && matchesType;
      });

      return { ...section, resources: filteredResources };
    }).filter(section => section.resources.length > 0);
  };

  const filteredLibraryData = getFilteredData();

  return (
    <div className="max-w-[1200px] mx-auto p-8 space-y-8 animate-fade-in">
      <main className="w-full">
        {isLoading ? (
          <LibrarySkeleton />
        ) : (
          <>
            <WeeklyFocus focusData={focusData} />
            
            <div className="mt-16 mb-8 border-t border-white/5 pt-12">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Resource Library</h2>
              <p className="text-sm text-neutral-400">Curated materials to master patterns and algorithms.</p>
            </div>

            <Filters 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
              selectedLevel={selectedLevel}
              setSelectedLevel={setSelectedLevel}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              topics={getTopicsList()}
            />

            <div className="space-y-4">
              {filteredLibraryData.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">No resources found matching your filters.</div>
              ) : (
                filteredLibraryData.map(section => (
                  <Section 
                    key={section.topic || section.id} 
                    data={section} 
                    onToggleSave={handleToggleSave}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
