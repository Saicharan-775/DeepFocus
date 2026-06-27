document.addEventListener('DOMContentLoaded', () => {
  const logoEl = document.getElementById('df-logo');
  if (logoEl && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    logoEl.src = chrome.runtime.getURL('assets/deepfocus-logo.png');
  }

  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      // Send message to parent window (content script) to handle navigation
      let targetOrigin = '*';
      try {
        targetOrigin = new URL(document.referrer).origin;
      } catch (_) {}
      window.parent.postMessage({ type: 'DEEPFOCUS_BACK_TO_PROBLEM' }, targetOrigin);
    });
  }
});
