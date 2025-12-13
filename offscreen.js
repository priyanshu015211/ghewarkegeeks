// ------------------------------------------------------
// offscreen.js — STABLE BERT WORDPIECE (MV3 SAFE)
// ------------------------------------------------------

console.log("Offscreen document loaded");

// 🔔 Signal readiness
chrome.runtime.sendMessage({ type: "OFFSCREEN_READY" });

// ------------------------------------------------------
// ONNX check
// ------------------------------------------------------
if (typeof ort === "undefined") {
  console.error("❌ ONNX Runtime NOT loaded");
}

// ------------------------------------------------------
// Globals
// ------------------------------------------------------
let session = null;
let vocab = null;
let config = null;

// ------------------------------------------------------
// Load vocab.txt (CORRECT for BERT)
// ------------------------------------------------------
async function loadVocab() {
  if (vocab) return vocab;

  const res = await fetch(chrome.runtime.getURL("model/vocab.txt"));
  const text = await res.text();

  vocab = {};
  text.split("\n").forEach((token, idx) => {
    vocab[token.trim()] = idx;
  });

  console.log("✅ vocab.txt loaded");
  return vocab;
}

// ------------------------------------------------------
// Load config
// ------------------------------------------------------
async function loadConfig() {
  if (config) return config;

  const res = await fetch(chrome.runtime.getURL("model/config.json"));
  config = await res.json();

  console.log("✅ config.json loaded");
  return config;
}

// ------------------------------------------------------
// Load ONNX model
// ------------------------------------------------------
async function loadModel() {
  if (session) return session;

  ort.env.wasm.wasmPaths = chrome.runtime.getURL("lib/");
  session = await ort.InferenceSession.create(
    chrome.runtime.getURL("model/intent_model.onnx")
  );

  console.log("✅ ONNX model loaded");
  return session;
}

// ------------------------------------------------------
// WordPiece Tokenization (BERT-correct)
// ------------------------------------------------------
function tokenize(text, vocab, maxLen) {
  const CLS = "[CLS]";
  const SEP = "[SEP]";
  const PAD = "[PAD]";
  const UNK = "[UNK]";

  let tokens = [CLS];

  text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .forEach(word => {
      if (vocab[word] !== undefined) {
        tokens.push(word);
      } else {
        tokens.push(UNK);
      }
    });

  tokens.push(SEP);

  let ids = tokens.map(t => vocab[t] ?? vocab[UNK]);

  if (ids.length > maxLen) {
    ids = ids.slice(0, maxLen);
    ids[maxLen - 1] = vocab[SEP];
  }

  while (ids.length < maxLen) {
    ids.push(vocab[PAD]);
  }

  return ids;
}

// ------------------------------------------------------
// Softmax
// ------------------------------------------------------
function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

// ------------------------------------------------------
// CLASSIFY
// ------------------------------------------------------
async function classify(text) {
  const [model, vocab, cfg] = await Promise.all([
    loadModel(),
    loadVocab(),
    loadConfig()
  ]);

  const maxLen = cfg.max_position_embeddings || 128;

  const ids = tokenize(text, vocab, maxLen);

  const inputIds = new ort.Tensor(
    "int64",
    BigInt64Array.from(ids.map(BigInt)),
    [1, maxLen]
  );

  const attentionMask = new ort.Tensor(
    "int64",
    BigInt64Array.from(ids.map(v => BigInt(v !== 0 ? 1 : 0))),
    [1, maxLen]
  );

  const output = await model.run({
    input_ids: inputIds,
    attention_mask: attentionMask
  });

  const logits = Array.from(output.logits.data);
  const probs = softmax(logits);

  const idx = probs.indexOf(Math.max(...probs));

  return {
    label: cfg.id2label[idx],
    confidence: Number(probs[idx].toFixed(3))
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
        console.error("❌ ML error:", err);
        sendResponse({ label: "error", confidence: 0 });
      });

    return true;
  }
});

