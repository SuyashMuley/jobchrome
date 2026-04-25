import {
  loadAll, savePreferences, saveSettings, saveResumeAndProvider,
  DEFAULT_PREFS, DEFAULT_SETTINGS,
} from "../preferences/prefs.js";

// Resolved at init from storage — never hardcoded
let API_BASE = DEFAULT_SETTINGS.backend_url;
let atsThreshold = DEFAULT_SETTINGS.ats_threshold;

// ── Tab switching ──────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((s) => s.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

// ── PDF Upload ─────────────────────────────────────────────────
const uploadZone   = document.getElementById("upload-zone");
const pdfInput     = document.getElementById("pdf-input");
const uploadLabel  = document.getElementById("upload-label");
const uploadStatus = document.getElementById("upload-status");

uploadZone.addEventListener("click", () => pdfInput.click());
uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handlePdfUpload(file);
});
pdfInput.addEventListener("change", () => { if (pdfInput.files[0]) handlePdfUpload(pdfInput.files[0]); });

async function handlePdfUpload(file) {
  if (file.type !== "application/pdf") {
    setUploadState("error", file.name, "Only PDF files are accepted.");
    return;
  }
  setUploadState("loading", file.name, "Extracting text…");
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/resume/parse`, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) { setUploadState("error", file.name, data.detail || "Parse failed."); return; }
    document.getElementById("resume-input").value = data.text;
    setUploadState("ok", file.name, `${data.page_count} page${data.page_count !== 1 ? "s" : ""} extracted`);
    await saveResumeAndProvider(data.text, document.getElementById("provider-select").value);
  } catch {
    setUploadState("error", file.name, "Could not reach backend. Check Settings → Backend URL.");
  }
}

function setUploadState(state, fileName, message) {
  uploadZone.classList.remove("success", "error-state", "drag-over");
  uploadStatus.classList.remove("ok", "fail");
  if (state === "ok") {
    uploadZone.classList.add("success");
    uploadLabel.textContent = `✓ ${fileName}`;
    uploadStatus.textContent = message;
    uploadStatus.classList.add("ok");
  } else if (state === "error") {
    uploadZone.classList.add("error-state");
    uploadLabel.innerHTML = `${fileName} — <u>try again</u>`;
    uploadStatus.textContent = message;
    uploadStatus.classList.add("fail");
  } else {
    uploadLabel.textContent = fileName;
    uploadStatus.textContent = message;
  }
}

// ── Tag input factory ──────────────────────────────────────────
function makeTagInput(inputId, tagsId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(tagsId);
  const values = [];

  function render() {
    container.innerHTML = "";
    values.forEach((v, i) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = `${v}<button aria-label="remove">×</button>`;
      tag.querySelector("button").addEventListener("click", () => { values.splice(i, 1); render(); });
      container.appendChild(tag);
    });
  }

  input.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.value.trim()) {
      e.preventDefault();
      const val = input.value.trim().replace(/,$/, "");
      if (val && !values.includes(val)) values.push(val);
      input.value = "";
      render();
    }
    if (e.key === "Backspace" && !input.value && values.length) { values.pop(); render(); }
  });

  return {
    getValues: () => [...values],
    setValues: (arr) => { values.length = 0; values.push(...arr); render(); },
    addValue: (val) => { if (val && !values.includes(val)) { values.push(val); render(); } },
    removeValue: (val) => { const i = values.indexOf(val); if (i !== -1) { values.splice(i, 1); render(); } },
    hasValue: (val) => values.includes(val),
  };
}

const tagTech     = makeTagInput("input-tech",     "tags-tech");
const tagRoles    = makeTagInput("input-roles",     "tags-roles");
const tagExcluded = makeTagInput("input-excluded",  "tags-excluded");

// Map data-tag attribute → tag controller
const TAG_MAP = { tech: tagTech, roles: tagRoles };

// ── Preset chips for Tech Stack & Target Roles ─────────────────
document.querySelectorAll(".preset-chips .chip").forEach((chip) => {
  const tag = TAG_MAP[chip.closest(".preset-chips").dataset.tag];
  if (!tag) return;

  chip.addEventListener("click", () => {
    const val = chip.dataset.value;
    if (tag.hasValue(val)) {
      tag.removeValue(val);
      chip.classList.remove("active");
    } else {
      tag.addValue(val);
      chip.classList.add("active");
    }
  });
});

// ── Domain chips ───────────────────────────────────────────────
document.querySelectorAll("#chips-domains .chip").forEach((chip) => {
  chip.addEventListener("click", () => chip.classList.toggle("active"));
});

function getSelectedDomains() {
  return [...document.querySelectorAll("#chips-domains .chip.active")].map((c) => c.dataset.value);
}
function setSelectedDomains(arr) {
  document.querySelectorAll("#chips-domains .chip").forEach((chip) => {
    chip.classList.toggle("active", arr.includes(chip.dataset.value));
  });
}

// ── Copy buttons ───────────────────────────────────────────────
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const el = document.getElementById(btn.dataset.target);
    navigator.clipboard.writeText(el.value || el.innerText);
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = orig), 1500);
  });
});

// ── Reveal API key buttons ─────────────────────────────────────
document.querySelectorAll(".reveal-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

// ── Threshold slider live label ────────────────────────────────
document.getElementById("setting-threshold").addEventListener("input", (e) => {
  document.getElementById("threshold-display").textContent = e.target.value;
});

// ── Collapsible sections ───────────────────────────────────────
["cold-email", "tailoring"].forEach((id) => {
  document.getElementById(`${id}-toggle`).addEventListener("click", () => {
    document.getElementById(`${id}-body`).classList.toggle("hidden");
    document.querySelector(`#${id}-toggle .chevron`).classList.toggle("open");
  });
});

// ── Analyze button ─────────────────────────────────────────────
const analyzeBtn = document.getElementById("analyze-btn");
const statusMsg  = document.getElementById("status-msg");

analyzeBtn.addEventListener("click", async () => {
  const resumeText = document.getElementById("resume-input").value.trim();
  const provider   = document.getElementById("provider-select").value;

  if (!resumeText) { showStatus(statusMsg, "Paste your resume first.", "error"); return; }

  await saveResumeAndProvider(resumeText, provider);
  analyzeBtn.disabled = true;
  showStatus(statusMsg, "Scraping job posting…", "");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.runtime.sendMessage({ type: "ANALYZE_JOB", tabId: tab.id });
    if (result.error) { showStatus(statusMsg, result.error, "error"); return; }
    showStatus(statusMsg, "", "");
    renderResults(result);
  } catch (err) {
    showStatus(statusMsg, err.message || "Something went wrong.", "error");
  } finally {
    analyzeBtn.disabled = false;
  }
});

// ── Render results ─────────────────────────────────────────────
function renderResults(data) {
  // Apply the local threshold filter — override LLM recommendation if score is below threshold
  const effectiveRec = data.ats_score >= atsThreshold ? data.recommendation : "skip";
  const thresholdOverridden = effectiveRec !== data.recommendation;

  document.getElementById("results").classList.remove("hidden");

  const score = data.ats_score;
  document.getElementById("score-num").textContent = score;
  const offset = 113.1 - (score / 100) * 113.1;
  const fill = document.getElementById("score-fill");
  fill.style.strokeDashoffset = offset;
  // SVG elements use setAttribute — .className is an SVGAnimatedString (read-only string setter)
  const ringColor = score >= 70 ? "green" : score >= 50 ? "yellow" : "red";
  fill.setAttribute("class", `fill ${ringColor}`);

  const badge = document.getElementById("rec-badge");
  badge.textContent = effectiveRec === "apply" ? "✓ Apply" : "✕ Skip";
  badge.className = `rec-badge ${effectiveRec}`;

  const reasonSuffix = thresholdOverridden
    ? ` (Score ${score} is below your apply threshold of ${atsThreshold}.)`
    : "";
  document.getElementById("reasoning").textContent = data.reasoning + reasonSuffix;

  setBar("keyword", data.ats_breakdown.keyword_match);
  setBar("skills",  data.ats_breakdown.skills_match);
  setBar("exp",     data.ats_breakdown.experience_match);
  setBar("pref",    data.ats_breakdown.preference_alignment);

  const tailoringCard = document.getElementById("tailoring-card");
  const tailoringBody = document.getElementById("tailoring-body");
  const suggestions = data.tailoring_suggestions ?? [];
  if (suggestions.length > 0) {
    tailoringCard.classList.remove("hidden");
    tailoringBody.innerHTML = "";
    suggestions.forEach((s) => {
      const p = document.createElement("p");
      p.className = "suggestion-item";
      p.textContent = s;
      tailoringBody.appendChild(p);
    });
  } else {
    tailoringCard.classList.add("hidden");
  }

  const coldCard = document.getElementById("cold-email-card");
  if (effectiveRec === "apply" && data.cold_email?.recommended) {
    coldCard.classList.remove("hidden");
    document.getElementById("email-subject").value = data.cold_email.subject;
    document.getElementById("email-body").value    = data.cold_email.body;
  } else {
    coldCard.classList.add("hidden");
  }

  const query = data.recruiter_search_template;
  document.getElementById("recruiter-query").value = query;
  document.getElementById("recruiter-link").href =
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

function setBar(key, value) {
  document.getElementById(`bar-${key}`).style.width = `${value}%`;
  document.getElementById(`val-${key}`).textContent = value;
}

// ── Save preferences ───────────────────────────────────────────
const saveMsg = document.getElementById("save-msg");

document.getElementById("save-prefs-btn").addEventListener("click", async () => {
  const prefs = {
    domains: getSelectedDomains(),
    tech_stack: tagTech.getValues(),
    target_roles: tagRoles.getValues(),
    experience_level: document.querySelector('input[name="exp"]:checked')?.value || "mid",
    work_mode: document.querySelector('input[name="mode"]:checked')?.value || "any",
    job_types: [...document.querySelectorAll('#check-jobtype input:checked')].map((c) => c.value),
    excluded_keywords: tagExcluded.getValues(),
  };
  await savePreferences(prefs);
  showStatus(saveMsg, "Preferences saved.", "success");
  setTimeout(() => showStatus(saveMsg, "", ""), 2000);
});

// ── Save settings ──────────────────────────────────────────────
const settingsMsg = document.getElementById("settings-msg");

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  const settings = {
    backend_url:       document.getElementById("setting-backend-url").value.trim() || DEFAULT_SETTINGS.backend_url,
    default_provider:  document.getElementById("setting-default-provider").value,
    anthropic_api_key: document.getElementById("setting-anthropic-key").value.trim(),
    groq_api_key:      document.getElementById("setting-groq-key").value.trim(),
    xai_api_key:       document.getElementById("setting-xai-key").value.trim(),
    ats_threshold:     Number(document.getElementById("setting-threshold").value),
    auto_open:         document.getElementById("setting-auto-open").checked,
  };

  await saveSettings(settings);
  API_BASE = settings.backend_url;
  atsThreshold = settings.ats_threshold;

  // Sync default provider to Analyze tab
  document.getElementById("provider-select").value = settings.default_provider;

  showStatus(settingsMsg, "Settings saved.", "success");
  setTimeout(() => showStatus(settingsMsg, "", ""), 2000);
});

// ── Load everything on open ────────────────────────────────────
async function init() {
  const { resume_text, provider, preferences: prefs, settings } = await loadAll();

  const s = { ...DEFAULT_SETTINGS, ...settings };
  API_BASE     = s.backend_url;
  atsThreshold = s.ats_threshold;

  // Analyze tab
  document.getElementById("resume-input").value    = resume_text;
  document.getElementById("provider-select").value = provider || s.default_provider;

  // Preferences tab
  const p = { ...DEFAULT_PREFS, ...prefs };
  setSelectedDomains(p.domains);
  tagTech.setValues(p.tech_stack);
  tagRoles.setValues(p.target_roles);

  // Sync preset chip active states to match loaded values
  document.querySelectorAll(".preset-chips .chip").forEach((chip) => {
    const tag = TAG_MAP[chip.closest(".preset-chips").dataset.tag];
    if (tag) chip.classList.toggle("active", tag.hasValue(chip.dataset.value));
  });
  const expEl = document.querySelector(`input[name="exp"][value="${p.experience_level}"]`);
  if (expEl) expEl.checked = true;
  const modeEl = document.querySelector(`input[name="mode"][value="${p.work_mode}"]`);
  if (modeEl) modeEl.checked = true;
  document.querySelectorAll('#check-jobtype input').forEach((cb) => {
    cb.checked = p.job_types.includes(cb.value);
  });
  tagExcluded.setValues(p.excluded_keywords);

  // Settings tab
  document.getElementById("setting-backend-url").value       = s.backend_url;
  document.getElementById("setting-default-provider").value  = s.default_provider;
  document.getElementById("setting-anthropic-key").value     = s.anthropic_api_key;
  document.getElementById("setting-groq-key").value          = s.groq_api_key;
  document.getElementById("setting-xai-key").value           = s.xai_api_key;
  document.getElementById("setting-threshold").value         = s.ats_threshold;
  document.getElementById("threshold-display").textContent   = s.ats_threshold;
  document.getElementById("setting-auto-open").checked       = s.auto_open;
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

init();
