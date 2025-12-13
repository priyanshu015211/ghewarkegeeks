document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------------------
    // TABS
    // ----------------------------------------------------------------
    const tabs = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");
    const explanationTab = document.querySelector('[data-tab="explanation"]');
    const explanationContent = document.getElementById('explanation-content');
    const explanationBackBtn = document.getElementById('explanation-back-btn');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        const tab = document.querySelector(`[data-tab="${tabId}"]`);
        if (tab) tab.classList.add("active");
        
        const content = document.getElementById(tabId);
        if (content) content.classList.add("active");

        if (tabId === 'log') loadWarningLog();
        if (tabId === 'analytics') generateAnalytics();
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    explanationBackBtn.addEventListener("click", () => {
        chrome.storage.local.remove('explanationData');
        explanationTab.style.display = 'none';
        switchTab('settings');
    });

    // ----------------------------------------------------------------
    // COMMON ELEMENTS
    // ----------------------------------------------------------------
    const statusText = document.getElementById("status");
    const toggleButton = document.getElementById("toggle");
    // ... (rest of element getters are the same)

    // ----------------------------------------------------------------
    // INITIAL LOAD
    // ----------------------------------------------------------------
    chrome.storage.local.get(
        ["enabled", "dailyScans", "scanTimestamps", "customRules", "soundEnabled", "explanationData"],
        (data) => {
            // Check for explanation data first
            if (data.explanationData) {
                generateExplanation(data.explanationData);
                explanationTab.style.display = 'block';
                switchTab('explanation');
            } else {
                explanationTab.style.display = 'none';
            }

            // ... (rest of initial load is the same)
            const isEnabled = data.enabled ?? true;
            statusText.textContent = isEnabled ? "Active" : "Disabled";
            toggleButton.textContent = isEnabled ? "Disable Scanner" : "Enable Scanner";
            updateStats(data);
            if (data.customRules) customRulesInput.value = data.customRules.join(", ");
            soundEnabledCheckbox.checked = !!data.soundEnabled;
        }
    );

    // ... (rest of the file is largely the same, but for safety I will replace it all)
    const scanCountText = document.getElementById("scanCountText");
    const spmText = document.getElementById("spmText");
    const customRulesInput = document.getElementById("customRulesInput");
    const saveRulesBtn = document.getElementById("saveRulesBtn");
    const builtinRulesContainer = document.getElementById("builtin-rules");
    const builtinRuleCountEl = document.getElementById("builtin-rule-count");
    const customRuleCountEl = document.getElementById("custom-rule-count");
    const totalRuleCountEl = document.getElementById("total-rule-count");
    const soundEnabledCheckbox = document.getElementById("soundEnabled");
    const clearLogBtn = document.getElementById("clearLogBtn");
    const logEntriesContainer = document.getElementById("log-entries");
    const topWordsChartContainer = document.getElementById("top-words-chart");
    const categoryChartContainer = document.getElementById("category-chart");
    
    toggleButton.addEventListener("click", () => {
        chrome.storage.local.get({ enabled: true }, (data) => {
            const newState = !data.enabled;
            chrome.storage.local.set({ enabled: newState });
        });
    });
    
    soundEnabledCheckbox.addEventListener("change", () => {
        chrome.storage.local.set({ soundEnabled: soundEnabledCheckbox.checked });
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (changes.enabled) {
            const isEnabled = changes.enabled.newValue ?? true;
            statusText.textContent = isEnabled ? "Active" : "Disabled";
            toggleButton.textContent = isEnabled ? "Disable Scanner" : "Enable Scanner";
        }
        if (changes.dailyScans || changes.scanTimestamps) {
            chrome.storage.local.get(["dailyScans", "scanTimestamps"], updateStats);
        }
        if (changes.disabledCategories || changes.customRules) {
            loadCategories();
            updateRuleCounts();
        }
        if (changes.warningLog && document.getElementById('log').classList.contains('active')) {
            loadWarningLog();
        }
        if (changes.warningLog && document.getElementById('analytics').classList.contains('active')) {
            generateAnalytics();
        }
    });

    function updateStats(data) {
        const today = new Date().toISOString().slice(0, 10);
        const dailyCount = (data.dailyScans?.date === today) ? data.dailyScans.count : 0;
        scanCountText.textContent = `${dailyCount || 0}`;
        spmText.textContent = `${data.scanTimestamps?.length || 0}`;
    }

    function updateRuleCounts() {
        let builtinCount = 0, customCount = 0;
        chrome.runtime.sendMessage({ type: "GET_RULES" }, (response) => {
            if (response?.rules) {
                builtinCount = Object.keys(response.rules).length;
                builtinRuleCountEl.textContent = builtinCount;
                totalRuleCountEl.textContent = builtinCount + customCount;
            }
        });
        chrome.storage.local.get({ customRules: [] }, (data) => {
            customCount = data.customRules.length;
            customRuleCountEl.textContent = customCount;
            totalRuleCountEl.textContent = builtinCount + customCount;
        });
    }

    function loadCategories() {
        chrome.runtime.sendMessage({ type: "GET_CATEGORIES" }, (response) => {
            if (chrome.runtime.lastError) return;
            const categories = response?.categories ? [...response.categories, 'custom'] : ['custom'];
            
            chrome.storage.local.get({ disabledCategories: [], sensitivitySettings: {} }, (data) => {
                const { disabledCategories, sensitivitySettings } = data;
                builtinRulesContainer.innerHTML = "";

                categories.forEach(category => {
                    const isChecked = !disabledCategories.includes(category);
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("category-item");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.id = `category-${category}`;
                    checkbox.checked = isChecked;
                    checkbox.addEventListener("change", (e) => {
                        const newDisabled = e.target.checked
                            ? disabledCategories.filter(c => c !== category)
                            : [...new Set([...disabledCategories, category])];
                        chrome.storage.local.set({ disabledCategories: newDisabled });
                    });
                    const label = document.createElement("label");
                    label.setAttribute("for", `category-${category}`);
                    label.textContent = category.replace(/_/g, " ");
                    const select = document.createElement("select");
                    select.dataset.category = category;
                    const levels = ["High", "Medium", "Low"];
                    levels.forEach(level => {
                        const option = document.createElement("option");
                        option.value = level.toLowerCase();
                        option.textContent = level;
                        select.appendChild(option);
                    });
                    select.value = sensitivitySettings[category] || 'high';
                    select.addEventListener('change', (e) => {
                        const newSettings = { ...sensitivitySettings, [category]: e.target.value };
                        chrome.storage.local.set({ sensitivitySettings: newSettings });
                    });
                    wrapper.appendChild(checkbox);
                    wrapper.appendChild(label);
                    wrapper.appendChild(select);
                    builtinRulesContainer.appendChild(wrapper);
                });
            });
        });
    }

    function showFeedback(message, type) {
        saveRulesBtn.textContent = message;
        saveRulesBtn.className = "save-rules-btn";
        saveRulesBtn.classList.add(type);
        setTimeout(() => {
            saveRulesBtn.textContent = "Save Rules";
            saveRulesBtn.classList.remove(type);
        }, 2000);
    }
    
    saveRulesBtn.addEventListener("click", () => {
        const newRulesRaw = customRulesInput.value;
        if (!newRulesRaw.trim()) {
            showFeedback("Input is empty.", "error");
            return;
        }
        const newRules = [...new Set(newRulesRaw.toLowerCase().split(",").map(r => r.trim()).filter(r => r.length > 0))];
        if (newRules.length === 0) {
            showFeedback("No valid rules.", "error");
            return;
        }
        Promise.all([
            new Promise(resolve => chrome.storage.local.get({ customRules: [] }, data => resolve(data.customRules))),
            new Promise(resolve => chrome.runtime.sendMessage({ type: "GET_ALL_BUILTIN_RULES" }, res => resolve(res?.rules || [])))
        ]).then(([existingCustom, allBuiltin]) => {
            const allBuiltinWords = allBuiltin.map(r => r.rule);
            const existingCustomLower = existingCustom.map(r => r.toLowerCase());
            const allBuiltinLower = allBuiltinWords.map(r => r.toLowerCase());
            const rulesToAdd = newRules.filter(rule => !existingCustomLower.includes(rule) && !allBuiltinLower.includes(rule));
            const conflictingRules = newRules.filter(rule => existingCustomLower.includes(rule) || allBuiltinLower.includes(rule));

            if (rulesToAdd.length === 0) {
                showFeedback(conflictingRules.length > 0 ? "Rule(s) already exist." : "No new rules.", "notice");
                return;
            }
            const updatedRules = [...existingCustom, ...rulesToAdd];
            chrome.storage.local.set({ customRules: updatedRules }, () => {
                customRulesInput.value = updatedRules.join(", ");
                showFeedback(`${rulesToAdd.length} rule(s) saved!`, "success");
            });
        });
    });

    function loadWarningLog() {
        chrome.storage.local.get({ warningLog: [] }, (data) => {
            const logs = data.warningLog;
            logEntriesContainer.innerHTML = "";
            if (logs.length === 0) {
                logEntriesContainer.textContent = "No warnings recorded yet.";
                return;
            }
            logs.forEach(log => {
                const entry = document.createElement("div");
                entry.classList.add("log-entry");
                const scoreEl = document.createElement("div");
                scoreEl.classList.add("log-score");
                scoreEl.textContent = log.score;
                if (log.score > 80) scoreEl.style.backgroundColor = "rgba(183, 28, 28, 0.9)";
                else if (log.score > 50) scoreEl.style.backgroundColor = "rgba(244, 67, 54, 0.9)";
                else if (log.score > 20) scoreEl.style.backgroundColor = "rgba(255, 152, 0, 0.9)";
                else scoreEl.style.backgroundColor = "rgba(255, 235, 59, 0.9)";
                const details = document.createElement("div");
                details.classList.add("log-details");
                const rule = document.createElement("div");
                rule.classList.add("log-rule");
                rule.textContent = `"${log.rule}"`;
                const time = document.createElement("div");
                time.classList.add("log-time");
                time.textContent = new Date(log.timestamp).toLocaleString();
                details.appendChild(rule);
                details.appendChild(time);
                entry.appendChild(scoreEl);
                entry.appendChild(details);
                logEntriesContainer.appendChild(entry);
            });
        });
    }

    clearLogBtn.addEventListener("click", () => {
        chrome.storage.local.set({ warningLog: [] });
    });

    function generateAnalytics() {
        chrome.storage.local.get({ warningLog: [] }, (data) => {
            const logs = data.warningLog;
            const wordCounts = {}, categoryCounts = {};
            logs.forEach(log => {
                wordCounts[log.rule] = (wordCounts[log.rule] || 0) + 1;
                categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
            });
            renderChart(topWordsChartContainer, wordCounts, 5);
            renderChart(categoryChartContainer, categoryCounts, 5, true);
        });
    }

    function renderChart(container, counts, topN, isCategory = false) {
        container.innerHTML = "";
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, topN);
        if (sorted.length === 0) {
            container.textContent = "Not enough data yet.";
            return;
        }
        const maxCount = sorted[0][1];
        container.classList.add("chart-container");
        sorted.forEach(([label, count]) => {
            const item = document.createElement("div");
            item.classList.add("chart-bar");
            const labelEl = document.createElement("div");
            labelEl.classList.add("chart-label");
            labelEl.textContent = label;
            labelEl.title = label;
            const bar = document.createElement("div");
            bar.classList.add("chart-bar-inner");
            bar.style.width = `${(count / maxCount) * 100}%`;
            bar.textContent = count;
            item.appendChild(labelEl);
            item.appendChild(bar);
            container.appendChild(item);
        });
    }

    function generateExplanation(data) {
        const { score, matchedRules, hasIntent } = data;
        const mainRule = matchedRules.sort((a, b) => b.weight - a.weight)[0];
        let html = `<p>This content was flagged with a risk score of <strong>${score}</strong>.</p>`;
        html += `<p>The main trigger was the phrase "<strong>${mainRule.rule}</strong>", which is in the <strong>${mainRule.category}</strong> category and has a base weight of <strong>${mainRule.weight}</strong>.</p>`;

        if (matchedRules.length > 1) {
            html += `<p>The score was increased because other risky words were also found.</p>`;
        }
        if (hasIntent) {
            html += `<p>The score was significantly increased because an <strong>instructional intent pattern</strong> (like "how to...") was detected alongside the risky keyword(s).</p>`;
        }
        explanationContent.innerHTML = html;
    }

    // Initial load
    updateRuleCounts();
    loadCategories();
});