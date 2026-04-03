const FOCUS_DURATION_SECONDS = 60;
const TAB_WARNING_COOLDOWN_MS = 4000;

let focusTabId = null;

function getNow() {
  return Date.now();
}

function calculateScore(tabSwitches) {
  return Math.max(0, 100 - tabSwitches * 15);
}

async function getFocusState() {
  return chrome.storage.local.get([
    "focusActive",
    "focusTabId",
    "focusSessionId",
    "tabSwitches",
    "sessionStartAt",
    "durationSeconds",
    "lastTabWarningAt"
  ]);
}

async function sendMessageToTab(tabId, message) {
  if (!tabId) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Focus tab may be navigating or the content script may not be attached yet.
  }
}

async function initializeFocusSession(tabId) {
  const sessionId = `df-${getNow()}-${Math.random().toString(36).slice(2, 8)}`;
  focusTabId = tabId;

  await chrome.storage.local.set({
    focusActive: true,
    focusTabId: tabId,
    focusSessionId: sessionId,
    sessionStartAt: getNow(),
    durationSeconds: FOCUS_DURATION_SECONDS,
    tabSwitches: 0,
    score: 100,
    lastTabWarningAt: 0
  });

  await sendMessageToTab(tabId, {
    type: "FOCUS_STATE_UPDATED",
    payload: {
      focusActive: true
    }
  });
}

async function stopFocusSession(reason = "manual-stop") {
  const state = await getFocusState();
  const activeTabId = state.focusTabId || focusTabId;

  await chrome.storage.local.set({
    focusActive: false,
    focusTabId: null,
    focusSessionId: null,
    sessionStartAt: null,
    durationSeconds: null,
    lastTabWarningAt: 0
  });

  focusTabId = null;

  await sendMessageToTab(activeTabId, {
    type: "FOCUS_FORCE_STOP",
    payload: {
      reason
    }
  });
}

async function focusProblemTab() {
  const state = await getFocusState();
  const tabId = state.focusTabId || focusTabId;

  if (!tabId) {
    return;
  }

  try {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId !== chrome.windows.WINDOW_ID_NONE) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (error) {
    // Tab may no longer exist.
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getFocusState();
  if (state.focusTabId) {
    focusTabId = state.focusTabId;
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const state = await getFocusState();
  if (state.focusTabId) {
    focusTabId = state.focusTabId;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "START_FOCUS") {
      const tabId =
        message.tabId ||
        sender.tab?.id ||
        (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

      if (!tabId) {
        sendResponse({ ok: false, error: "No active LeetCode tab found." });
        return;
      }

      await initializeFocusSession(tabId);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "STOP_FOCUS") {
      await stopFocusSession(message.reason || "manual-stop");
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "FOCUS_TAB") {
      await focusProblemTab();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "GET_FOCUS_STATE") {
      sendResponse({
        ok: true,
        state: await getFocusState()
      });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type." });
  })();

  return true;
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const state = await getFocusState();

  if (!state.focusActive || !state.focusTabId || tabId === state.focusTabId) {
    return;
  }

  const now = getNow();
  if (now - (state.lastTabWarningAt || 0) < TAB_WARNING_COOLDOWN_MS) {
    return;
  }

  const tabSwitches = (state.tabSwitches || 0) + 1;
  await chrome.storage.local.set({
    tabSwitches,
    score: calculateScore(tabSwitches),
    lastTabWarningAt: now
  });

  await sendMessageToTab(state.focusTabId, {
    type: "TAB_SWITCH_WARNING",
    payload: {
      tabSwitches,
      score: calculateScore(tabSwitches)
    }
  });
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getFocusState();
  if (state.focusActive && state.focusTabId === tabId) {
    await stopFocusSession("focus-tab-closed");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.focusTabId) {
    focusTabId = changes.focusTabId.newValue || null;
  }
});
