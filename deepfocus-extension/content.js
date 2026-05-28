(() => {
if (window.__DEEPFOCUS_CONTENT_LOADED__) {
  return;
}
window.__DEEPFOCUS_CONTENT_LOADED__ = true;

// =============================================
// INSTANT BLOCK — runs before DOM renders
// We read focus active from local storage via a
// synchronous-ish check of the URL combined with
// an asynchronous storage check. The trick is to
// immediately hide the page and show a blocker
// overlay at the style level if we're on a forbidden URL.
// =============================================
const isDashboard = !window.location.hostname.includes('leetcode.com');

function removeFocusUIArtifacts() {
  document.getElementById('df-widget-container')?.remove();
  document.getElementById('df-modal-overlay')?.remove();
  document.getElementById('df-ai-modal-overlay')?.remove();
  document.getElementById('df-extend-overlay')?.remove();
  document.getElementById('df-blocked-frame')?.remove();
  document.getElementById('df-css-blocker')?.remove();
  document.getElementById('df-instant-block-style')?.remove();
  document.querySelector('.df-toast')?.remove();
  if (document.body) document.body.style.display = '';
}

function prunePendingEvents() {
  safeStorageGet(['deepfocus_pending_events'], (res) => {
    const current = Array.isArray(res.deepfocus_pending_events) ? res.deepfocus_pending_events : [];
    const pruned = current.filter(isValidPendingProblem);
    if (pruned.length !== current.length) {
      safeStorageSet({ deepfocus_pending_events: pruned });
    }
  });
}

if (isDashboard) {
  prunePendingEvents();
  if (document.body) {
    removeFocusUIArtifacts();
  } else {
    document.addEventListener('DOMContentLoaded', removeFocusUIArtifacts, { once: true });
  }
}

(function instantBlock() {
  const BLOCKED_PATTERN = /\/problems\/[^\/]+\/(solutions?|editorial)/i;
  if (!BLOCKED_PATTERN.test(window.location.href)) return;

  // Check if focus is stored as active (from a previous session startup)
  // We must use synchronous approach since storage is async at document_start.
  // Inject a full-page style hider immediately; then remove if focus is not active.
  const styleId = 'df-instant-block-style';

  // Don't run on dashboard
  if (isDashboard) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = 'html { visibility: hidden !important; }';
  document.documentElement.appendChild(style);

  // Now check focus state asynchronously as fast as possible
  try {
    requestValidatedFocusState((state) => {
      if (!isUsableFocusState(state)) {
        // Not in focus — reveal the page
        const s = document.getElementById(styleId);
        if (s) s.remove();
      }
      // If focus is active, blockSolutionsIfNeeded() below will inject the proper iframe overlay
      // and reveal won't happen — the iframe blocks it instead
    });
  } catch (e) {
    // Extension context error — reveal the page
    const s = document.getElementById(styleId);
    if (s) s.remove();
  }
})();

let focusState = { focusActive: false };
let isCurrentlyBlocked = false;  // Fixed: Global state tracking
let widgetContainer = null;
let timerInterval = null;
let observer = null;
let blockingObserver = null;  // Fixed: Persistent singleton observer
let acceptedObserverInterval = null;
let difficulty = "Medium"; // default
let lastInterceptedCode = "";

function isUsableFocusState(state) {
  return !!(state && state.focusActive && state.sessionId && state.sessionStartAt && state.durationSeconds && state.focusTabId);
}

function requestValidatedFocusState(callback) {
  try {
    chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        callback({ focusActive: false });
        return;
      }
      callback(response.state || { focusActive: false });
    });
  } catch (e) {
    callback({ focusActive: false });
  }
}

// Get Font Awesome / Iconify raw SVGs
const clockIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
const tabIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`;
const crossIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
const lightningIcon = `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>`;

const minusIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"></path></svg>`;
const plusIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>`;

function syncStateToPage() {
  window.postMessage({
    type: '__DEEPFOCUS_STATE_UPDATE__',
    focusActive: focusState.focusActive
  }, '*');
}

function appendToBodyWhenReady(node) {
  if (document.body) {
    document.body.appendChild(node);
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!node.isConnected && document.body) {
      document.body.appendChild(node);
    }
  }, { once: true });
}

// Initial sync
requestValidatedFocusState((state) => {
  if (isUsableFocusState(state)) {
    focusState = state;
    initFocusEnvironment();
    syncStateToPage();
  }
  // Request AI keys if we are on the dashboard
  if (isDashboard) {
    window.postMessage({ type: "DEEPFOCUS_GET_AI_KEYS" }, "*");
  }
});

// Listen for messages from background & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_INTERNAL_COPY') {
    lastLocalCopy = message.text;
    return;
  }
  if (message.type === 'REVISION_OPTIMISTIC_UPSERT') {
    if (isDashboard) {
      window.postMessage({
        type: 'DEEPFOCUS_REVISION_UPSERT',
        problem: message.problem,
        syncState: message.syncState || 'optimistic'
      }, '*');
    }
    return;
  }
  if (message.type === 'REVISION_REFRESH') {
    if (isDashboard) {
      window.postMessage({ type: 'DEEPFOCUS_REVISION_REFRESH' }, '*');
    }
    return;
  }
  if (isDashboard && ['FOCUS_STARTED', 'TAB_SWITCH_WARNING', 'URL_CHANGED', 'FOCUS_STATE_UPDATED', 'GET_FINAL_SYNC_DATA', 'SHOW_TOAST'].includes(message.type)) {
    removeFocusUIArtifacts();
    if (message.type === 'GET_FINAL_SYNC_DATA') {
      sendResponse(null);
      return true;
    }
    return;
  }
  if (message.type === 'FOCUS_STARTED') {
    if (!isUsableFocusState(message.state)) return;
    focusState = message.state;
    isCurrentlyBlocked = false;
    initFocusEnvironment();
    if (!isDashboard && document.body) {
      injectWidget();
      updateWidgetUI();
    }
    syncStateToPage();
    return;
  }
  if (message.type === 'FOCUS_STOPPED') {
    focusState = { focusActive: false };
    cleanupFocusEnvironment();
    syncStateToPage();
    return;
  }
  if (message.type === 'TAB_SWITCH_WARNING') {
    if (!isUsableFocusState(message.state)) return;
    focusState = message.state;
    updateWidgetUI();
    showWarningModal();
    syncStateToPage();
    return;
  }
  if (message.type === 'GET_DIFFICULTY') {
    const details = getProblemDetails();
    sendResponse({ difficulty: details.difficulty, title: details.title, link: details.link });
    return true;
  }
  if (message.type === 'URL_CHANGED') {
    blockSolutionsIfNeeded();
    return;
  }
  if (message.type === 'FOCUS_STATE_UPDATED') {
    if (isUsableFocusState(message.state)) {
      focusState = message.state;
      updateWidgetUI();
    } else {
      focusState = { focusActive: false };
      cleanupFocusEnvironment();
      syncStateToPage();
    }
    return;
  }
  if (message.type === 'GET_FINAL_SYNC_DATA') {
    const details = getProblemDetails();
    let userCode = "";
    try {
      userCode = getEditorCode();
    } catch (e) {
      console.error("Error reading editor code:", e);
    }
    sendResponse({
      title: details.title,
      link: details.link,
      difficulty: details.difficulty,
      code: userCode
    });
    return true;
  }
  if (message.type === 'SHOW_TOAST') {
    showToast(message.text, message.variant);
    return;
  }
});

/** Normalize LeetCode problem URLs to consistently have a trailing slash */
function normalizeProblemUrl(url) {
  if (!url) return '';
  const fullUrl = url.split('?')[0].split('#')[0];
  const match = fullUrl.match(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([^\/]+)/);
  if (match) {
    return `https://leetcode.com/problems/${match[1]}/`;
  }
  return fullUrl;
}

/** Get Problem Details */
function getProblemDetails() {
  let titleStr = "Unknown Problem";
  let link = normalizeProblemUrl(window.location.href);
  let diff = difficulty || "Medium";

  try {
    // 1. IMPROVED TITLE DETECTION
    const titleEl = document.querySelector('[data-cy="question-title"]') ||
      document.querySelector('div.text-title-large') ||
      document.querySelector('h4.text-title-large') ||
      document.querySelector('.question-title');

    if (titleEl && titleEl.textContent) {
      titleStr = titleEl.textContent.replace(/^\d+\.\s*/, '').trim();
    } else if (document.title) {
      titleStr = document.title.split('-')[0].replace(/^\d+\.\s*/, '').trim();
    }

    if (!titleStr || titleStr.toLowerCase().includes("leetcode") || titleStr === "Previously Solved Problem" || titleStr === "LeetCode Problem" || titleStr === "Unknown Problem") {
      const urlMatch = window.location.href.match(/\/problems\/([^\/]+)/);
      if (urlMatch) {
        titleStr = urlMatch[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    // 2. DIFFICULTY DETECTION
    if (document.body) {
      const diffBadge = document.querySelector('[data-track-load="description_content"] div[class*="text-difficulty-"], .text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');
      if (diffBadge) {
        const txt = diffBadge.textContent.trim();
        if (txt.includes('Hard')) diff = 'Hard';
        else if (txt.includes('Easy')) diff = 'Easy';
        else if (txt.includes('Medium')) diff = 'Medium';
      } else {
        const mainContent = document.querySelector('[data-track-load="description_content"]') || document.body;
        const hards = mainContent.querySelectorAll('.text-pink, .text-difficulty-hard, .text-red-6');
        const mediums = mainContent.querySelectorAll('.text-yellow, .text-difficulty-medium, .text-orange-6');
        const easys = mainContent.querySelectorAll('.text-olive, .text-difficulty-easy, .text-green-6');
        const hasText = (list, key) => Array.from(list).some(el => (el.textContent || '').includes(key));
        if (hasText(hards, 'Hard')) diff = 'Hard';
        else if (hasText(mediums, 'Medium')) diff = 'Medium';
        else if (hasText(easys, 'Easy')) diff = 'Easy';
      }
    }
  } catch (err) {
    console.error("DeepFocus: Error in getProblemDetails:", err);
  }

  difficulty = diff;

  return {
    id: Date.now(),
    title: titleStr,
    link: link,
    difficulty: diff,
    added: new Date().toISOString().split('T')[0]
  };
}

/** QUEUE EVENTS (Secure Supabase Sync) */
function syncWithWebsite(status, score, switches, processNow = true) {
  // IGNORE lists/general leetcode pages — only sync on problem pages
  if (!window.location.href.includes('/problems/')) return;

  const details = getProblemDetails();
  const elapsedSecs = focusState.sessionStartAt
    ? Math.floor((Date.now() - focusState.sessionStartAt) / 1000)
    : 0;

  let userCode = "";
  try {
    userCode = getEditorCode();
  } catch (e) {
    console.error("Error reading editor code:", e);
  }

  const problemObject = {
    title: details.title,
    link: details.link,
    difficulty: details.difficulty,
    focus_status: status,
    focus_score: score,
    switches: switches,
    focus_duration: elapsedSecs,
    code: userCode,
    timestamp: Date.now()
  };

  chrome.storage.local.get(['deepfocus_pending_events'], (res) => {
    let queue = res.deepfocus_pending_events || [];
    queue.push(problemObject);

    // Limit queue size to prevent overflow
    if (queue.length > 50) queue = queue.slice(-50);

    chrome.storage.local.set({ deepfocus_pending_events: queue }, () => {
      if (processNow) {
        processEventQueue();
      }
    });
  });
}

// Processing Queue with Backoff
let isProcessingQueue = false;
async function processEventQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    chrome.runtime.sendMessage({ type: 'PROCESS_PENDING_EVENTS' }, () => {});
  } catch (_) {
    // Background owns persistence; content pages only request a retry.
  } finally {
    isProcessingQueue = false;
  }
  return;

  try {
    // Safely check context validity. chrome?.storage?.local passes even on
    // invalidated contexts — the actual error fires at .get() time, so we wrap it.
    let res;
    try {
      res = await new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(['deepfocus_pending_events', 'deepfocus_connection_token'], resolve);
        } catch (e) { reject(e); }
      });
    } catch (ctxErr) {
      // Context invalidated — old tab, extension was reloaded. Silently bail.
      return;
    }
    let queue = (res.deepfocus_pending_events || []).filter(isValidPendingProblem);
    const token = res.deepfocus_connection_token;

    if (queue.length === 0) return;
    await chrome.storage.local.set({ deepfocus_pending_events: queue });

    if (!token) {
      console.error("[DeepFocus] ❌ No connection token found. Please connect the extension from the DeepFocus dashboard Settings page.");
      showToast("⚠️ Extension not connected! Open DeepFocus dashboard → Settings → Connect Extension");
      return;
    }

    // 1. SMART DEDUPLICATE: Only keep the LATEST event for each unique link
    const uniqueMap = new Map();
    queue.forEach(item => uniqueMap.set(normalizeProblemUrl(item.link), item));
    const dedupedQueue = Array.from(uniqueMap.values());

    if (dedupedQueue.length !== queue.length) {
      // Queue pruned to prevent spam
    }

    // 2. PROCESS ONE-BY-ONE SAFELY
    let remainingQueue = [...dedupedQueue];

    for (const problem of dedupedQueue) {

      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'SYNC_EVENT', problem, token }, (reply) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Background sync handler unavailable"
              });
              return;
            }

            resolve(reply || {
              success: false,
              error: "Background sync handler returned no response"
            });
          });
        });

        if (response && response.success) {
          remainingQueue = remainingQueue.filter(q => q.link !== problem.link);

          // Save progress IMMEDIATELY after each success
          await chrome.storage.local.set({ deepfocus_pending_events: remainingQueue });

          if (remainingQueue.length === 0) showToast("Revision Sheet updated", "success");
        } else {
          console.error("[DeepFocus] ❌ Sync failure. Details (raw response):", response);
          const errDetail = response?.error || (response?.status ? `HTTP ${response.status}` : "Unknown sync error");
          console.error("[DeepFocus] ❌ Sync failure (error/status derived):", {
            error: response?.error,
            status: response?.status,
            errDetail
          });
          const retryMessage = errDetail === 'Sync request timed out'
            ? "Revision saved locally. It will sync automatically."
            : `Revision sync queued: ${errDetail}`;
          showToast(retryMessage);
          break;
        }


        // Small pulse between requests
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error("[DeepFocus] 🌐 Messaging Failure:", error);
        showToast("⚠️ Extension messaging error. Try reloading the extension.");
        break;
      }
    }

  } catch (err) {
    // Silently ignore context-invalidation errors — tab was open when extension reloaded.
    if (!err?.message?.includes('context invalidated')) {
      console.error("DeepFocus Queue Processor Error:", err);
    }
  } finally {
    isProcessingQueue = false;
  }
}

function isValidPendingProblem(item) {
  return !!(
    item &&
    typeof item.link === 'string' &&
    /^https:\/\/leetcode\.com\/problems\/[^/]+\/?$/.test(normalizeProblemUrl(item.link)) &&
    typeof item.title === 'string' &&
    item.title.trim() &&
    ['Easy', 'Medium', 'Hard'].includes(item.difficulty) &&
    ['Cheated', 'Give Up', 'Low Focus', 'Focus Kept'].includes(item.focus_status)
  );
}

// Background retry loop - only on real LeetCode pages, never on dashboard
if (!isDashboard) {
  setInterval(() => {
    if (!chrome.runtime?.id) return;
    processEventQueue();
  }, 30000);
}

// Check if currently active from storage on load
try {
  if (chrome.runtime?.id) {
    chrome.storage.local.get(['widgetCollapsed', 'widgetPos'], (res) => {
      if (chrome.runtime.lastError) return;
      requestValidatedFocusState((state) => {
        if (isUsableFocusState(state)) {
          focusState = state;
          initFocusEnvironment(res.widgetCollapsed, res.widgetPos);
        }
      });
    });
  }
} catch (e) { /* context invalidated */ }

// Manual token logic is now handled exclusively via the extension popup to avoid conflict.


function setupMouseLeaveWarning() {
  document.addEventListener("mouseleave", (e) => {
    // clientY <= 0 means they've moved mouse to the tab bar/address bar area
    if (focusState.focusActive && e.clientY <= 0) {
      showToast("👀 Don't break your flow! You may lose points.");
    }
  });

  // Also show warning when window loses focus (proactive)
  window.addEventListener("blur", () => {
    if (focusState.focusActive) {
      // Small timeout to check if it's a real switch or just browser lag
      setTimeout(() => {
        if (document.hidden) {
          // Proactive: Tab is now definitely hidden
        }
      }, 100);
    }
  });
}

// Exit prevention removed to prevent SPA navigation alerts.

// Tab Switch Guard removed - now handled exclusively by background.js for stability.

function initFocusEnvironment(initialCollapsed = false, initialPos = null) {
  // Don't run on dashboard
  if (isDashboard) return;

  if (!focusState.focusActive) return;

  // Layers 1, 2, 4 are non-DOM and can run immediately at document_start
  installHistoryAPIGuard();
  installClickGuard();
  installCSSBlocker();

  // Everything else needs document.body to exist
  const doSetup = () => {
    blockSolutionsIfNeeded();
    injectWidget(initialCollapsed, initialPos);
    setupPersistObserver(initialCollapsed, initialPos);
    setupAcceptedDetection();
    setupMouseLeaveWarning();
    setupCopyPasteRestriction();
  };

  if (document.body) {
    doSetup();
  } else {
    document.addEventListener('DOMContentLoaded', doSetup, { once: true });
  }
}

function cleanupFocusEnvironment() {
  if (widgetContainer) widgetContainer.remove();
  document.getElementById('df-widget-container')?.remove();
  if (timerInterval) clearInterval(timerInterval);
  if (observer) observer.disconnect();
  if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);
  if (urlWatcherInterval) clearInterval(urlWatcherInterval);
  const modal = document.getElementById('df-modal-overlay');
  if (modal) modal.remove();
  document.getElementById('df-ai-modal-overlay')?.remove();
  document.getElementById('df-extend-overlay')?.remove();
  const cssBlocker = document.getElementById('df-css-blocker');
  if (cssBlocker) cssBlocker.remove();
  document.removeEventListener('copy', handleClipboardEvent, true);
  document.removeEventListener('paste', handleClipboardEvent, true);
  document.removeEventListener('click', handleClickGuard, true);
  // Restore History API
  if (window._dfOrigPushState) history.pushState = window._dfOrigPushState;
  if (window._dfOrigReplaceState) history.replaceState = window._dfOrigReplaceState;
  const existingToast = document.querySelector('.df-toast');
  if (existingToast) existingToast.remove();

  hideBlockOverlay();
  isCurrentlyBlocked = false;
  if (blockingObserver) blockingObserver.disconnect();
}


// ==============================================================
// LAYER 1: Click Interception — intercept clicks before navigation
// ==============================================================
const BLOCKED_PATTERN = /\/problems\/[^\/]+\/(solutions?|editorial)/i;
let urlWatcherInterval = null;

function handleClickGuard(e) {
  if (!focusState.focusActive) return;
  const anchor = e.target.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href') || '';
  if (BLOCKED_PATTERN.test(href)) {
    // Rely on URL change + blocker instead of manual preventDefault
    // This fixed the flickering by letting the URL update so the interval syncs properly
    showBlockOverlay();
  }
}

function installClickGuard() {
  document.addEventListener('click', handleClickGuard, true);
}

// ==============================================================
// LAYER 2: CSS Pre-Blocker — hide any solution content elements
// ==============================================================
function installCSSBlocker() {
  if (document.getElementById('df-css-blocker')) return;
  const style = document.createElement('style');
  style.id = 'df-css-blocker';
  style.textContent = `
    [data-track-load="solution"],
    [data-e2e-locator="solution"],
    [class*="solution-content"],
    [class*="solutions-content"],
    .solution-content,
    .solutions-content {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  document.documentElement.appendChild(style);
}

// ==============================================================
// LAYER 4: History API Override — block SPA pushState navigation
// ==============================================================
function installHistoryAPIGuard() {
  const patchHistory = (original, method) => {
    return function (state, title, url) {
      if (focusState.focusActive && url && BLOCKED_PATTERN.test(url)) {
        showBlockOverlay();
        // Removed return: allow call to proceed so URL updates, preventing flicker
      }
      return original.apply(this, arguments);
    };
  };
  if (!window._dfOrigPushState) {
    window._dfOrigPushState = history.pushState;
    history.pushState = patchHistory(window._dfOrigPushState, 'pushState');
  }
  if (!window._dfOrigReplaceState) {
    window._dfOrigReplaceState = history.replaceState;
    history.replaceState = patchHistory(window._dfOrigReplaceState, 'replaceState');
  }
}

// ==============================================================
// LAYER 5: URL Watcher interval fallback
// ==============================================================
function startUrlWatcher() {
  if (urlWatcherInterval) return; // Don't double-start
  urlWatcherInterval = setInterval(() => {
    try {
      if (!chrome.runtime?.id) { clearInterval(urlWatcherInterval); return; }
      if (!focusState.focusActive) { clearInterval(urlWatcherInterval); return; }
      if (BLOCKED_PATTERN.test(window.location.href)) {
        showBlockOverlay();
      }
    } catch (e) { clearInterval(urlWatcherInterval); }
  }, 300); // fast but lightweight
}

// ==============================================================
// Core Block Functions
// ==============================================================
function showBlockOverlay() {
  if (document.getElementById('df-blocked-frame')) return;

  try {
    if (!chrome.runtime?.id) return;
    const overlayUrl = chrome.runtime.getURL('content/blocked-overlay.html');
    const frame = document.createElement('iframe');
    frame.id = 'df-blocked-frame';
    frame.src = overlayUrl;
    frame.className = 'df-global-overlay';
    frame.style.border = 'none';
    document.documentElement.appendChild(frame);
    if (document.body) document.body.style.display = 'none';
    const instantStyle = document.getElementById('df-instant-block-style');
    if (instantStyle) instantStyle.remove();
  } catch (e) { }
}

function hideBlockOverlay() {
  const frame = document.getElementById('df-blocked-frame');
  if (frame) frame.remove();
  if (document.body) document.body.style.display = '';
  const instantStyle = document.getElementById('df-instant-block-style');
  if (instantStyle) instantStyle.remove();
}

// URL Blocking overlay
function blockSolutionsIfNeeded() {
  if (!focusState.focusActive) return;

  const isBlocked = BLOCKED_PATTERN.test(window.location.href);

  if (isBlocked) {
    if (!isCurrentlyBlocked) {
      isCurrentlyBlocked = true;
      showBlockOverlay();

      // Layer 3: Singleton MutationObserver for dynamically loaded solution nodes
      if (!blockingObserver) {
        blockingObserver = new MutationObserver(() => {
          if (focusState.focusActive && BLOCKED_PATTERN.test(window.location.href)) {
            showBlockOverlay();
          }
        });
      }

      if (document.body) {
        blockingObserver.observe(document.body, { childList: true, subtree: true });
      }

      // Layer 5: URL interval watcher
      startUrlWatcher();
    }
  } else {
    if (isCurrentlyBlocked) {
      isCurrentlyBlocked = false;
      hideBlockOverlay();
      if (blockingObserver) blockingObserver.disconnect();
    }
  }
}

// Helper: safely call chrome.storage.local.get — guards both the call AND the callback
function safeStorageGet(keys, callback) {
  try {
    if (!chrome?.runtime?.id) return;
    chrome.storage.local.get(keys, function () {
      try { callback.apply(this, arguments); }
      catch (e) { /* context invalidated inside callback — ignore */ }
    });
  } catch (e) { /* context invalidated — ignore */ }
}

// Helper: safely call chrome.storage.local.set
function safeStorageSet(obj, callback) {
  try {
    if (!chrome?.runtime?.id) return;
    chrome.storage.local.set(obj, function () {
      try { if (callback) callback.apply(this, arguments); }
      catch (e) { /* context invalidated inside callback — ignore */ }
    });
  } catch (e) { /* context invalidated — ignore */ }
}

// Listen for messages from the page / iframe
window.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === '__DEEPFOCUS_EXTRACTED_CODE__') {
    if (e.data.code && e.data.code.trim()) {
      lastInterceptedCode = e.data.code;
    }
  }

  if (e.data.type === '__DEEPFOCUS_SUBMITTED_CODE__') {
    if (e.data.code && e.data.code.trim()) {
      lastInterceptedCode = e.data.code;
    }
  }

  if (e.data.type === 'DEEPFOCUS_SET_AI_KEYS') {
    const { openrouterApiKey, groqApiKey, openAiApiKey, aiKeyMode } = e.data;
    safeStorageSet({
      df_openrouter_api_key: openrouterApiKey || "",
      df_groq_api_key: groqApiKey || "",
      df_openai_api_key: openAiApiKey || "",
      df_ai_key_mode: aiKeyMode === "byok" ? "byok" : "demo"
    }, () => {
      console.log("DeepFocus AI keys updated in storage.");
    });
  }

  if (e.data.type === 'DEEPFOCUS_CONNECT') {
    const token = e.data.token;
    safeStorageSet({ deepfocus_connection_token: token }, () => {
      console.log("[DeepFocus] Connection token saved automatically:", token);
    });
  }

  if (e.data.type === 'DEEPFOCUS_PING_EXTENSION') {
    safeStorageGet(['deepfocus_connection_token'], (res) => {
      window.postMessage({
        type: 'DEEPFOCUS_PONG_EXTENSION',
        token: res?.deepfocus_connection_token || null
      }, '*');
    });
  }

  if (e.data.type === 'DEEPFOCUS_GET_PENDING_NOTES') {
    safeStorageGet(['df_pending_ai_notes'], (res) => {
      if (res.df_pending_ai_notes && res.df_pending_ai_notes.length > 0) {
        window.postMessage({
          type: 'DEEPFOCUS_SET_PENDING_NOTES',
          notes: res.df_pending_ai_notes
        }, '*');
      }
    });
  }

  if (e.data.type === 'DEEPFOCUS_CLEAR_PENDING_NOTES') {
    safeStorageSet({ df_pending_ai_notes: [] });
  }

  if (e.data.type === 'DEEPFOCUS_BACK_TO_PROBLEM') {
    // Hide overlay immediately feeling responsive
    const frame = document.getElementById('df-blocked-frame');
    if (frame) frame.style.display = 'none';
    if (document.body) document.body.style.display = '';
    isCurrentlyBlocked = false;

    // First try the SPA way: find the "Description" tab element and click it
    const descTab = document.querySelector('a[href*="/description"]');
    if (descTab) {
      descTab.click(); // Should smoothly switch tabs via SPA without reloading
    } else {
      // Fallback: hard URL redirect to the root problem page
      const currentUrl = window.location.href;
      const match = currentUrl.match(/(https?:\/\/[^\/]+\/problems\/[^\/]+)/i);
      if (match) {
        window.location.href = match[1] + '/description/';
      }
    }
  }
});

// Widget UI
function injectWidget(initialCollapsed = false, initialPos = null) {
  if (document.getElementById('df-widget-container')) return;

  widgetContainer = document.createElement('div');
  widgetContainer.id = 'df-widget-container';

  // Apply collapsed class immediately if needed
  if (initialCollapsed) {
    widgetContainer.classList.add('df-collapsed');
  }

  // Apply position immediately if needed
  if (initialPos && initialPos.top) {
    widgetContainer.style.top = initialPos.top;
    widgetContainer.style.left = initialPos.left;
    widgetContainer.style.right = 'auto';
  }

  widgetContainer.innerHTML = `
    <!-- Expanded View -->
    <div class="df-expanded-view">
      <div class="df-widget-header">
        <div class="df-widget-title">DeepFocus <span class="df-icon-bolt">${lightningIcon}</span></div>
        <div class="df-header-right">
          <button class="df-toggle-btn" id="df-btn-collapse" title="Collapse">${minusIcon}</button>
          <div class="df-status-dot"></div>
        </div>
      </div>
      
      <div class="df-widget-body">
        <div class="df-stat-row">
          <div class="df-stat-label"><div class="df-icon-bg">${clockIcon}</div> Session Time</div>
          <div class="df-stat-value df-timer-value" id="df-time-display">00:00</div>
        </div>
        
        <div class="df-divider"></div>
        
        <div class="df-stat-row">
          <div class="df-stat-label"><div class="df-icon-bg">${tabIcon}</div> Tab Switches</div>
          <div class="df-stat-value">
            <span class="df-orange-dot"></span> <span id="df-tab-count">0</span>
          </div>
        </div>
        
        <div class="df-divider"></div>
        
        <div class="df-stat-row df-score-row" style="border-bottom:none;">
          <div class="df-stat-label"><div class="df-icon-bg">${crossIcon}</div> Focus Score</div>
          <div class="df-stat-value df-score-pill" id="df-score-display">100</div>
        </div>

        <div class="df-divider"></div>

        <div style="padding-top: 12px; display: flex; flex-direction: column; gap: 8px;">
          <button id="df-btn-analyze-mistake" class="df-analyze-btn">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            Analyze Mistake (AI)
          </button>
          
          <button id="df-btn-stop-focus" class="df-stop-focus-btn">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:14px;height:14px;"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Stop Focus
          </button>
        </div>
      </div>
    </div>
    
    <!-- Collapsed View (Timer Only) -->
    <div class="df-collapsed-view">
      <div class="df-icon-bg-small">${clockIcon}</div>
      <div class="df-timer-value" id="df-small-time-display">00:00</div>
      <button class="df-toggle-btn" id="df-btn-expand" title="Expand">${plusIcon}</button>
    </div>
  `;

  appendToBodyWhenReady(widgetContainer);
  makeWidgetDraggable(widgetContainer);
  updateWidgetUI();

  // Button interactions
  const btnCollapse = widgetContainer.querySelector('#df-btn-collapse');
  const btnExpand = widgetContainer.querySelector('#df-btn-expand');

  if (btnCollapse) {
    btnCollapse.addEventListener('click', (e) => {
      e.stopPropagation();
      widgetContainer.classList.add('df-collapsed');
      chrome.storage.local.set({ widgetCollapsed: true });
    });
  }

  if (btnExpand) {
    btnExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      widgetContainer.classList.remove('df-collapsed');
      chrome.storage.local.set({ widgetCollapsed: false });
    });
  }

  const btnStop = widgetContainer.querySelector('#df-btn-stop-focus');
  if (btnStop) {
    btnStop.addEventListener('click', (e) => {
      e.stopPropagation();
      btnStop.disabled = true;
      btnStop.textContent = "Stopping...";
      let finalStatus = "Give Up";
      if (focusState.tabSwitches > 8) {
        finalStatus = "Cheated";
      }
      stopFocusRequest(false, finalStatus, true);
    });
  }
  
  const btnAnalyze = widgetContainer.querySelector('#df-btn-analyze-mistake');
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', (e) => {
      e.stopPropagation();
      btnAnalyze.disabled = true;
      btnAnalyze.textContent = "Stopping...";
      let finalStatus = "Give Up";
      if (focusState.tabSwitches > 8) {
        finalStatus = "Cheated";
      }
      stopFocusRequest(false, finalStatus, true);
    });
  }
}

function getAISummarySnapshot(finalStatus) {
  const details = getProblemDetails();
  let userCode = "";
  try {
    userCode = getEditorCode();
  } catch (e) {
    userCode = "";
  }

  return {
    title: details.title || focusState.title || "Unknown Problem",
    link: details.link || normalizeProblemUrl(window.location.href),
    difficulty: details.difficulty || focusState.difficulty || "Medium",
    code: userCode && userCode.trim() ? userCode : "No code or notes provided yet.",
    finalStatus,
    score: typeof focusState.score === 'number' ? focusState.score : 100,
    switches: focusState.tabSwitches || 0
  };
}

function promptAISummaryAfterStop(snapshot) {
  if (document.getElementById('df-ai-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'df-ai-modal-overlay';
  overlay.innerHTML = `
      <div class="df-modal-content df-ai-modal-content">
        <div class="df-modal-header">
          <h2 class="df-modal-title" style="margin:0;">Session Ended</h2>
        </div>
        <div class="df-ai-modal-body">
          Would you like a quick AI summary of your approach, highlighting mistakes and providing a better direction?
        </div>
        <div class="df-summary-prompt-actions">
          <button class="df-summary-prompt-btn-yes" id="df-prompt-yes">Yes, analyze my code</button>
          <button class="df-summary-prompt-btn-no" id="df-prompt-no">No thanks</button>
        </div>
      </div>
    `;
  appendToBodyWhenReady(overlay);

  document.getElementById('df-prompt-no').onclick = () => {
    overlay.remove();
  };

  document.getElementById('df-prompt-yes').onclick = () => {
    const bodyEl = overlay.querySelector('.df-ai-modal-body');
    const actionsEl = overlay.querySelector('.df-summary-prompt-actions');
    actionsEl.style.display = 'none';
    bodyEl.innerHTML = `
        <div class="df-ai-loading">
          <div class="df-spinner"></div>
          <div>Analyzing your code and approach...</div>
        </div>
      `;

    chrome.runtime.sendMessage({
      type: 'ANALYZE_MISTAKE',
      payload: {
        title: snapshot.title,
        difficulty: snapshot.difficulty,
        code: snapshot.code
      }
    }, (res) => {
      if (chrome.runtime.lastError || !res) {
        showToast("Failed to communicate with AI.");
        overlay.remove();
        return;
      }

      if (res.success) {
        queuePendingNote(snapshot, res.summary);

        bodyEl.innerHTML = `
            <div style="color: #10b981; font-weight:600; margin-bottom:12px;">Analysis Complete! (Saved to Notes)</div>
            <div class="df-ai-summary-text">${res.summary}</div>
          `;
          
        actionsEl.style.display = 'flex';
        actionsEl.innerHTML = `<button class="df-btn-fight" id="df-prompt-close" style="background:#a78bfa;color:#000;width:100%;">Close & Finish</button>`;
        document.getElementById('df-prompt-close').onclick = () => {
          overlay.remove();
        };
      } else {
        showToast(res.error || "Error analyzing code.");
        overlay.remove();
      }
    });
  };
}

function queuePendingNote(snapshot, summary) {
  chrome.storage.local.get(['df_pending_ai_notes'], (res) => {
    let queue = res.df_pending_ai_notes || [];
    const link = snapshot.link || normalizeProblemUrl(window.location.href);

    queue.push({
      link: link,
      title: snapshot.title,
      summary: summary,
      difficulty: snapshot.difficulty || "Medium",
      code: snapshot.code || "",
      timestamp: Date.now()
    });
    chrome.storage.local.set({ df_pending_ai_notes: queue });

    // Tell background script to save directly to Supabase
    chrome.runtime.sendMessage({
      type: 'SAVE_AI_SUMMARY',
      payload: { 
        link: link, 
        summary: summary,
        title: snapshot.title,
        difficulty: snapshot.difficulty || "Medium",
        code: snapshot.code || ""
      }
    });
  });
}

function getEditorCode() {
  if (lastInterceptedCode && lastInterceptedCode.trim()) {
    return lastInterceptedCode;
  }

  // 1. CodeMirror 6 (LeetCode's modern default editor)
  const cmContent = document.querySelector('.cm-content');
  if (cmContent) {
    const cmLines = cmContent.querySelectorAll('.cm-line');
    if (cmLines && cmLines.length > 0) {
      return Array.from(cmLines).map(line => line.textContent).join('\n');
    }
    return cmContent.innerText || cmContent.textContent || "";
  }

  // 2. Monaco Editor (lines are rendered inside .view-lines)
  const viewLines = document.querySelector('.view-lines');
  if (viewLines) {
    const lines = Array.from(viewLines.querySelectorAll('.view-line'));
    if (lines.length > 0) {
      return lines.map(line => line.textContent).join('\n');
    }
  }

  // 3. Fallback: CodeMirror 5 (often has text in pre elements inside CodeMirror-code)
  const cmCode = document.querySelector('.CodeMirror-code');
  if (cmCode) {
    const lines = Array.from(cmCode.querySelectorAll('pre'));
    if (lines.length > 0) {
      return lines.map(line => line.textContent).join('\n');
    }
  }

  // 4. Last resort: Try textareas in editor components
  const textareas = document.querySelectorAll('.monaco-editor textarea, .cm-editor textarea, textarea.inputarea');
  for (const ta of textareas) {
    if (ta.value && ta.value.length > 20) {
      return ta.value;
    }
  }

  return "";
}

function updateWidgetUI() {
  const isAct = focusState.focusActive;
  if (!widgetContainer) return;

  if (!isAct) {
    widgetContainer.style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    return;
  }

  widgetContainer.style.display = 'block';
  document.getElementById('df-tab-count').innerText = focusState.tabSwitches || 0;

  const score = typeof focusState.score === 'number' ? focusState.score : 100;
  const scoreEl = document.getElementById('df-score-display');
  scoreEl.innerText = score;
  if (score < 50) {
    scoreEl.classList.add('df-score-danger');
  } else {
    scoreEl.classList.remove('df-score-danger');
  }

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    try {
      const elapsed = Math.floor((Date.now() - focusState.sessionStartAt) / 1000);
      const remaining = Math.max(0, focusState.durationSeconds - elapsed);

      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');

      const timeStr = `${m}:${s}`;
      const timeEl = document.getElementById('df-time-display');
      if (timeEl) timeEl.innerText = timeStr;
      const miniTimeEl = document.getElementById('df-small-time-display');
      if (miniTimeEl) miniTimeEl.innerText = timeStr;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        showExtendPrompt();
      }
    } catch (e) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

function showExtendPrompt() {
  if (document.getElementById('df-extend-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'df-extend-overlay';
  overlay.innerHTML = `
    <div class="df-modal-content">
      <div class="df-modal-icon-wrap" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <h2 class="df-modal-title">Time's Up!</h2>
      <p class="df-modal-text">Great work so far. Do you need a few more minutes to wrap this up?</p>
      <div class="df-modal-actions">
        <button class="df-btn-fight" id="df-btn-extend-5" style="background: #fbbf24; color: #000;">
          Add 5 Minutes
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button class="df-btn-giveup" id="df-btn-finish-session">Finish Session</button>
      </div>
    </div>
  `;
  appendToBodyWhenReady(overlay);

  document.getElementById('df-btn-extend-5').onclick = () => {
    overlay.remove();
    chrome.runtime.sendMessage({ type: 'EXTEND_FOCUS' }, (res) => {
      if (res && res.success) {
        focusState = res.state;
        updateWidgetUI();
      }
    });
  };

  document.getElementById('df-btn-finish-session').onclick = () => {
    overlay.remove();
    stopFocusRequest(false, "Focus Kept", true);
  };
}

// function startTimer() { // This function is now integrated into updateWidgetUI
//   if (timerInterval) clearInterval(timerInterval);

//   timerInterval = setInterval(() => {
//     if (!focusState.focusActive || !focusState.sessionStartAt) return;

//     const elapsedSecs = Math.floor((Date.now() - focusState.sessionStartAt) / 1000);
//     const totalSecs = focusState.durationSeconds;
//     const remaining = Math.max(0, totalSecs - elapsedSecs);

//     const displayElement = document.getElementById('df-time-display');
//     if (displayElement) {
//       const m = Math.floor(remaining / 60).toString().padStart(2, '0');
//       const s = (remaining % 60).toString().padStart(2, '0');
//       displayElement.innerText = `${m}:${s}`;
//     }

//     if (remaining <= 0) {
//       stopFocusRequest();
//     }
//   }, 1000);
// }

// Widget Persist & Draggable
function setupPersistObserver(initialCollapsed = false, initialPos = null) {
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    if (focusState.focusActive && !document.getElementById('df-widget-container')) {
      // Re-inject if removed by LeetCode SPA changes
      injectWidget(initialCollapsed, initialPos);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function makeWidgetDraggable(el) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  // Drag from anywhere on the widget
  el.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    // Check if we are interacting with something inside that we shouldn't drag
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.right = "auto";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    try { chrome.storage.local.set({ widgetPos: { top: el.style.top, left: el.style.left } }); } catch (e) { }
  }
}

// Copy/Paste restrictions
function setupCopyPasteRestriction() {
  document.addEventListener('copy', handleClipboardEvent, true);
  document.addEventListener('paste', handleClipboardEvent, true);
}

let lastLocalCopy = null;

function handleClipboardEvent(e) {
  if (!focusState.focusActive) return;
  const target = e.target;

  // Broader editor detection
  const isEditor = target.closest('.monaco-editor') ||
    target.closest('.react-codemirror2') ||
    target.closest('[data-track-load="editor_content"]') ||
    target.closest('.editor-scrollable') ||
    target.classList.contains('inputarea') ||
    target.closest('.cm-editor') ||
    target.closest('.CodeMirror') ||
    (target.tagName === 'TEXTAREA' && (target.closest('.editor-container') || target.closest('.editor-scrollable')));

  // Handle Copy: record what was copied locally
  if (e.type === 'copy' || e.type === 'cut') {
    let selection = window.getSelection().toString();
    if (selection) {
      lastLocalCopy = selection;
      chrome.runtime.sendMessage({ type: 'INTERNAL_COPY', text: selection });
      window.postMessage({ type: '__DEEPFOCUS_INTERNAL_COPY__', text: selection }, '*');
    }
    return;
  }

  // Handle Paste
  if (e.type === 'paste') {
    const clipboardData = (e.clipboardData || window.clipboardData).getData('text');
    const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();
    const normClipboard = normalize(clipboardData);
    const isInternalFlag = e.clipboardData?.getData('text/deepfocus-internal') === 'true' ||
      e.clipboardData?.getData('web text/deepfocus-internal') === 'true';

    const normLocalSync = normalize(lastLocalCopy);
    const isInternalSync = isInternalFlag || (lastLocalCopy && normClipboard === normLocalSync && normClipboard.length > 0);

    // Only allow pasting if it's strictly internal code being pasted into the editor
    if (isEditor && isInternalSync) {
      return; // Allow
    }

    // Otherwise block (external code, text anywhere, or internal text outside editor)
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (window.DeepFocusSound) {
      window.DeepFocusSound.playSound('fail');
    }
    showCheekyPasteToast();
    return false;
  }
}

// Block Ctrl+V / Cmd+V directly as well for extra protection
document.addEventListener('keydown', (e) => {
  if (!focusState.focusActive) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    const target = e.target;
    const isEditor = target.closest('.monaco-editor') || target.classList.contains('inputarea') || target.closest('.cm-editor');

    if (isEditor) {
      // We can't see clipboard data here easily without async, 
      // so we let the 'paste' event handler deal with it.
      // But we log it.
      // But we log it.
    }
  }
}, true);

const roastLines = [
  "Even my grandma types faster than you copy. Get to work!",
  "Brain.exe has left the chat? Try typing it.",
  "The keys are right there. Use them, lazy bones.",
  "Nice try, Ctrl+V artist! Practice makes perfect.",
  "Pasting code? That's not very DeepFocus of you.",
  "Your keyboard is feeling neglected. Type it out!",
  "Copy-pasting won't fix your skill issue, buddy.",
  "ChatGPT did the work, now you want the credit? Type it.",
  "Ctrl+C, Ctrl+V... Do you even know what a semicolon is?",
  "Is this code even yours? Doubt it. Type it or lose it.",
];

function showCheekyPasteToast() {
  const line = roastLines[Math.floor(Math.random() * roastLines.length)];
  showToast(line);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getToastMeta(message, variant) {
  const text = String(message || '');
  if (variant === 'success' || /revision sheet updated/i.test(text)) {
    return {
      variant: 'success',
      title: 'Revision Sheet updated',
      detail: 'Your focus session was saved and synced.',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`
    };
  }
  if (variant === 'queued' || /queued|saved locally|not connected/i.test(text)) {
    return {
      variant: 'queued',
      title: 'Saved locally',
      detail: text,
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="9"></circle></svg>`
    };
  }
  return {
    variant: 'default',
    title: text,
    detail: '',
    icon: `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 14.25 9 20 11.25 14.25 13.5 12 19 9.75 13.5 4 11.25 9.75 9 12 3.5Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"></path><path d="M18.5 4.75 19.25 6.5 21 7.25 19.25 8 18.5 9.75 17.75 8 16 7.25 17.75 6.5 18.5 4.75Z" fill="currentColor"></path></svg>`
  };
}

function showToast(message, variant = 'default') {
  const existing = document.querySelector('.df-toast');
  if (existing) existing.remove();

  const meta = getToastMeta(message, variant);
  const toast = document.createElement('div');
  toast.className = `df-toast df-toast-${meta.variant}`;
  toast.innerHTML = `
    <div class="df-toast-icon">
      ${meta.icon}
    </div>
    <div class="df-toast-copy">
      <div class="df-toast-title">${escapeHtml(meta.title)}</div>
      ${meta.detail ? `<div class="df-toast-detail">${escapeHtml(meta.detail)}</div>` : ''}
    </div>
  `;
  appendToBodyWhenReady(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, meta.variant === 'success' ? 4200 : 3200);
}

// Warning Modal
const tabRoastLines = [
  "Caught you red-handed! No sneak-peeks allowed here.",
  "Distraction alert! What's so interesting outside LeetCode?",
  "Another tab switch? Your brain must be running out of RAM.",
  "Are you looking up the solution on another tab? Busted!",
  "Tab switching won't compile your solution. Get back to coding!",
  "Focus, young padawan! Your attention span is shorter than a goldfish.",
  "Did you really just switch tabs? Focus score goes brrr...",
];

function showWarningModal() {
  if (document.getElementById('df-modal-overlay')) return;

  const roast = tabRoastLines[Math.floor(Math.random() * tabRoastLines.length)];
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'df-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="df-modal-content">
      <div class="df-modal-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h2 class="df-modal-title">Focus Mode Active</h2>
      <p class="df-modal-text" style="font-style: italic; color: #a78bfa; margin-bottom: 12px;">"${roast}"</p>
      <p class="df-modal-text">Leaving the problem interrupts your focus.<br>Your score has dropped by <strong>10 points</strong>.</p>
      <div class="df-modal-actions">
        <button class="df-btn-fight" id="df-btn-fight-modal">
          Keep Fighting
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <button class="df-btn-giveup" id="df-btn-giveup-modal">Give Up</button>
      </div>
    </div>
  `;
  appendToBodyWhenReady(modalOverlay);

  document.getElementById('df-btn-fight-modal').onclick = () => {
    modalOverlay.remove();
  };

  document.getElementById('df-btn-giveup-modal').onclick = () => {
    modalOverlay.remove();
    stopFocusRequest(false, "Give Up", true);
  };
}

// Check for Accepted — only after the user actually clicks Submit
let waitingForSubmit = false;
let lastSeenResult = null;
let isJudging = false;
let xhrResultReceived = null; // Result from network interception
let acceptedDetectionInstalled = false;
let submissionSequence = 0;
let activeSubmissionId = 0;
let handledSubmissionId = 0;
let preSubmitResultText = "";

function getSubmissionResultText() {
  const resultEl = document.querySelector('[data-e2e-locator="submission-result"]') ||
    document.querySelector('.submission-result') ||
    document.querySelector('[class*="result-status"]') ||
    document.querySelector('[class*="status-column"]');

  try {
    return resultEl ? (resultEl.textContent || resultEl.innerText || '').trim().toLowerCase() : '';
  } catch (err) {
    return '';
  }
}

function classifySubmissionResult(rawStatus, rawState = "") {
  const status = String(rawStatus || '').trim().toLowerCase();
  const state = String(rawState || '').trim().toLowerCase();
  const combined = `${status} ${state}`;

  if (!combined.trim()) return null;
  if (
    combined.includes('pending') ||
    combined.includes('started') ||
    combined.includes('judging') ||
    combined.includes('running') ||
    combined.includes('queued')
  ) {
    return 'pending';
  }

  if (status === 'accepted' || /\baccepted\b/.test(status)) return 'success';

  if (
    combined.includes('wrong answer') ||
    combined.includes('runtime error') ||
    combined.includes('compile error') ||
    combined.includes('compilation error') ||
    combined.includes('time limit') ||
    combined.includes('memory limit') ||
    combined.includes('output limit') ||
    combined.includes('limit exceeded') ||
    combined.includes('failed') ||
    combined.includes('error')
  ) {
    return 'fail';
  }

  return status ? 'fail' : null;
}

function playSubmissionResult(resultType) {
  if (!waitingForSubmit || !activeSubmissionId || handledSubmissionId === activeSubmissionId) return false;
  if (resultType !== 'success' && resultType !== 'fail') return false;

  handledSubmissionId = activeSubmissionId;
  if (window.DeepFocusSound) {
    window.DeepFocusSound.playSound(resultType, { force: true });
  }
  return true;
}

function setupAcceptedDetection() {
  if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);

  if (!acceptedDetectionInstalled) {
    acceptedDetectionInstalled = true;

    // ========== STRATEGY 1: Intercept LeetCode's Network Responses ==========
    try {
      if (!chrome.runtime?.id) return;
      const interceptScript = document.createElement('script');
      interceptScript.src = chrome.runtime.getURL('utils/pageInterceptor.js');
      interceptScript.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(interceptScript);
    } catch (e) {
      // Silently ignore
    }

    window.addEventListener('message', (event) => {
      if (event.data?.type !== '__DEEPFOCUS_SUBMISSION_RESULT__') return;
      if (!waitingForSubmit) return;

      const msg = event.data.status_msg || '';
      const state = event.data.state || '';
      const resultType = classifySubmissionResult(msg, state);

      if (resultType === 'pending') return;
      xhrResultReceived = { msg, state, resultType, submissionId: activeSubmissionId };
    });

    window.addEventListener('message', (event) => {
      if (event.data?.type !== '__DEEPFOCUS_INTERNAL_COPY__') return;
      lastLocalCopy = event.data.text;
    });

    document.addEventListener('click', (e) => {
      if (!focusState.focusActive) return;
      const btn = e.target.closest('button');
      if (!btn) return;
      const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      const isSubmit = text === 'submit' ||
        btn.getAttribute('data-e2e-locator') === 'console-submit-button' ||
        btn.getAttribute('data-cy') === 'submit-code-btn';

      if (isSubmit) {
        submissionSequence += 1;
        activeSubmissionId = submissionSequence;
        waitingForSubmit = true;
        isJudging = false;
        lastSeenResult = null;
        xhrResultReceived = null;
        preSubmitResultText = getSubmissionResultText();
        window._dfClickTime = Date.now();
      }
    }, true);
  }

  // ========== STRATEGY 3: Polling-Based Result Detection ==========
  acceptedObserverInterval = setInterval(() => {
    try {
      if (!chrome.runtime?.id || !focusState.focusActive) {
        if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);
        return;
      }
      if (!waitingForSubmit) return;

      const timeSinceClick = Date.now() - (window._dfClickTime || 0);

      const finishDetection = () => {
        // Reset state flags ONLY — do NOT clear the interval.
        // The interval must keep running to detect future submissions.
        waitingForSubmit = false;
        isJudging = false;
        xhrResultReceived = null;
        lastSeenResult = null;
        preSubmitResultText = "";
      };

      // ---- CHECK 1: Network intercepted result (most reliable) ----
      if (xhrResultReceived && xhrResultReceived.submissionId === activeSubmissionId) {
        if (xhrResultReceived.resultType === 'success') {
          playSubmissionResult('success');
          finishDetection();
          stopFocusRequest(false, "Focus Kept");
          return;
        }

        if (xhrResultReceived.resultType === 'fail') {
          const failedMessage = xhrResultReceived.msg;
          playSubmissionResult('fail');
          finishDetection();
          lastSeenResult = failedMessage;
          return;
        }
      }

      // ---- CHECK 2: DOM-based detection (fallback) ----
      const lowerRes = getSubmissionResultText();
      const domResultType = classifySubmissionResult(lowerRes);

      // Detect judging state — this is what "unlocks" DOM-based result checks
      if (domResultType === 'pending') {
        isJudging = true;
        lastSeenResult = lowerRes;
        return;
      }

      // CRITICAL: Only check DOM results AFTER we have seen the judging state.
      // This prevents stale DOM from the previous submission from triggering sounds.
      if (isJudging || (lowerRes && lowerRes !== preSubmitResultText && lowerRes !== lastSeenResult)) {
        // If result text has changed from the judging state to something new
        if (lowerRes && lowerRes !== lastSeenResult) {
          lastSeenResult = lowerRes;

          if (domResultType === 'success') {
            playSubmissionResult('success');
            finishDetection();
            stopFocusRequest(false, "Focus Kept");
            return;
          }

          if (domResultType === 'fail') {
            playSubmissionResult('fail');
            finishDetection();
            return;
          }
        }
      }

      if (isJudging) {
        // ---- CHECK 3: Scan for red/error elements — only after judging ----
        const errorEls = document.querySelectorAll(
          '[class*="text-red-"], [class*="text-pink-"], [class*="error"], [data-cy*="error"]'
        );

        for (const el of errorEls) {
          const txt = (el.textContent || el.innerText || '').trim().toLowerCase();
          if (classifySubmissionResult(txt) === 'fail') {
            playSubmissionResult('fail');
            finishDetection();
            lastSeenResult = txt;
            return;
          }
        }
      }

      // ---- TIMEOUT: If 15s passed since submit and still nothing, reset ----
      if (timeSinceClick > 15000) {
        waitingForSubmit = false;
        isJudging = false;
        xhrResultReceived = null;
        preSubmitResultText = "";
      }

    } catch (e) {
      console.error("DeepFocus Observer Error:", e);
      if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);
    }
  }, 500);
}

let stopFocusInProgress = false;

function stopFocusRequest(skipSync = false, customStatus = null, offerAISummary = false) {
  if (!focusState.focusActive) return;
  if (stopFocusInProgress) return;
  // Determine final status based on tab switches or custom status
  let finalStatus = customStatus || "Give Up";
  if (!customStatus && focusState.tabSwitches > 8) {
    finalStatus = "Cheated";
  }

  const aiSnapshot = offerAISummary ? getAISummarySnapshot(finalStatus) : null;
  stopFocusInProgress = true;
  if (aiSnapshot) {
    setTimeout(() => promptAISummaryAfterStop(aiSnapshot), 650);
  }
  executeStopFocus(skipSync, finalStatus, () => {
    stopFocusInProgress = false;
  });
}

function executeStopFocus(skipSync = false, customStatus = null, onComplete = null) {
  try {
    let finalStatus = "Give Up";
    if (focusState.tabSwitches > 8) {
      finalStatus = "Cheated";
    } else if (customStatus) {
      finalStatus = customStatus;
    }

    const fallbackScore = focusState.score || 0;
    const fallbackSwitches = focusState.tabSwitches || 0;
    let cleaned = false;
    let completed = false;
    const cleanupLocal = () => {
      if (cleaned) return;
      cleaned = true;
      focusState = { focusActive: false };
      cleanupFocusEnvironment();
      syncStateToPage();
    };
    const completeStop = () => {
      if (completed) return;
      completed = true;
      cleanupLocal();
      if (typeof onComplete === 'function') {
        onComplete();
      }
    };

    const localCleanupTimer = setTimeout(cleanupLocal, 500);
    const completionFallbackTimer = setTimeout(() => {
      if (!skipSync) {
        syncWithWebsite(finalStatus, fallbackScore, fallbackSwitches, false);
      }
      showToast("Focus stopped locally. Sync queued.");
      completeStop();
    }, 12000);

    chrome.runtime.sendMessage({
      type: 'STOP_FOCUS',
      customStatus: finalStatus,
      skipSync: skipSync
    }, (res) => {
      clearTimeout(localCleanupTimer);
      clearTimeout(completionFallbackTimer);

      if (chrome.runtime.lastError || !res?.success) {
        if (!skipSync) {
          syncWithWebsite(finalStatus, fallbackScore, fallbackSwitches, false);
        }
        showToast(res?.error || chrome.runtime.lastError?.message || "Focus stopped locally. Sync queued.");
      }

      completeStop();
    });
  } catch (e) {
    stopFocusInProgress = false;
    focusState = { focusActive: false };
    cleanupFocusEnvironment();
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }
}

let lastWidgetCheck = 0;
// INSTANT WATCHER (Self-Heals Widget and Blocks Solutions)
setInterval(() => {
  // 0. Safety Check: is context still valid?
  if (!chrome.runtime?.id) return;

  // 1. Solution Block Check (200ms)
  if (typeof blockSolutionsIfNeeded === 'function') {
    blockSolutionsIfNeeded();
  }

  // 2. Widget Presence Check (500ms) - Ensures instant appearance if message was lost
  const now = Date.now();
  if (now - lastWidgetCheck > 500) {
    lastWidgetCheck = now;
    if (!document.getElementById('df-widget-container')) {
      // Safety check: is context still valid?
      if (!chrome.runtime?.id) return;

      requestValidatedFocusState((state) => {
        if (isUsableFocusState(state)) {
          focusState = state;
          initFocusEnvironment();
        }
      });
    }
  }
}, 200);
})();
