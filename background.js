// -------------------------------------------------------
// LLM Safety Extension - Background Service Worker (Phase 1)
// Minimal version: alive logs + message listener
// -------------------------------------------------------

console.log("Background script is active");
console.log("LLM Safety Extension background loaded");

// Prevent 'receiving end does not exist' errors
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in background:", msg);

  // Phase 1: No scoring logic yet, just acknowledge message
  sendResponse({ status: "ok" });

  // No async logic → return nothing
});
