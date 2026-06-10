document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('master-toggle');
  const sensitivityRadios = document.getElementsByName('sensitivity');
  const whitelistInput = document.getElementById('whitelist-input');
  const addWhitelistBtn = document.getElementById('add-whitelist-btn');
  const whitelistUl = document.getElementById('whitelist-ul');
  const statusBanner = document.getElementById('status-banner');
  const piiToggle = document.getElementById('pii-toggle');

  let currentWhitelist = [];

  // 1. Load initial state
  chrome.storage.local.get(["enabled", "sensitivity", "whitelist", "piiEnabled"], (data) => {
    masterToggle.checked = data.enabled ?? true;
    piiToggle.checked = data.piiEnabled ?? true;
    
    const sens = data.sensitivity || "balanced";
    sensitivityRadios.forEach(r => {
      if (r.value === sens) r.checked = true;
    });

    currentWhitelist = data.whitelist || [];
    renderWhitelist();
    updateStatusBanner();
  });

  // 2. Fetch Tab Status
  function updateStatusBanner() {
    if (!masterToggle.checked) {
      setStatus("disabled");
      return;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: "GET_STATUS" }, (response) => {
        // If content script doesn't respond, it's an unsupported page
        setStatus(response?.status ?? "unsupported");
      });
    });
  }

  function setStatus(status) {
    statusBanner.className = "status-banner"; // reset
    if (status === "disabled") {
      statusBanner.classList.add("status-disabled");
      statusBanner.innerText = "🛑 Extension Disabled";
    } else if (status === "scanning") {
      statusBanner.classList.add("status-scanning");
      statusBanner.innerText = "✅ Active on this page";
    } else if (status === "whitelisted") {
      statusBanner.classList.add("status-whitelisted");
      statusBanner.innerText = "🛡️ Domain Whitelisted";
    } else {
      statusBanner.classList.add("status-unsupported");
      statusBanner.innerText = "🚫 Platform Not Supported";
    }
  }

  // 3. Attach Listeners
  masterToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ enabled: e.target.checked }, () => {
      updateStatusBanner();
    });
  });

  piiToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ piiEnabled: e.target.checked });
  });

  sensitivityRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        chrome.storage.local.set({ sensitivity: e.target.value });
      }
    });
  });

  addWhitelistBtn.addEventListener('click', () => {
    const domain = whitelistInput.value.trim().toLowerCase();
    if (domain && !currentWhitelist.includes(domain)) {
      currentWhitelist.push(domain);
      chrome.storage.local.set({ whitelist: currentWhitelist }, () => {
        whitelistInput.value = "";
        renderWhitelist();
        updateStatusBanner();
      });
    }
  });

  function renderWhitelist() {
    whitelistUl.innerHTML = "";
    currentWhitelist.forEach((domain, index) => {
      const li = document.createElement('li');
      li.className = 'whitelist-item';
      li.innerHTML = `
        <span>${domain}</span>
        <button class="remove-btn" data-index="${index}">X</button>
      `;
      whitelistUl.appendChild(li);
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        currentWhitelist.splice(idx, 1);
        chrome.storage.local.set({ whitelist: currentWhitelist }, () => {
          renderWhitelist();
          updateStatusBanner();
        });
      });
    });
  }
});
