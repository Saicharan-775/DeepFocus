// =============================================
// INSTANT BLOCK — runs before DOM renders
// We read focus active from local storage via a
// synchronous-ish check of the URL combined with
// an asynchronous storage check. The trick is to
// immediately hide the page and show a blocker
// overlay at the style level if we're on a forbidden URL.
// =============================================
(function instantBlock() {
  const BLOCKED_PATTERN = /\/problems\/[^\/]+\/(solutions?|editorial)/i;
  if (!BLOCKED_PATTERN.test(window.location.href)) return;

  // Check if focus is stored as active (from a previous session startup)
  // We must use synchronous approach since storage is async at document_start.
  // Inject a full-page style hider immediately; then remove if focus is not active.
  const styleId = 'df-instant-block-style';

  // Don't run on localhost (dashboard)
  if (window.location.hostname === 'localhost') return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = 'html { visibility: hidden !important; }';
  document.documentElement.appendChild(style);

  // Now check focus state asynchronously as fast as possible
  try {
    chrome.storage.local.get(['focusState'], (res) => {
      if (chrome.runtime.lastError || !res || !res.focusState || !res.focusState.focusActive) {
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

// Get Font Awesome / Iconify raw SVGs
const clockIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
const tabIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`;
const crossIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
const lightningIcon = `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>`;
const minusIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"></path></svg>`;
const plusIcon = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>`;


// Listen for messages from background & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DIFFICULTY') {
    let diff = 'Medium'; // default
    let titleStr = "LeetCode Problem";

    try {
      // 1. IMPROVED TITLE DETECTION
      // First try the specific 1.1 title element LeetCode uses
      const titleEl = document.querySelector('[data-cy="question-title"]') ||
        document.querySelector('div.text-title-large') ||
        document.querySelector('h4.text-title-large');

      if (titleEl && titleEl.textContent) {
        titleStr = titleEl.textContent.trim();
      } else if (document.title) {
        // Fallback to document title: "1. Two Sum - LeetCode" -> "Two Sum"
        titleStr = document.title.split('-')[0].replace(/^\d+\.\s*/, '').trim();
      }

      if (!titleStr || titleStr.toLowerCase().includes("leetcode")) {
        // Last resort: extract from URL
        const urlMatch = window.location.href.match(/\/problems\/([^\/]+)/);
        if (urlMatch) {
          titleStr = urlMatch[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }

      // 2. IMPROVED DIFFICULTY DETECTION
      if (document.body) {
        // Try precise badge selection first (best for modern LeetCode)
        const diffBadge = document.querySelector('[data-track-load="description_content"] div[class*="text-difficulty-"], .text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');

        if (diffBadge) {
          const txt = diffBadge.textContent.trim();
          if (txt.includes('Hard')) diff = 'Hard';
          else if (txt.includes('Easy')) diff = 'Easy';
          else if (txt.includes('Medium')) diff = 'Medium';
        } else {
          // Fallback to broader check but prioritize main content area
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
      console.error("DeepFocus: Error detecting difficulty:", err);
    }

    difficulty = diff;
    sendResponse({ difficulty: diff, title: titleStr });
    return;
  }

  if (message.type === 'FOCUS_STARTED') {
    focusState = message.state;
    isCurrentlyBlocked = false;
    
    initFocusEnvironment();
    
    if (document.body) {
      injectWidget();
      updateWidgetUI();
    }
    return;
  }

  if (message.type === 'FOCUS_STOPPED') {
    focusState = { focusActive: false };
    cleanupFocusEnvironment();
  }

  if (message.type === 'TAB_SWITCH_WARNING') {
    // Score has been updated by background — sync it and refresh widget
    focusState = message.state;
    updateWidgetUI();
    showWarningModal();

    // Mid-session syncing disabled per user request. Use final end syncs only.
  }

  if (message.type === 'URL_CHANGED') {
    blockSolutionsIfNeeded();
  }

  if (message.type === 'SYNC_AND_STOP') {
    syncWithWebsite(message.status, message.score, message.switches);
    // Note: cleanup will be handled shortly after by FOCUS_STOPPED message from background
  }

  if (message.type === 'FOCUS_STATE_UPDATED') {
    focusState = message.state;
    updateWidgetUI();
  }
});

/** Get Problem Details */
function getProblemDetails() {
  const titleEl = document.querySelector('[data-cy="question-title"]') ||
    document.querySelector('div.text-title-large') ||
    document.querySelector('h4.text-title-large') ||
    document.querySelector('.question-title');
  const title = titleEl ? titleEl.textContent.replace(/^\d+\.\s*/, '').trim() : "Unknown Problem";

  const fullUrl = window.location.href.split('?')[0].split('#')[0];
  // Normalize: https://leetcode.com/problems/name/description/ -> https://leetcode.com/problems/name/
  const linkMatch = fullUrl.match(/https?:\/\/leetcode\.com\/problems\/[^\/]+\//);
  const link = linkMatch ? linkMatch[0] : fullUrl;

  return {
    id: Date.now(),
    title,
    link,
    difficulty: difficulty,
    added: new Date().toISOString().split('T')[0]
  };
}

/** QUEUE EVENTS (Secure Supabase Sync) */
function syncWithWebsite(status, score, switches) {
  // IGNORE lists/general leetcode pages — only sync on problem pages
  if (!window.location.href.includes('/problems/')) return;

  const details = getProblemDetails();
  const elapsedSecs = focusState.sessionStartAt 
    ? Math.floor((Date.now() - focusState.sessionStartAt) / 1000) 
    : 0;

  const problemObject = {
    title: details.title,
    link: details.link,
    difficulty: details.difficulty,
    focus_status: status,
    focus_score: score,
    switches: switches,
    focus_duration: elapsedSecs,
    timestamp: Date.now()
  };

  chrome.storage.local.get(['deepfocus_pending_events'], (res) => {
    let queue = res.deepfocus_pending_events || [];
    queue.push(problemObject);

    // Limit queue size to prevent overflow
    if (queue.length > 50) queue = queue.slice(-50);

    chrome.storage.local.set({ deepfocus_pending_events: queue }, () => {
      processEventQueue(); // Try immediately
    });
  });
}

// Processing Queue with Backoff
let isProcessingQueue = false;
async function processEventQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

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
    let queue = res.deepfocus_pending_events || [];
    const token = res.deepfocus_connection_token;

    if (queue.length === 0) return;

    if (!token) {
      return;
    }

    // 1. SMART DEDUPLICATE: Only keep the LATEST event for each unique link
    const uniqueMap = new Map();
    queue.forEach(item => uniqueMap.set(item.link, item));
    const dedupedQueue = Array.from(uniqueMap.values());
    
    if (dedupedQueue.length !== queue.length) {
      // Queue pruned to prevent spam
    }

    // 2. PROCESS ONE-BY-ONE SAFELY
    let remainingQueue = [...dedupedQueue];
    
    for (const problem of dedupedQueue) {
      
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'SYNC_EVENT', problem, token }, resolve);
        });

        if (response && response.success) {
          remainingQueue = remainingQueue.filter(q => q.link !== problem.link);
          
          // Save progress IMMEDIATELY after each success
          await chrome.storage.local.set({ deepfocus_pending_events: remainingQueue });
          
          if (remainingQueue.length === 0) showToast("🚀 Revision Sheet Updated!");
        } else {
          console.error("❌ Sync failure. Stopping for now.");
          break; 
        }

        // Small pulse between requests
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error("🌐 Messaging Failure:", error);
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

// Background retry loop - only on real LeetCode pages, never on localhost/dashboard
if (window.location.hostname !== 'localhost') {
  setInterval(() => {
    if (!chrome.runtime?.id) return;
    processEventQueue();
  }, 30000);
}

// Check if currently active from storage on load
try {
  if (chrome.runtime?.id) {
    chrome.storage.local.get(['focusState', 'widgetCollapsed', 'widgetPos'], (res) => {
      if (chrome.runtime.lastError) return;
      if (res && res.focusState && res.focusState.focusActive) {
        focusState = res.focusState;
        initFocusEnvironment(res.widgetCollapsed, res.widgetPos);
      }
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
  // Don't run on localhost
  if (window.location.hostname === 'localhost') return;

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
  };

  if (document.body) {
    doSetup();
  } else {
    document.addEventListener('DOMContentLoaded', doSetup, { once: true });
  }
}

function cleanupFocusEnvironment() {
  if (widgetContainer) widgetContainer.remove();
  if (timerInterval) clearInterval(timerInterval);
  if (observer) observer.disconnect();
  if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);
  if (urlWatcherInterval) clearInterval(urlWatcherInterval);
  const modal = document.getElementById('df-modal-overlay');
  if (modal) modal.remove();
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
    const overlayUrl = chrome.runtime.getURL('content/blocked-overlay.html');
    const frame = document.createElement('iframe');
    frame.id = 'df-blocked-frame';
    frame.src = overlayUrl;
    frame.className = 'df-global-overlay';
    frame.style.border = 'none';
    document.documentElement.appendChild(frame);
    document.body.style.display = 'none';
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

// Listen for messages from the iframe (e.g. clicking "Go Back")
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'DEEPFOCUS_BACK_TO_PROBLEM') {
    // Hide overlay immediately feeling responsive
    const frame = document.getElementById('df-blocked-frame');
    if (frame) frame.style.display = 'none';
    document.body.style.display = '';
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

        <div style="padding-top: 12px;">
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

  document.body.appendChild(widgetContainer);
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
      stopFocusRequest();
    });
  }
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
  document.body.appendChild(overlay);

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
    // Naturally finished sessions get 'Focus Kept'
    syncWithWebsite("Focus Kept", focusState.score || 0, focusState.tabSwitches || 0);
    stopFocusRequest(true); // pass skipSync=true since we just did it
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
  const isEditor = target.closest('.monaco-editor') ||
    target.closest('.react-codemirror2') ||
    target.classList.contains('inputarea') ||
    target.closest('.editor-scrollable'); // Extra safety for LeetCode editor variations

  const isDescription = target.closest('[data-track-load="description_content"]') ||
    target.closest('.question-content') ||
    target.closest('.elf-description');

  // Handle Copy: record what was copied locally ONLY if it's from the editor or description
  if (e.type === 'copy') {
    if (isEditor || isDescription) {
      const selection = window.getSelection().toString();
      if (selection) {
        lastLocalCopy = selection;
      }
    } else {
      // If user copies something else (external site, etc.), invalidate local copy
      lastLocalCopy = null;
    }
    return;
  }

  // Handle Paste: validate against local copy
  if (e.type === 'paste' && isEditor) {
    const clipboardData = (e.clipboardData || window.clipboardData).getData('text');

    // Normalize logic: ignore external/internal differences in line endings or trailing spaces
    const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();

    const normClipboard = normalize(clipboardData);
    const normLocal = normalize(lastLocalCopy);

    // Allow if it matches exactly what we just copied within this session
    if (lastLocalCopy && normClipboard === normLocal && normClipboard.length > 0) {
      // Allow the native paste to happen silently
      return;
    } else {
      // External content or no local copy recorded
      e.preventDefault();
      e.stopPropagation();
      showCheekyPasteToast();
      return;
    }
  }

  // Block copy/paste in non-editable areas as well
  const isEditable = target.tagName === 'TEXTAREA' ||
    target.tagName === 'INPUT' ||
    target.isContentEditable ||
    isEditor;

  if (!isEditable) {
    if (e.type === 'paste') {
      e.preventDefault();
      e.stopPropagation();
      showToast("Pasting is not allowed here!");
    }
  }
}

const cheekyLines = [
  "Brain.exe has left the chat? Try typing it.",
  "Code is like love; you shouldn't just copy it.",
  "Nice try, Ctrl+V artist!",
  "The keys are right there. Use them.",
  "Pasting code? That's not very DeepFocus of you.",
  "Your keyboard is feeling neglected. Type it out!",
  "Don't cheat your own growth. Build it manually."
];

function showCheekyPasteToast() {
  const line = cheekyLines[Math.floor(Math.random() * cheekyLines.length)];
  showToast(line);
}

function showToast(message) {
  // Remove existing toast if any
  const existing = document.querySelector('.df-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'df-toast';
  toast.innerHTML = `
    <div class="df-toast-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
    <div class="df-toast-message">${message}</div>
  `;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Warning Modal
function showWarningModal() {
  if (document.getElementById('df-modal-overlay')) return;

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
  document.body.appendChild(modalOverlay);

  document.getElementById('df-btn-fight-modal').onclick = () => {
    modalOverlay.remove();
  };

  document.getElementById('df-btn-giveup-modal').onclick = () => {
    modalOverlay.remove();
    syncWithWebsite("Give Up", focusState.score || 0, focusState.tabSwitches || 0);
    stopFocusRequest();
  };
}

// Check for Accepted — only after the user actually clicks Submit
let waitingForSubmit = false;
let lastSeenResult = null;
let isJudging = false;
let xhrResultReceived = null; // Result from network interception

function setupAcceptedDetection() {
  if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);

  // ========== STRATEGY 1: Intercept LeetCode's Network Responses ==========
  // Inject a page-level script that hooks into XMLHttpRequest and fetch
  // to catch the actual submission result from LeetCode's API.
  // This is the most reliable method as it reads the raw server response.
  try {
    const interceptScript = document.createElement('script');
    interceptScript.src = chrome.runtime.getURL('utils/pageInterceptor.js');
    interceptScript.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(interceptScript);
  } catch (e) {
    // Silently ignore
  }

  // Listen for intercepted results via postMessage
  window.addEventListener('message', (event) => {
    if (event.data?.type !== '__DEEPFOCUS_SUBMISSION_RESULT__') return;
    if (!waitingForSubmit) return;
    
    const msg = event.data.status_msg || '';
    const state = event.data.state || '';
    
    // Ignore intermediate states
    if (state === 'PENDING' || state === 'STARTED') return;
    
    xhrResultReceived = msg;
  });

  // ========== STRATEGY 2: Submit Button Click Detection ==========
  document.addEventListener('click', (e) => {
    if (!focusState.focusActive) return;
    const btn = e.target.closest('button');
    if (!btn) return;
    const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
    const isSubmit = text === 'submit' || 
                   btn.getAttribute('data-e2e-locator') === 'console-submit-button' ||
                   btn.getAttribute('data-cy') === 'submit-code-btn';

    if (isSubmit) {
      waitingForSubmit = true;
      isJudging = false; 
      lastSeenResult = null;
      xhrResultReceived = null;
      window._dfClickTime = Date.now();
    }
  }, true);

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
      };

      // ---- CHECK 1: Network intercepted result (most reliable) ----
      if (xhrResultReceived) {
        const msg = xhrResultReceived.toLowerCase();
        
        if (msg === 'accepted') {
          if (window.DeepFocusSound) window.DeepFocusSound.playSound('success');
          finishDetection();
          stopFocusRequest();
          return;
        } else {
          // Any non-Accepted final result = failure
          if (window.DeepFocusSound) window.DeepFocusSound.playSound('fail');
          finishDetection();
          lastSeenResult = xhrResultReceived;
          return;
        }
      }

      // ---- CHECK 2: DOM-based detection (fallback) ----
      const resultEl = document.querySelector('[data-e2e-locator="submission-result"]') || 
                       document.querySelector('.submission-result') ||
                       document.querySelector('[class*="result-status"]') ||
                       document.querySelector('[class*="status-column"]');

      const checkText = (el) => {
        try { return el ? (el.textContent || el.innerText || '').trim().toLowerCase() : ''; } 
        catch (err) { return ''; }
      };

      const lowerRes = checkText(resultEl);

      // Detect judging state — this is what "unlocks" DOM-based result checks
      if (lowerRes.includes('pending') || lowerRes.includes('judging')) {
        isJudging = true;
        lastSeenResult = lowerRes;
        return;
      }

      // CRITICAL: Only check DOM results AFTER we have seen the judging state.
      // This prevents stale DOM from the previous submission from triggering sounds.
      if (isJudging) {
        // If result text has changed from the judging state to something new
        if (lowerRes && lowerRes !== lastSeenResult) {
          lastSeenResult = lowerRes;

          if (lowerRes.includes('accepted')) {
            if (window.DeepFocusSound) window.DeepFocusSound.playSound('success');
            finishDetection();
            stopFocusRequest();
            return;
          }

          // Any other non-empty, non-judging text after judging = failure
          if (window.DeepFocusSound) window.DeepFocusSound.playSound('fail');
          finishDetection();
          return;
        }

        // ---- CHECK 3: Scan for red/error elements — only after judging ----
        const errorEls = document.querySelectorAll(
          '[class*="text-red-"], [class*="text-pink-"], [class*="error"], [data-cy*="error"]'
        );
        
        for (const el of errorEls) {
          const txt = checkText(el);
          if (txt && (
            txt.includes('wrong answer') || txt.includes('time limit') ||
            txt.includes('runtime error') || txt.includes('compile error') ||
            txt.includes('memory limit') || txt.includes('output limit') ||
            txt.includes('failed') || txt.includes('limit exceeded')
          )) {
            if (window.DeepFocusSound) window.DeepFocusSound.playSound('fail');
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
      }

    } catch (e) {
      console.error("DeepFocus Observer Error:", e);
      if (acceptedObserverInterval) clearInterval(acceptedObserverInterval);
    }
  }, 500);
}

function stopFocusRequest(skipSync = false, customStatus = null) {
  // If stopping naturally or via button, sync as Give Up (unless overridden by switches or customStatus)
  if (focusState.focusActive && !skipSync) {
    let finalStatus = (focusState.tabSwitches >= 10) ? "Cheated" : (focusState.tabSwitches >= 4 ? "Low Focus" : (focusState.tabSwitches >= 1 ? "Focus Kept" : (customStatus || "Give Up")));
    syncWithWebsite(finalStatus, focusState.score || 0, focusState.tabSwitches || 0);
  }

  try {
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS' });
  } catch (e) {
    // If context invalidated (extension reloaded), cleanly dismantle locally
    focusState = { focusActive: false };
    cleanupFocusEnvironment();
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

      chrome.storage.local.get(['focusState'], (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.focusState && res.focusState.focusActive) {
          focusState = res.focusState;
          initFocusEnvironment();
        }
      });
    }
  }
}, 200);
