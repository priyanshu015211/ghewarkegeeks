// ------------------------------------------------------
// offscreen.js — Pattern-based classifier (MV3 safe)
// Replaces the broken ONNX pipeline. Uses rules.json
// which actually exists, instead of intent_model.onnx
// and config.json which do not.
// ------------------------------------------------------

console.log("Offscreen document loaded");

// Signal background that we are ready
chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });

// ------------------------------------------------------
// Rules cache
// ------------------------------------------------------
let rulesCache = null;

async function loadRules() {
  if (rulesCache) return rulesCache;
  const res = await fetch(chrome.runtime.getURL("rules.json"));
  rulesCache = await res.json();
  console.log("✅ rules.json loaded into offscreen");
  return rulesCache;
}

// ------------------------------------------------------
// Intent boosters
// Words/phrases that signal the user is asking HOW TO
// do something harmful (raises confidence significantly)
// ------------------------------------------------------
const INTENT_PATTERNS = [
  /\bhow\s+to\b/i,
  /\bsteps?\s+to\b/i,
  /\bguide\s+(me\s+)?to\b/i,
  /\bwalk\s+me\s+through\b/i,
  /\bhelp\s+me\b/i,
  /\bshow\s+me\s+how\b/i,
  /\bcan\s+you\s+(teach|explain|tell)\b/i,
  /\binstructions?\s+for\b/i,
  /\btutorial\b/i,
];

function hasInstructionalIntent(text) {
  return INTENT_PATTERNS.some(p => p.test(text));
}

// ------------------------------------------------------
// CLASSIFY
// Scores the text against every rule in rules.json.
// Returns:
//   label      — "harmful" | "neutral"
//   confidence — 0.0–1.0
//   score      — raw score (0–100 scale, capped at 100)
//   matchedRules  — array of matched rule objects
//   hasIntent  — whether instructional intent was found
//   category   — category of the highest-weight match
// ------------------------------------------------------
async function classify(text) {
  const rules = await loadRules();

  const lower = text.toLowerCase();
  const hasIntent = hasInstructionalIntent(text);

  let totalScore = 0;
  const matchedRules = [];

  // Walk every category and every rule
  for (const [category, entries] of Object.entries(rules)) {
    for (const entry of entries) {
      if (lower.includes(entry.rule.toLowerCase())) {
        let weight = entry.weight;

        // Intent boost: +30% of the rule weight, capped
        if (hasIntent) {
          weight = Math.min(100, weight + Math.round(weight * 0.3));
        }

        totalScore += weight;
        matchedRules.push({ ...entry, category, weight });
      }
    }
  }

  // Multiple matches compound the risk (up to cap)
  const rawScore = Math.min(100, totalScore);

  // Normalize to 0.0–1.0 confidence
  const confidence = Number((rawScore / 100).toFixed(3));

  // Threshold: 0.35 → harmful (weight 35+ means at least one
  // medium-weight rule like "hack" + intent, or one heavy rule)
  const label = confidence >= 0.35 ? "harmful" : "neutral";

  // Best-matched category (highest individual weight)
  const topMatch = matchedRules.sort((a, b) => b.weight - a.weight)[0];
  const category = topMatch?.category ?? "none";

  console.log(`✅ Classify: label=${label} confidence=${confidence} score=${rawScore} matches=${matchedRules.length}`);

  return {
    label,
    confidence,
    score: rawScore,
    matchedRules,
    hasIntent,
    category,
  };
}

// ------------------------------------------------------
// MESSAGE HANDLER
// ------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLASSIFY_TEXT_OFFSCREEN") {
    classify(msg.text)
      .then(res => {
        console.log("✅ Prediction:", res);
        sendResponse(res);
      })
      .catch(err => {
        console.error("❌ Classifier error:", err);
        sendResponse({ label: "error", confidence: 0, score: 0 });
      });

    return true; // async sendResponse
  }
});
