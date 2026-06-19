// ------------------------------------------------------
// content.js — FIXED, STABLE ML BEHAVIOR
// ------------------------------------------------------

console.log("Content script loaded");

let isEnabled = true;
let observer = null;

// ──────────────────────────────────────────────────────
// ML CONTROL CONSTANTS
// ──────────────────────────────────────────────────────
const MIN_WORDS = 3;        // sentence-level only
const DEBOUNCE_MS = 800;   // wait for user to stop typing

let debounceTimer = null;
let lastSentText = "";

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────
function shouldRunML(text) {
  if (!text) return false;

  const cleaned = text.trim();
  if (cleaned === lastSentText) return false;

  const words = cleaned.split(/\s+/);
  if (words.length < MIN_WORDS) return false;

  return true;
}

function showTooltip(input, reason, severity = "warning") {
  let existing = document.getElementById("llm-safety-tooltip");
  if (existing) existing.remove();

  let bgColor, borderColor, textMsg;
  if (severity === "block") {
    bgColor = "#d32f2f"; borderColor = "#d32f2f";
    textMsg = `🛑 <b>Blocked:</b> Highly toxic (${reason}).`;
  } else if (severity === "warning") {
    bgColor = "#f57c00"; borderColor = "#f57c00";
    textMsg = `⚠️ <b>Warning:</b> Moderately toxic (${reason}).`;
  } else {
    bgColor = "#1976d2"; borderColor = "#1976d2";
    textMsg = `ℹ️ <b>Info:</b> Mildly sensitive (${reason}).`;
  }

  const tooltip = document.createElement("div");
  tooltip.id = "llm-safety-tooltip";
  tooltip.innerHTML = textMsg;
  
  Object.assign(tooltip.style, {
    position: "fixed",
    backgroundColor: "#fff",
    color: bgColor,
    border: `1px solid ${borderColor}`,
    padding: "8px 12px",
    borderRadius: "8px",
    boxShadow: `0 4px 12px ${borderColor}40`,
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    zIndex: "2147483647",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 0.2s ease-in-out",
    whiteSpace: "nowrap"
  });

  document.body.appendChild(tooltip);

  const rect = input.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.top - 45}px`;

  setTimeout(() => {
    tooltip.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => tooltip.remove(), 200);
  }, 4000);
}

function showSeverityUI(input, reason, severity) {
  const originalBorder = input.style.border;
  const originalBoxShadow = input.style.boxShadow;
  
  let borderColor, shadowColor;
  if (severity === "block") { borderColor = "darkred"; shadowColor = "rgba(255,0,0,0.5)"; }
  else if (severity === "warning") { borderColor = "darkorange"; shadowColor = "rgba(255,140,0,0.5)"; }
  else { borderColor = "dodgerblue"; shadowColor = "rgba(30,144,255,0.5)"; }
  
  input.style.border = `2px solid ${borderColor}`;
  input.style.boxShadow = `0 0 10px ${shadowColor}`;
  
  showTooltip(input, reason, severity);
  
  setTimeout(() => {
    input.style.border = originalBorder;
    input.style.boxShadow = originalBoxShadow;
  }, 4000);
}

// ──────────────────────────────────────────────────────
// AUTO-BLOCK EVENT INTERCEPTION
// ──────────────────────────────────────────────────────
function toggleSubmitButton(disable) {
  if (!currentPlatform?.submitButton) return;
  const btn = document.querySelector(currentPlatform.submitButton);
  if (!btn) return;
  btn.disabled = disable;
  btn.style.opacity = disable ? "0.5" : "1";
  btn.style.cursor = disable ? "not-allowed" : "pointer";
}

function interceptSubmission(event) {
  if (currentStatus !== "scanning") return;
  const input = event.target;
  if (event.key === "Enter" && !event.shiftKey) {
    if (input.__llmSeverityState === "block") {
      event.preventDefault();
      event.stopImmediatePropagation();
      showTooltip(input, "Submission Blocked: Content is highly toxic.", "block");
      console.log("🛑 Submission blocked by LLM Safety Extension.");
    }
  }
}

// ──────────────────────────────────────────────────────
// PII DETECTION
// ──────────────────────────────────────────────────────
const PII_PATTERNS = {
  block: {
    "Credit Card": /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/,
    "SSN": /\b(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}\b/,
    "Aadhaar": /\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b/,
  },
  warning: {
    "Email": /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/i,
    "Phone": /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  }
};

function testPattern(regex, text) {
  regex.lastIndex = 0;
  return regex.test(text);
}

function scanForPII(text) {
  if (!isPiiEnabled) return null;

  for (const [type, regex] of Object.entries(PII_PATTERNS.block)) {
    if (testPattern(regex, text)) {
      return { label: "harmful", severity: "block", confidence: 1.0, matchedRule: `PII Detected (${type})` };
    }
  }

  for (const [type, regex] of Object.entries(PII_PATTERNS.warning)) {
    if (testPattern(regex, text)) {
      return { label: "harmful", severity: "warning", confidence: 1.0, matchedRule: `PII Detected (${type})` };
    }
  }

  return null;
}

function handleClassificationResult(mlResult, input, text) {
  if (!mlResult) return;

  if (mlResult.label === "harmful") {
    console.log(`⚠️ Harmful content detected! Severity: ${mlResult.severity}, Score: ${mlResult.confidence}`);
    
    input.__llmSeverityState = mlResult.severity;
    if (mlResult.severity === "block") {
      toggleSubmitButton(true);
    } else {
      toggleSubmitButton(false);
    }
    
    let reason = "Toxicity";
    if (mlResult.matchedRule) {
      if (mlResult.matchedRule.startsWith("PII Detected")) {
        reason = mlResult.matchedRule;
      } else {
        const match = mlResult.matchedRule.match(/\((.*?)\)/);
        if (match && match[1]) {
          const label = match[1];
          if (label === 'threat') reason = 'Threatening Language';
          else if (label === 'identity_hate') reason = 'Identity Hate / Slurs';
          else if (label === 'obscene') reason = 'Obscenity';
          else if (label === 'insult') reason = 'Insult / Harassment';
          else if (label === 'severe_toxic') reason = 'Severe Toxicity';
          else reason = label.charAt(0).toUpperCase() + label.slice(1);
        } else {
          reason = mlResult.matchedRule;
        }
      }
    }

    showSeverityUI(input, reason, mlResult.severity);
    
    chrome.storage.local.get(["warningLog"], (data) => {
      const warningLog = data.warningLog || [];
      warningLog.unshift({
        timestamp: Date.now(),
        rule: mlResult.matchedRule || text.substring(0, 20) + "...",
        category: mlResult.category || (mlResult.matchedRule && mlResult.matchedRule.startsWith("PII") ? "PII" : "AI Detection"),
        score: Math.round(mlResult.confidence * 100)
      });
      if (warningLog.length > 50) warningLog.pop();
      chrome.storage.local.set({ warningLog, explanationData: mlResult });
    });
  }
}

// ──────────────────────────────────────────────────────
// ML SCAN (SINGLE, CONTROLLED PATH)
// ──────────────────────────────────────────────────────
function scanText(input) {
  if (currentStatus !== "scanning") return;

  const text =
    (input.tagName === "TEXTAREA" || input.tagName === "INPUT")
      ? input.value
      : input.innerText;

  if (text.trim() === "") {
    input.__llmSeverityState = "neutral";
    toggleSubmitButton(false);
    let existing = document.getElementById("llm-safety-tooltip");
    if (existing) existing.remove();
    input.style.border = "";
    input.style.boxShadow = "";
    return;
  }

  if (!shouldRunML(text)) return;

  const piiResult = scanForPII(text);
  if (piiResult) {
    handleClassificationResult(piiResult, input, text);
    return;
  }

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    lastSentText = text;

    console.log("Sending text to ML:", text.substring(0, 50) + "...");

    chrome.storage.local.get(["dailyScans", "scanTimestamps"], (data) => {
      const today = new Date().toISOString().slice(0, 10);
      let dailyScans = data.dailyScans || { date: today, count: 0 };
      if (dailyScans.date !== today) dailyScans = { date: today, count: 0 };
      dailyScans.count++;
      
      const now = Date.now();
      let scanTimestamps = data.scanTimestamps || [];
      scanTimestamps.push(now);
      scanTimestamps = scanTimestamps.filter(t => now - t < 60000); // Last minute
      
      chrome.storage.local.set({ dailyScans, scanTimestamps });
    });

    chrome.runtime.sendMessage({ 
      type: "CLASSIFY_TEXT", 
      text, 
      settings: { sensitivity: currentSensitivity } 
    })
      .then((mlResult) => {
        handleClassificationResult(mlResult, input, text);
      })
      .catch((err) => {
        // Silently catch the annoying "message channel closed" Chrome bug
        console.debug("ML Scanner async channel closed gracefully.");
      });
  }, DEBOUNCE_MS);
}

// ──────────────────────────────────────────────────────
// INPUT LISTENER (ATTACH ONCE)
// ──────────────────────────────────────────────────────
function attachListener(input) {
  if (input.__llmSafetyAttached) return;
  input.__llmSafetyAttached = true;
  
  // Attach capture listener to intercept Enter keys before React does
  input.addEventListener("keydown", interceptSubmission, { capture: true });

  input.addEventListener("input", () => {
    if (!isEnabled) return;
    scanText(input);
  });
}

// ──────────────────────────────────────────────────────
// OBSERVER
// ──────────────────────────────────────────────────────
let currentPlatform = null;

function detectPlatform() {
  if (typeof PLATFORMS_CONFIG === "undefined") return;
  const hostname = window.location.hostname;
  for (const [domain, config] of Object.entries(PLATFORMS_CONFIG)) {
    if (hostname.includes(domain)) {
      currentPlatform = config;
      console.log(`[LLM Safety] Platform recognized: ${config.name}`);
      break;
    }
  }
}
detectPlatform();

function scanForInputs() {
  const selectors = [];
  
  if (currentPlatform) {
    if (currentPlatform.inputArea) selectors.push(currentPlatform.inputArea);
    if (currentPlatform.fallbackInputArea) selectors.push(currentPlatform.fallbackInputArea);
  } else {
    selectors.push("textarea", "[contenteditable='true']", "input[type='text']");
  }

  const query = selectors.join(", ");
  document.querySelectorAll(query).forEach((input) => {
    attachListener(input);
  });
}

let domSettleTimer = null; // responseScanTimer reserved for Phase 4

function handleMutations(mutationsList) {
  if (domSettleTimer) {
    clearTimeout(domSettleTimer);
  }
  domSettleTimer = setTimeout(() => {
    scanForInputs();
  }, 50);
}

// TODO: make configurable via popup
function handleEscapeKey(e) {
  if (e.key !== "Escape") return;
  const tooltip = document.getElementById("llm-safety-tooltip");
  if (tooltip) tooltip.remove();
  
  if (document.activeElement && document.activeElement.__llmSafetyAttached) {
     document.activeElement.style.border = "";
     document.activeElement.style.boxShadow = "";
  }
}

function startScanning() {
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'disabled']
    });
  }
  document.addEventListener('keydown', handleEscapeKey);
  scanForInputs();
  console.log("LLM Safety: Scanner ON (Debounced)");
}

let currentSensitivity = "balanced";
let currentWhitelist = [];
let currentStatus = "unsupported";
let isPiiEnabled = true;

function stopScanning() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (domSettleTimer) clearTimeout(domSettleTimer);
  
  // Full visual teardown
  document.querySelectorAll('#llm-safety-tooltip').forEach(el => el.remove());
  document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
    input.style.border = "";
    input.style.boxShadow = "";
    input.__llmSafetyAttached = false;
  });
  
  document.removeEventListener('keydown', handleEscapeKey);
  
  toggleSubmitButton(false);
  console.log("LLM Safety: Scanner OFF");
}

function evaluateState() {
  if (!isEnabled) {
    currentStatus = "disabled";
    stopScanning();
    return;
  }

  const hostname = window.location.hostname;
  const isWhitelisted = currentWhitelist.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (isWhitelisted) {
    currentStatus = "whitelisted";
    stopScanning();
    return;
  }

  if (!currentPlatform) {
    currentStatus = "unsupported";
    stopScanning();
    return;
  }

  currentStatus = "scanning";
  startScanning();
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
chrome.storage.local.get(["enabled", "sensitivity", "whitelist", "piiEnabled"], (data) => {
  isEnabled = data.enabled ?? true;
  currentSensitivity = data.sensitivity || "balanced";
  currentWhitelist = data.whitelist || [];
  isPiiEnabled = data.piiEnabled ?? true;
  evaluateState();
});

chrome.storage.onChanged.addListener((changes) => {
  let stateChanged = false;
  
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    stateChanged = true;
  }
  if (changes.whitelist) {
    currentWhitelist = changes.whitelist.newValue;
    stateChanged = true;
  }
  if (changes.sensitivity) {
    currentSensitivity = changes.sensitivity.newValue;
  }
  if (changes.piiEnabled) {
    isPiiEnabled = changes.piiEnabled.newValue;
  }
  
  if (stateChanged) evaluateState();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    sendResponse({ status: currentStatus });
  }
});