// ── Helpers ────────────────────────────────────────────────────

function first(...selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText?.trim()) return el;
    } catch (_) {}
  }
  return null;
}

// ── LinkedIn scraper ───────────────────────────────────────────

function scrapeLinkedIn() {
  // Strategy 1: specific class selectors (covers /jobs/view/ and /jobs/search/)
  const titleEl = first(
    ".job-details-jobs-unified-top-card__job-title h1",
    ".job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title h2",
    ".jobs-unified-top-card__job-title",
    ".jobs-details-top-card__job-title",
    "h1.t-24",
    "h2.t-24.t-bold",
    "h2.t-24",
    ".job-view-layout h1",
    ".job-view-layout h2",
    // search-results page layout
    ".jobs-search__job-details h1",
    ".jobs-search__job-details h2",
    "[class*='top-card'] h1",
    "[class*='top-card'] h2",
  );

  const descEl = first(
    "#job-details",
    ".jobs-description-content__text",
    ".jobs-description__content",
    ".jobs-description",
    ".jobs-box__html-content",
    "article.jobs-description__container",
    "[class*='job-description']",
    "[class*='description-content']",
    ".jobs-search__job-details section",
    // broader fallback
    "[class*='description']",
  );

  const companyEl = first(
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
    ".jobs-details-top-card__company-info a",
    "[class*='company-name']",
  );

  const locationEl = first(
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__bullet",
    ".tvm__text--positive",
    "[class*='workplace-type']",
  );

  if (titleEl && descEl) {
    return {
      title: titleEl.innerText.trim(),
      company: companyEl?.innerText.trim() ?? "",
      location: locationEl?.innerText.trim() ?? "",
      description: descEl.innerText.trim(),
      source: "linkedin",
    };
  }

  // Strategy 2: parse title from document.title, find description via heuristics
  // LinkedIn sets: "Job Title | Company | LinkedIn" or "Job Title at Company | LinkedIn"
  let title = "", company = "";
  const pageTitleParts = document.title.split("|").map((s) => s.trim());
  if (pageTitleParts.length >= 2 && !pageTitleParts[0].toLowerCase().includes("linkedin")) {
    title = pageTitleParts[0];
    // Handle "Title at Company" format
    const atIdx = title.lastIndexOf(" at ");
    if (atIdx !== -1) {
      company = title.slice(atIdx + 4);
      title = title.slice(0, atIdx);
    } else if (pageTitleParts[1] && !pageTitleParts[1].toLowerCase().includes("linkedin")) {
      company = pageTitleParts[1];
    }
  }

  const description = findLargestTextBlock();

  if (!title || !description) {
    console.debug("[JobChrome] LinkedIn scrape failed.");
    console.debug("[JobChrome] h1s:", [...document.querySelectorAll("h1")].map((e) => `${e.className}: ${e.innerText.slice(0, 80)}`));
    console.debug("[JobChrome] h2s:", [...document.querySelectorAll("h2")].map((e) => `${e.className}: ${e.innerText.slice(0, 80)}`));
    return null;
  }

  return { title, company, location: "", description, source: "linkedin" };
}

// Find the element with the most text that isn't the whole page body
function findLargestTextBlock() {
  let best = null;
  let bestLen = 300; // must have at least 300 chars to count as a description

  const candidates = document.querySelectorAll("div, section, article");
  for (const el of candidates) {
    if (el === document.body) continue;
    // Skip elements that are just large containers (too many direct children)
    if (el.children.length > 30) continue;
    const text = el.innerText?.trim() ?? "";
    if (text.length > bestLen && text.length < 15000) {
      bestLen = text.length;
      best = text;
    }
  }
  return best;
}

// ── Indeed scraper ─────────────────────────────────────────────

function scrapeIndeed() {
  const titleEl = first(
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    "h1.jobsearch-JobInfoHeader-title",
    "h1[class*='jobTitle']",
    "h1",
  );

  const companyEl = first(
    '[data-testid="inlineHeader-companyName"] a',
    '[data-testid="inlineHeader-companyName"]',
    "[class*='companyName']",
  );

  const locationEl = first(
    '[data-testid="job-location"]',
    '[data-testid="inlineHeader-companyLocation"]',
    "[class*='companyLocation']",
  );

  const descEl = first(
    "#jobDescriptionText",
    ".jobsearch-jobDescriptionText",
    '[data-testid="jobDescription"]',
    "[class*='jobDescription']",
  );

  if (!titleEl || !descEl) return null;

  return {
    title: titleEl.innerText.trim(),
    company: companyEl?.innerText.trim() ?? "",
    location: locationEl?.innerText.trim() ?? "",
    description: descEl.innerText.trim(),
    source: "indeed",
  };
}

// ── Greenhouse scraper ─────────────────────────────────────────

function scrapeGreenhouse() {
  const titleEl = first(
    "h1.app-title",
    "h1[class*='app-title']",
    "h1",
  );

  const locationEl = first(
    ".location",
    ".offices",
  );

  const descEl = first(
    "#content",
    ".section.page-centered",
    "[class*='job-post__description']",
  );

  // URL path: /company-name/jobs/123 → "company-name"
  let company = window.location.pathname.split("/").filter(Boolean)[0]?.replace(/-/g, " ") ?? "";
  if (!company) {
    const parts = document.title.split(" - ").map((s) => s.trim());
    if (parts.length >= 2) company = parts[0];
  }

  if (!titleEl || !descEl) return null;

  return {
    title: titleEl.innerText.trim(),
    company,
    location: locationEl?.innerText.trim() ?? "",
    description: descEl.innerText.trim(),
    source: "greenhouse",
  };
}

// ── Lever scraper ──────────────────────────────────────────────

function scrapeLever() {
  const titleEl = first(
    ".posting-headline h2",
    ".posting-headline h1",
    "h2",
  );

  const locationEl = first(
    ".sort-by-location",
    ".posting-categories .location",
    "[class*='location']",
  );

  const descEl = first(
    ".posting-description",
    ".section-wrapper",
    "[class*='description']",
  );

  // URL path: /company-name/uuid → "company-name"
  let company = window.location.pathname.split("/").filter(Boolean)[0]?.replace(/-/g, " ") ?? "";
  if (!company) {
    const parts = document.title.split(" - ").map((s) => s.trim());
    if (parts.length >= 2) company = parts[parts.length - 1];
  }

  if (!titleEl || !descEl) return null;

  return {
    title: titleEl.innerText.trim(),
    company,
    location: locationEl?.innerText.trim() ?? "",
    description: descEl.innerText.trim(),
    source: "lever",
  };
}

// ── Workday scraper ────────────────────────────────────────────

function scrapeWorkday() {
  const titleEl = first(
    '[data-automation-id="jobPostingHeader"]',
    "h1.css-1xpnhgm",
    "h1[class*='css-']",
    "h1",
  );

  const locationEl = first(
    '[data-automation-id="locations"]',
    '[data-automation-id="location"]',
    '[data-automation-id="locationDate"]',
    "[class*='locationDate']",
  );

  const descEl = first(
    '[data-automation-id="jobPostingDescription"]',
    "[data-automation-id='richTextEditor']",
    "[class*='RichTextEditor']",
    "[class*='richText']",
    ".css-cygeeu",
  );

  // Company: try page title ("Job Title | Company"), then fall back to subdomain
  let company = "";
  const titleParts = document.title.split("|").map((s) => s.trim());
  if (titleParts.length >= 2) {
    const last = titleParts[titleParts.length - 1];
    company = last.toLowerCase() === "workday" && titleParts.length > 2
      ? titleParts[titleParts.length - 2]
      : last;
  }
  if (!company) {
    // e.g. apple.wd1.myworkdayjobs.com → "apple"
    company = window.location.hostname.split(".")[0].replace(/-/g, " ");
  }

  if (!titleEl || !descEl) return null;

  return {
    title: titleEl.innerText.trim(),
    company,
    location: locationEl?.innerText.trim() ?? "",
    description: descEl.innerText.trim(),
    source: "workday",
  };
}

// ── Registry ───────────────────────────────────────────────────

const SCRAPERS = {
  "www.linkedin.com": scrapeLinkedIn,
  "www.indeed.com": scrapeIndeed,
};

function getScraper(hostname) {
  if (SCRAPERS[hostname]) return SCRAPERS[hostname];
  if (hostname.endsWith(".myworkdayjobs.com")) return scrapeWorkday;
  if (hostname === "boards.greenhouse.io" || hostname === "job-boards.greenhouse.io") return scrapeGreenhouse;
  if (hostname === "jobs.lever.co") return scrapeLever;
  return null;
}

async function scrapeWithRetry(scraper) {
  for (let i = 0; i < 10; i++) {
    const result = scraper();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SCRAPE_JOB") return;

  const scraper = getScraper(window.location.hostname);
  if (!scraper) {
    sendResponse(null);
    return;
  }

  scrapeWithRetry(scraper).then(sendResponse);
  return true;
});
