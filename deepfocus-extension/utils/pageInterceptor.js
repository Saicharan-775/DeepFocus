// DeepFocus Page Interceptor
// Injected into the PAGE context (not extension context) to hook fetch/XHR.
// Communicates results back via window.postMessage.

(function() {
  if (window.__dfInterceptInstalled) return;
  window.__dfInterceptInstalled = true;

  function notifyResult(status_msg, state) {
    window.postMessage({
      type: '__DEEPFOCUS_SUBMISSION_RESULT__',
      status_msg: status_msg,
      state: state || ''
    }, '*');
  }

  // Hook fetch
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    return origFetch.apply(this, args).then(response => {
      try {
        const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
        if (url.includes('/submissions/') || url.includes('/submit') || url.includes('check')) {
          response.clone().json().then(data => {
            if (data && data.status_msg) {
              notifyResult(data.status_msg, data.state);
            }
          }).catch(() => {});
        }
      } catch(e) {}
      return response;
    });
  };

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__dfUrl = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        const url = this.__dfUrl || '';
        if (url.includes('/submissions/') || url.includes('/submit') || url.includes('check')) {
          const data = JSON.parse(this.responseText);
          if (data && data.status_msg) {
            notifyResult(data.status_msg, data.state);
          }
        }
      } catch(e) {}
    });
    return origSend.apply(this, arguments);
  };

  // Page interceptor active.
})();
