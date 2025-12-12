// popup.js - Complete popup functionality

let currentPrompt = '';
let currentSanitized = '';
let currentScore = 0;

console.log("🎉 Popup loaded!");

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Received message:", message);
  
  if (message.type === 'SCAN_RESULT') {
    displayScanResult(message.result);
  }
});

// Display scan results in the UI
function displayScanResult(result) {
  console.log("📊 Displaying scan result:", result);
  
  currentPrompt = result.originalPrompt || '';
  currentSanitized = result.sanitizedPrompt || '';
  currentScore = result.total || 0;
  
  // Update score display
  document.getElementById('scoreVal').textContent = currentScore;
  
  // Update risk level indicator
  const riskIndicator = document.getElementById('riskLevel');
  const riskText = document.getElementById('riskText');
  
  if (currentScore <= 30) {
    riskIndicator.className = 'risk-indicator risk-safe';
    riskText.textContent = '✅ Safe - Low Risk';
  } else if (currentScore <= 70) {
    riskIndicator.className = 'risk-indicator risk-warning';
    riskText.textContent = '⚠️ Warning - Medium Risk';
  } else {
    riskIndicator.className = 'risk-indicator risk-danger';
    riskText.textContent = '🚫 Blocked - High Risk';
  }
  
  // Display reasons
  const reasonsList = document.getElementById('reasonsList');
  reasonsList.innerHTML = '';
  
  if (result.reasons && result.reasons.length > 0) {
    result.reasons.forEach(reason => {
      const li = document.createElement('li');
      li.textContent = `${reason.type}: ${reason.keyword || reason.phrase || reason.pattern} (+${reason.add || 0} points)`;
      reasonsList.appendChild(li);
    });
  } else {
    reasonsList.innerHTML = '<li>No specific risks detected</li>';
  }
  
  // Show sanitized preview if available
  if (currentSanitized && currentScore > 30) {
    document.getElementById('sanitizedPreview').hidden = false;
    document.getElementById('sanitizedText').textContent = currentSanitized;
  } else {
    document.getElementById('sanitizedPreview').hidden = true;
  }
  
  // Update button visibility
  updateButtonStates(currentScore);
}

// Update button visibility based on risk score
function updateButtonStates(score) {
  const allowBtn = document.getElementById('allowBtn');
  const sanitizeBtn = document.getElementById('sanitizeBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  
  if (score <= 30) {
    // Low risk - hide action buttons (auto-allow)
    allowBtn.style.display = 'none';
    sanitizeBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
  } else if (score <= 70) {
    // Medium risk - show all options
    allowBtn.style.display = 'block';
    sanitizeBtn.style.display = 'block';
    cancelBtn.style.display = 'block';
  } else {
    // High risk - only allow sanitized version
    allowBtn.style.display = 'none';
    sanitizeBtn.style.display = 'block';
    cancelBtn.style.display = 'block';
  }
}

// Button Event Listeners
document.getElementById('allowBtn').addEventListener('click', () => {
  console.log("✅ User clicked: Allow Anyway");
  chrome.runtime.sendMessage({
    type: 'USER_ACTION',
    action: 'ALLOW',
    prompt: currentPrompt
  });
  window.close();
});

document.getElementById('sanitizeBtn').addEventListener('click', () => {
  console.log("🧹 User clicked: Use Sanitized");
  chrome.runtime.sendMessage({
    type: 'USER_ACTION',
    action: 'SANITIZE',
    prompt: currentSanitized
  });
  window.close();
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  console.log("❌ User clicked: Cancel");
  chrome.runtime.sendMessage({
    type: 'USER_ACTION',
    action: 'CANCEL'
  });
  window.close();
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (currentScore > 70) {
      document.getElementById('sanitizeBtn').click();
    } else if (currentScore > 30) {
      document.getElementById('allowBtn').click();
    }
  } else if (e.key === 'Escape') {
    document.getElementById('cancelBtn').click();
  }
});

// For testing - simulate a scan result
setTimeout(() => {
  // Uncomment this to test the UI with fake data
  
  displayScanResult({
    originalPrompt: "How to hack a website?",
    sanitizedPrompt: "How to learn about website security?",
    total: 75,
    reasons: [
      { type: 'keyword', keyword: 'hack', add: 30 },
      { type: 'banned', phrase: 'exploit', add: 25 },
      { type: 'entropy', add: 20 }
    ]
  });
  
}, 500);