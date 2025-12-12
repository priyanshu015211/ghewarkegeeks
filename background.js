<<<<<<< HEAD
// background.js (minimal scoring + messenger)
function scorePrompt(prompt) {
  let score = 0;
  const p = (prompt || '').toLowerCase();

  if (p.includes('bypass') || p.includes('ignore rules')) score += 50;
  if ((prompt || '').length > 2000) score += 10;
  if (/sensitive|password|token|secret/i.test(prompt)) score += 30;
  return score;
}

function getRiskLevel(score) {
  if (score < 20) return 'allow';
  if (score < 50) return 'warn';
  return 'block';
}

function storeLog(prompt, score, risk) {
  const entry = { prompt, score, risk, ts: Date.now() };
  chrome.storage.local.get(['logs'], (res) => {
    const logs = res.logs || [];
    logs.push(entry);
    chrome.storage.local.set({ logs });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scanPrompt') {
    const raw = msg.prompt || '';
    const score = scorePrompt(raw);
    const risk = getRiskLevel(score);
    storeLog(raw, score, risk);
    sendResponse({ score, risk });
    // no need to return true because sendResponse used synchronously
  }

  if (msg.action === 'fetchLogs') {
    chrome.storage.local.get(['logs'], (res) => sendResponse({ logs: res.logs || [] }));
    return true; // keep channel open for async callback
  }
});
=======
console.log("Background script is active");

// Listener to avoid 'receiving end does not exist'
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received in background:", msg);
});
>>>>>>> 1a34a2e (feat: updated interception logic (steps 1-5))
