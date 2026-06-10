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

function showCriticalMLWarning(input) {
  const originalBorder = input.style.border;
  const originalBoxShadow = input.style.boxShadow;
  
  input.style.border = "2px solid darkred";
  input.style.boxShadow = "0 0 10px rgba(255,0,0,0.5)";
  
  setTimeout(() => {
    input.style.border = originalBorder;
    input.style.boxShadow = originalBoxShadow;
  }, 1500);
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

    chrome.runtime.sendMessage(
      { type: "CLASSIFY_TEXT", text },
      (mlResult) => {
        if (chrome.runtime.lastError) return;
        if (!mlResult) return;

        if (mlResult.label === "harmful") {
          console.log("⚠️ Harmful content detected! Score:", mlResult.confidence);
          showCriticalMLWarning(input);
          
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
      }
    );
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