// content.js
// Purpose: intercept Enter or form submit to scan prompt, but avoid interception while IME composing.

// configurable selector(s) - update to match the input(s)/textarea(s) and forms on target pages
const INPUT_SELECTOR = 'textarea, input[type="text"], input[type="search"]';
const FORM_SELECTOR = 'form';

// global flag to track IME composition state
let composing = false;

// 1) Composition events - needed for IME (Hindi/Japanese/Korean...)
document.addEventListener('compositionstart', () => {
  composing = true;
});
document.addEventListener('compositionend', () => {
  // compositionend fires AFTER the final text is applied to the input
  // small timeout not usually needed, but keeps behaviour predictable
  setTimeout(() => { composing = false; }, 0);
});

// 2) Helper: find nearest form for a given element
function findNearestForm(el) {
  while (el && el !== document.body) {
    if (el.tagName && el.tagName.toLowerCase() === 'form') return el;
    el = el.parentElement;
  }
  return null;
}

// 3) Helper: trigger scan and return a Promise resolving to {score, risk}
function scanPrompt(promptText, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let settled = false;

    try {
      chrome.runtime.sendMessage(
        { action: 'scanPrompt', prompt: promptText },
        (res) => {
          if (settled) return;
          settled = true;
          // If background didn't respond properly, resolve safe fallback
          if (!res || typeof res.score === 'undefined') {
            resolve({ score: 0, risk: 'allow' });
          } else {
            resolve(res);
          }
        }
      );
    } catch (err) {
      // If sendMessage throws (e.g. extension not active), treat as allow
      if (!settled) {
        settled = true;
        resolve({ score: 0, risk: 'allow' });
      }
    }

    // Safety timeout: if background takes too long, default to allow (or you can default to warn)
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ score: 0, risk: 'allow' });
      }
    }, timeoutMs);
  });
}

// 4) Handler: when Enter pressed inside inputs
function onKeyDownHandler(e) {
  // Only care about Enter key
  if (e.key !== 'Enter') return;

  // If IME composition is active, do not intercept Enter
  if (composing) {
    // Let IME finalize; don't preventDefault
    return;
  }

  // find target input / form
  const target = e.target;
  if (!target) return;

  // Optional: if target has contenteditable, get text differently
  const promptText = (target.value !== undefined) ? target.value : target.innerText || '';

  // If empty, do nothing
  if (!promptText.trim()) return;

  // Prevent default submission so we can scan first
  e.preventDefault();
  e.stopPropagation();

  // Run the scan
  scanPrompt(promptText).then((res) => {
    const { risk } = res || {};
    if (risk === 'block') {
      // Show UI/notification — keep it simple for now
      // Replace with your popup/TOAST UI code as needed
      alert('Your message was blocked for safety. Please edit and try again.');
      // do not submit
      return;
    }

    if (risk === 'warn') {
      // show a warning but allow user to confirm submit
      const proceed = confirm('This prompt may be risky. Continue?');
      if (!proceed) return;
    }

    // If allow (or confirmed), submit the form if exists, otherwise simulate Enter (send to background/app)
    const form = findNearestForm(target);
    if (form) {
      // Use form.requestSubmit if available — preserves submit handlers
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        // fallback
        form.submit();
      }
    } else {
      // No form: you may want to trigger the site's native send action.
      // Best effort: dispatch an 'Enter' KeyboardEvent that is not cancellable
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: false,
      });
      target.dispatchEvent(enterEvent);
    }
  });
}

// 5) Handler for form submit (covers button-click submit or JS submit)
function onFormSubmitHandler(event) {
  // If composing, allow native submit to continue (user may be finalizing IME)
  if (composing) return;

  const form = event.target;
  if (!form) return;

  // gather prompt text from form inputs - simple heuristic: first textarea or text input
  let promptText = '';
  const textarea = form.querySelector('textarea');
  if (textarea) promptText = textarea.value;
  else {
    const textInput = form.querySelector('input[type="text"], input[type="search"], input:not([type])');
    if (textInput) promptText = textInput.value;
  }

  // If empty or whitespace, allow submit
  if (!promptText || !promptText.trim()) return;

  // Prevent default submit to scan first
  event.preventDefault();
  event.stopPropagation();

  scanPrompt(promptText).then((res) => {
    const { risk } = res || {};
    if (risk === 'block') {
      alert('Submission blocked by policy. Please modify content.');
      return;
    }
    if (risk === 'warn') {
      const ok = confirm('This looks risky. Proceed?');
      if (!ok) return;
    }

    // proceed with original submission
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.submit();
    }
  });
}

// 6) Attach listeners to document (delegation-style)
function attachListeners() {
  // keydown on document captures Enter from inputs
  document.addEventListener('keydown', onKeyDownHandler, true); // capture phase to intercept early

  // form submit listener
  document.addEventListener('submit', onFormSubmitHandler, true); // capture
}

// Initialize immediately
attachListeners();

// 7) Cleanup function (optional) if you later unload the content script
function detachListeners() {
  document.removeEventListener('keydown', onKeyDownHandler, true);
  document.removeEventListener('submit', onFormSubmitHandler, true);
  document.removeEventListener('compositionstart', () => { composing = true; });
  document.removeEventListener('compositionend', () => { composing = false; });
}

// Export for testing (if using bundler) - otherwise ignore
// window._myExtension = { detachListeners };
