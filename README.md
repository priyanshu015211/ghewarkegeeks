
# 🛡️ GhewarkeGeeks – LLM Safety Browser Extension

A **browser extension** that adds a safety layer while interacting with **Large Language Models (LLMs)** on websites like ChatGPT, Gemini, Claude, etc.
It detects unsafe, harmful, or restricted content in real time and alerts the user before submission or response usage.

---

## 🎯 Problem Statement

LLMs can sometimes generate or accept:

* Harmful instructions
* Unsafe prompts
* Policy-violating content
* Toxic or sensitive text

Users often submit prompts without realizing the risks.
This extension helps **prevent unsafe interactions** by analyzing text **locally** before it is sent or used.

---

## 🚀 Features

* 🔍 **Real-Time Text Scanning**

  * Monitors text typed into prompt boxes on supported websites.

* 🧠 **AI-Based Content Classification**

  * Uses a trained ML model instead of simple keyword matching.

* ⚠️ **Instant Warnings & Auto-Blocking**
  * 3-Tier Severity Levels (Info, Warning, Block).
  * Automatically disables the submit button for highly toxic text.

* 🛡️ **PII Detection Engine**
  * Lightning-fast Regex pre-filter blocks SSN, Aadhaar, Credit Cards natively in the DOM.
  * Warns users on Emails and Phone Numbers before sending text to the ML model.

* 🔔 **Badge Notifications & Keyboard Shortcuts**
  * Tracks blocked/warned messages per tab via extension icon badges.
  * Use the `Escape` key to instantly dismiss safety tooltips.

* 🔒 **Privacy-Preserving**

  * No API calls
  * No data sent to external servers
  * Everything runs locally

* ⚙️ **Custom Rule Support**

  * Safety rules can be extended or modified.

---

## 🧩 Project Structure

```
ghewarkegeeks/
│
├── model/              # Trained ML model files (Xenova/toxic-bert)
├── lib/                # ONNX runtime WebAssembly binaries
├── src/
│   ├── content.js      # Injected script to capture user input
│   ├── background.js   # Background logic and offscreen document routing
│   └── offscreen.js    # Core ML scanning using Xenova/transformers
├── offscreen2.html     # Hidden document that executes the ML model
├── popup.html          # Extension UI
├── popup.js            # UI logic
├── style.css           # Styling for popup and alerts
├── rules.json          # Safety rules and categories
├── webpack.config.js   # Bundles offscreen.js for browser compatibility
└── manifest.json       # Browser extension configuration (Manifest V3)
```
---

### 🔄 How they work together

1. User types text on a webpage
2. `content.js` captures the input and detects pauses (debouncing).
3. The text is sent via `chrome.runtime.sendMessage` to `background.js`.
4. `background.js` spawns an invisible `offscreen2.html` document (if not already running).
5. The text is forwarded to `offscreen.js` which runs the **Xenova/toxic-bert** ONNX model entirely locally in the browser via WebAssembly.
6. The ML model predicts the toxicity category and returns a confidence score.
7. `content.js` receives the result and injects a warning tooltip and red border if the text is flagged.

---

## 🛠️ Installation

### Step 1: Clone the repository

```bash
git clone https://github.com/priyanshu015211/ghewarkegeeks.git
cd ghewarkegeeks
```

### Step 2: Build the Extension

Since the ML engine uses Node modules, we need to bundle it for the browser:

```bash
npm install
npx webpack
```

### Step 3: Load extension in browser

* Open Chrome / Edge / Brave
* Go to `chrome://extensions`
* Enable **Developer Mode**
* Click **Load Unpacked**
* Select the `ghewarkegeeks` project folder

---

## 🌐 Supported Platforms

* Google Chrome
* Microsoft Edge
* Brave Browser
* Firefox (with minor adjustments)

---

## 🧪 Development & Contribution

You can contribute by:

* Improving detection accuracy
* Adding new safety categories
* Enhancing UI/UX
* Optimizing performance

Steps:

1. Fork the repository
2. Create a new branch
3. Make changes
4. Submit a Pull Request

---

## 📌 Use Cases

* Safer AI usage for students
* Preventing accidental policy violations
* Ethical AI experimentation
* Hackathons and research demos

---

## ⚖️ License

This project is **open source**.
Feel free to use, modify, and extend responsibly.

---
