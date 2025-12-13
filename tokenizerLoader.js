let tokenizerInstance = null;

export async function loadTokenizer() {
  if (tokenizerInstance) {
    return tokenizerInstance;
  }

  try {
    const tokenizerURL = chrome.runtime.getURL("model/tokenizer.json");
    const response = await fetch(tokenizerURL);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const tokenizerConfig = await response.json();
    tokenizerInstance = tokenizerConfig;

    console.log("Tokenizer JSON loaded successfully");
    return tokenizerInstance;
  } catch (e) {
    console.error("Failed to load tokenizer.json:", e);
    return null;
  }
}
