const DEFAULT_BACKEND = "http://localhost:8000";

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const { settings } = await chrome.storage.local.get("settings");
  if (settings?.auto_open !== false) {
    chrome.sidePanel.open({ tabId: tab.id });
  } else {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Auto-open on job pages if enabled
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const { settings } = await chrome.storage.local.get("settings");
  if (!settings?.auto_open) return;

  const jobPagePattern = /^https:\/\/(www\.linkedin\.com\/jobs|www\.indeed\.com\/(viewjob|jobs))/;
  if (tab.url && jobPagePattern.test(tab.url)) {
    chrome.sidePanel.open({ tabId });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ANALYZE_JOB") {
    handleAnalyze(message.tabId).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleAnalyze(tabId) {
  const stored = await chrome.storage.local.get(["resume_text", "provider", "preferences", "settings"]);
  const settings = stored.settings || {};
  const backendUrl = settings.backend_url || DEFAULT_BACKEND;

  if (!stored.resume_text) {
    throw new Error("No resume found. Paste or upload your resume in the Analyze tab first.");
  }

  // Scrape job posting from the active tab
  const [{ result: job }] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content_scripts/index.js"],
  });

  if (!job) {
    throw new Error("No job posting detected on this page.");
  }

  const payload = {
    resume_text: stored.resume_text,
    job,
    provider: stored.provider || settings.default_provider || "claude",
    preferences: stored.preferences || {},
  };

  // Build headers — include API key overrides if stored
  const headers = { "Content-Type": "application/json" };
  if (settings.anthropic_api_key) headers["X-Anthropic-Key"] = settings.anthropic_api_key;
  if (settings.xai_api_key)       headers["X-XAI-Key"]       = settings.xai_api_key;

  const response = await fetch(`${backendUrl}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || "Backend error");
  }

  return response.json();
}
