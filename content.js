
// -------------------------------
// PHASE 2 — STEP 1 (Pushu)
// Prepare environment for interception
// -------------------------------

// Debug flag — turn off in production
const DEBUG = true;

// Retry duration for scanning dynamic DOM
const RETRY_MS = 1500;

// For IME text composition (Hindi, Japanese, etc.)
let composing = false;

// Alive log
if (DEBUG) console.log("Content script loaded and ready.");

// Notify background script (safe if background exists)
chrome.runtime.sendMessage({ status: "content_script_ready" });


// -------------------------------
// PHASE 2 — STEP 2 (Pushu)
// Prompt box detector (ChatGPT / Gemini / Claude / Poe / etc.)
// -------------------------------

function findPromptBox() {
  return document.querySelector("textarea, [contenteditable='true']");
}

function waitForPromptBox() {
  const box = findPromptBox();

  if (!box) {
    if (DEBUG) console.log("Prompt box not found. Retrying...");
    setTimeout(waitForPromptBox, RETRY_MS);
    return;
  }

  if (DEBUG) console.log("Prompt box found.");

  attachKeyListener(box);
}

// Start scanning
waitForPromptBox();


// -------------------------------
// PHASE 2 — STEP 3 (Pushu)
// Intercept Enter key & capture prompt
// -------------------------------

// Main key handler
function keyHandler(e) {
  // Allow Shift+Enter for new lines
  if (e.key === "Enter" && e.shiftKey) return;

  // Avoid breaking IME input
  if (composing) return;

  // Catch the normal Enter press
  if (e.key === "Enter") {
    e.preventDefault();  // Stop auto-send

    const box = findPromptBox();
    if (!box) return;

    // Extract prompt text based on element type
    const prompt = ("value" in box) ? box.value : box.innerText;

    if (DEBUG) console.log("Captured prompt:", prompt);

    // Send prompt to background.js for scanning
    chrome.runtime.sendMessage({
      type: "SCAN_PROMPT",
      prompt: prompt
    });
  }
}

// Attach the key handler safely
function attachKeyListener(box) {
  box.removeEventListener("keydown", keyHandler); // prevent duplicate listeners
  box.addEventListener("keydown", keyHandler);

  if (DEBUG) console.log("Interception listener attached.");
}
