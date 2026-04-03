import { topics } from "../data/library/topics";
import { patterns } from "../data/library/patterns";
import { githubResources as resources } from "../data/library/resources";

/**
 * 🚀 LIBRARY SERVICE (Utility Layer)
 * 
 * This service currently uses local static arrays to return data. 
 * Because each function returns a Promise, you can easily swap the 
 * internal implementation to `fetch('/api/...')` later with ZERO 
 * changes to the UI components calling these functions!
 */

// Simulate network delay for testing loading states (optional)
const delay = (ms = 100) => new Promise(res => setTimeout(res, ms));

export const getTopics = async () => {
  await delay();
  return topics;
};

export const getPatternsByTopic = async (topicId) => {
  await delay();
  if (!topicId) return patterns;
  return patterns.filter(p => p.topicId === topicId);
};

export const getResourcesByPattern = async (patternId) => {
  await delay();
  if (!patternId) return resources;
  return resources.filter(r => r.patternId === patternId);
};

export const getAllResources = async () => {
  await delay();
  return resources;
};

/**
 * Weekly Recommendation Logic
 * 
 * Input: array of weak topic IDs (e.g. ['dp', 'graphs'])
 * Output: 3-5 recommended resources mapped to their patterns.
 * Priority: Focus on 'Beginner' level if possible, and high quality.
 */
export const getWeeklyRecommendations = async (weakTopicIds) => {
  await delay();

  // 1. Find all patterns belonging to the weak topics.
  const weakPatterns = patterns.filter(p => weakTopicIds.includes(p.topicId));
  
  // 2. Prioritize 'Beginner' patterns for weak topics
  weakPatterns.sort((a, b) => {
    if (a.level === 'Beginner' && b.level !== 'Beginner') return -1;
    if (a.level !== 'Beginner' && b.level === 'Beginner') return 1;
    return 0;
  });

  // Extract pattern IDs
  const targetPatternIds = weakPatterns.map(p => p.id);

  // 3. Find resources that map to these patterns
  let recommendedResources = resources.filter(r => targetPatternIds.includes(r.patternId));

  // 4. Sort by quality (highest rating first)
  recommendedResources.sort((a, b) => b.quality - a.quality);

  // 5. Build full DTO response, attaching pattern info to the resource for the UI
  // Limit to Top 3 results 
  const topRecommendations = recommendedResources.slice(0, 3).map(res => {
    const parentPattern = patterns.find(p => p.id === res.patternId);
    
    return {
      id: res.id,
      type: res.type,
      title: res.title,
      description: parentPattern ? parentPattern.name : res.title,
      topic: parentPattern ? topics.find(t => t.id === parentPattern.topicId)?.title : 'Unknown Focus',
      time: `${res.readTime} min`,
      level: parentPattern ? parentPattern.level : "Beginner",
      url: res.url,
      // Default to recommended state initially
      state: "Recommended" 
    };
  });

  return {
    title: "This Week's Focus",
    subtitle: `Based on your weak areas`,
    completed: 0,
    total: topRecommendations.length,
    cards: topRecommendations
  };
};

/**
 * Helper to build the nested library view easily.
 * Groups patterns and resources under their topics.
 */
export const getGroupedLibraryData = async () => {
  await delay();
  
  // Return an array shaped for the UI
  return topics.map(topic => {
    // Find patterns for this topic
    const topicPatterns = patterns.filter(p => p.topicId === topic.id);
    
    // Find all resources for all patterns in this topic
    const topicPatternIds = topicPatterns.map(p => p.id);
    const topicResources = resources.filter(r => topicPatternIds.includes(r.patternId));
    
    if (topicResources.length === 0) return null;

    // Map resources to UI format
    const formattedResources = topicResources.map(res => {
      const p = patterns.find(pat => pat.id === res.patternId);
      return {
        id: res.id,
        title: res.title,
        type: res.type,
        level: p ? p.level : 'Medium',
        source: res.source,
        rating: res.quality,
        time: `${res.readTime} min`,
        url: res.url,
        isSaved: false,
        isCompleted: false,
      };
    });

    return {
      id: topic.id,
      topic: topic.title,
      resources: formattedResources
    };
  }).filter(Boolean); // removes topics with 0 resources
};
