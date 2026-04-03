let refreshInterval;
let cachedUrl = '';

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
      renderState(message.state);
    }
  });
  
  // 3.5 Mode toggles
  const btnSerious = document.getElementById('btn-serious');
  const btnRoast = document.getElementById('btn-roast');
  if (btnSerious && btnRoast) {
    btnSerious.addEventListener('click', () => {
      btnSerious.classList.add('active');
      btnRoast.classList.remove('active');
    });
    btnRoast.addEventListener('click', () => {
      btnRoast.classList.add('active');
      btnSerious.classList.remove('active');
    });
  }

  // 3.8 Connection Token Logic
  const tokenInput = document.getElementById('token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const connStatus = document.getElementById('connection-status');

  if (saveTokenBtn && tokenInput && connStatus) {
    // Check initial state
    chrome.storage.local.get(['deepfocus_connection_token'], (res) => {
      if (res.deepfocus_connection_token) {
        tokenInput.value = '********';
        connStatus.style.display = 'flex';
        saveTokenBtn.textContent = 'Update';
      }
    });

    saveTokenBtn.addEventListener('click', () => {
      const rawToken = tokenInput.value.trim();
      
      if (!rawToken.startsWith('dfx_')) {
        alert("Invalid token format. It should start with 'dfx_'.");
        return;
      }

      saveTokenBtn.textContent = 'Saving...';
      saveTokenBtn.disabled = true;

      chrome.storage.local.set({ deepfocus_connection_token: rawToken }, () => {
        saveTokenBtn.textContent = 'Update';
        saveTokenBtn.disabled = false;
        tokenInput.value = '********';
        connStatus.style.display = 'flex';
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
    let probTitle = 'LeetCode Problem';
    
    try {
      // Small timeout for sendMessage to prevent hanging
      const response = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_DIFFICULTY' });
      if (response) {
        if (response.difficulty) diff = response.difficulty;
        if (response.title) probTitle = response.title;
      }
    } catch (e) {
      // Content script not reachable - likely needs refresh
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
        difficulty: diff
      }
    }, (res) => {
      if (res && res.success) {
        renderState(res.state);
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
  const data = await chrome.storage.local.get(['focusState']);
  if (data.focusState) {
    renderState(data.focusState);
  } else {
    renderState({ focusActive: false });
  }
}

function renderState(state) {
  const isAct = state.focusActive;
  
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
        historyList.innerHTML += `
          <div class="h-item">
            <div class="h-icon">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
            <div class="h-info">
              <h4 class="h-title">${item.title}</h4>
              <p class="h-sub">LeetCode • ${item.difficulty}</p>
            </div>
            <div class="h-stats">
              <div class="h-time">${item.durationMins}m</div>
              <div class="h-score" style="color: ${scoreColor};">${item.score} score</div>
            </div>
          </div>
        `;
      }
    }
  }
}
