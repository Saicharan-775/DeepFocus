document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const statusEl = document.getElementById('focus-status');
  const statusDot = document.getElementById('status-dot');
  const sessionPreview = document.getElementById('session-preview');
  const previewTime = document.getElementById('preview-time');
  const previewSwitches = document.getElementById('preview-switches');
  const previewScore = document.getElementById('preview-score');

  let isLoading = false;

  async function updateStatus() {
    const data = await chrome.storage.local.get([
      'focusActive', 
      'sessionStartAt', 
      'durationSeconds', 
      'tabSwitches', 
      'score'
    ]);
    
    const active = data.focusActive;
    
    statusEl.textContent = active ? 'Focus Mode Active' : 'Ready to focus';
    statusEl.className = active ? 'status-active' : 'status-inactive';
    
    statusDot.className = active ? 'status-dot' : 'status-dot';
    
    startBtn.style.display = active ? 'none' : 'block';
    stopBtn.style.display = active ? 'block' : 'none';
    
    if (active) {
      sessionPreview.classList.remove('hidden');
      
      const startedAt = data.sessionStartAt || Date.now();
      const durationSeconds = data.durationSeconds || 60;
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      
      previewTime.textContent = `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
      previewSwitches.textContent = data.tabSwitches || 0;
      previewScore.textContent = data.score ?? 100;
    } else {
      sessionPreview.classList.add('hidden');
    }
  }

  async function handleAction(type) {
    if (isLoading) return;
    
    isLoading = true;
    startBtn.classList.add('loading');
    stopBtn.classList.add('loading');
    
    try {
      await chrome.runtime.sendMessage({ type });
      await updateStatus();
    } finally {
      isLoading = false;
      startBtn.classList.remove('loading');
      stopBtn.classList.remove('loading');
    }
  }

  startBtn.onclick = () => handleAction('START_FOCUS');
  stopBtn.onclick = () => handleAction('STOP_FOCUS');

  // Live updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.focusActive || changes.tabSwitches || changes.score || changes.sessionStartAt || changes.durationSeconds) {
      updateStatus();
    }
  });

  // Token Connection Logic
  const tokenInput = document.getElementById('token-input');
  const saveTokenBtn = document.getElementById('save-token-btn');
  const connStatus = document.getElementById('connection-status');

  // Check if already connected
  chrome.storage.local.get(['deepfocus_connection_token'], (res) => {
    if (res.deepfocus_connection_token) {
      tokenInput.value = '********';
      connStatus.style.display = 'block';
      saveTokenBtn.textContent = 'Update';
    }
  });

  saveTokenBtn.onclick = () => {
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
      connStatus.style.display = 'block';
      connStatus.textContent = '✓ Connected securely';
    });
  };

  // Initial load
  await updateStatus();
});

