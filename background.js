console.log("Background script is active");
console.log("LLM Safety Extension background loaded");

chrome.runtime.onMessage.addMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in background:", msg);

  // 1. INTERCEPT message: sent from content script when user hits Enter
  if (msg.type === "INTERCEPT") {
    const score = scorePrompt(msg.prompt);

    const entry = {
      text: msg.prompt,
      score,
      time: Date.now()
    };

    saveLog(entry);

    const decision = getRiskLevel(score);

    sendResponse({
      decision,
      score
    });

    return true; // keeps response channel open if needed
  }

  // 2. Default fallback (Phase 1 compatibility)
  sendResponse({ status: "ok" });
});

