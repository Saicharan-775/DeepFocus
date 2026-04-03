importScripts("config.js");

// Default Focus State
const defaultState = {
  focusActive: false,
  sessionStartAt: null,
  durationSeconds: 0,
  tabSwitches: 0,
  score: 100,
  focusTabId: null,
};

// Initialize State and Self-Inject into open tabs for "No Refresh" feel
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['focusState', 'analytics', 'history'], (res) => {
    if (!res.focusState) chrome.storage.local.set({ focusState: defaultState });
    if (!res.analytics) chrome.storage.local.set({ analytics: { streak: 0, lastFocusDay: null, avgScore: 100, totalSessions: 0 } });
    if (!res.history) chrome.storage.local.set({ history: [] });
  });

  // SELF-INJECTION: Re-attach to LeetCode tabs so no refresh is needed
  chrome.tabs.query({ url: ['*://*.leetcode.com/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.url.includes('leetcode.com')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['config.js', 'utils/soundManager.js', 'content.js']
        }).catch(() => {});
      }
    }
  });
});

// Helper to get current state
async function getFocusState() {
  const data = await chrome.storage.local.get(['focusState']);
  return data.focusState || defaultState;
}

// Helper to save state
async function updateFocusState(newState) {
  await chrome.storage.local.set({ focusState: newState });
  // Notify interested parts
  chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATED', state: newState }).catch(() => {});
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_FOCUS') {
    const newState = {
      focusActive: true,
      sessionStartAt: Date.now(),
      durationSeconds: message.payload.durationSeconds,
      tabSwitches: 0,
      score: 100,
      focusTabId: message.payload.tabId,
      title: message.payload.title,
      difficulty: message.payload.difficulty
    };
    updateFocusState(newState).then(() => {
      sendResponse({ success: true, state: newState });
      chrome.tabs.sendMessage(newState.focusTabId, { type: 'FOCUS_STARTED', state: newState }).catch(() => {});
    });
    return true;
  }

  if (message.type === 'EXTEND_FOCUS') {
    getFocusState().then(state => {
      if (!state.focusActive) return;
      const newState = { ...state, durationSeconds: state.durationSeconds + 300 };
      updateFocusState(newState).then(() => {
        sendResponse({ success: true, state: newState });
      });
    });
    return true;
  }

  if (message.type === 'STOP_FOCUS') {
    handleStopFocus();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SYNC_EVENT') {
    const { problem, token } = message;
    
    // Call the database RPC directly (Faster/More Reliable than Edge Functions)
    fetch(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/sync_focus_event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        p_raw_token: token,
        p_title: problem.title,
        p_link: problem.link,
        p_difficulty: problem.difficulty,
        p_status: problem.focus_status,
        p_score: problem.focus_score,
        p_switches: problem.switches,
        p_duration: problem.focus_duration || 0
      })
    })
    .then(async (response) => {
      const data = await response.json();
      if (response.ok && data.success) {
        sendResponse({ success: true });
      } else {
        sendResponse({ 
          success: false, 
          status: response.status, 
          error: data.error || "Database Sync Failed" 
        });
      }
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; 
  }
});

async function handleStopFocus() {
  const state = await getFocusState();
  if (state.focusActive && state.focusTabId) {
    // 1. Trigger final sync to dashboard first
    chrome.tabs.sendMessage(state.focusTabId, { 
      type: 'SYNC_AND_STOP', 
      status: 'Give Up', // Default for a manual stop
      score: state.score, 
      switches: state.tabSwitches 
    }).catch(() => {});

    // 2. Save local history & analytics
    await recordSessionAnalytics(state);
    
    // 3. Tell content script to clean up UI
    chrome.tabs.sendMessage(state.focusTabId, { type: 'FOCUS_STOPPED' }).catch(() => {});
  }
  await updateFocusState(defaultState);
}

// Analytics and History Logic
async function recordSessionAnalytics(state) {
  if (!state.sessionStartAt) return;
  
  // Calculate elapsed minutes (can be 0 if testing under 1min)
  let elapsedMinutes = Math.floor((Date.now() - state.sessionStartAt) / 60000);
  if (elapsedMinutes < 1) elapsedMinutes = 1; // Default to 1m for testing under a minute

  const data = await chrome.storage.local.get(['analytics', 'history']);
  const analytics = data.analytics || { streak: 0, lastFocusDay: null, avgScore: 100, totalSessions: 0 };
  let history = data.history || [];

  // Update History
  const sessionRecord = {
    id: Date.now(),
    title: state.title || "LeetCode Problem",
    difficulty: state.difficulty || "Medium",
    durationMins: elapsedMinutes,
    score: state.score
  };
  history.unshift(sessionRecord);
  if (history.length > 5) history.pop(); // Keep last 5

  // Update Averages
  const newTotal = analytics.totalSessions + 1;
  const newAvg = ((analytics.avgScore * analytics.totalSessions) + state.score) / newTotal;

  // Update Streak
  const today = new Date().toDateString();
  let currentStreak = analytics.streak;
  
  if (analytics.lastFocusDay) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (analytics.lastFocusDay === yesterday.toDateString()) {
      currentStreak += 1;
    } else if (analytics.lastFocusDay !== today) {
      currentStreak = 1; // Reset
    }
  } else {
    currentStreak = 1; // First time
  }

  const updatedAnalytics = {
    streak: Math.min(currentStreak, 7), // Max 7 for the UI dots
    lastFocusDay: today,
    avgScore: Math.round(newAvg),
    totalSessions: newTotal
  };

  await chrome.storage.local.set({ analytics: updatedAnalytics, history });
}

// Tab Switch Detection
async function handleTabOrWindowChange(activeInfo) {
  const state = await getFocusState();
  if (!state.focusActive || !state.focusTabId) return;

  const now = Date.now();

  // If this was called from onFocusChanged with WINDOW_ID_NONE
  if (activeInfo === chrome.windows.WINDOW_ID_NONE) {
    processSwitch(state, now);
    return;
  }

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const currentActiveTab = tabs[0];
    
    if (currentActiveTab.id !== state.focusTabId) {
      // 1. FORCE SNAP-BACK: Jump back to target tab AND its window
      chrome.tabs.update(state.focusTabId, { active: true }).catch(() => {});
      chrome.tabs.get(state.focusTabId, (tab) => {
        if (tab && tab.windowId) chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
      });
      
      processSwitch(state, now);
    }
  });
}

async function processSwitch(state, now) {
  const lastSwitchTime = state.lastSwitchTime || 0;
  if (now - lastSwitchTime < 2000) return;

  const newScore = Math.max(0, state.score - 10);
  const newState = {
    ...state,
    tabSwitches: state.tabSwitches + 1,
    score: newScore,
    lastSwitchTime: now
  };
  
  await updateFocusState(newState);
  chrome.tabs.sendMessage(state.focusTabId, { type: 'TAB_SWITCH_WARNING', state: newState }).catch(() => {});
}

// Monitor URL changes for /solution or /editorial (SPA navigation)
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const state = await getFocusState();
  if (state.focusActive && state.focusTabId === details.tabId) {
    chrome.tabs.sendMessage(details.tabId, { type: 'URL_CHANGED', url: details.url }).catch(() => {});
  }
}, { url: [{ hostContains: 'leetcode.com' }] });

// GUARDIAN: Sync if tab is closed unexpectedly
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getFocusState();
  if (state.focusActive && state.focusTabId === tabId) {
    // 1. Final Sync from Background
    chrome.storage.local.get(['deepfocus_connection_token'], (res) => {
      const token = res.deepfocus_connection_token;
      if (token) {
        fetch(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/sync_focus_event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            p_raw_token: token,
            p_title: state.title || "Unknown Problem",
            p_link: `https://leetcode.com/problems/${state.title?.toLowerCase().replace(/ /g, '-')}`,
            p_difficulty: state.difficulty || "Medium",
            p_status: (state.tabSwitches >= 10) ? "Cheated" : (state.tabSwitches >= 4 ? "Low Focus" : (state.tabSwitches >= 1 ? "Focus Kept" : "Unexpected Exit")),
            p_score: state.score,
            p_switches: state.tabSwitches,
            p_duration: 0
          })
        }).catch(err => console.error("Guardian Sync Failed:", err));
      }
    });

    // 2. Clean up local state
    await recordSessionAnalytics(state);
    await updateFocusState(defaultState);
  }
});

chrome.tabs.onActivated.addListener(handleTabOrWindowChange);
chrome.windows.onFocusChanged.addListener(handleTabOrWindowChange);
