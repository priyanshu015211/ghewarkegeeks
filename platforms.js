var PLATFORMS_CONFIG = {
  "chatgpt.com": {
    "name": "ChatGPT",
    "inputArea": "#prompt-textarea",
    "fallbackInputArea": "div[contenteditable='true'][data-id]",
    "submitButton": "button[data-testid='send-button']",
    "_reserved_responseContainer": "div[data-message-author-role='assistant'] // Reserved for Phase 4 streaming analysis"
  },
  "gemini.google.com": {
    "name": "Google Gemini",
    "inputArea": "rich-textarea > div",
    "fallbackInputArea": "textarea.text-input-field",
    "submitButton": "button[aria-label='Send message']",
    "_reserved_responseContainer": "model-response, .message-content // Reserved for Phase 4 streaming analysis"
  },
  "claude.ai": {
    "name": "Claude",
    "inputArea": "div[contenteditable='true']",
    "fallbackInputArea": "textarea",
    "submitButton": "button[aria-label='Send Message']",
    "_reserved_responseContainer": ".font-claude-message // Reserved for Phase 4 streaming analysis"
  },
  "perplexity.ai": {
    "name": "Perplexity",
    "inputArea": "textarea",
    "fallbackInputArea": "div[contenteditable='true']",
    "submitButton": "button[aria-label='Submit']",
    "_reserved_responseContainer": ".prose // Reserved for Phase 4 streaming analysis"
  }
};
