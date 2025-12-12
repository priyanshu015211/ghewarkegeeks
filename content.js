// --------------------------------------------------
// LLM SAFETY EXTENSION - CONTENT SCRIPT (CLEAN VERSION)
// Phase 2: Prompt Interception Logic
// Owner: Pushu
// --------------------------------------------------

// Debug flag — turn off in production
const DEBUG = true;

// Retry interval for dynamic DOM scanning
const RETRY_MS = 1500;

// For IME text composition (Hindi, Japanese, etc.)
let composing = false;

// Alive logs
console.log("LLM Safety content script loaded");
if (DEBUG) console.log("Content script loaded and ready");

// Notify background that content script is active
chrome.runtime.sendMessage({ status: "content_script_ready" });


// --------------------------------------------------
// STEP 1 — Locate Prompt Box Dynamically
// Works for: ChatGPT, Gemini, Claude, Poe, etc.
// --------------------------------------------------

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

  if (DEBUG) console.log("Prompt box found");
  attachKeyListener(box);
}

// Start scanning on script load
waitForPromptBox();


// --------------------------------------------------
// STEP 2 — Intercept Enter Key + Capture Prompt
// --------------------------------------------------

function keyHandler(e) {
  // Allow Shift+Enter → Multiline input
  if (e.key === "Enter" && e.shiftKey) return;

  // IME language input should not be interrupted
  if (composing) return;

  // Normal Enter pressed → interception happens here
  if (e.key === "Enter") {
    e.preventDefault(); // stop auto-send

    const box = findPromptBox();
    if (!box) return;

    // Extract prompt content safely
    const prompt = ("value" in box) ? box.value : box.innerText;

    if (DEBUG) console.log("Captured prompt:", prompt);

    // Send to background for scanning
    chrome.runtime.sendMessage({
      type: "SCAN_PROMPT",
      prompt: prompt
    });
  }
}


// --------------------------------------------------
// STEP 3 — Add & Manage Listeners Safely
// --------------------------------------------------

function attachKeyListener(box) {
  box.removeEventListener("keydown", keyHandler); // avoid duplicates
  box.addEventListener("keydown", keyHandler);

  // IME listeners
  box.addEventListener("compositionstart", () => composing = true);
  box.addEventListener("compositionend", () => composing = false);

  if (DEBUG) console.log("Interception listener attached.");
}


// --------------------------------------------------
// STEP 4 — Receive FINAL_PROMPT from Background
// Insert sanitized/approved prompt and auto-send
// --------------------------------------------------

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "FINAL_PROMPT") {
    const box = findPromptBox();
    if (!box) return;

    const finalPrompt = msg.prompt;

    // Insert text
    if ("value" in box) box.value = finalPrompt;
    else box.innerText = finalPrompt;

    // Trigger input event so UI updates
    box.dispatchEvent(new Event("input", { bubbles: true }));

    // Try to find send button
    const sendBtn =
      document.querySelector('button[type="submit"], button[aria-label*="send"]');

    if (sendBtn) {
      sendBtn.click();
      if (DEBUG) console.log("Final prompt sent programmatically");
    }
  }
});
