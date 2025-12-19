
# 🛡️ LLM Safety Extension

A **browser extension** designed to enhance safety and ethical behavior when interacting with large language models (LLMs). This tool helps users enforce safety guidelines, filter unwanted outputs, and maintain content integrity while using AI-powered applications.

---

##  Features

*  **Safety-First Filtering**
  Detects and restricts unsafe or undesirable responses from LLMs based on customizable rules.

*  **Lightweight & Fast**
  Built using standard web extension technologies (JavaScript, HTML, CSS) for seamless performance in compatible browsers.

*  **Context-Aware Detection**
  Intelligently analyzes text across web pages and user inputs to flag potentially harmful content.

*  **Custom Rules Engine**
  Easily extend or edit filtering rules (JSON based) to tailor safety requirements for your use-case.

---

##  Installation

1. **Clone the repository**

   ```sh
   git clone https://github.com/priyanshu015211/ghewarkegeeks.git
   ```
2. **Navigate into the folder**

   ```sh
   cd ghewarkegeeks
   ```
3. **Load as an unpacked extension** in your browser using the `manifest.json`.

> Supported Browsers: Chrome, Edge, Brave, Firefox (with extension developer mode enabled)

---

## 🛠️ How It Works

This extension includes:

* **background.js** – Core event handlers and background logic
* **content.js** – Script injected into web pages to monitor and analyze LLM output
* **rules.json** – Safety rules and flags
* **popup.html / popup.js** – UI for enabling/disabling filters and managing settings
* **style.css** – Styling for the extension UI

Together, these components create a safety layer for interactions with AI models, helping users maintain control over content quality.

---

## 🧪 Development

To contribute:

1. Fork the repo
2. Create a feature branch
3. Make your improvements
4. Submit a Pull Request

All contributions toward better safety rules, UI upgrades, and performance improvements are welcome!

---

##  Contributing

Feel free to open issues or propose enhancements. Whether it’s better filtering logic, UI polishing, or new safety modules — community contributions help make AI safer for everyone.

---

##  License

This project is open source — share, adapt, and build responsibly.
