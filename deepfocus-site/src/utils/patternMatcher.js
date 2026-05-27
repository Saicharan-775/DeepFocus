import curatedQuestions from '../constants/Patterns/curated_questions.json';
import patternPriority from '../constants/Patterns/pattern_priority.json';
import patternsData from '../constants/Patterns/patterns.json';
import aliasMap from '../constants/Patterns/pattern_alias_map.json';

export const patternsList = patternsData.patterns;
export const patternPriorityMap = patternPriority;

// Helper to normalize problem titles (lowercase, strip leading digits/punctuation, strip non-alphanumeric)
export function normalizeTitle(title) {
  if (!title) return "";
  let clean = title.toLowerCase().trim();
  clean = clean.replace(/^\d+[\.\-\s]*/, ""); // strip leading numbers like "51. ", "51 ", "51-"
  clean = clean.replace(/[^a-z0-9]/g, ""); // strip non-alphanumeric characters
  return clean;
}

// Helper to extract and normalize slug from problem link
export function getSlugFromLink(url) {
  if (!url) return "";
  const match = url.match(/\/problems\/([^\/]+)/);
  if (!match) return "";
  let slug = match[1].toLowerCase().trim();
  slug = slug.replace(/^\d+[\.\-\s]*/, ""); // strip leading numbers from slug
  slug = slug.replace(/[^a-z0-9]/g, ""); // strip non-alphanumeric characters
  return slug;
}

// Build a map of curated questions indexed by both normalized title and normalized slug
const normalizedCuratedMap = {};
curatedQuestions.forEach(q => {
  const normTitle = normalizeTitle(q.title);
  if (normTitle) {
    normalizedCuratedMap[normTitle] = q;
  }
  const slug = q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const normSlug = getSlugFromLink(`/problems/${slug}/`);
  if (normSlug && normSlug !== normTitle) {
    normalizedCuratedMap[normSlug] = q;
  }
});

// Retrieve curated question data based on title or link
export function getProblemData(title, link = "") {
  if (title) {
    const normTitle = normalizeTitle(title);
    if (normalizedCuratedMap[normTitle]) {
      return normalizedCuratedMap[normTitle];
    }
  }
  if (link) {
    const normSlug = getSlugFromLink(link);
    if (normalizedCuratedMap[normSlug]) {
      return normalizedCuratedMap[normSlug];
    }
  }
  return null;
}

// Simple deterministic tag/title matcher for unknown questions
export function getProblemPattern(title, tags = [], link = "") {
  if (!title) return "Other";
  
  // 1. Search in curated questions using normalized lookup
  const cq = getProblemData(title, link);
  if (cq) {
    return cq.primary_pattern;
  }
  
  const lowerTitle = title.toLowerCase();
  
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

