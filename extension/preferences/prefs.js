export const DEFAULT_PREFS = {
  domains: [],
  tech_stack: [],
  target_roles: [],
  experience_level: "mid",
  job_types: ["full-time"],
  work_mode: "any",
  excluded_keywords: [],
};

export const DEFAULT_SETTINGS = {
  backend_url: "http://localhost:8000",
  default_provider: "claude",
  anthropic_api_key: "",
  xai_api_key: "",
  ats_threshold: 60,
  auto_open: false,
};

export async function loadAll() {
  const stored = await chrome.storage.local.get(["resume_text", "provider", "preferences", "settings"]);
  return {
    resume_text: stored.resume_text || "",
    provider: stored.provider || "claude",
    preferences: { ...DEFAULT_PREFS, ...(stored.preferences || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
  };
}

export async function savePreferences(prefs) {
  await chrome.storage.local.set({ preferences: prefs });
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

export async function saveResumeAndProvider(resumeText, provider) {
  await chrome.storage.local.set({ resume_text: resumeText, provider });
}
