const PLANNER_STORAGE_KEY = 'df_custom_planner_data';

export const getPlannerApiKey = () => {
  const provider = localStorage.getItem('df_ai_provider') || 'demo';
  const openrouterKey = localStorage.getItem('df_openrouter_api_key');
  const groqKey = localStorage.getItem('df_groq_api_key');
  const openaiKey = localStorage.getItem('df_openai_key');

  return provider === 'demo' ? 'demo_active' : (openrouterKey || groqKey || openaiKey);
};

export const loadPlannerData = () => {
  const savedPlan = localStorage.getItem(PLANNER_STORAGE_KEY);
  if (!savedPlan) return null;
  return JSON.parse(savedPlan);
};

export const savePlannerData = ({ phases, goal, targetDate, commitment, pageIcon, coverStyle }) => {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
    phases,
    goal,
    targetDate,
    commitment,
    pageIcon,
    coverStyle
  }));
};

export const clearPlannerData = () => {
  localStorage.removeItem(PLANNER_STORAGE_KEY);
};
