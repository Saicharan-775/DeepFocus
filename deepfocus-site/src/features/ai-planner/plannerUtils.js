import curatedQuestions from '../../constants/Patterns/curated_questions.json';
import {
  DEFAULT_WEAK_TOPICS,
  PATTERN_MAPPING,
  PATTERN_WEIGHTS,
  PREREQUISITE_ORDER,
  SERVICE_TOPICS,
  STARTUP_TOPICS,
  TOPIC_WEIGHTS
} from './plannerConstants';

const SUBPATTERN_FALLBACK = 'General Concepts';

export const diffColor = (difficulty) =>
  difficulty === 'Easy' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
  difficulty === 'Hard' ? 'text-rose-400 bg-rose-400/10 border-rose-400/20' :
  'text-amber-400 bg-amber-400/10 border-amber-400/20';

export const splitIntoGroups = (array, n) => {
  if (array.length === 0) return [[]];
  const groupCount = Math.max(1, Math.min(n, array.length));
  const size = Math.ceil(array.length / groupCount);
  const groups = [];

  for (let index = 0; index < array.length; index += size) {
    groups.push(array.slice(index, index + size));
  }

  return groups;
};

export const getDefaultTopicsForFocus = (focus) => {
  if (focus === 'startup') return STARTUP_TOPICS;
  if (focus === 'service') return SERVICE_TOPICS;
  return DEFAULT_WEAK_TOPICS;
};

export const predictWeeks = (topics, commit) => {
  if (!topics || topics.length === 0) return 2;

  const sum = topics.reduce((total, topic) => total + (TOPIC_WEIGHTS[topic] || 1.0), 0);
  let multiplier = 1.0;

  if (commit === '1 hour / day') multiplier = 1.5;
  else if (commit === '4 hours / day') multiplier = 0.7;
  else if (commit === '6 hours / day') multiplier = 0.5;

  const predicted = Math.round(sum * multiplier);
  return Math.max(1, Math.min(12, predicted));
};

export const getDifficultyOrder = (focus) => {
  if (focus === 'faang') return ['Medium', 'Hard', 'Easy'];
  if (focus === 'startup') return ['Medium', 'Easy', 'Hard'];
  return ['Easy', 'Medium', 'Hard'];
};

export const getCandidateAllocations = (_focus, weak, weeks) => {
  const weakPatternsMapped = weak.map((topic) => PATTERN_MAPPING[topic] || topic);
  const candidateSet = new Set(weakPatternsMapped);
  const finalCandidates = PREREQUISITE_ORDER.filter((pattern) => candidateSet.has(pattern));
  finalCandidates.push(...Array.from(candidateSet).filter((pattern) => !PREREQUISITE_ORDER.includes(pattern)));

  const candidateAllocations = finalCandidates.map((pattern) => {
    const baseWeight = PATTERN_WEIGHTS[pattern] || 1.0;
    const isWeak = weakPatternsMapped.includes(pattern);
    const amplifiedWeight = isWeak ? baseWeight * 1.4 : baseWeight;
    const patternPool = curatedQuestions.filter((question) => question.primary_pattern === pattern);
    const subSet = new Set(patternPool.map((question) => question.hidden_tags?.[0] || SUBPATTERN_FALLBACK));
    const ideal = amplifiedWeight >= 1.8 && subSet.size > 1 ? 2 : 1;

    return { pattern, isWeak, ideal, allocated: 0 };
  });

  let currentSum = 0;
  const activeCandidates = [];

  for (const candidate of candidateAllocations) {
    if (currentSum >= weeks) break;

    const toAllocate = Math.min(candidate.ideal, weeks - currentSum);
    candidate.allocated = toAllocate;
    currentSum += toAllocate;
    activeCandidates.push(candidate);
  }

  currentSum = fillCandidateAllocations(activeCandidates, currentSum, weeks, (candidate) =>
    candidate.allocated < 2 && candidate.isWeak
  );
  currentSum = fillCandidateAllocations(activeCandidates, currentSum, weeks, (candidate) =>
    candidate.allocated < 2 && (PATTERN_WEIGHTS[candidate.pattern] || 1.0) >= 1.5
  );
  currentSum = fillCandidateAllocations(activeCandidates, currentSum, weeks, (candidate) =>
    candidate.allocated < 2
  );

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

const fillCandidateAllocations = (candidates, currentSum, weeks, canAllocate) => {
  let nextSum = currentSum;
  for (const candidate of candidates) {
    if (nextSum >= weeks) break;
    if (canAllocate(candidate)) {
      candidate.allocated += 1;
      nextSum += 1;
    }
  }
  return nextSum;
};

export const getRecommendedQuestionIds = ({ candidates, focus, commitment }) => {
  const recommendedIds = new Set();
  candidates.forEach((candidate) => {
    addRecommendedIdsForCandidate(recommendedIds, candidate, focus, commitment);
  });
  return recommendedIds;
};

export const getRecommendedQuestionIdsForPattern = ({ pattern, allocated = 1, focus, commitment }) => {
  const recommendedIds = new Set();
  addRecommendedIdsForCandidate(recommendedIds, { pattern, allocated }, focus, commitment);
  return recommendedIds;
};

const addRecommendedIdsForCandidate = (recommendedIds, candidate, focus, commitment) => {
  const pool = curatedQuestions.filter((question) => question.primary_pattern === candidate.pattern);
  const subpatterns = [...new Set(pool.map((question) => question.hidden_tags?.[0] || SUBPATTERN_FALLBACK))];
  const maxPerSub = commitment.includes('1 hour') ? 1 : commitment.includes('6 hours') ? 3 : 2;
  const subpatternGroups = splitIntoGroups(subpatterns, candidate.allocated);
  const diffOrder = getDifficultyOrder(focus);

  subpatternGroups.forEach((groupSubpatterns) => {
    groupSubpatterns.forEach((subpattern) => {
      const subPool = pool.filter((question) => (question.hidden_tags?.[0] || SUBPATTERN_FALLBACK) === subpattern);
      const sortedSubPool = sortQuestionsByDifficulty(subPool, diffOrder);
      sortedSubPool.slice(0, Math.min(maxPerSub, sortedSubPool.length)).forEach((question) => {
        recommendedIds.add(question.leetcode_id);
      });
    });

    const selectedCount = pool.filter((question) =>
      recommendedIds.has(question.leetcode_id) &&
      groupSubpatterns.includes(question.hidden_tags?.[0] || SUBPATTERN_FALLBACK)
    ).length;

    if (selectedCount < 3) {
      const extraPool = pool.filter((question) =>
        groupSubpatterns.includes(question.hidden_tags?.[0] || SUBPATTERN_FALLBACK)
      );
      let added = 0;

      for (const question of sortQuestionsByDifficulty(extraPool, diffOrder)) {
        if (selectedCount + added >= 3) break;
        if (!recommendedIds.has(question.leetcode_id)) {
          recommendedIds.add(question.leetcode_id);
          added += 1;
        }
      }
    }
  });
};

export const generateLocalPlan = ({ focus, weakTopics, weeks, commitment, selectedQuestionIds }) => {
  const candWeeks = getCandidateAllocations(focus, weakTopics, weeks);
  const roadmapPhases = [];
  let weekCounter = 1;

  candWeeks.forEach((candidate) => {
    const pool = curatedQuestions.filter((question) => question.primary_pattern === candidate.pattern);
    const subpatterns = [...new Set(pool.map((question) => question.hidden_tags?.[0] || SUBPATTERN_FALLBACK))];
    const subpatternGroups = splitIntoGroups(subpatterns, candidate.allocated);

    subpatternGroups.forEach((groupSubpatterns) => {
      const weekStr = `Week ${weekCounter}`;
      const problemsSelected = getSelectedProblems({
        pool,
        groupSubpatterns,
        selectedQuestionIds
      });

      weekCounter += 1;

      if (problemsSelected.length < 3) {
        addFallbackProblems({
          problemsSelected,
          pool,
          groupSubpatterns,
          focus
        });
      }

      if (problemsSelected.length === 0) {
        problemsSelected.push({
          name: `${candidate.pattern} Core Concept Quiz`,
          difficulty: 'Medium',
          completed: false,
          leetcode_id: 9999,
          link: `https://leetcode.com/problemset/all/?search=${encodeURIComponent(candidate.pattern)}`,
          subpattern: SUBPATTERN_FALLBACK
        });
      }

      roadmapPhases.push(createRoadmapPhase(candidate.pattern, groupSubpatterns, weekStr, problemsSelected));
    });
  });

  return roadmapPhases;
};

const getSelectedProblems = ({ pool, groupSubpatterns, selectedQuestionIds }) => {
  const problems = [];

  groupSubpatterns.forEach((subpattern) => {
    const subPool = pool.filter((question) => (question.hidden_tags?.[0] || SUBPATTERN_FALLBACK) === subpattern);
    const selected = subPool.filter((question) => selectedQuestionIds.has(question.leetcode_id));

    selected.forEach((question) => {
        problems.push(toPlannerProblem(question, subpattern));
    });
  });

  return problems;
};

const addFallbackProblems = ({ problemsSelected, pool, groupSubpatterns, focus }) => {
  const chosenIds = new Set(problemsSelected.map((problem) => problem.leetcode_id));

  for (const subpattern of groupSubpatterns) {
    const subPool = pool.filter((question) => (question.hidden_tags?.[0] || SUBPATTERN_FALLBACK) === subpattern);

    for (const question of sortQuestionsByDifficulty(subPool, getDifficultyOrder(focus))) {
      if (problemsSelected.length >= 3) break;
      if (!chosenIds.has(question.leetcode_id)) {
        chosenIds.add(question.leetcode_id);
        problemsSelected.push(toPlannerProblem(question, subpattern));
      }
    }
  }
};

const toPlannerProblem = (question, subpattern) => ({
  name: question.title,
  difficulty: question.difficulty,
  completed: false,
  leetcode_id: question.leetcode_id,
  link: getLeetCodeUrl(question.title),
  subpattern
});

export const getLeetCodeUrl = (title) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return `https://leetcode.com/problems/${slug}/`;
};

const sortQuestionsByDifficulty = (questions, diffOrder) =>
  [...questions].sort((a, b) => diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty));

const createRoadmapPhase = (pattern, groupSubpatterns, week, problems) => {
  const displaySubpatterns = groupSubpatterns.slice(0, 2).join(' & ');
  const subpatternList = groupSubpatterns.join(', ');
  const title = groupSubpatterns.length > 2
    ? `${pattern}: ${displaySubpatterns} & More`
    : `${pattern}: ${displaySubpatterns}`;

  return {
    title,
    description: `Focus on mastering the following subpatterns: ${subpatternList}. Each subpattern represents a specific problem solving structure. Solve the curated problems below to build strong visual and mathematical intuition.`,
    status: 'PENDING',
    week,
    problems
  };
};

export const migrateSavedPhases = (phases = []) =>
  phases.map((phase) => ({
    ...phase,
    problems: (phase.problems || []).map((problem) => {
      const match = curatedQuestions.find((question) => question.leetcode_id === problem.leetcode_id);

      return {
        ...problem,
        name: typeof problem.name === 'string' ? problem.name.replace(/\s+\[in [^\]]+\]$/, '') : problem.name,
        link: problem.link || (match ? getLeetCodeUrl(match.title) : ''),
        subpattern: problem.subpattern || (match?.hidden_tags?.[0] || SUBPATTERN_FALLBACK)
      };
    })
  }));

export const parseWeekRange = (weekStr) => {
  const match = weekStr.match(/\d+/g);
  if (!match) return { start: 1, span: 2 };
  const nums = match.map(Number);
  if (nums.length === 1) return { start: nums[0], span: 1 };
  return { start: nums[0], span: (nums[1] - nums[0]) + 1 };
};
