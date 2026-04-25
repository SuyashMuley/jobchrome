const DEFAULT_BACKEND = "http://localhost:8000";

// Let Chrome open the side panel automatically when the action icon is clicked.
// This avoids having to call sidePanel.open() manually (which requires a user gesture
// and throws when called from onUpdated or other non-gesture contexts).
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Auto-open: when enabled in Settings, make the panel available for job pages.
// We can't force-open it (no user gesture), but setOptions enables it for the tab
// so clicking the icon immediately shows the panel without any extra steps.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  const { settings } = await chrome.storage.local.get("settings");
  const jobPagePattern = /^https:\/\/(www\.linkedin\.com\/jobs|www\.indeed\.com\/(viewjob|jobs)|[^/]+\.myworkdayjobs\.com|boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co)\//;

  if (settings?.auto_open && jobPagePattern.test(tab.url)) {
    chrome.sidePanel.setOptions({ tabId, enabled: true, path: "sidepanel/sidepanel.html" });
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

  // Send a scrape request to the content script already injected by the manifest.
  // If the tab was open before the extension loaded/reloaded, the content script
  // won't be there yet — inject it on demand as a fallback.
  let job;
  try {
    job = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_JOB" });
  } catch {
    // Content script not present — inject it now, then retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content_scripts/index.js"],
      });
      job = await chrome.tabs.sendMessage(tabId, { type: "SCRAPE_JOB" });
    } catch {
      throw new Error("Could not reach the page. Make sure you are on a LinkedIn, Indeed, Workday, Greenhouse, or Lever job posting and try again.");
    }
  }

  if (!job) {
    throw new Error("No job posting detected. Open the LinkedIn tab's Console (F12 → Console) and look for [JobChrome] debug lines to see which selectors were tried.");
  }

  const payload = {
    resume_text: stored.resume_text,
    job,
    provider: stored.provider || settings.default_provider || "claude",
    preferences: stored.preferences || {},
  };

  const headers = { "Content-Type": "application/json" };
  if (settings.anthropic_api_key) headers["X-Anthropic-Key"] = settings.anthropic_api_key;
  if (settings.groq_api_key)      headers["X-Groq-Key"]      = settings.groq_api_key;
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
