console.log("Scanner script loaded.");

let rules = [];

// Load rules.json once
fetch(chrome.runtime.getURL("rules.json"))
  .then(res => res.json())
  .then(data => {
    rules = data.blocked;
    console.log("Loaded rules:", rules);
  });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SCAN_TEXT") {
    const text = msg.text.toLowerCase();
    let flagged = false;

    for (let rule of rules) {
      if (text.includes(rule.toLowerCase())) {
        flagged = true;
        break;
      }
    }

    sendResponse({ flagged });
    return true;
  }
});
