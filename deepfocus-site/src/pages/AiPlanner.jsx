import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Icon } from '@iconify/react';
import curatedQuestions from '../constants/Patterns/curated_questions.json';

const ICON_CHOICES = [
  'lucide:brain',
  'lucide:target',
  'lucide:zap',
  'lucide:code-2',
  'lucide:sparkles',
  'lucide:award',
  'lucide:book-open',
  'lucide:terminal',
  'lucide:flame',
  'lucide:star'
];

const COVERS = {
  violet: 'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.18), transparent 80%), linear-gradient(180deg, #09090b 0%, #12101e 100%)',
  cyber: 'radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.12), transparent 75%), linear-gradient(180deg, #09090b 0%, #1a1208 100%)',
  cosmos: 'radial-gradient(circle at 70% 80%, rgba(14, 165, 233, 0.15), transparent 70%), linear-gradient(180deg, #09090b 0%, #081622 100%)',
  emerald: 'radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.12), transparent 80%), linear-gradient(180deg, #09090b 0%, #061811 100%)'
};

const PATTERN_MAPPING = {
  'Dynamic Programming': 'Dynamic Programming',
  'Graph Algorithms': 'Graphs',
  'Trees & Recursion': 'Trees',
  'Sliding Window': 'Sliding Window',
  'Two Pointers': 'Two Pointers',
  'Binary Search': 'Binary Search',
  'Heaps & Priority Queues': 'Heap',
  'Stack & Queue puzzles': 'Stack',
  'Hash Tables': 'Arrays & Matrices',
  'Linked Lists': 'Linked List',
  'Backtracking': 'Backtracking'
};

const diffColor = (d) =>
  d === 'Easy' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
  d === 'Hard' ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' :
  'text-amber-400 bg-amber-400/10 border-amber-400/20';

const splitIntoGroups = (array, n) => {
  if (array.length === 0) return [[]];
  const groups = Array.from({ length: n }, () => []);
  array.forEach((item, index) => {
    groups[index % n].push(item);
  });
  return groups.filter(g => g.length > 0);
};

const predictWeeks = (topics, commit) => {
  if (!topics || topics.length === 0) return 2;
  
  const TOPIC_WEIGHTS = {
    'Dynamic Programming': 2.0,
    'Graph Algorithms': 2.0,
    'Trees & Recursion': 1.5,
    'Binary Search': 1.5,
    'Heaps & Priority Queues': 1.5,
    'Sliding Window': 1.0,
    'Two Pointers': 1.0,
    'Stack & Queue puzzles': 1.0,
    'Hash Tables': 1.0,
    'Linked Lists': 1.0,
    'Backtracking': 2.0
  };
  
  let sum = 0;
  topics.forEach(t => {
    sum += TOPIC_WEIGHTS[t] || 1.0;
  });
  
  let multiplier = 1.0;
  if (commit === '1 hour / day') multiplier = 1.5;
  else if (commit === '2 hours / day') multiplier = 1.0;
  else if (commit === '4 hours / day') multiplier = 0.7;
  else if (commit === '6 hours / day') multiplier = 0.5;
  
  const predicted = Math.round(sum * multiplier);
  return Math.max(1, Math.min(12, predicted));
};

export default function AiPlanner() {
  const [goal, setGoal] = useState('Crack FAANG Interviews');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [commitment, setCommitment] = useState('2 hours / day');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  
  // Wizard Setup States
  const [isSetupActive, setIsSetupActive] = useState(true);
  const [wizardStep, setWizardStep] = useState(1);
  const [targetFocus, setTargetFocus] = useState('faang'); // faang, startup, intensive
  const [selectedLanguage, setSelectedLanguage] = useState('C++');
  const [weakTopics, setWeakTopics] = useState([
    'Dynamic Programming',
    'Graph Algorithms',
    'Trees & Recursion',
    'Sliding Window',
    'Two Pointers',
    'Binary Search',
    'Heaps & Priority Queues',
    'Stack & Queue puzzles',
    'Hash Tables',
    'Linked Lists',
    'Backtracking'
  ]);
  const [targetWeeks, setTargetWeeks] = useState(8);
  const [activeCandidates, setActiveCandidates] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [activeSelectionPattern, setActiveSelectionPattern] = useState(null);

  // Notion Specific Page Settings
  const [pageIcon, setPageIcon] = useState('lucide:target');
  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('workspace'); // workspace, board, timeline
  const [phases, setPhases] = useState([]);
  const [activeTogglePhase, setActiveTogglePhase] = useState(0);
  const [coverStyle, setCoverStyle] = useState('violet');

  const [openSubpatterns, setOpenSubpatterns] = useState({});
  const toggleSubpattern = (pIdx, subName) => {
    const key = `${pIdx}-${subName}`;
    setOpenSubpatterns(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }));
  };

  const navigate = useNavigate();

  useEffect(() => {
    const provider = localStorage.getItem('df_ai_provider') || 'demo';
    const openrouterKey = localStorage.getItem('df_openrouter_api_key');
    const groqKey = localStorage.getItem('df_groq_api_key');
    const openaiKey = localStorage.getItem('df_openai_key');
    setApiKey(provider === 'demo' ? 'demo_active' : (openrouterKey || groqKey || openaiKey));
    
    const savedPlan = localStorage.getItem('df_custom_planner_data');
    if (savedPlan) {
      try {
        const parsed = JSON.parse(savedPlan);
        
        // Clean/migrate saved phases to populate missing links and subpatterns from curatedQuestions
        const migratedPhases = (parsed.phases || []).map(phase => {
          const updatedProblems = (phase.problems || []).map(prob => {
            const match = curatedQuestions.find(cq => cq.leetcode_id === prob.leetcode_id);
            return {
              ...prob,
              link: prob.link || (match ? `https://leetcode.com/problems/${match.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/` : ''),
              subpattern: prob.subpattern || (match?.hidden_tags?.[0] || 'General Concepts')
            };
          });
          return { ...phase, problems: updatedProblems };
        });

        setPhases(migratedPhases);
        setGoal(parsed.goal);
        setTargetDate(parsed.targetDate);
        setCommitment(parsed.commitment);
        setPageIcon(parsed.pageIcon || 'lucide:target');
        setCoverStyle(parsed.coverStyle || 'violet');
        setIsSetupActive(false);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveWorkspaceToStorage = (updatedPhases, updatedGoal = goal, updatedDate = targetDate, updatedCommitment = commitment, updatedIcon = pageIcon, updatedCover = coverStyle) => {
    localStorage.setItem('df_custom_planner_data', JSON.stringify({
      phases: updatedPhases,
      goal: updatedGoal,
      targetDate: updatedDate,
      commitment: updatedCommitment,
      pageIcon: updatedIcon,
      coverStyle: updatedCover
    }));
  };

  useEffect(() => {
    const predicted = predictWeeks(weakTopics, commitment);
    setTargetWeeks(predicted);
  }, [weakTopics, commitment]);

  const handleAutoPlanner = () => {
    // 1. Choose topics based on targetFocus (or all topics)
    let defaultTopics = [];
    if (targetFocus === 'faang') {
      defaultTopics = [
        'Dynamic Programming', 'Graph Algorithms', 'Trees & Recursion',
        'Sliding Window', 'Two Pointers', 'Binary Search',
        'Heaps & Priority Queues', 'Stack & Queue puzzles', 'Hash Tables',
        'Linked Lists', 'Backtracking'
      ];
    } else if (targetFocus === 'startup') {
      defaultTopics = [
        'Dynamic Programming', 'Graph Algorithms', 'Trees & Recursion',
        'Sliding Window', 'Two Pointers', 'Binary Search',
        'Heaps & Priority Queues', 'Stack & Queue puzzles', 'Hash Tables'
      ];
    } else { // service
      defaultTopics = [
        'Trees & Recursion', 'Sliding Window', 'Two Pointers', 'Binary Search',
        'Stack & Queue puzzles', 'Hash Tables', 'Linked Lists'
      ];
    }
    
    // 2. Predict weeks
    const predicted = predictWeeks(defaultTopics, commitment);
    
    // 3. Prepare recommended questions
    const candWeeks = getCandidateAllocations(targetFocus, defaultTopics, predicted);
    const recommendedIds = new Set();
    const maxPerSub = commitment.includes('1 hour') ? 1 : commitment.includes('6 hours') ? 3 : 2;

    candWeeks.forEach(cand => {
      const pool = curatedQuestions.filter(q => q.primary_pattern === cand.pattern);
      const subpatterns = [...new Set(pool.map(q => q.hidden_tags?.[0] || 'General Concepts'))];

      const numWeeks = cand.allocated;
      const subpatternGroups = splitIntoGroups(subpatterns, numWeeks);

      subpatternGroups.forEach((groupSubpatterns) => {
        groupSubpatterns.forEach(sub => {
          const subPool = pool.filter(q => (q.hidden_tags?.[0] || 'General Concepts') === sub);
          const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
          const sortedSubPool = [...subPool].sort((a, b) => {
            return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
          });

          const countToSelect = Math.min(maxPerSub, sortedSubPool.length);
          const selected = sortedSubPool.slice(0, countToSelect);
          selected.forEach(q => recommendedIds.add(q.leetcode_id));
        });

        const currentSelectedCount = pool.filter(q => recommendedIds.has(q.leetcode_id) && groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts')).length;
        if (currentSelectedCount < 3) {
          const extraPool = pool.filter(q => groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts'));
          const sortedExtraPool = [...extraPool].sort((a, b) => {
            const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
            return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
          });

          let added = 0;
          for (let q of sortedExtraPool) {
            if (currentSelectedCount + added >= 3) break;
            if (!recommendedIds.has(q.leetcode_id)) {
              recommendedIds.add(q.leetcode_id);
              added++;
            }
          }
        }
      });
    });

    // 4. Generate plan
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const generated = generateLocalPlan(targetFocus, selectedLanguage, defaultTopics, predicted, commitment, recommendedIds);
        setPhases(generated);
        saveWorkspaceToStorage(generated, goal, targetDate, commitment, pageIcon, coverStyle);
        
        // Also update state so it aligns
        setWeakTopics(defaultTopics);
        setTargetWeeks(predicted);
        setSelectedQuestionIds(recommendedIds);
        
        setIsSetupActive(false);
      } catch (err) {
        console.error(err);
        alert(`Auto-generation failed: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
  };

  const getCandidateAllocations = (focus, weak, weeks) => {
    const weakPatternsMapped = weak.map(w => PATTERN_MAPPING[w] || w);
    const candidateSet = new Set(weakPatternsMapped);
    
    const prerequisiteOrder = [
      'Arrays & Matrices',
      'Two Pointers',
      'Sliding Window',
      'Linked List',
      'Stack',
      'Binary Search',
      'Trees',
      'Heap',
      'Graphs',
      'Dynamic Programming',
      'Backtracking'
    ];
    
    const finalCandidates = prerequisiteOrder.filter(p => candidateSet.has(p));
    finalCandidates.push(...Array.from(candidateSet).filter(p => !prerequisiteOrder.includes(p)));

    const PATTERN_WEIGHTS = {
      'Arrays & Matrices': 1.0,
      'Two Pointers': 1.0,
      'Sliding Window': 1.0,
      'Linked List': 1.0,
      'Stack': 1.0,
      'Binary Search': 1.5,
      'Trees': 1.5,
      'Heap': 1.5,
      'Graphs': 2.0,
      'Dynamic Programming': 2.0,
      'Backtracking': 2.0
    };

    const candidateAllocations = finalCandidates.map(pattern => {
      const baseW = PATTERN_WEIGHTS[pattern] || 1.0;
      const isWeak = weakPatternsMapped.includes(pattern);
      const amplifiedW = isWeak ? baseW * 1.4 : baseW;
      
      const patternPool = curatedQuestions.filter(q => q.primary_pattern === pattern);
      const subSet = new Set(patternPool.map(q => q.hidden_tags?.[0] || 'General Concepts'));
      
      let ideal = amplifiedW >= 1.8 ? 2 : 1;
      if (subSet.size <= 1) {
        ideal = 1;
      }
      return { pattern, isWeak, ideal, allocated: 0 };
    });

    let currentSum = 0;
    let activeCandidates = [];

    for (let cand of candidateAllocations) {
      if (currentSum >= weeks) break;
      
      let toAllocate = cand.ideal;
      if (currentSum + toAllocate > weeks) {
        toAllocate = weeks - currentSum;
      }
      cand.allocated = toAllocate;
      currentSum += toAllocate;
      activeCandidates.push(cand);
    }

    if (currentSum < weeks) {
      for (let cand of activeCandidates) {
        if (currentSum >= weeks) break;
        if (cand.allocated < 2 && cand.isWeak) {
          cand.allocated += 1;
          currentSum += 1;
        }
      }
    }

    if (currentSum < weeks) {
      for (let cand of activeCandidates) {
        if (currentSum >= weeks) break;
        if (cand.allocated < 2) {
          const baseW = PATTERN_WEIGHTS[cand.pattern] || 1.0;
          if (baseW >= 1.5) {
            cand.allocated += 1;
            currentSum += 1;
          }
        }
      }
    }

    if (currentSum < weeks) {
      for (let cand of activeCandidates) {
        if (currentSum >= weeks) break;
        if (cand.allocated < 2) {
          cand.allocated += 1;
          currentSum += 1;
        }
      }
    }

    if (currentSum < weeks && activeCandidates.length > 0) {
      let index = 0;
      while (currentSum < weeks) {
        activeCandidates[index].allocated += 1;
        currentSum += 1;
        index = (index + 1) % activeCandidates.length;
      }
    }

    return activeCandidates;
  };

  const prepareQuestionSelection = () => {
    const candWeeks = getCandidateAllocations(targetFocus, weakTopics, targetWeeks);
    setActiveCandidates(candWeeks);
    if (candWeeks.length > 0) {
      setActiveSelectionPattern(candWeeks[0].pattern);
    }

    const recommendedIds = new Set();
    const maxPerSub = commitment.includes('1 hour') ? 1 : commitment.includes('6 hours') ? 3 : 2;

    candWeeks.forEach(cand => {
      const pool = curatedQuestions.filter(q => q.primary_pattern === cand.pattern);
      const subpatterns = [...new Set(pool.map(q => q.hidden_tags?.[0] || 'General Concepts'))];

      const numWeeks = cand.allocated;
      const subpatternGroups = splitIntoGroups(subpatterns, numWeeks);

      subpatternGroups.forEach((groupSubpatterns) => {
        groupSubpatterns.forEach(sub => {
          const subPool = pool.filter(q => (q.hidden_tags?.[0] || 'General Concepts') === sub);
          const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
          const sortedSubPool = [...subPool].sort((a, b) => {
            return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
          });

          const countToSelect = Math.min(maxPerSub, sortedSubPool.length);
          const selected = sortedSubPool.slice(0, countToSelect);
          selected.forEach(q => recommendedIds.add(q.leetcode_id));
        });

        const currentSelectedCount = pool.filter(q => recommendedIds.has(q.leetcode_id) && groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts')).length;
        if (currentSelectedCount < 3) {
          const extraPool = pool.filter(q => groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts'));
          const sortedExtraPool = [...extraPool].sort((a, b) => {
            const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
            return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
          });

          let added = 0;
          for (let q of sortedExtraPool) {
            if (currentSelectedCount + added >= 3) break;
            if (!recommendedIds.has(q.leetcode_id)) {
              recommendedIds.add(q.leetcode_id);
              added++;
            }
          }
        }
      });
    });

    setSelectedQuestionIds(recommendedIds);
  };

  const toggleQuestionId = (id) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllForPattern = (pattern) => {
    const pool = curatedQuestions.filter(q => q.primary_pattern === pattern);
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      pool.forEach(q => next.add(q.leetcode_id));
      return next;
    });
  };

  const handleDeselectAllForPattern = (pattern) => {
    const pool = curatedQuestions.filter(q => q.primary_pattern === pattern);
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      pool.forEach(q => next.delete(q.leetcode_id));
      return next;
    });
  };

  const handleResetToRecommendedForPattern = (pattern) => {
    const pool = curatedQuestions.filter(q => q.primary_pattern === pattern);
    const maxPerSub = commitment.includes('1 hour') ? 1 : commitment.includes('6 hours') ? 3 : 2;
    const subpatterns = [...new Set(pool.map(q => q.hidden_tags?.[0] || 'General Concepts'))];

    const cand = activeCandidates.find(c => c.pattern === pattern) || { allocated: 1 };
    const numWeeks = cand.allocated;
    const subpatternGroups = splitIntoGroups(subpatterns, numWeeks);

    const recommendedIds = new Set();
    subpatternGroups.forEach((groupSubpatterns) => {
      groupSubpatterns.forEach(sub => {
        const subPool = pool.filter(q => (q.hidden_tags?.[0] || 'General Concepts') === sub);
        const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
        const sortedSubPool = [...subPool].sort((a, b) => {
          return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
        });

        const countToSelect = Math.min(maxPerSub, sortedSubPool.length);
        const selected = sortedSubPool.slice(0, countToSelect);
        selected.forEach(q => recommendedIds.add(q.leetcode_id));
      });

      const currentSelectedCount = pool.filter(q => recommendedIds.has(q.leetcode_id) && groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts')).length;
      if (currentSelectedCount < 3) {
        const extraPool = pool.filter(q => groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts'));
        const sortedExtraPool = [...extraPool].sort((a, b) => {
          const diffOrder = targetFocus === 'faang' ? ['Medium', 'Hard', 'Easy'] : targetFocus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
          return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
        });

        let added = 0;
        for (let q of sortedExtraPool) {
          if (currentSelectedCount + added >= 3) break;
          if (!recommendedIds.has(q.leetcode_id)) {
            recommendedIds.add(q.leetcode_id);
            added++;
          }
        }
      }
    });

    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      pool.forEach(q => next.delete(q.leetcode_id));
      recommendedIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBuildPlan = async () => {
    setIsGenerating(true);
    
    // Simulate generation to feel premium and showcase a beautiful loader
    setTimeout(() => {
      try {
        const generated = generateLocalPlan(targetFocus, selectedLanguage, weakTopics, targetWeeks, commitment, selectedQuestionIds);
        setPhases(generated);
        saveWorkspaceToStorage(generated, goal, targetDate, commitment, pageIcon, coverStyle);
        setIsSetupActive(false);
      } catch (err) {
        console.error(err);
        alert(`Generation failed: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
  };

  const generateLocalPlan = (focus, lang, weak, weeks, commit, checkedIds = selectedQuestionIds) => {
    const candWeeks = getCandidateAllocations(focus, weak, weeks);
    let weekCounter = 1;
    const roadmapPhases = [];

    candWeeks.forEach((cand) => {
      const pool = curatedQuestions.filter(q => q.primary_pattern === cand.pattern);
      const subpatterns = [...new Set(pool.map(q => q.hidden_tags?.[0] || 'General Concepts'))];

      const numWeeks = cand.allocated;
      const subpatternGroups = splitIntoGroups(subpatterns, numWeeks);

      subpatternGroups.forEach((groupSubpatterns) => {
        const startW = weekCounter;
        weekCounter++;

        const weekStr = `Week ${startW}`;
        const problemsSelected = [];

        groupSubpatterns.forEach(sub => {
          const subPool = pool.filter(q => (q.hidden_tags?.[0] || 'General Concepts') === sub);
          const selected = subPool.filter(q => checkedIds.has(q.leetcode_id));

          selected.forEach(q => {
            const slug = q.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
            const url = `https://leetcode.com/problems/${slug}/`;

            problemsSelected.push({
              name: `${q.title} [in ${lang}]`,
              difficulty: q.difficulty,
              completed: false,
              leetcode_id: q.leetcode_id,
              link: url,
              subpattern: sub
            });
          });
        });

        if (problemsSelected.length < 3) {
          const extraPool = pool.filter(q => groupSubpatterns.includes(q.hidden_tags?.[0] || 'General Concepts'));
          const sortedExtraPool = [...extraPool].sort((a, b) => {
            const diffOrder = focus === 'faang' ? ['Medium', 'Hard', 'Easy'] : focus === 'startup' ? ['Medium', 'Easy', 'Hard'] : ['Easy', 'Medium', 'Hard'];
            return diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty);
          });

          const chosenIds = new Set(problemsSelected.map(p => p.leetcode_id));

          for (let q of sortedExtraPool) {
            if (problemsSelected.length >= 3) break;
            if (!chosenIds.has(q.leetcode_id)) {
              chosenIds.add(q.leetcode_id);
              const slug = q.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
              const url = `https://leetcode.com/problems/${slug}/`;

              problemsSelected.push({
                name: `${q.title} [in ${lang}]`,
                difficulty: q.difficulty,
                completed: false,
                leetcode_id: q.leetcode_id,
                link: url,
                subpattern: q.hidden_tags?.[0] || 'General Concepts'
              });
            }
          }
        }

        if (problemsSelected.length === 0) {
          problemsSelected.push({
            name: `${cand.pattern} Core Concept Quiz [in ${lang}]`,
            difficulty: 'Medium',
            completed: false,
            leetcode_id: 9999,
            link: `https://leetcode.com/problemset/all/?search=${encodeURIComponent(cand.pattern)}`,
            subpattern: 'General Concepts'
          });
        }

        const displaySubpatterns = groupSubpatterns.slice(0, 2).join(' & ');
        const subpatternListStr = groupSubpatterns.join(', ');
        
        let title = `${cand.pattern}: ${displaySubpatterns}`;
        if (groupSubpatterns.length > 2) {
          title += ` & More`;
        }

        const description = `Focus on mastering the following subpatterns: ${subpatternListStr}. Each subpattern represents a specific problem solving structure. Solve the curated problems below to build strong visual and mathematical intuition.`;

        roadmapPhases.push({
          title,
          description,
          status: 'PENDING',
          week: weekStr,
          problems: problemsSelected
        });
      });
    });

    return roadmapPhases;
  };

  const handleToggleProblem = (phaseIndex, problemIndex) => {
    const updated = [...phases];
    updated[phaseIndex].problems[problemIndex].completed = !updated[phaseIndex].problems[problemIndex].completed;
    
    const total = updated[phaseIndex].problems.length;
    const done = updated[phaseIndex].problems.filter(p => p.completed).length;
    if (done === total && total > 0) {
      updated[phaseIndex].status = 'DONE';
    } else if (done > 0) {
      updated[phaseIndex].status = 'ACTIVE';
    } else {
      updated[phaseIndex].status = 'PENDING';
    }
    setPhases(updated);
    saveWorkspaceToStorage(updated);
  };

  const handleChangePhaseStatus = (phaseIndex, newStatus) => {
    const updated = [...phases];
    updated[phaseIndex].status = newStatus;
    if (newStatus === 'DONE') {
      updated[phaseIndex].problems.forEach(p => p.completed = true);
    } else if (newStatus === 'PENDING') {
      updated[phaseIndex].problems.forEach(p => p.completed = false);
    }
    setPhases(updated);
    saveWorkspaceToStorage(updated);
  };

  const handleResetWorkspace = () => {
    localStorage.removeItem('df_custom_planner_data');
    setPhases([]);
    setIsSetupActive(true);
    setWizardStep(1);
  };

  const allProblems = phases.flatMap(p => p.problems || []);
  const totalProblemsCount = allProblems.length;
  const completedProblemsCount = allProblems.filter(p => p.completed).length;
  const overallProgress = totalProblemsCount > 0 ? Math.round((completedProblemsCount / totalProblemsCount) * 100) : 0;

  const parseWeekRange = (weekStr) => {
    const match = weekStr.match(/\d+/g);
    if (!match) return { start: 1, span: 2 };
    const nums = match.map(Number);
    if (nums.length === 1) return { start: nums[0], span: 1 };
    return { start: nums[0], span: (nums[1] - nums[0]) + 1 };
  };

  return (
    <div className="relative min-h-screen bg-[#09090b] text-[#d4d4d8] font-sans pb-16">
      
      {/* Background Matrix Mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: '#7c3aed' }} />
        <div className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[120px]" style={{ background: '#0ea5e9' }} />
      </div>

      {/* Notion Cover Header */}
      <div className="relative h-56 w-full border-b border-zinc-900 bg-zinc-950 overflow-hidden transition-all duration-500" style={{ background: COVERS[coverStyle] }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 18px)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] to-transparent" />
        
        {!isSetupActive && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 border border-white/5 backdrop-blur-md px-2.5 py-1.5 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-semibold font-mono mr-1">Cover Style:</span>
            {Object.keys(COVERS).map((c) => (
              <button 
                key={c}
                onClick={() => {
                  setCoverStyle(c);
                  saveWorkspaceToStorage(phases, goal, targetDate, commitment, pageIcon, c);
                }}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${coverStyle === c ? 'border-white scale-110' : 'border-zinc-800 hover:border-zinc-600'}`}
                style={{ 
                  background: c === 'violet' ? '#7c3aed' : c === 'cyber' ? '#f59e0b' : c === 'cosmos' ? '#0ea5e9' : '#10b981'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(24px)' }}>
            <div className="w-60 h-60">
              <DotLottieReact src="https://lottie.host/5a449ee2-c5f8-439b-9455-6e83cde25682/XXzIGAxwx3.lottie" loop autoplay />
            </div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-violet-400 text-xs font-mono tracking-[0.25em] uppercase mt-4 animate-pulse">
              Structuring verified curriculum...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-6 relative z-10 -mt-16">
        
        {isSetupActive ? (
          /* ================= ONBOARDING SETUP WIZARD ================= */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-800/80 bg-[#0c0c0e] shadow-2xl p-8 space-y-8 relative overflow-hidden"
          >
            <div className="flex items-center gap-1.5 pb-4 border-b border-zinc-900 text-xs text-zinc-500 font-mono">
              <Icon icon="lucide:terminal" className="w-3.5 h-3.5 text-violet-400" />
              <span>deepfocus ~ planner-wizard v3.0</span>
            </div>

            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Configure Your Study Roadmap</h2>
              <p className="text-xs text-zinc-500">Input your DSA targets to dynamically match real LeetCode questions from our curated database.</p>
            </div>

            <div className="flex justify-center items-center gap-4 text-xs font-mono">
              <div className={`px-3 py-1 rounded-md border transition-all ${wizardStep === 1 ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-900 text-zinc-600'}`}>1. FOCUS</div>
              <Icon icon="lucide:arrow-right" className="w-3 h-3 text-zinc-800" />
              <div className={`px-3 py-1 rounded-md border transition-all ${wizardStep === 2 ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-900 text-zinc-600'}`}>2. DIAGNOSTIC</div>
              <Icon icon="lucide:arrow-right" className="w-3 h-3 text-zinc-800" />
              <div className={`px-3 py-1 rounded-md border transition-all ${wizardStep === 3 ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-900 text-zinc-600'}`}>3. PACE</div>
              <Icon icon="lucide:arrow-right" className="w-3 h-3 text-zinc-800" />
              <div className={`px-3 py-1 rounded-md border transition-all ${wizardStep === 4 ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-900 text-zinc-600'}`}>4. SELECTION</div>
            </div>

            {/* STEP 1: Focus & Targets */}
            {wizardStep === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">What is your placement target?</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'faang', title: 'FAANG Target', desc: 'Google, Meta, Netflix. Deep focus on complex patterns and Medium/Hard problems.', icon: 'lucide:target' },
                      { id: 'startup', title: 'Product Startups', desc: 'Uber, Stripe, Coinbase. Focus on problem solving speed and Easy/Medium/Hard mix.', icon: 'lucide:rocket' },
                      { id: 'service', title: 'Service Companies', desc: 'TCS, Infosys, Accenture. Core concepts, data structure fundamentals & Easy/Medium problems.', icon: 'lucide:briefcase' }
                    ].map(card => (
                      <button 
                        key={card.id}
                        onClick={() => {
                          setTargetFocus(card.id);
                          if (card.id === 'faang') setGoal('Crack FAANG Interviews');
                          else if (card.id === 'startup') setGoal('Crack Product Startup Interviews');
                          else if (card.id === 'service') setGoal('Crack Service Company Screenings');
                        }}
                        className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${targetFocus === card.id ? 'border-violet-500 bg-violet-500/5' : 'border-zinc-900 bg-zinc-900/10 hover:border-zinc-800'}`}
                      >
                        <Icon icon={card.icon} className={`w-5 h-5 ${targetFocus === card.id ? 'text-violet-400' : 'text-zinc-500'}`} />
                        <span className="text-xs font-bold text-zinc-200">{card.title}</span>
                        <span className="text-[10px] text-zinc-500 leading-normal">{card.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Preferred Programming Language</label>
                  <div className="flex flex-wrap gap-2">
                    {['C++', 'Java', 'Python', 'JavaScript', 'Go'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-4 py-2 rounded-lg border text-xs font-mono transition-all ${selectedLanguage === lang ? 'border-violet-500/50 bg-violet-500/10 text-white' : 'border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 text-zinc-400'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Diagnostic Pattern Selection */}
            {wizardStep === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Patterns to Master</label>
                    <p className="text-[10px] text-zinc-500">Only the selected patterns will be included in your custom curriculum.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWeakTopics([
                        'Dynamic Programming', 'Graph Algorithms', 'Trees & Recursion',
                        'Sliding Window', 'Two Pointers', 'Binary Search',
                        'Heaps & Priority Queues', 'Stack & Queue puzzles', 'Hash Tables',
                        'Linked Lists', 'Backtracking'
                      ])}
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition-all border border-zinc-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeakTopics([])}
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition-all border border-zinc-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Dynamic Programming', 'Graph Algorithms', 'Trees & Recursion',
                    'Sliding Window', 'Two Pointers', 'Binary Search',
                    'Heaps & Priority Queues', 'Stack & Queue puzzles', 'Hash Tables',
                    'Linked Lists', 'Backtracking'
                  ].map(topic => {
                    const isSelected = weakTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        onClick={() => {
                          if (isSelected) {
                            setWeakTopics(weakTopics.filter(t => t !== topic));
                          } else {
                            setWeakTopics([...weakTopics, topic]);
                          }
                        }}
                        className={`p-3 rounded-lg border text-xs font-medium text-center transition-all ${isSelected ? 'border-violet-500/60 bg-violet-500/5 text-violet-300' : 'border-zinc-900 bg-zinc-900/10 text-zinc-400 hover:border-zinc-800'}`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Timeline & Pace */}
            {wizardStep === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Roadmap Duration</label>
                    <span className="text-xs font-mono font-bold text-violet-400">{targetWeeks} Weeks</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    value={targetWeeks} 
                    onChange={e => setTargetWeeks(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                    <span>1 Week (Fast revision)</span>
                    <span>12 Weeks (Full deep dive)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Daily Study Target</label>
                  <select 
                    value={commitment} 
                    onChange={(e) => setCommitment(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
                  >
                    <option value="1 hour / day">1 hour / day (Consistent pace)</option>
                    <option value="2 hours / day">2 hours / day (Moderate pace)</option>
                    <option value="4 hours / day">4 hours / day (Intensive preparation)</option>
                    <option value="6 hours / day">6 hours / day (FAANG Placement rush)</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Question Selection */}
            {wizardStep === 4 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Questions for Each Pattern</label>
                      <p className="text-[10px] text-zinc-500">Pick exactly which questions you want to master in your plan.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono font-bold">
                      {selectedQuestionIds.size} Selected
                    </span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 h-[380px] border border-zinc-900/60 rounded-xl overflow-hidden bg-zinc-950/20">
                  
                  {/* Left Column: Pattern Tabs */}
                  <div className="w-full md:w-1/3 border-r border-zinc-900/60 bg-zinc-950/40 p-2 overflow-y-auto space-y-1">
                    {activeCandidates.map(cand => {
                      const isActive = activeSelectionPattern === cand.pattern;
                      const patternPool = curatedQuestions.filter(q => q.primary_pattern === cand.pattern);
                      const selectedCount = patternPool.filter(q => selectedQuestionIds.has(q.leetcode_id)).length;
                      
                      return (
                        <button
                          key={cand.pattern}
                          type="button"
                          onClick={() => setActiveSelectionPattern(cand.pattern)}
                          className={`w-full text-left p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${isActive ? 'border-violet-500 bg-violet-500/5 text-white font-bold' : 'border-transparent text-zinc-400 hover:bg-zinc-900/40'}`}
                        >
                          <span className="truncate">{cand.pattern}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{selectedCount} / {patternPool.length} selected</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Column: Questions grouped by subpattern */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    {(() => {
                      if (!activeSelectionPattern) return <div className="text-xs text-zinc-500 text-center pt-12">Select a pattern to view questions</div>;
                      
                      const pool = curatedQuestions.filter(q => q.primary_pattern === activeSelectionPattern);
                      const subpatternPools = {};
                      pool.forEach(q => {
                        const sub = q.hidden_tags?.[0] || 'General Concepts';
                        if (!subpatternPools[sub]) subpatternPools[sub] = [];
                        subpatternPools[sub].push(q);
                      });

                      return (
                        <div className="space-y-6">
                          
                          {/* Quick Actions for active selection pattern */}
                          <div className="flex flex-wrap gap-2 pb-3 border-b border-zinc-900/60">
                            <button
                              type="button"
                              onClick={() => handleSelectAllForPattern(activeSelectionPattern)}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition-all border border-zinc-800"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeselectAllForPattern(activeSelectionPattern)}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition-all border border-zinc-800"
                            >
                              Deselect All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetToRecommendedForPattern(activeSelectionPattern)}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition-all border border-zinc-800"
                            >
                              Reset to Recommended
                            </button>
                          </div>

                          {/* Render Subpattern groups */}
                          {Object.keys(subpatternPools).map(sub => {
                            const groupQuestions = subpatternPools[sub];
                            return (
                              <div key={sub} className="space-y-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 font-mono">{sub}</h4>
                                <div className="space-y-1.5">
                                  {groupQuestions.map(q => {
                                    const isChecked = selectedQuestionIds.has(q.leetcode_id);
                                    return (
                                      <div
                                        key={q.leetcode_id}
                                        onClick={() => toggleQuestionId(q.leetcode_id)}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${isChecked ? 'border-zinc-800 bg-zinc-950/40' : 'border-transparent hover:bg-zinc-900/10'}`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <button
                                            type="button"
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-violet-600 border-violet-500 text-white' : 'border-zinc-800 bg-zinc-900'}`}
                                          >
                                            {isChecked && <Icon icon="lucide:check" className="w-2.5 h-2.5" />}
                                          </button>
                                          <span className={`text-zinc-300 ${isChecked ? '' : 'text-zinc-500'}`}>{q.title}</span>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${diffColor(q.difficulty)}`}>
                                          {q.difficulty}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </motion.div>
            )}

            {/* Step navigation actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
              {wizardStep > 1 ? (
                <button 
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all bg-zinc-900 border border-zinc-800"
                >
                  <Icon icon="lucide:arrow-left" className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <button 
                  onClick={handleAutoPlanner}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-violet-400 hover:text-white transition-all bg-violet-950/40 border border-violet-850 hover:border-violet-600 hover:bg-violet-900/20 active:scale-95 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                >
                  <Icon icon="lucide:sparkles" className="w-3.5 h-3.5 text-violet-400" /> Launch AI Auto-Planner
                </button>
              )}

              {wizardStep < 3 ? (
                <button 
                  disabled={wizardStep === 2 && weakTopics.length === 0}
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 hover:bg-zinc-800/60 ${wizardStep === 2 && weakTopics.length === 0 ? 'opacity-40 cursor-not-allowed border-zinc-950' : ''}`}
                >
                  Next Step <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                </button>
              ) : wizardStep === 3 ? (
                <button 
                  onClick={() => {
                    prepareQuestionSelection();
                    setWizardStep(4);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 hover:bg-zinc-800/60"
                >
                  Select Questions <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button 
                  onClick={handleBuildPlan}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold text-white transition-all bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95"
                >
                  <Icon icon="lucide:check-circle" className="w-3.5 h-3.5" /> Build Custom Workspace
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* ================= WORKSPACE INTERACTIVE VIEW ================= */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Page Icon Selector */}
            <div className="relative inline-block mb-2">
              <button 
                onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-center shadow-xl hover:border-violet-500/50 hover:bg-zinc-800/80 transition-all group"
              >
                <Icon icon={pageIcon} className="w-10 h-10 text-violet-400 group-hover:scale-110 transition-transform" />
              </button>
              
              <AnimatePresence>
                {isIconDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 mt-2 p-3 rounded-xl border border-zinc-850 bg-zinc-950 shadow-2xl z-50 grid grid-cols-5 gap-2 w-60"
                  >
                    {ICON_CHOICES.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => {
                          setPageIcon(ic);
                          setIsIconDropdownOpen(false);
                          saveWorkspaceToStorage(phases, goal, targetDate, commitment, ic, coverStyle);
                        }}
                        className={`p-2 rounded-lg border hover:bg-zinc-900 hover:border-zinc-700 transition-all ${pageIcon === ic ? 'border-violet-500/50 bg-violet-500/10' : 'border-transparent'}`}
                      >
                        <Icon icon={ic} className="w-5 h-5 text-zinc-300" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Headline and controls */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      saveWorkspaceToStorage(phases, e.target.value);
                    }}
                    className="w-full bg-transparent text-4xl font-extrabold text-white tracking-tight border-none outline-none focus:ring-0 placeholder-zinc-700 p-0"
                    placeholder="Untitled Study Plan"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleResetWorkspace}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800/80 hover:text-white hover:border-zinc-700 transition-all"
                  >
                    <Icon icon="lucide:refresh-cw" className="w-3.5 h-3.5" /> Reconfigure
                  </button>
                </div>
              </div>
            </div>

            {/* Database Properties block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 py-6 border-b border-zinc-800/60 text-xs">
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-28 text-zinc-500 flex items-center gap-1.5"><Icon icon="lucide:calendar" className="w-3.5 h-3.5" /> Target Date</span>
                  <input 
                    type="date" 
                    value={targetDate} 
                    onChange={(e) => {
                      setTargetDate(e.target.value);
                      saveWorkspaceToStorage(phases, goal, e.target.value);
                    }}
                    className="bg-transparent border-none outline-none text-zinc-200 focus:ring-0 p-0 cursor-pointer font-mono"
                  />
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-zinc-500 flex items-center gap-1.5"><Icon icon="lucide:clock" className="w-3.5 h-3.5" /> Daily target</span>
                  <select 
                    value={commitment} 
                    onChange={(e) => {
                      setCommitment(e.target.value);
                      saveWorkspaceToStorage(phases, goal, targetDate, e.target.value);
                    }}
                    className="bg-transparent border-none outline-none text-zinc-200 focus:ring-0 p-0 cursor-pointer"
                  >
                    <option value="1 hour / day" className="bg-zinc-950">1 hour / day</option>
                    <option value="2 hours / day" className="bg-zinc-950">2 hours / day</option>
                    <option value="4 hours / day" className="bg-zinc-950">4 hours / day</option>
                    <option value="6 hours / day" className="bg-zinc-950">6 hours / day</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-28 text-zinc-500 flex items-center gap-1.5"><Icon icon="lucide:trending-up" className="w-3.5 h-3.5" /> Total Progress</span>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden max-w-[120px]">
                      <div className="h-full bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]" style={{ width: `${overallProgress}%` }} />
                    </div>
                    <span className="font-mono text-zinc-300">{overallProgress}%</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-zinc-500 flex items-center gap-1.5"><Icon icon="lucide:cpu" className="w-3.5 h-3.5" /> Engine Status</span>
                  {apiKey ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wide font-mono">
                      ACTIVE (AI PLAN)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold tracking-wide font-mono">
                      LOCAL BLUEPRINT Fallback
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* View selectors */}
            <div className="flex items-center gap-1 border-b border-zinc-850 mt-6 pb-px text-xs font-medium text-zinc-400">
              {[
                { id: 'workspace', label: 'Workspace View', icon: 'lucide:file-text' },
                { id: 'board', label: 'Board View', icon: 'lucide:kanban' },
                { id: 'timeline', label: 'Timeline View', icon: 'lucide:git-commit' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 -mb-px transition-all hover:text-zinc-200 relative ${activeTab === tab.id ? 'text-white font-semibold' : 'border-transparent'}`}
                >
                  <Icon icon={tab.icon} className="w-3.5 h-3.5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTabIndicator" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.8)]" 
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab panel container */}
            <div className="py-4">
              
              {/* Workspace View */}
              {activeTab === 'workspace' && (
                <div className="space-y-6">
                  
                  {/* Insight Callout */}
                  <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <Icon icon="lucide:info" className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-zinc-200">AI Co-pilot Insight: </span>
                      Based on target goal <span className="text-zinc-200">"{goal}"</span>, we suggest mastering fundamental patterns sequentially. Press <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 font-mono text-[10px] text-zinc-300">Generate Plan</code> above to rebuild target problems using advanced ML patterns.
                    </div>
                  </div>

                  {/* Toggle list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase font-mono">Roadmap Nodes</span>
                      <button 
                        onClick={() => {
                          const newPhase = {
                            title: 'New Study Phase',
                            description: 'Define your focus topics and key concepts for this week.',
                            status: 'PENDING',
                            week: `Week ${phases.length * 2 + 1}-${phases.length * 2 + 2}`,
                            problems: [{ name: 'Sample Problem 1 [in C++]', difficulty: 'Medium', completed: false, leetcode_id: 1 }]
                          };
                          const updated = [...phases, newPhase];
                          setPhases(updated);
                          setActiveTogglePhase(phases.length);
                          saveWorkspaceToStorage(updated);
                        }}
                        className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-all font-semibold"
                      >
                        <Icon icon="lucide:plus" className="w-3.5 h-3.5" /> Add Phase
                      </button>
                    </div>

                    <div className="space-y-2">
                      {phases.map((phase, pIdx) => {
                        const isOpen = activeTogglePhase === pIdx;
                        const total = phase.problems?.length || 0;
                        const completed = phase.problems?.filter(pr => pr.completed).length || 0;
                        return (
                          <div key={pIdx} className="rounded-xl border border-zinc-850 bg-zinc-950/40 overflow-hidden transition-all hover:border-zinc-700/60">
                            
                            {/* Toggle header */}
                            <div className="flex items-center justify-between p-4 cursor-pointer select-none" onClick={() => setActiveTogglePhase(isOpen ? -1 : pIdx)}>
                              <div className="flex items-center gap-3">
                                <Icon 
                                  icon="lucide:chevron-right" 
                                  className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-90 text-violet-400' : ''}`} 
                                />
                                <div>
                                  <span className="text-xs text-zinc-500 font-mono mr-2">{phase.week}</span>
                                  <span className="text-sm font-bold text-zinc-200">{phase.title}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-xs text-zinc-500 font-mono">{completed}/{total} solved</span>
                                <select 
                                  value={phase.status} 
                                  onClick={(e) => e.stopPropagation()} 
                                  onChange={(e) => handleChangePhaseStatus(pIdx, e.target.value)}
                                  className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-2 py-1 outline-none text-zinc-300 cursor-pointer"
                                >
                                  <option value="PENDING">To Do</option>
                                  <option value="ACTIVE">In Progress</option>
                                  <option value="DONE">Done</option>
                                </select>
                              </div>
                            </div>

                            {/* Toggle Inner Content */}
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 pt-0 border-t border-zinc-900 bg-zinc-900/10 space-y-4 text-xs">
                                    <p className="text-zinc-400 leading-relaxed pt-3">{phase.description}</p>
                                    
                                    <div className="space-y-3">
                                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Curated Modules & Subpatterns</div>
                                      
                                      {(() => {
                                        const grouped = {};
                                        phase.problems?.forEach((prob, prIdx) => {
                                          const sub = prob.subpattern || 'General Concepts';
                                          if (!grouped[sub]) grouped[sub] = [];
                                          grouped[sub].push({ ...prob, originalIndex: prIdx });
                                        });

                                        return Object.keys(grouped).map((subName) => {
                                          const subProblems = grouped[subName];
                                          const subKey = `${pIdx}-${subName}`;
                                          const isSubOpen = openSubpatterns[subKey] !== false;
                                          const solvedCount = subProblems.filter(p => p.completed).length;
                                          const totalCount = subProblems.length;

                                          return (
                                            <div key={subName} className="border border-zinc-900 bg-zinc-950/20 rounded-lg overflow-hidden">
                                              
                                              {/* Subpattern Header */}
                                              <div 
                                                onClick={() => toggleSubpattern(pIdx, subName)}
                                                className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all cursor-pointer select-none text-xs"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Icon 
                                                    icon="lucide:chevron-right" 
                                                    className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isSubOpen ? 'rotate-90 text-violet-400' : ''}`} 
                                                  />
                                                  <span className="font-semibold text-zinc-300">{subName}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 font-mono">{solvedCount}/{totalCount} solved</span>
                                              </div>

                                              {/* Subpattern Content */}
                                              <AnimatePresence initial={false}>
                                                {isSubOpen && (
                                                  <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden"
                                                  >
                                                    <div className="p-3 bg-zinc-900/5 space-y-2 border-t border-zinc-900/40">
                                                      {subProblems.map((prob) => (
                                                        <div key={prob.originalIndex} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-900/40 bg-zinc-950/40 hover:border-zinc-800 transition-all text-xs">
                                                          <div className="flex items-center gap-3">
                                                            <button 
                                                              onClick={() => handleToggleProblem(pIdx, prob.originalIndex)}
                                                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${prob.completed ? 'bg-violet-600 border-violet-500 text-white' : 'border-zinc-800 bg-zinc-900'}`}
                                                            >
                                                              {prob.completed && <Icon icon="lucide:check" className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <span className={`text-zinc-300 ${prob.completed ? 'line-through text-zinc-650' : ''}`}>{prob.name}</span>
                                                            {prob.link && (
                                                              <a
                                                                href={prob.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-zinc-500 hover:text-violet-400 transition-colors flex items-center justify-center ml-1"
                                                                title="Open in LeetCode"
                                                              >
                                                                <Icon icon="lucide:external-link" className="w-3.5 h-3.5" />
                                                              </a>
                                                            )}
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-[9px] text-zinc-600 font-mono">ID: {prob.leetcode_id}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${diffColor(prob.difficulty)}`}>{prob.difficulty}</span>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>

                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Board View */}
              {activeTab === 'board' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { status: 'PENDING', label: 'To Do', border: 'border-t-zinc-600', color: 'text-zinc-400', count: phases.filter(p => p.status === 'PENDING').length },
                    { status: 'ACTIVE', label: 'In Progress', border: 'border-t-amber-500', color: 'text-amber-400', count: phases.filter(p => p.status === 'ACTIVE').length },
                    { status: 'DONE', label: 'Completed', border: 'border-t-emerald-500', color: 'text-emerald-400', count: phases.filter(p => p.status === 'DONE').length },
                  ].map((col) => (
                    <div key={col.status} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${col.status === 'PENDING' ? 'bg-zinc-600' : col.status === 'ACTIVE' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="text-xs font-bold text-zinc-300">{col.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono">{col.count}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {phases.filter(phase => phase.status === col.status).map((phase) => {
                          const phaseIdx = phases.findIndex(p => p.title === phase.title);
                          const totalPr = phase.problems?.length || 0;
                          const donePr = phase.problems?.filter(pr => pr.completed).length || 0;
                          return (
                            <div 
                              key={phase.title} 
                              className={`p-4 rounded-xl border border-zinc-850 bg-zinc-950/40 flex flex-col gap-3 shadow-md hover:border-zinc-700/80 transition-all border-t-2 ${col.border}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-zinc-200 leading-tight">{phase.title}</span>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">{phase.week}</span>
                              </div>
                              
                              <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{phase.description}</p>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-zinc-900 mt-1">
                                <span className="text-[10px] text-zinc-400 font-mono">{donePr}/{totalPr} Solved</span>
                                <select 
                                  value={phase.status} 
                                  onChange={(e) => handleChangePhaseStatus(phaseIdx, e.target.value)}
                                  className="text-[10px] bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 outline-none text-zinc-300 cursor-pointer"
                                >
                                  <option value="PENDING">To Do</option>
                                  <option value="ACTIVE">In Progress</option>
                                  <option value="DONE">Done</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}

                        {col.count === 0 && (
                          <div className="p-6 text-center border border-dashed border-zinc-900 rounded-xl text-zinc-650 text-xs">
                            No phases here
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline View */}
              {activeTab === 'timeline' && (
                <div className="rounded-xl border border-zinc-850 bg-zinc-950/40 overflow-hidden text-xs">
                  
                  {/* Timeline Header Row */}
                  <div className="flex border-b border-zinc-900 bg-zinc-900/30">
                    <div className="w-1/3 p-4 font-semibold text-zinc-400 border-r border-zinc-900 font-mono">Roadmap Item</div>
                    <div 
                      className="flex-1 grid text-center font-mono text-[10px] text-zinc-500"
                      style={{ gridTemplateColumns: `repeat(${targetWeeks}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: targetWeeks }, (_, i) => (
                        <div key={i} className="py-4 border-r border-zinc-900/40 last:border-r-0">W{i+1}</div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Items */}
                  <div className="divide-y divide-zinc-900">
                    {phases.map((phase, pIdx) => {
                      const { start, span } = parseWeekRange(phase.week);
                      const clampedStart = Math.max(1, Math.min(start, targetWeeks));
                      const clampedSpan = Math.min(span, targetWeeks + 1 - clampedStart);
                      
                      return (
                        <div key={pIdx} className="flex hover:bg-zinc-900/10 transition-colors">
                          <div className="w-1/3 p-4 border-r border-zinc-900 flex flex-col gap-1 justify-center">
                            <span className="font-bold text-zinc-200">{phase.title}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{phase.week}</span>
                          </div>
                          
                          <div 
                            className="flex-1 grid relative py-6 items-center"
                            style={{ gridTemplateColumns: `repeat(${targetWeeks}, minmax(0, 1fr))` }}
                          >
                            <div 
                              className="h-6 rounded-lg flex items-center justify-between px-3 text-[10px] font-bold text-white transition-all shadow-lg"
                              style={{
                                gridColumnStart: clampedStart,
                                gridColumnSpan: clampedSpan,
                                background: phase.status === 'DONE' 
                                  ? 'linear-gradient(90deg, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.5) 100%)' 
                                  : phase.status === 'ACTIVE' 
                                  ? 'linear-gradient(90deg, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.5) 100%)' 
                                  : 'linear-gradient(90deg, rgba(124,58,237,0.2) 0%, rgba(124,58,237,0.4) 100%)',
                                border: phase.status === 'DONE' 
                                  ? '1px solid rgba(16,185,129,0.3)' 
                                  : phase.status === 'ACTIVE' 
                                  ? '1px solid rgba(245,158,11,0.3)' 
                                  : '1px solid rgba(124,58,237,0.3)'
                              }}
                            >
                              <span className="truncate">{phase.title}</span>
                              <span className="shrink-0 font-mono text-[9px] opacity-75">{phase.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}


