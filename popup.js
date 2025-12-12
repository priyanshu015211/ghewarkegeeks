const statusText = document.getElementById("status");
const button = document.getElementById("toggle");

chrome.storage.local.get(["enabled"], (data) => {
  const enabled = data.enabled ?? true;
  statusText.textContent = enabled ? "Active" : "Disabled";
});

button.addEventListener("click", () => {
  chrome.storage.local.get(["enabled"], (data) => {
    const newState = !(data.enabled ?? true);

    chrome.storage.local.set({ enabled: newState }, () => {
      statusText.textContent = newState ? "Active" : "Disabled";
      button.textContent = newState ? "Disable Scanner" : "Enable Scanner";
    });
  });
});
