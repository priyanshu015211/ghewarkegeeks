// ------------------------------------------------------
// background.js (STABLE OFFSCREEN ROUTER)
// ------------------------------------------------------

let offscreenReady = false;
let creatingOffscreen = null;

// Ensure offscreen document exists AND is ready
async function ensureOffscreen() {
  if (offscreenReady) return;

  if (!creatingOffscreen) {
    console.log("Creating offscreen document...");
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Run ONNX ML inference"
    });
  }

  await creatingOffscreen;
  
  // Give it a moment to load
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Listen for OFFSCREEN_READY signal
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OFFSCREEN_READY") {
    console.log("Offscreen signaled READY");
    offscreenReady = true;
    sendResponse({ status: "ready" });
  }
  return false;
});

// MAIN ROUTER
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.type);
  
  if (message.type === "CLASSIFY_TEXT") {
    (async () => {
      try {
        console.log("Ensuring offscreen is ready...");
        await ensureOffscreen();

        console.log("Sending to offscreen:", message.text.substring(0, 50) + "...");
        
        const result = await chrome.runtime.sendMessage({
          type: "CLASSIFY_TEXT_OFFSCREEN",
          text: message.text
        });

        console.log("Received from offscreen:", result);
        sendResponse(result);
      } catch (err) {
        console.error("Background ML error:", err);
        sendResponse({ 
          label: "error", 
          confidence: 0,
          error: err.message 
        });
      }
    })();

    return true; // async response
  }
  
  // Handle other messages
  return false;
});