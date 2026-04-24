export function scrape() {
  const title = document.querySelector(
    ".job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title"
  )?.innerText?.trim();

  const company = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name"
  )?.innerText?.trim();

  const location = document.querySelector(
    ".job-details-jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__primary-description-without-tagline span"
  )?.innerText?.trim();

  const description = document.querySelector("#job-details")?.innerText?.trim();

  if (!title || !description) return null;

  return { title: title || "", company: company || "", location: location || "", description, source: "linkedin" };
}
