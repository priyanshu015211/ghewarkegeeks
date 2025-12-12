// sanitizer import if in same bundle (use modules or require pattern per MV3 setup)
import { sanitizePrompt } from './sanitizer.js'; // if using sanitizer branch/file

// 1) scoring
function scorePrompt(prompt) {
  let score = 0;
  const p = prompt.toLowerCase();

  if (p.includes("bypass") || p.includes("ignore rules")) score += 50;
  if (prompt.length > 2000) score += 10;
  if (/sensitive|password|token|secret/i.test(prompt)) score += 30;

  return score;
}

function getRiskLevel(score) {
  if (score < 20) return "allow";
  if (score < 50) return "warn";
  return "block";
}

// 2) store logs
function storeLog(prompt, score, risk) {
  const entry = { prompt, score, risk, timestamp: Date.now() };
  chrome.storage.local.get(['logs'], (res) => {
    const logs = res.logs || [];
    logs.push(entry);
    chrome.storage.local.set({ logs });
  });
}

// 3) message handler (from content/popup)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scanPrompt') {
    const raw = msg.prompt || '';
    const clean = (typeof sanitizePrompt === 'function') ? sanitizePrompt(raw) : raw;
    const score = scorePrompt(clean);
    const risk = getRiskLevel(score);
    storeLog(clean, score, risk);
    sendResponse({ score, risk });
  }

  if (msg.action === 'fetchLogs') {
    chrome.storage.local.get(['logs'], (res) => sendResponse({ logs: res.logs || [] }));
    return true; // keep channel open for async response
  }
});
