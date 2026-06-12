let refreshInterval;
let cachedUrl = '';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');

  // 1. Check current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs.length > 0) {
    cachedUrl = tabs[0].url || '';
  }

  // 2. Fetch state & analytics
  await updateUIFromState();
  await updateAnalyticsUI();

  // 3. Listen for state updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'FOCUS_STATE_UPDATED') {
      updateUIFromState();
    }
  });



  // 3.8 Connection Token Logic
  const tokenInput = document.getElementById('token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const connStatus = document.getElementById('connection-status');
  const connStatusDot = document.getElementById('conn-status-dot');
  const connStatusText = document.getElementById('conn-status-text');
  const toggleVisBtn = document.getElementById('toggle-token-vis');

  function setConnUI(state = 'hidden', msg = '') {
    if (!connStatus) return;
    connStatus.style.display = (state === 'hidden') ? 'none' : 'flex';
    if (state === 'hidden') {
      connStatusText.textContent = '';
      return;
    }
    if (state === 'success') {
      connStatusDot.style.background = 'var(--green-text)';
      connStatusDot.style.boxShadow = '0 0 8px var(--green-text)';
      connStatus.style.color = 'var(--green-text)';
    } else if (state === 'error') {
      connStatusDot.style.background = '#ef4444';
      connStatusDot.style.boxShadow = '0 0 8px rgba(239,68,68,0.4)';
      connStatus.style.color = '#ef4444';
    } else {
      connStatusDot.style.background = '#f59e0b';
      connStatusDot.style.boxShadow = '0 0 8px rgba(245,158,11,0.4)';
      connStatus.style.color = '#f59e0b';
    }
    if (msg) connStatusText.textContent = msg;
  }

  function isInvalidTokenError(message = '') {
    const normalized = String(message).toLowerCase();
    return normalized.includes('invalid') || normalized.includes('expired');
  }

  // Toggle token visibility
  if (toggleVisBtn && tokenInput) {
    toggleVisBtn.addEventListener('click', () => {
      if (tokenInput.type === 'password') {
        tokenInput.type = 'text';
        toggleVisBtn.textContent = 'Hide';
      } else {
        tokenInput.type = 'password';
        toggleVisBtn.textContent = 'Show';
      }
    });
  }

  if (saveTokenBtn && tokenInput && connStatus) {
    // Check initial state and VERIFY existing token
    chrome.storage.local.get(['deepfocus_connection_token'], (res) => {
      if (res.deepfocus_connection_token) {
        const storedToken = res.deepfocus_connection_token.trim();
        tokenInput.type = 'password';
        tokenInput.placeholder = 'Paste dfx_ token here';
        tokenInput.value = storedToken;
        saveTokenBtn.textContent = 'Update';
        saveTokenBtn.disabled = true;
        setConnUI('loading', 'Checking connection...');
        // Verify the existing token is still valid
        chrome.runtime.sendMessage({ type: 'VERIFY_TOKEN', token: storedToken }, (response) => {
          if (chrome.runtime.lastError) {
            setConnUI('error', 'Could not verify right now.');
            saveTokenBtn.textContent = 'Update';
            saveTokenBtn.disabled = false;
            return;
          }

          if (response && response.success) {
            setConnUI('hidden');
            saveTokenBtn.disabled = false;
          } else {
            const err = response?.error || 'Could not verify right now.';
            setConnUI('error', isInvalidTokenError(err) ? 'Connection needs update.' : 'Could not verify right now.');
            saveTokenBtn.textContent = isInvalidTokenError(err) ? 'Connect' : 'Update';
            saveTokenBtn.disabled = false;
            if (isInvalidTokenError(err)) {
              chrome.storage.local.remove(['deepfocus_connection_token']);
              tokenInput.value = '';
              tokenInput.placeholder = 'Paste dfx_ token here';
            }
          }
        });
      }else{

        tokenInput.type = 'password';
        tokenInput.placeholder = 'Paste dfx_ token here';
        tokenInput.value = '';
        setConnUI('hidden');
        saveTokenBtn.textContent = 'Connect';
        saveTokenBtn.disabled = false;
      }
    });

    saveTokenBtn.addEventListener('click', () => {
      const rawToken = tokenInput.value.trim();

      if (rawToken === '') {
        setConnUI('error', "Enter a token starting with 'dfx_'.");
        return;
      }

      if (!rawToken.startsWith('dfx_')) {
        setConnUI('error', "Invalid token format.");
        return;
      }

      saveTokenBtn.textContent = 'Verifying...';
      saveTokenBtn.disabled = true;
      setConnUI('loading', 'Verifying token...');

      // First verify, then save
      chrome.runtime.sendMessage({ type: 'VERIFY_TOKEN', token: rawToken.trim() }, (response) => {
        if (chrome.runtime.lastError) {
          saveTokenBtn.textContent = 'Connect';
          saveTokenBtn.disabled = false;
          setConnUI('error', 'Verification failed.');
          return;
        }

        if (response && response.success) {
          // Valid - save it
          chrome.storage.local.set({ deepfocus_connection_token: rawToken.trim() }, () => {
            saveTokenBtn.textContent = 'Update';
            saveTokenBtn.disabled = false;
            tokenInput.type = 'password';
            tokenInput.placeholder = 'Paste dfx_ token here';
            tokenInput.value = rawToken.trim();
            setConnUI('hidden');
          });
        } else {
          const err = (response && response.error) ? response.error : 'Verification failed';
          if (isInvalidTokenError(err)) {
            saveTokenBtn.textContent = 'Connect';
            saveTokenBtn.disabled = false;
            setConnUI('error', err);
            return;
          }

          chrome.storage.local.set({ deepfocus_connection_token: rawToken.trim() }, () => {
            saveTokenBtn.textContent = 'Update';
            saveTokenBtn.disabled = false;
            tokenInput.type = 'password';
            tokenInput.placeholder = 'Paste dfx_ token here';
            tokenInput.value = rawToken.trim();
            setConnUI('error', 'Saved. Verification will retry.');
          });
        }
      });
    });
  }

  // 4. Setup Actions
  btnStart.addEventListener('click', async () => {
    // Re-verify current tab to avoid stale data
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!currentTabs || currentTabs.length === 0) return;
    const targetTab = currentTabs[0];

    // Determine difficulty & title by asking content script
    let diff = 'Medium';
    let probTitle = 'Previously Solved Problem';
    let probLink = targetTab.url;

    try {
      // Small timeout for sendMessage to prevent hanging
      const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_DIFFICULTY' });
      if (response) {
        if (response.difficulty) diff = response.difficulty;
        if (response.title && response.title !== 'Previously Solved Problem' && response.title !== 'LeetCode Problem') {
          probTitle = response.title;
        }
        if (response.link) probLink = response.link;
      }
    } catch (e) {
      // Content script not reachable - likely needs refresh
    }

    // Ultimate fallback: if title is still the placeholder, extract from URL
    if (probTitle === 'Previously Solved Problem' || probTitle === 'LeetCode Problem') {
      const urlMatch = targetTab.url.match(/\/problems\/([^\/]+)/);
      if (urlMatch) {
        probTitle = urlMatch[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    let durationMins = 25; // Default for Medium
    if (diff === 'Easy') durationMins = 10;
    else if (diff === 'Hard') durationMins = 40;

    btnStart.disabled = true;
    chrome.runtime.sendMessage({
      type: 'START_FOCUS',
      payload: {
        tabId: targetTab.id,
        durationSeconds: durationMins * 60,
        title: probTitle,
        difficulty: diff,
        link: probLink
      }
    }, (res) => {
      if (res && res.success) {
        renderState(res.state);
      } else {
        renderState(res?.state || { focusActive: false });
        btnStart.disabled = false;
        if (res?.error) alert(res.error);
      }
    });
  });

  btnStop.addEventListener('click', () => {
    btnStop.disabled = true;
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, async (res) => {
      if (res && res.success) {
        // Optimistic reset and reload analytics
        renderState({ focusActive: false });
        await updateAnalyticsUI();
      }
    });
  });
});

async function updateUIFromState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATE' });
    renderState(response?.state || { focusActive: false });
  } catch (e) {
    console.error("DeepFocus popup state update failed:", e);
    renderState({ focusActive: false });
  }
}

function renderState(state) {
  const isAct = !!(state && state.focusActive && state.sessionId && state.sessionStartAt && state.durationSeconds);

  const badge = document.getElementById('status-badge');
  const badgeText = document.getElementById('status-text');
  const timerStatusDiv = document.getElementById('timer-status');
  const timerStatusSpan = timerStatusDiv.querySelector('span');
  const focusStatusText = document.getElementById('focus-status-text');

  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');

  if (isAct) {
    document.body.classList.add('is-active');

    badge.classList.remove('inactive');
    badgeText.innerText = 'Active';

    timerStatusDiv.classList.remove('inactive');
    timerStatusSpan.innerText = 'Session in progress';

    focusStatusText.innerText = 'Focused';
    focusStatusText.style.color = '#818cf8'; // indigo

    btnStart.disabled = true;
    btnStop.disabled = false;

    document.getElementById('score-display').innerText = typeof state.score === 'number' ? state.score : 100;
    document.getElementById('tabs-display').innerText = state.tabSwitches || 0;

    // Start local timer loop to keep UI fresh
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.sessionStartAt) / 1000);
      const remaining = Math.max(0, state.durationSeconds - elapsed);
      updateTimerDisplay(remaining);
      if (remaining <= 0) clearInterval(refreshInterval);
    }, 1000);

    // initial render
    const elapsedNow = Math.floor((Date.now() - state.sessionStartAt) / 1000);
    updateTimerDisplay(Math.max(0, state.durationSeconds - Math.max(0, elapsedNow)));

  } else {
    document.body.classList.remove('is-active');

    badge.classList.add('inactive');
    badgeText.innerText = 'Inactive';

    timerStatusDiv.classList.add('inactive');
    timerStatusSpan.innerText = 'Ready to focus';

    focusStatusText.innerText = 'Idle';
    focusStatusText.style.color = '#94a3b8'; // muted

    document.getElementById('timer-display').innerText = '00:00:00';
    if (refreshInterval) clearInterval(refreshInterval);

    // Validate if Start is possible based on URL
    const isLeetCodeProblem = cachedUrl.match(/leetcode\.com\/problems\/[^/]+/);
    if (!isLeetCodeProblem) {
      btnStart.disabled = true;
    } else {
      btnStart.disabled = false;
    }
    btnStop.disabled = true;
  }
}

function updateTimerDisplay(remainingSecs) {
  const h = Math.floor(remainingSecs / 3600).toString().padStart(2, '0');
  const m = Math.floor((remainingSecs % 3600) / 60).toString().padStart(2, '0');
  const s = (remainingSecs % 60).toString().padStart(2, '0');

  document.getElementById('timer-display').innerText = `${h}:${m}:${s}`;
}

async function updateAnalyticsUI() {
  try {
    const data = await chrome.storage.local.get(['analytics', 'history']);
    const analytics = data.analytics || { streak: 0, avgScore: 100 };
    const history = data.history || [];

    // Update Streak Nodes
    const streakContainer = document.querySelector('.streak-dots');
    if (streakContainer) {
      streakContainer.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        if (i < analytics.streak) {
          streakContainer.innerHTML += '<div class="s-dot active"></div>';
        } else {
          streakContainer.innerHTML += '<div class="s-dot"></div>';
        }
      }
    }

    // Update Avg Score
    const avgScoreValContainers = document.querySelectorAll('.a-value');
    if (avgScoreValContainers.length >= 2) {
      // 0 is streak, 1 is avg
      avgScoreValContainers[0].innerHTML = `${analytics.streak} <span>days</span>`;
      avgScoreValContainers[1].innerHTML = `${analytics.avgScore}<span>/100</span>`;
    }

    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = `${analytics.avgScore}%`;
    }

    // Build History
    const historyList = document.querySelector('.history-list');
    if (historyList) {
      historyList.innerHTML = '';

      if (history.length === 0) {
        historyList.innerHTML = '<div style="color:#94a3b8; font-size: 13px; text-align: center; padding: 20px;">No sessions completed yet.</div>';
      } else {
        for (const item of history) {
          const scoreColor = item.score < 50 ? '#ef4444' : '#34d399';
          historyList.insertAdjacentHTML('beforeend', `
            <div class="h-item">
              <div class="h-icon">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              </div>
              <div class="h-info">
                <h4 class="h-title">${escapeHtml(item.title)}</h4>
                <p class="h-sub">Previously Solved • ${escapeHtml(item.difficulty)}</p>
              </div>
              <div class="h-stats">
                <div class="h-time">${escapeHtml(item.durationMins)}m • ${escapeHtml(item.mistakes || 0)} mistakes</div>
                <div class="h-score" style="color: ${scoreColor};">${escapeHtml(item.score)} score</div>
              </div>
            </div>
          `);
        }
      }
    }
  } catch (e) {
    console.error("DeepFocus popup analytics failed:", e);
  }
}
