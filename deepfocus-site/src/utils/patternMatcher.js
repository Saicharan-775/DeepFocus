import curatedQuestions from '../constants/Patterns/curated_questions.json';
import patternPriority from '../constants/Patterns/pattern_priority.json';
import patternsData from '../constants/Patterns/patterns.json';
import aliasMap from '../constants/Patterns/pattern_alias_map.json';

const exactMatchMap = {};
curatedQuestions.forEach(q => {
  exactMatchMap[q.title.toLowerCase()] = q;
});

export const patternsList = patternsData.patterns;
export const patternPriorityMap = patternPriority;

// Simple deterministic tag/title matcher for unknown questions
export function getProblemPattern(title, tags = []) {
  if (!title) return "Other";
  
  const lowerTitle = title.toLowerCase();
  
  // 1. Search in curated_questions.json
  if (exactMatchMap[lowerTitle]) {
    return exactMatchMap[lowerTitle].primary_pattern;
  }
  
  // 2. Deterministic logic based on tags and title keywords
  const combinedKeywords = [...tags, ...lowerTitle.split(/\s+/)].map(k => k.toLowerCase());
  
  // Potential matches array
  const matches = [];

  combinedKeywords.forEach(word => {
    // Check aliases first
    for (const [alias, primary] of Object.entries(aliasMap)) {
      if (word.includes(alias.toLowerCase())) {
        matches.push(primary);
      }
    }
    
    // Check primary patterns directly
    patternsList.forEach(p => {
      if (word.includes(p.toLowerCase())) {
        matches.push(p);
      }
    });
  });

  // Also do some hardcoded heuristics for common DSA terms missing in exact aliases
  if (lowerTitle.includes("tree")) matches.push("Trees");
  if (lowerTitle.includes("graph") || lowerTitle.includes("island") || lowerTitle.includes("pacific")) matches.push("Graphs");
  if (lowerTitle.includes("window") || lowerTitle.includes("substring") || lowerTitle.includes("subarray sum")) matches.push("Sliding Window");
  if (lowerTitle.includes("sum") && !lowerTitle.includes("subarray")) matches.push("Two Pointers");
  if (lowerTitle.includes("pointer") || lowerTitle.includes("palindrome")) matches.push("Two Pointers");
  if (lowerTitle.includes("interval")) matches.push("Sweep Line");
  if (lowerTitle.includes("sort")) matches.push("Arrays & Matrices");
  if (lowerTitle.includes("search in rotated") || lowerTitle.includes("minimum in rotated")) matches.push("Binary Search");

  if (matches.length === 0) return "Arrays & Matrices"; // Ultimate fallback

  // Return highest priority match
  let bestPattern = matches[0];
  let bestScore = patternPriorityMap[bestPattern] || 0;

  for (let i = 1; i < matches.length; i++) {
    const score = patternPriorityMap[matches[i]] || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPattern = matches[i];
    }
  }

  return bestPattern;
}

export function getProblemData(title) {
  const lowerTitle = title.toLowerCase();
  if (exactMatchMap[lowerTitle]) return exactMatchMap[lowerTitle];
  return null;
}
