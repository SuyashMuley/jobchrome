// Scraper registry — add new job boards here
const SCRAPERS = {
  "www.linkedin.com": () => import(chrome.runtime.getURL("content_scripts/scrapers/linkedin.js")),
  "www.indeed.com":   () => import(chrome.runtime.getURL("content_scripts/scrapers/indeed.js")),
};

(async () => {
  const host = window.location.hostname;
  const loader = SCRAPERS[host];
  if (!loader) return null;

  try {
    const { scrape } = await loader();

    // Retry up to 5× with 500ms gaps for dynamic content
    for (let i = 0; i < 5; i++) {
      const result = scrape();
      if (result) return result;
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (e) {
    console.error("[JobChrome] scrape error:", e);
  }

  return null;
})();
