chrome.runtime.onInstalled.addListener(() => {
  console.log("LLM Safety Guard Installed.");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "WARN_DETECTED") {
    console.log("⚠️ Unsafe content detected:", msg.text);
  }
  sendResponse({ received: true });
});
