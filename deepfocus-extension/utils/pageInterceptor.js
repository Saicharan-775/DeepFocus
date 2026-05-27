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

  function extractCodeFromEditor() {
    try {
      // 1. Monaco Editor (usually LeetCode's default for some tabs)
      if (window.monaco && typeof window.monaco.editor === 'object') {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          return models[0].getValue();
        }
      }
    } catch (e) {
      console.warn("[DeepFocus] Monaco read failed:", e);
    }

    try {
      // 2. CodeMirror 6 (modern LeetCode editor)
      const cmContent = document.querySelector('.cm-content');
      if (cmContent && cmContent.cmView && cmContent.cmView.view) {
        const view = cmContent.cmView.view;
        if (view.state && view.state.doc) {
          return view.state.doc.toString();
        }
      }
    } catch (e) {
      console.warn("[DeepFocus] CodeMirror 6 read failed:", e);
    }
    
    // Fallback: CodeMirror 6 DOM Scraper
    try {
      const cmContent = document.querySelector('.cm-content');
      if (cmContent) {
        const cmLines = cmContent.querySelectorAll('.cm-line');
        if (cmLines && cmLines.length > 0) {
          return Array.from(cmLines).map(line => line.textContent).join('\n');
        }
        return cmContent.innerText || cmContent.textContent || "";
      }
    } catch (e) {}

    // Monaco DOM fallback
    try {
      const viewLines = document.querySelector('.view-lines');
      if (viewLines) {
        const lines = Array.from(viewLines.querySelectorAll('.view-line'));
        if (lines.length > 0) {
          return lines.map(line => line.textContent).join('\n');
        }
      }
    } catch (e) {}

    // Textareas fallback
    try {
      const textareas = document.querySelectorAll('.monaco-editor textarea, .cm-editor textarea, textarea.inputarea');
      for (const ta of textareas) {
        if (ta.value && ta.value.length > 20) {
          return ta.value;
        }
      }
    } catch (e) {}

    return "";
  }

  // Periodic code extraction loop
  setInterval(() => {
    if (!focusActive) return;
    try {
      const code = extractCodeFromEditor();
      if (code && code.trim()) {
        window.postMessage({
          type: '__DEEPFOCUS_EXTRACTED_CODE__',
          code: code
        }, '*');
      }
    } catch (e) {}
  }, 2000);

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
      try {
        origSetData.call(this, 'web text/deepfocus-internal', 'true');
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
      const isInternalFlag = origGetData.call(this, 'text/deepfocus-internal') === 'true' ||
                             origGetData.call(this, 'web text/deepfocus-internal') === 'true';
      
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
    try {
      const url = (typeof args[0] === 'string') ? args[0] : (args[0]?.url || '');
      if (url.includes('/submit') || url.includes('/interpret_solution')) {
        const options = args[1];
        if (options && options.body && typeof options.body === 'string') {
          try {
            const bodyJson = JSON.parse(options.body);
            const submittedCode = bodyJson.typedCode || bodyJson.typed_code;
            if (submittedCode && submittedCode.trim()) {
              window.postMessage({
                type: '__DEEPFOCUS_SUBMITTED_CODE__',
                code: submittedCode
              }, '*');
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

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

  XMLHttpRequest.prototype.send = function (body) {
    try {
      const url = this.__dfUrl || '';
      if ((url.includes('/submit') || url.includes('/interpret_solution')) && body && typeof body === 'string') {
        try {
          const bodyJson = JSON.parse(body);
          const submittedCode = bodyJson.typedCode || bodyJson.typed_code;
          if (submittedCode && submittedCode.trim()) {
            window.postMessage({
              type: '__DEEPFOCUS_SUBMITTED_CODE__',
              code: submittedCode
            }, '*');
          }
        } catch (e) {}
      }
    } catch (e) {}

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

