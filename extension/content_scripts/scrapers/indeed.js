export function scrape() {
  const title = document.querySelector(
    '[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title'
  )?.innerText?.trim();

  const company = document.querySelector(
    '[data-testid="inlineHeader-companyName"] a, [data-testid="inlineHeader-companyName"]'
  )?.innerText?.trim();

  const location = document.querySelector(
    '[data-testid="job-location"], [data-testid="inlineHeader-companyLocation"]'
  )?.innerText?.trim();

  const description = document.querySelector("#jobDescriptionText")?.innerText?.trim();

  if (!title || !description) return null;

  return { title: title || "", company: company || "", location: location || "", description, source: "indeed" };
}
