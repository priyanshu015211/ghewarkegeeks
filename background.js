// ------------------------------------------------------
// background.js — FIXED (single listener, full routing)
// ------------------------------------------------------

let offscreenReady = false;
let creatingOffscreen = null;

// Load rules from rules.json once at startup
let rulesData = null;

async function getRules() {
  if (rulesData) return rulesData;
  const url = chrome.runtime.getURL("rules.json");
  const res = await fetch(url);
  rulesData = await res.json();
  return rulesData;
}

// Ensure offscreen document exists
async function ensureOffscreen() {
  if (offscreenReady) return;

  if (await chrome.offscreen.hasDocument()) {
    offscreenReady = true;
    return;
  }

  if (!creatingOffscreen) {
    console.log("Creating offscreen document...");
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "offscreen2.html",
      reasons: ["BLOBS"],
      justification: "Run safety pattern classifier"
    });
  }

  await creatingOffscreen;

  // Wait for OFFSCREEN_READY signal (max 3s)
  await new Promise((resolve) => {
    if (offscreenReady) return resolve();
    const timeout = setTimeout(resolve, 3000);
    const check = setInterval(() => {
      if (offscreenReady) {
        clearInterval(check);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}

// -------------------------------------------------------
// SINGLE unified message listener
// Chrome MV3 only honours `return true` from the FIRST
// registered listener — so all message types must live here.
// -------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received:", message.type);

  // ── Signal from offscreen that it is ready ──────────
  if (message.type === "OFFSCREEN_READY") {
    console.log("Offscreen signaled READY");
    offscreenReady = true;
    sendResponse({ status: "ready" });
    return false; // sync response, no async needed
  }

  // ── Classify text via offscreen document ────────────
  if (message.type === "CLASSIFY_TEXT") {
    (async () => {
      try {
        await ensureOffscreen();

        // Fetch storage data here, because offscreen doc might not have chrome.storage access
        const settings = await new Promise(resolve => {
          chrome.storage.local.get(["disabledCategories", "customRules", "sensitivitySettings"], resolve);
        });

        const result = await chrome.runtime.sendMessage({
          type: "CLASSIFY_TEXT_OFFSCREEN",
          text: message.text,
          settings: settings
        });

        console.log("Offscreen result:", result);
        sendResponse(result);
      } catch (err) {
        console.error("Background classify error:", err);
        sendResponse({ label: "error", confidence: 0, error: err.message });
      }
    })();
    return true; // keeps port open for async sendResponse
  }

  // ── Return all rules grouped by category ────────────
  if (message.type === "GET_RULES") {
    getRules().then((data) => {
      sendResponse({ rules: data });
    }).catch(() => {
      sendResponse({ rules: {} });
    });
    return true;
  }

  // ── Return the list of category names ───────────────
  if (message.type === "GET_CATEGORIES") {
    getRules().then((data) => {
      sendResponse({ categories: Object.keys(data) });
    }).catch(() => {
      sendResponse({ categories: [] });
    });
    return true;
  }

  // ── Return all built-in rules as a flat array ────────
  if (message.type === "GET_ALL_BUILTIN_RULES") {
    getRules().then((data) => {
      const flat = Object.values(data).flat();
      sendResponse({ rules: flat });
    }).catch(() => {
      sendResponse({ rules: [] });
    });
    return true;
  }

  // Unknown message — no async response needed
  return false;
});
