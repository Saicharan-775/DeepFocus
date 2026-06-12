document.addEventListener('DOMContentLoaded', () => {
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
