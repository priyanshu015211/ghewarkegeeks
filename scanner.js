console.log("Scanner script loaded.");

let RULES = [];

// Get rules from background
chrome.runtime.sendMessage({ type: "GET_RULES" }, (response) => {
  if (response && response.rules) {
    RULES = response.rules;
    console.log("Scanner received rules:", RULES);
  }
});

// Export rules to content.js using window object
window.SAFETY_RULES = RULES;
