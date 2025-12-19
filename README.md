
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

* ⚠️ **Instant Warnings**

  * Highlights unsafe content and notifies the user immediately.

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
├── model/              # Trained ML model files
├── tokenizer/          # Tokenizer used for text preprocessing
├── content.js          # Injected script to capture user input
├── background.js       # Background logic and message handling
├── scanner.js          # Core scanning and classification logic
├── popup.html          # Extension UI
├── popup.js            # UI logic
├── style.css           # Styling for popup and alerts
├── rules.json          # Safety rules and categories
└── manifest.json       # Browser extension configuration
```
---

### 🔄 How they work together

1. User types text on a webpage
2. `content.js` captures the input
3. Text is passed to the **tokenizer**
4. Tokenized input goes to the **model**
5. Model predicts risk category
6. Extension blocks, warns, or allows the input

---

## 🛠️ Installation

### Step 1: Clone the repository

```bash
git clone https://github.com/priyanshu015211/ghewarkegeeks.git
cd ghewarkegeeks
```

### Step 2: Load extension in browser

* Open Chrome / Edge / Brave
* Go to `chrome://extensions`
* Enable **Developer Mode**
* Click **Load Unpacked**
* Select the project folder

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
