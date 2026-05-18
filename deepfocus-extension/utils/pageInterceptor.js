// DeepFocus Page Interceptor
// Injected into the PAGE context (not extension context) to hook fetch/XHR and Clipboard.
// Communicates results back via window.postMessage.

(function () {
  if (window.__dfInterceptInstalled) return;
  window.__dfInterceptInstalled = true;

  function notifyResult(status_msg, state) {
    window.postMessage({
      type: '__DEEPFOCUS_SUBMISSION_RESULT__',
      status_msg: status_msg,
      state: state || ''
    }, '*');
  }

  // Internal state tracking in the main world
  let lastInternalText = '';
  let focusActive = false;

  window.addEventListener('message', (e) => {
    if (e.data?.type === '__DEEPFOCUS_STATE_UPDATE__') {
      focusActive = !!e.data.focusActive;
    }
    if (e.data?.type === '__DEEPFOCUS_INTERNAL_COPY__') {
      lastInternalText = e.data.text;
    }
  });

  function notifyCopy(text) {
    if (!text) return;
    lastInternalText = text;
    window.postMessage({
      type: '__DEEPFOCUS_INTERNAL_COPY__',
      text: text
    }, '*');
  }

  // Hook Clipboard setData to catch internal copies (Monaco uses this)
  const origSetData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (format, data) {
    if (format === 'text/plain' || format === 'Text') {
      notifyCopy(data);
      // Mark as internal for the extension to allow pasting
      try {
        origSetData.call(this, 'text/deepfocus-internal', 'true');
      } catch (e) { }
    }
    return origSetData.apply(this, arguments);
  };

  // Hook Clipboard getData to BLOCK external pastes
  const origGetData = DataTransfer.prototype.getData;
  DataTransfer.prototype.getData = function (format) {
    const originalResult = origGetData.apply(this, arguments);
    if (!focusActive) return originalResult;

    if (format === 'text/plain' || format === 'Text') {
      const isInternalFlag = origGetData.call(this, 'text/deepfocus-internal') === 'true';
      
      const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();
      const normResult = normalize(originalResult);
      const normInternal = normalize(lastInternalText);

      if (isInternalFlag || (lastInternalText && normResult === normInternal && normResult.length > 0)) {
        return originalResult;
      }

      // Block!
      return "";
    }
    return originalResult;
  };

  // Hook navigator.clipboard.readText (Modern way)
  const origReadText = navigator.clipboard.readText;
  if (origReadText) {
    navigator.clipboard.readText = async function () {
      const text = await origReadText.apply(this, arguments);
      if (!focusActive) return text;

      const normalize = (str) => (str || '').replace(/\r\n/g, '\n').trim();
      const normText = normalize(text);
      const normInternal = normalize(lastInternalText);

      if (lastInternalText && normText === normInternal && normText.length > 0) {
        return text;
      }

      window.postMessage({ type: '__DEEPFOCUS_PASTE_BLOCKED__' }, '*');
      return "";
    };
  }

  // Hook fetch
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then(response => {
      try {
        const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
        if (url.includes('/submissions/') || url.includes('/submit') || url.includes('check')) {
          response.clone().json().then(data => {
            if (data && data.status_msg) {
              notifyResult(data.status_msg, data.state);
            }
          }).catch(() => { });
        }
      } catch (e) { }
      return response;
    });
  };

  // Hook XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__dfUrl = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', function () {
      try {
        const url = this.__dfUrl || '';
        if (url.includes('/submissions/') || url.includes('/submit') || url.includes('check')) {
          const data = JSON.parse(this.responseText);
          if (data && data.status_msg) {
            notifyResult(data.status_msg, data.state);
          }
        }
      } catch (e) { }
    });
    return origSend.apply(this, arguments);
  };

  // Signal ready
  window.postMessage({ type: '__DEEPFOCUS_INTERCEPTOR_READY__' }, '*');
})();

