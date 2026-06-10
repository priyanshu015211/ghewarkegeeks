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

function showTooltip(input, reason) {
  let existing = document.getElementById("llm-safety-tooltip");
  if (existing) existing.remove();

  const tooltip = document.createElement("div");
  tooltip.id = "llm-safety-tooltip";
  tooltip.innerHTML = `⚠️ <b>Warning:</b> Your message appears highly toxic (${reason}). Please reconsider sending this.`;
  
  Object.assign(tooltip.style, {
    position: "fixed",
    backgroundColor: "#fff",
    color: "#d32f2f",
    border: "1px solid #d32f2f",
    padding: "8px 12px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(211,47,47,0.2)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    zIndex: "2147483647", // Max z-index to stay above ChatGPT's UI
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

function showCriticalMLWarning(input, reason) {
  const originalBorder = input.style.border;
  const originalBoxShadow = input.style.boxShadow;
  
  input.style.border = "2px solid darkred";
  input.style.boxShadow = "0 0 10px rgba(255,0,0,0.5)";
  
  showTooltip(input, reason);
  
  setTimeout(() => {
    input.style.border = originalBorder;
    input.style.boxShadow = originalBoxShadow;
  }, 4000);
}

// ──────────────────────────────────────────────────────
// ML SCAN (SINGLE, CONTROLLED PATH)
// ──────────────────────────────────────────────────────
function scanText(input) {
  const text =
    (input.tagName === "TEXTAREA" || input.tagName === "INPUT")
      ? input.value.trim()
      : input.innerText.trim();

  if (!shouldRunML(text)) return;

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

    chrome.runtime.sendMessage({ type: "CLASSIFY_TEXT", text })
      .then((mlResult) => {
        if (!mlResult) return;

        if (mlResult.label === "harmful") {
          console.log("⚠️ Harmful content detected! Score:", mlResult.confidence);
          
          let reason = "Toxicity";
          if (mlResult.matchedRule) {
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

          showCriticalMLWarning(input, reason);
          
          chrome.storage.local.get(["warningLog"], (data) => {
            const warningLog = data.warningLog || [];
            warningLog.unshift({
              timestamp: Date.now(),
              rule: mlResult.matchedRule || text.substring(0, 20) + "...",
              category: mlResult.category || "AI Detection",
              score: Math.round(mlResult.confidence * 100)
            });
            if (warningLog.length > 50) warningLog.pop();
            chrome.storage.local.set({ warningLog, explanationData: mlResult });
          });
        }
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

  input.addEventListener("input", () => {
    if (!isEnabled) return;
    scanText(input);
  });
}

// ──────────────────────────────────────────────────────
// OBSERVER
// ──────────────────────────────────────────────────────
function scanForInputs() {
  document
    .querySelectorAll("textarea, [contenteditable='true'], input[type='text']")
    .forEach(attachListener);
}

function startScanning() {
  if (!observer) {
    observer = new MutationObserver(scanForInputs);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  scanForInputs();
  console.log("LLM Safety: Scanner ON");
}

function stopScanning() {
  if (observer) observer.disconnect();
  observer = null;
  console.log("LLM Safety: Scanner OFF");
}

// ──────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────
chrome.storage.local.get(["enabled"], (data) => {
  isEnabled = data.enabled ?? true;
  if (isEnabled) startScanning();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    isEnabled ? startScanning() : stopScanning();
  }
});

// Initial scan after page load
setTimeout(() => {
  if (isEnabled) scanForInputs();
}, 1000);