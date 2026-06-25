console.log("Offscreen document loaded");

// Set up transformers
const { pipeline, env } = require('@xenova/transformers');

// Configure env for local models
if (env) {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false; // Fix: Cache API does not support chrome-extension://
  // localModelPath acts as a base URL for local models
  env.localModelPath = chrome.runtime.getURL('model/');
  // Point to local WASM files safely
  if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('lib/');
    env.backends.onnx.wasm.numThreads = 1;
  }
}

let classifierPipeline = null;


async function loadClassifier() {
  if (!classifierPipeline && pipeline) {
    try {
      console.log("Loading toxic-bert model...");
      // toxic-bert model is placed in model/Xenova/toxic-bert
      classifierPipeline = await pipeline('text-classification', 'Xenova/toxic-bert');
      console.log("Model loaded successfully.");
    } catch (e) {
      console.error("Failed to load model:", e);
    }
  }
}

// Start loading immediately
loadClassifier().then(() => {
  chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });
});

async function classify(text, settings = {}) {
  if (!classifierPipeline) {
    return { label: "error", confidence: 0, score: 0 };
  }

  try {
    const data = settings || {};
    
    // First check custom rules
    const customRules = data.customRules || [];
    const lowerText = text.toLowerCase();
    for (const rule of customRules) {
      if (lowerText.includes(rule.toLowerCase())) {
        return {
          label: "harmful",
          confidence: 1.0,
          score: 100,
          matchedRule: rule,
          category: "custom",
          severity: "block"
        };
      }
    }

    // Run AI model
    const results = await classifierPipeline(text, { topk: null });
    // results is typically an array of arrays or an array of objects depending on the model output shape.
    // toxic-bert returns an array of label/score objects for the input string.
    const labels = Array.isArray(results[0]) ? results[0] : results;
    
    let maxToxicScore = 0;
    let maxToxicLabel = "neutral";
    
    const disabled = data.disabledCategories || [];
    const mapLabelToCategory = (label) => {
      if (label === 'threat') return 'violence';
      if (label === 'identity_hate') return 'cybercrime';
      return 'self_harm';
    };
    
    for (const res of labels) {
       if (res.label !== 'toxic' && res.label !== 'severe_toxic' && res.label !== 'obscene' && res.label !== 'threat' && res.label !== 'insult' && res.label !== 'identity_hate') continue;
       
       const mappedCategory = mapLabelToCategory(res.label);
       
       if (disabled.includes(mappedCategory)) continue;

       if (res.score > maxToxicScore) {
         maxToxicScore = res.score;
         maxToxicLabel = res.label;
       }
    }
    
    const sensitivity = data.sensitivity || "balanced";

    let tBlock = 0.85;
    let tWarning = 0.60;
    let tInfo = 0.40;

    if (sensitivity === "strict") {
      tBlock = 0.75;
      tWarning = 0.50;
      tInfo = 0.35;
    } else if (sensitivity === "relaxed") {
      tBlock = 0.95;
      tWarning = 0.80;
      tInfo = 0.60;
    }

    let severity = "neutral";
    if (maxToxicScore >= tBlock) severity = "block";
    else if (maxToxicScore >= tWarning) severity = "warning";
    else if (maxToxicScore >= tInfo) severity = "info";

    return {
      label: severity === "neutral" ? "neutral" : "harmful",
      severity: severity,
      confidence: maxToxicScore,
      score: Math.round(maxToxicScore * 100),
      matchedRule: severity !== "neutral" ? `AI Pattern (${maxToxicLabel})` : "",
      category: "AI Detection"
    };
    
  } catch(e) {
    console.error("Classifier runtime error:", e);
    return { label: "error", confidence: 0, score: 0 };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLASSIFY_TEXT_OFFSCREEN") {
    classify(msg.text, msg.settings)
      .then(res => {
        sendResponse(res);
      })
      .catch(err => {
        sendResponse({ label: "error", confidence: 0, score: 0 });
      });
    return true; // async
  }
});
