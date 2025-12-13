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
  input.style.border = "2px solid darkred";
  input.style.boxShadow = "0 0 10px rgba(255,0,0,0.5)";
  
  setTimeout(() => {
    input.style.border = "";
    input.style.boxShadow = "";
  }, 1500);
}

// ──────────────────────────────────────────────────────
// ML SCAN (SINGLE, CONTROLLED PATH)
// ──────────────────────────────────────────────────────
function scanText(input) {
  const text =
    input.tagName === "TEXTAREA"
      ? input.value.trim()
      : input.innerText.trim();

  if (!shouldRunML(text)) return;

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    lastSentText = text;

    console.log("Sending text to ML:", text.substring(0, 50) + "...");

    chrome.runtime.sendMessage(
      { type: "CLASSIFY_TEXT", text },
      (mlResult) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          return;
        }
        
        if (!mlResult) {
          console.error("No ML result received");
          return;
        }

        console.log("ML response received:", mlResult);

        // ⚠️ IMPORTANT:
        // Neutral results are VALID.
        // Only act on clearly harmful intent.
        if (
          mlResult.label === "harmful" &&
          typeof mlResult.confidence === "number" &&
          mlResult.confidence > 0.7
        ) {
          console.log("⚠️ Harmful content detected! Score:", mlResult.confidence);
          showCriticalMLWarning(input);
        } else if (mlResult.label === "error") {
          console.warn("ML system error, using fallback");
          // Use simple keyword fallback
          const harmfulWords = ["kill", "suicide", "bomb", "murder", "harm"];
          const lowerText = text.toLowerCase();
          if (harmfulWords.some(word => lowerText.includes(word))) {
            showCriticalMLWarning(input);
          }
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