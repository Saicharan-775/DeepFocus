const DEEPFOCUS_CONFIG = {
  SUPABASE_URL: 'https://vcfwjpywxbjnnpswjivu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZndqcHl3eGJqbm5wc3dqaXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTkzNzgsImV4cCI6MjA4OTIzNTM3OH0.7OKVcYvmTIIXYAVficTMJ0nd9GYIDc8NCAKs8yCUUX4',
  FOCUS_EVENT_ENDPOINT: 'functions/v1/focus-event'
};

// Default Focus State
const defaultState = {
  focusActive: false,
  sessionStartAt: null,
  durationSeconds: 0,
  tabSwitches: 0,
  score: 100,
  focusTabId: null,
};

const MAX_FOCUS_SESSION_MS = 12 * 60 * 60 * 1000;
const RPC_SYNC_TIMEOUT_MS = 10000;
const EDGE_SYNC_TIMEOUT_MS = 15000;
const DEMO_AI_DAILY_LIMIT = 5;
const DEMO_AI_TRIAL_DAYS = 3;
const DEMO_AI_START_KEY = 'df_demo_ai_started_at';
const DEMO_AI_DATE_KEY = 'df_demo_ai_usage_date';
const DEMO_AI_COUNT_KEY = 'df_demo_ai_usage_count';

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function normalizeApiKey(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

async function readProviderError(provider, response) {
  let message = '';
  try {
    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        message = data?.error?.message || data?.error || data?.message || text;
      } catch (_) {
        message = text;
      }
    }
  } catch (_) {
    message = '';
  }

  if (response.status === 429) {
    if (provider.startsWith('OpenRouter')) {
      return 'OpenRouter is rate-limiting the free model right now. Try again in a minute, or add a Groq/OpenAI key in Settings for a backup provider.';
    }
    return `${provider} is rate-limited right now. Try again in a minute, or add another AI key in Settings.`;
  }

  return `${provider} rejected the request (${response.status}): ${String(message || 'Request failed').slice(0, 220)}`;
}

function formatProviderErrors(errors, fallback) {
  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  return uniqueErrors.length ? uniqueErrors.join("\n") : fallback;
}

async function callDemoAiFromExtension({ title, difficulty, code }) {
  const tokenData = await chrome.storage.local.get(['deepfocus_connection_token']);
  const token = normalizeApiKey(tokenData.deepfocus_connection_token);
  if (!token || !token.startsWith('dfx_')) {
    throw new Error('Demo AI requires a connected DeepFocus account. Open Settings and connect the extension.');
  }

  const response = await fetch(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/functions/v1/ai-demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`,
      'X-Extension-Token': token
    },
    body: JSON.stringify({
      kind: 'summary',
      payload: { title, difficulty, code }
    })
  });

  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch (_) {}

  if (!response.ok || !data?.success || !data?.content) {
    throw new Error(data?.error || text || `Demo AI failed (${response.status})`);
  }

  return data.content.trim();
}

async function getDemoAiUsage() {
  const data = await chrome.storage.local.get([
    DEMO_AI_START_KEY,
    DEMO_AI_DATE_KEY,
    DEMO_AI_COUNT_KEY
  ]);

  let startedAt = Number(data[DEMO_AI_START_KEY] || 0);
  if (!startedAt) {
    startedAt = Date.now();
    await chrome.storage.local.set({ [DEMO_AI_START_KEY]: startedAt });
  }

  const elapsedDays = Math.floor((Date.now() - startedAt) / 86400000);
  const daysLeft = Math.max(0, DEMO_AI_TRIAL_DAYS - elapsedDays);
  const date = todayKey();
  const count = data[DEMO_AI_DATE_KEY] === date ? Number(data[DEMO_AI_COUNT_KEY] || 0) : 0;

  return {
    daysLeft,
    count,
    date,
    remaining: Math.max(0, DEMO_AI_DAILY_LIMIT - count)
  };
}

async function assertDemoAiAllowed(aiKeyMode) {
  if (aiKeyMode === 'byok') return;
  const usage = await getDemoAiUsage();
  if (usage.daysLeft <= 0) {
    throw new Error('Your 3-day demo AI trial has ended. Add your own OpenRouter or Groq API key to continue.');
  }
  if (usage.remaining <= 0) {
    throw new Error('Demo AI limit reached for today (5/5). Add your own OpenRouter or Groq API key to continue.');
  }
}

async function recordDemoAiUse(aiKeyMode) {
  if (aiKeyMode === 'byok') return;
  const usage = await getDemoAiUsage();
  await chrome.storage.local.set({
    [DEMO_AI_DATE_KEY]: usage.date,
    [DEMO_AI_COUNT_KEY]: usage.count + 1
  });
}

function sendTabMessage(tabId, message, callback = null) {
  if (!tabId) {
    if (callback) callback(null);
    return;
  }

  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      if (callback) callback(null);
      return;
    }
    if (callback) callback(response);
  });
}

function focusTabIfAvailable(tabId) {
  if (!tabId) return;

  chrome.tabs.update(tabId, { active: true }, () => {
    if (chrome.runtime.lastError) return;

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab?.windowId) return;
      chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    });
  });
}

function isDashboardUrl(url = '') {
  return /^(http:\/\/localhost|http:\/\/127\.0\.0\.1|https:\/\/[^/]+\.vercel\.app|https:\/\/[^/]+\.netlify\.app)/.test(url);
}

function broadcastRevisionUpdate(problem, syncState = 'optimistic') {
  chrome.tabs.query({}, (tabs) => {
    (tabs || []).forEach((tab) => {
      if (!tab.id || !isDashboardUrl(tab.url || '')) return;
      sendTabMessage(tab.id, {
        type: 'REVISION_OPTIMISTIC_UPSERT',
        problem,
        syncState
      });
    });
  });
}

function broadcastRevisionRefresh() {
  chrome.tabs.query({}, (tabs) => {
    (tabs || []).forEach((tab) => {
      if (!tab.id || !isDashboardUrl(tab.url || '')) return;
      sendTabMessage(tab.id, { type: 'REVISION_REFRESH' });
    });
  });
}

function normalizeProblemUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const fullUrl = url.split('?')[0].split('#')[0];
  const match = fullUrl.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([^\/]+)/);
  return match ? `https://leetcode.com/problems/${match[1]}/` : fullUrl;
}

function isValidProblemEvent(problem) {
  return !!(
    problem &&
    typeof problem.title === 'string' &&
    problem.title.trim() &&
    /^https:\/\/leetcode\.com\/problems\/[^/]+\/$/.test(normalizeProblemUrl(problem.link)) &&
    ['Easy', 'Medium', 'Hard'].includes(problem.difficulty) &&
    ['Cheated', 'Give Up', 'Low Focus', 'Focus Kept'].includes(problem.focus_status)
  );
}

function isLeetCodeProblemUrl(url) {
  return /^https?:\/\/(?:www\.)?leetcode\.com\/problems\/[^/]+\/?/.test(url || '');
}

function createSessionId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

// Initialize State and Self-Inject into open tabs for "No Refresh" feel
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['focusState', 'analytics', 'history'], (res) => {
    if (!res.focusState) chrome.storage.local.set({ focusState: defaultState });
    if (!res.analytics) chrome.storage.local.set({ analytics: { streak: 0, lastFocusDay: null, avgScore: 100, totalSessions: 0 } });
    if (!res.history) chrome.storage.local.set({ history: [] });
  });
  sanitizeFocusState();
  processPendingEvents();

  // SELF-INJECTION: Re-attach to LeetCode tabs so no refresh is needed
  chrome.tabs.query({ url: ['*://*.leetcode.com/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.url.includes('leetcode.com')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['config.js', 'utils/soundManager.js', 'content.js']
        }).catch(() => { });
      }
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  sanitizeFocusState();
  processPendingEvents();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.deepfocus_connection_token?.newValue) {
    processPendingEvents();
  }
});

async function getStoredFocusState() {
  const data = await chrome.storage.local.get(['focusState']);
  return data.focusState || defaultState;
}

async function validateFocusState(state) {
  if (!state?.focusActive) return { ...defaultState };

  const now = Date.now();
  const startedAt = Number(state.sessionStartAt || 0);
  const duration = Number(state.durationSeconds || 0);

  if (!state.sessionId || !startedAt || !duration || duration <= 0 || startedAt > now + 5000 || now - startedAt > MAX_FOCUS_SESSION_MS) {
    return { ...defaultState };
  }

  if (!state.focusTabId || !isLeetCodeProblemUrl(state.link)) {
    return { ...defaultState };
  }

  const tab = await new Promise((resolve) => {
    chrome.tabs.get(state.focusTabId, (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(result);
    });
  });

  if (!tab || !isLeetCodeProblemUrl(tab.url)) {
    return { ...defaultState };
  }

  return state;
}

async function sanitizeFocusState() {
  const stored = await getStoredFocusState();
  const validated = await validateFocusState(stored);
  if (stored?.focusActive && !validated.focusActive) {
    await updateFocusState(defaultState);
  }
  return validated;
}

// Helper to get current state
async function getFocusState() {
  return sanitizeFocusState();
}

// Helper to save state
async function updateFocusState(newState) {
  await chrome.storage.local.set({ focusState: newState });
  // Notify interested parts
  chrome.runtime.sendMessage({ type: 'FOCUS_STATE_UPDATED', state: newState }).catch(() => { });
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_FOCUS_STATE') {
    getFocusState()
      .then((state) => sendResponse({ success: true, state }))
      .catch((err) => sendResponse({ success: false, error: err?.message || "Failed to read focus state", state: defaultState }));
    return true;
  }

  if (message.type === 'START_FOCUS') {
    handleStartFocus(message.payload)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err?.message || "Failed to start focus", state: defaultState }));
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
    handleStopFocus(message.customStatus, message.skipSync)
      .then((result) => {
        sendResponse(result || { success: true });
      })
      .catch((err) => {
        console.error("[DeepFocus] STOP_FOCUS failed:", err);
        sendResponse({ success: false, error: err?.message || "Stop focus failed" });
      });
    return true;
  }

  if (message.type === 'SYNC_EVENT') {
    syncProblemEvent(message.problem, message.token)
      .then((result) => {
        sendResponse(result || { success: false, error: "Background sync returned no result" });
      })
      .catch((err) => {
        console.error("[DeepFocus] SYNC_EVENT failed:", err);
        sendResponse({ success: false, error: err?.message || "Background sync failed" });
      });
    return true;
  }

  if (message.type === 'PROCESS_PENDING_EVENTS') {
    processPendingEvents()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err?.message || 'Pending sync failed' }));
    return true;
  }

  if (message.type === 'VERIFY_TOKEN') {
    const token = message.token;
    if (!token || !token.startsWith('dfx_')) {
      sendResponse({ success: false, error: 'Invalid format. Token must start with dfx_' });
      return true;
    }
    // Use the dedicated read-only verify RPC (no rows written, no side effects)
    fetchJsonWithTimeout(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/verify_extension_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ p_raw_token: token })
    }, RPC_SYNC_TIMEOUT_MS)
      .then(({ response, data }) => {
        if (response.ok && data.success) {
          sendResponse({ success: true });
        } else if (response.status === 404) {
          // RPC not deployed yet — soft-accept the token.
          // The real validation happens when sync_focus_event or append_ai_summary is called.
          console.warn("[DeepFocus] verify_extension_token RPC not found (404). Accepting token; it will be validated during actual sync.");
          sendResponse({ success: true, fallback: true });
        } else {
          const errMsg = data.error || `Server error (HTTP ${response.status})`;
          sendResponse({ success: false, error: errMsg });
        }
      })
      .catch((err) => {
        const error = err?.name === 'AbortError' ? 'Verification timed out.' : 'Network error. Check your internet connection.';
        sendResponse({ success: false, error });
      });
    return true;
  }

  if (message.type === 'SAVE_AI_SUMMARY') {
    const { link, summary, title, difficulty, code } = message.payload;
    chrome.storage.local.get(['deepfocus_connection_token'], (res) => {
      const token = (res.deepfocus_connection_token || '').trim();
      if (!token) {
        sendResponse({ success: false, error: "No connection token found." });
        return;
      }
      // Primary: 6-parameter RPC
      fetch(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/append_ai_summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_raw_token: token,
          p_link: link,
          p_summary: summary,
          p_title: title || null,
          p_difficulty: difficulty || null,
          p_code: code || null
        })
      })
        .then(async (response) => {
          if (response.status === 400 || response.status === 404) {
            console.warn("[DeepFocus] 6-param append_ai_summary not available (HTTP " + response.status + "). Trying 3-param fallback.");
            // Fallback 1: 3-parameter RPC (older version)
            return fetch(`${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/append_ai_summary`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                p_raw_token: token,
                p_link: link,
                p_summary: summary
              })
            });
          }
          return response;
        })
        .then(async (response) => {
          const text = await response.text();
          let data = {};
          try { data = JSON.parse(text); } catch (e) { /* non-JSON response (e.g. 404 HTML) */ }

          if (response.ok && (data.success || data.message)) {
            sendResponse({ success: true });
          } else if (response.status === 404) {
            // Both RPC variants not deployed — accept gracefully
            console.warn("[DeepFocus] append_ai_summary RPC not deployed (404). Summary saved in local queue only.");
            sendResponse({ success: false, error: "AI summary RPC not available. Summary saved locally; will retry." });
          } else {
            sendResponse({ success: false, error: data.error || data.message || "Database Sync Failed" });
          }
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
    });
    return true;
  }

  if (message.type === 'INTERNAL_COPY') {
    chrome.storage.local.set({ lastInternalCopy: message.text });
    // Broadcast copy to other tabs so they can paste it if focus mode is active
    chrome.tabs.query({}, (tabs) => {
      if (tabs) {
        tabs.forEach((t) => {
          if (t.id && t.url && (t.url.includes('leetcode.com') || t.url.includes('localhost') || t.url.includes('127.0.0.1') || t.url.includes('vercel.app') || t.url.includes('netlify.app'))) {
      sendTabMessage(t.id, { type: 'SYNC_INTERNAL_COPY', text: message.text });
          }
        });
      }
    });
    return true;
  }

  if (message.type === 'ANALYZE_MISTAKE') {
    handleAnalyzeMistake(message.payload)
      .then(result => sendResponse({ success: true, summary: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleStartFocus(payload) {
  const current = await getFocusState();
  if (current.focusActive) {
    return { success: false, error: "A focus session is already active.", state: current };
  }

  const tabId = payload?.tabId;
  const tab = await new Promise((resolve) => {
    if (!tabId) {
      resolve(null);
      return;
    }
    chrome.tabs.get(tabId, (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(result);
    });
  });

  const link = normalizeProblemUrl(payload?.link || tab?.url || '');
  if (!tab || !isLeetCodeProblemUrl(tab.url) || !isLeetCodeProblemUrl(link)) {
    await updateFocusState(defaultState);
    return { success: false, error: "Open a LeetCode problem page before starting focus.", state: defaultState };
  }

  const difficulty = ['Easy', 'Medium', 'Hard'].includes(payload?.difficulty) ? payload.difficulty : 'Medium';
  const durationSeconds = Math.max(60, Number(payload?.durationSeconds || 1500));
  const newState = {
    focusActive: true,
    sessionId: createSessionId(),
    sessionStartAt: Date.now(),
    durationSeconds,
    tabSwitches: 0,
    score: 100,
    focusTabId: tab.id,
    title: payload?.title || "Unknown Problem",
    difficulty,
    link
  };

  await updateFocusState(newState);
  sendTabMessage(newState.focusTabId, { type: 'FOCUS_STARTED', state: newState });
  return { success: true, state: newState };
}

async function handleAnalyzeMistake({ title, difficulty, code }) {
  const keys = await chrome.storage.local.get(['df_openrouter_api_key', 'df_groq_api_key', 'df_openai_api_key', 'df_ai_key_mode']);
  const openrouterKey = normalizeApiKey(keys.df_openrouter_api_key);
  const groqKey = normalizeApiKey(keys.df_groq_api_key);
  const openAiKey = normalizeApiKey(keys.df_openai_api_key);
  const aiKeyMode = keys.df_ai_key_mode === 'byok' ? 'byok' : 'demo';
  const providerErrors = [];

  if (!openrouterKey && !groqKey && !openAiKey) {
    return callDemoAiFromExtension({ title, difficulty, code });
  }

  await assertDemoAiAllowed(aiKeyMode);

  const systemPrompt = `You are an expert DSA mentor.
Analyze the user's submitted solution or notes.
Generate a concise, insightful, personalized summary structured exactly with these three headings:
1. **Code Review & Mistake**: (Identify specific bugs, edge-case failures, or performance flaws in their code/approach).
2. **Cognitive Root Cause ("What made you think like this?")**: (Explain the logical misconception, premature optimization, or missing observation that likely led to this specific approach).
3. **Correct Approach Tip**: (Provide a high-level key insight, conceptual strategy, or pattern recognition tip to solve this and similar problems successfully).

Rules:
- Base response strictly on the USER'S SUBMITTED CODE/NOTES.
- Do NOT explain generic editorial or paste full solutions.
- Keep the response clear, concise (under 180 words), and highly action-oriented.`;

  const userPrompt = `Problem: ${title} (${difficulty || "Medium"})
User's Code/Notes/Approach:
${code || "No code or notes provided yet."}`;

  // Try OpenRouter first
  if (openrouterKey) {
    const models = [
      "openrouter/free",
      "meta-llama/llama-3.3-70b-instruct:free"
    ];

    for (const model of models) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openrouterKey}`,
            "HTTP-Referer": "https://github.com/Saicharan-775/DeepFocus",
            "X-Title": "DeepFocus"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            await recordDemoAiUse(aiKeyMode);
            return content.trim();
          }
        } else {
          const message = await readProviderError(`OpenRouter ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = `OpenRouter ${model} request failed: ${err?.message || 'Network request failed'}`;
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  // Fallback to Groq
  if (groqKey) {
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama3-8b-8192"
    ];

    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 300
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            await recordDemoAiUse(aiKeyMode);
            return content.trim();
          }
        } else {
          const message = await readProviderError(`Groq ${model}`, res);
          providerErrors.push(message);
          console.warn(message);
        }
      } catch (err) {
        const message = `Groq ${model} request failed: ${err?.message || 'Network request failed'}`;
        providerErrors.push(message);
        console.warn(message);
      }
    }
  }

  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          await recordDemoAiUse(aiKeyMode);
          return content.trim();
        }
      } else {
        const message = await readProviderError("OpenAI", res);
        providerErrors.push(message);
        if (!openrouterKey && !groqKey) throw new Error(message);
        console.warn(message);
      }
    } catch (err) {
      const message = err?.message?.startsWith("OpenAI ")
        ? err.message
        : `OpenAI request failed: ${err?.message || "Network request failed"}`;
      providerErrors.push(message);
      if (!openrouterKey && !groqKey) throw new Error(message);
      console.warn(message);
    }
  }

  throw new Error(formatProviderErrors(
    providerErrors,
    "AI Analysis failed. No configured provider returned a response."
  ));
}

async function queuePendingEvent(problemObject) {
  if (!isValidProblemEvent(problemObject)) {
    console.warn("[DeepFocus] Skipping invalid pending event:", problemObject);
    return;
  }
  problemObject = { ...problemObject, link: normalizeProblemUrl(problemObject.link) };
  const res = await chrome.storage.local.get(['deepfocus_pending_events']);
  let queue = (res.deepfocus_pending_events || []).filter(isValidProblemEvent);
  queue = queue.filter(item => normalizeProblemUrl(item.link) !== problemObject.link);
  queue.push(problemObject);
  if (queue.length > 50) queue = queue.slice(-50);
  await chrome.storage.local.set({ deepfocus_pending_events: queue });
}

let isProcessingPendingEvents = false;
async function processPendingEvents() {
  if (isProcessingPendingEvents) return;
  isProcessingPendingEvents = true;

  try {
    const res = await chrome.storage.local.get(['deepfocus_pending_events', 'deepfocus_connection_token']);
    const token = (res.deepfocus_connection_token || '').trim();
    if (!token) return;

    const uniqueMap = new Map();
    (res.deepfocus_pending_events || [])
      .filter(isValidProblemEvent)
      .forEach(item => {
        const normalized = { ...item, link: normalizeProblemUrl(item.link) };
        uniqueMap.set(normalized.link, normalized);
      });

    let remaining = Array.from(uniqueMap.values());
    if (remaining.length === 0) {
      await chrome.storage.local.set({ deepfocus_pending_events: [] });
      return;
    }

    for (const problem of [...remaining]) {
      const result = await syncProblemEvent(problem, token);
      if (result?.success) {
        remaining = remaining.filter(item => normalizeProblemUrl(item.link) !== normalizeProblemUrl(problem.link));
        await chrome.storage.local.set({ deepfocus_pending_events: remaining });
        broadcastRevisionUpdate(problem, 'synced');
        broadcastRevisionRefresh();
      } else {
        if (result?.error && /invalid|expired|token/i.test(result.error)) {
          break;
        }
        break;
      }
    }
  } catch (err) {
    console.warn('[DeepFocus] Pending revision sync retry failed:', err?.message || err);
  } finally {
    isProcessingPendingEvents = false;
  }
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  let timeoutId = null;
  const controller = new AbortController();
  timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) {}
    return { response, data, text };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function isTokenSyncError(status, data = {}) {
  const errorText = `${data.error || ''} ${data.message || ''}`.toLowerCase();
  return status === 401 || errorText.includes('token') || errorText.includes('expired');
}

function syncPayloadToRpcParams(problemObject, token) {
  return {
    p_raw_token: token,
    p_title: problemObject.title,
    p_link: problemObject.link,
    p_difficulty: problemObject.difficulty,
    p_status: problemObject.focus_status,
    p_score: problemObject.focus_score,
    p_switches: problemObject.switches,
    p_duration: problemObject.focus_duration || 0,
    p_code: problemObject.code || null
  };
}

function syncPayloadToLegacyRpcParams(problemObject, token) {
  return {
    p_raw_token: token,
    p_title: problemObject.title,
    p_link: problemObject.link,
    p_difficulty: problemObject.difficulty,
    p_status: problemObject.focus_status,
    p_score: problemObject.focus_score,
    p_switches: problemObject.switches,
    p_duration: problemObject.focus_duration || 0
  };
}

async function syncProblemViaRpc(problemObject, token) {
  const url = `${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/sync_focus_event`;
  const { response, data, text } = await fetchJsonWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(syncPayloadToRpcParams(problemObject, token))
  }, RPC_SYNC_TIMEOUT_MS);

  if (response.ok && !(data.success === false)) {
    return { success: true, via: 'rpc' };
  }

  return {
    success: false,
    via: 'rpc',
    status: response.status,
    tokenError: isTokenSyncError(response.status, data),
    error: data.error || data.message || text || `RPC sync failed (HTTP ${response.status})`
  };
}

async function syncProblemViaLegacyRpc(problemObject, token) {
  const url = `${DEEPFOCUS_CONFIG.SUPABASE_URL}/rest/v1/rpc/sync_focus_event`;
  const { response, data, text } = await fetchJsonWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(syncPayloadToLegacyRpcParams(problemObject, token))
  }, RPC_SYNC_TIMEOUT_MS);

  if (response.ok && !(data.success === false)) {
    return { success: true, via: 'legacy-rpc' };
  }

  return {
    success: false,
    via: 'legacy-rpc',
    status: response.status,
    tokenError: isTokenSyncError(response.status, data),
    error: data.error || data.message || text || `Legacy RPC sync failed (HTTP ${response.status})`
  };
}

async function syncProblemViaEdge(problemObject, token) {
  const url = `${DEEPFOCUS_CONFIG.SUPABASE_URL}/${DEEPFOCUS_CONFIG.FOCUS_EVENT_ENDPOINT}`;
  const { response, data, text } = await fetchJsonWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${DEEPFOCUS_CONFIG.SUPABASE_ANON_KEY}`,
      "X-Extension-Token": token
    },
    body: JSON.stringify(problemObject)
  }, EDGE_SYNC_TIMEOUT_MS);

  if (response.ok && !(data.success === false)) {
    return { success: true, via: 'edge' };
  }

  return {
    success: false,
    via: 'edge',
    status: response.status,
    tokenError: isTokenSyncError(response.status, data),
    error: data.error || data.message || text || `Edge sync failed (HTTP ${response.status})`
  };
}

function shouldFallbackToEdge(result) {
  if (!result || result.success || result.tokenError) return false;
  const errorText = String(result.error || '').toLowerCase();
  return result.status === 404 ||
    result.status === 400 ||
    errorText.includes('could not find') ||
    errorText.includes('function') ||
    errorText.includes('schema cache');
}

function shouldFallbackToLegacyRpc(result) {
  if (!result || result.success || result.tokenError) return false;
  const errorText = String(result.error || '').toLowerCase();
  return result.status === 404 ||
    result.status === 400 ||
    errorText.includes('could not find') ||
    errorText.includes('p_code') ||
    errorText.includes('function') ||
    errorText.includes('schema cache');
}

// Sync a problem event to Supabase and handle token errors
async function syncProblemEvent(problemObject, token) {
  try {
    if (!isValidProblemEvent(problemObject)) {
      return { success: false, error: 'Invalid problem event. Only LeetCode problem URLs can sync.' };
    }
    problemObject = { ...problemObject, link: normalizeProblemUrl(problemObject.link) };
    // Trim and validate token
    token = typeof token === 'string' ? token.trim() : '';
    if (!token) {
      console.warn('[DeepFocus] No connection token available for sync.');
      return { success: false, error: 'Missing connection token.' };
    }
    if (!token.startsWith('dfx_')) {
      console.warn('[DeepFocus] Invalid token format for sync:', token);
      return { success: false, error: 'Invalid token format.' };
    }

    console.log('[DeepFocus] Syncing revision problem:', problemObject.link);

    let result;
    try {
      result = await syncProblemViaRpc(problemObject, token);
    } catch (err) {
      result = {
        success: false,
        via: 'rpc',
        error: err?.name === 'AbortError' ? 'RPC sync timed out' : (err?.message || 'RPC sync failed')
      };
    }

    if (result.success) return result;

    if (shouldFallbackToLegacyRpc(result)) {
      try {
        const legacyResult = await syncProblemViaLegacyRpc(problemObject, token);
        if (legacyResult.success) return legacyResult;
        result = legacyResult;
      } catch (err) {
        result = {
          success: false,
          via: 'legacy-rpc',
          error: err?.name === 'AbortError' ? 'Legacy RPC sync timed out' : (err?.message || 'Legacy RPC sync failed')
        };
      }
    }

    if (shouldFallbackToEdge(result)) {
      try {
        const edgeResult = await syncProblemViaEdge(problemObject, token);
        if (edgeResult.success) return edgeResult;
        result = edgeResult;
      } catch (err) {
        result = {
          success: false,
          via: 'edge',
          error: err?.name === 'AbortError' ? 'Edge sync timed out' : (err?.message || 'Edge sync failed')
        };
      }
    }

    if (result.tokenError) {
      console.warn("[DeepFocus] Invalid or expired token detected. Clearing stored token.");
      chrome.storage.local.remove('deepfocus_connection_token');
    }

    return {
      success: false,
      status: result.status,
      error: result.error || "Sync failed"
    };
  } catch (err) {
    const error = err?.name === 'AbortError' ? 'Sync request timed out' : (err.message || 'Sync failed');
    return { success: false, error };
  }
}


async function handleStopFocus(customStatus = null, skipSync = false) {
  const state = await getFocusState();
  if (!state.focusActive) return { success: true, alreadyStopped: true };

  let finalStatus = customStatus;
  if (!finalStatus) {
    finalStatus = (state.tabSwitches > 8) ? 'Cheated' : 'Give Up';
  }

  let finalProblemData = {
    title: state.title || "Unknown Problem",
    link: state.link || "",
    difficulty: state.difficulty || "Medium",
    code: null
  };

  // 1. If we have a tab ID, try to get editor code and details from the content script
  if (state.focusTabId) {
    const tabResponse = await new Promise((resolve) => {
      sendTabMessage(state.focusTabId, { type: 'GET_FINAL_SYNC_DATA' }, resolve);
    });

    if (tabResponse) {
      if (tabResponse.title) finalProblemData.title = tabResponse.title;
      if (tabResponse.link) finalProblemData.link = tabResponse.link;
      if (tabResponse.difficulty) finalProblemData.difficulty = tabResponse.difficulty;
      if (tabResponse.code) finalProblemData.code = tabResponse.code;
    }
  }

  // Calculate duration
  const elapsedSecs = state.sessionStartAt
    ? Math.floor((Date.now() - state.sessionStartAt) / 1000)
    : 0;

  const problemObject = {
    title: finalProblemData.title,
    link: normalizeProblemUrl(finalProblemData.link),
    difficulty: finalProblemData.difficulty,
    focus_status: finalStatus,
    focus_score: state.score,
    switches: state.tabSwitches,
    focus_duration: elapsedSecs,
    code: finalProblemData.code,
    timestamp: Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  broadcastRevisionUpdate(problemObject, 'optimistic');

  // End focus mode before network/database work. Sync can be slow or fail,
  // but the user-facing session must stop immediately.
  await recordSessionAnalytics(state);
  if (state.focusTabId) {
    sendTabMessage(state.focusTabId, { type: 'FOCUS_STOPPED' });
  }
  await updateFocusState(defaultState);

  let syncResult = { saved: false, queued: false, error: null };

  if (!skipSync) {
    // 2. Perform the sync directly from background.js regardless of link pattern
    const tokenData = await chrome.storage.local.get(['deepfocus_connection_token']);
    let token = (tokenData.deepfocus_connection_token || '').trim();
    if (token) {
      // Attempt sync; if it fails, queue the event for later retry
      console.log("[DeepFocus] Syncing event directly from background.js:", problemObject);
      const syncRes = await syncProblemEvent(problemObject, token);
      if (syncRes && syncRes.success) {
        syncResult = { saved: true, queued: false, error: null };
        console.log("[DeepFocus] Sync direct from background succeeded.");
        broadcastRevisionUpdate(problemObject, 'synced');
        broadcastRevisionRefresh();
        if (state.focusTabId) {
          sendTabMessage(state.focusTabId, { type: 'SHOW_TOAST', text: "Revision Sheet updated", variant: 'success' });
        }
      } else {
        const errMsg = syncRes && syncRes.error ? syncRes.error : "Sync failed";
        console.warn("[DeepFocus] Revision sync queued:", errMsg);
        await queuePendingEvent(problemObject);
        broadcastRevisionUpdate(problemObject, 'queued');
        processPendingEvents();
        if (state.focusTabId) {
          const text = errMsg === 'Sync request timed out'
            ? "Revision saved locally. It will sync automatically."
            : `Revision sync queued: ${errMsg}`;
          sendTabMessage(state.focusTabId, { type: 'SHOW_TOAST', text, variant: 'queued' });
        }
        syncResult = { saved: false, queued: true, error: errMsg };
      }
    } else {
      console.warn("[DeepFocus] No connection token. Queuing event.");
      if (state.focusTabId) {
        sendTabMessage(state.focusTabId, { type: 'SHOW_TOAST', text: "Not connected. Queued.", variant: 'queued' });
      }
      await queuePendingEvent(problemObject);
      broadcastRevisionUpdate(problemObject, 'queued');
      processPendingEvents();
      syncResult = { saved: false, queued: true, error: 'Missing connection token.' };
    }
  }

  return { success: true, ...syncResult };
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
    title: state.title || "Previously Solved Problem",
    difficulty: state.difficulty || "Medium",
    durationMins: elapsedMinutes,
    score: state.score,
    mistakes: state.tabSwitches || 0
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
      focusTabIfAvailable(state.focusTabId);

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
  sendTabMessage(state.focusTabId, { type: 'TAB_SWITCH_WARNING', state: newState });
}

// Monitor URL changes for /solution or /editorial (SPA navigation)
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const state = await getFocusState();
  if (state.focusActive && state.focusTabId === details.tabId) {
    sendTabMessage(details.tabId, { type: 'URL_CHANGED', url: details.url });
  }
}, { url: [{ hostContains: 'leetcode.com' }] });

// GUARDIAN: Sync if tab is closed unexpectedly
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getStoredFocusState();
  if (state.focusActive && state.focusTabId === tabId) {
    // 1. Final Sync from Background
    const res = await chrome.storage.local.get(['deepfocus_connection_token']);
    const token = res.deepfocus_connection_token;
    if (token) {
      const guardianPayload = {
        title: state.title || "Unknown Problem",
        link: state.link || `https://leetcode.com/problems/${state.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
        difficulty: state.difficulty || "Medium",
        focus_status: (state.tabSwitches > 8) ? "Cheated" : "Give Up",
        focus_score: state.score,
        switches: state.tabSwitches,
        focus_duration: 0,
        code: null,
        timestamp: Date.now()
      };

      console.log("[DeepFocus] Guardian Sync starting for tab close...");
      const syncRes = await syncProblemEvent(guardianPayload, token);
      if (!syncRes.success) {
        console.error("[DeepFocus] Guardian Sync Failed:", syncRes.error);
        await queuePendingEvent(guardianPayload);
      } else {
        console.log("[DeepFocus] Guardian Sync: Revision sheet updated successfully");
      }
    }

    // 2. Clean up local state
    await recordSessionAnalytics(state);
    await updateFocusState(defaultState);
  }
});

chrome.tabs.onActivated.addListener(handleTabOrWindowChange);
chrome.windows.onFocusChanged.addListener(handleTabOrWindowChange);
