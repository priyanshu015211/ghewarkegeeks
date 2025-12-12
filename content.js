console.log("Content script loaded.");

function handleInput(event) {
  const text = event.target.value || "";

  chrome.runtime.sendMessage(
    { type: "SCAN_TEXT", text },
    (response) => {
      if (response && response.flagged) {
        alert("⚠️ Warning: Unsafe content detected!");
      }
    }
  );
}

// Listen for typing in all textareas & input fields
document.addEventListener("input", handleInput, true);

console.log("LLM Safety: Input listener attached");
