document.addEventListener('DOMContentLoaded', () => {
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      // Send message to parent window (content script) to handle navigation
      window.parent.postMessage({ type: 'DEEPFOCUS_BACK_TO_PROBLEM' }, '*');
    });
  }
});
