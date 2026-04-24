# JobChrome

A Chrome extension + FastAPI backend that analyzes job postings against your resume in real time.

Open any LinkedIn or Indeed job posting, click the extension icon, and get:

- **ATS score** with a keyword / skills / experience / preference breakdown
- **Apply or Skip** recommendation with reasoning
- **Cold email** subject + body (only shown when you should apply)
- **LinkedIn recruiter search** query to find the right person to reach out to

Supports **Claude** (Anthropic) and **Grok** (xAI) as LLM providers, switchable per analysis.

---

## Project Structure

```
JobChrome/
├── backend/          # FastAPI — analysis API + PDF parser
└── extension/        # Chrome MV3 — side panel UI
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11 or higher (3.14 works) |
| Google Chrome | 114+ (Side Panel API required) |
| Anthropic API key | From console.anthropic.com |
| xAI API key | From console.x.ai (optional if using Claude only) |

---

## 1. Backend Setup

### 1a. Install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 1b. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
DEFAULT_PROVIDER=claude
ALLOWED_ORIGINS=*
```

`XAI_API_KEY` is only required if you plan to use Grok. `ALLOWED_ORIGINS=*` is fine for local development — lock it down to your extension's origin when deploying.

### 1c. Run the backend

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

Verify it's running:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## 2. Chrome Extension Setup

### 2a. Load the extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project

You should see the JobChrome icon appear in your Chrome toolbar.

### 2b. Pin the extension (recommended)

Click the puzzle piece icon in the Chrome toolbar → click the pin next to JobChrome so it's always visible.

---

## 3. First-Time Configuration

Click the JobChrome icon to open the side panel, then:

### Step 1 — Add your resume (Analyze tab)

Either drag and drop a PDF onto the upload zone, or paste plain text directly into the text area. The resume is saved in your browser's local storage and persists between sessions.

### Step 2 — Set your preferences (Preferences tab)

Configure the kinds of jobs you're looking for:

- **Target domains** — e.g. Software Engineering, ML / AI
- **Tech stack** — languages and frameworks you work with
- **Target roles** — specific job titles you're targeting
- **Experience level** — Entry / Mid / Senior / Lead
- **Work mode** — Remote / Hybrid / Onsite / Any
- **Job type** — Full-time, Contract, Internship, etc.
- **Excluded keywords** — any keyword that auto-skips a job (e.g. "unpaid", "commission-only")

Click **Save Preferences**.

### Step 3 — Configure settings (Settings tab)

| Setting | Description |
|---|---|
| Backend URL | Change if you've deployed the backend remotely (default: `http://localhost:8000`) |
| Anthropic API Key | Optional — overrides the server's env var for your session |
| xAI API Key | Optional — same as above for Grok |
| Default LLM | Which provider to use by default |
| Apply Threshold | Minimum ATS score to show an "Apply" recommendation (default: 60) |
| Auto-open on job pages | Automatically opens the panel when you navigate to a job posting |

Click **Save Settings**.

---

## 4. Analyzing a Job

1. Navigate to a job posting on **LinkedIn** (`linkedin.com/jobs/...`) or **Indeed** (`indeed.com/viewjob...`)
2. Click the JobChrome icon — the side panel opens on the right
3. Select your LLM provider (Claude or Grok)
4. Click **Analyze This Job**

The extension scrapes the job posting, sends it with your resume and preferences to the backend, and displays the results in a few seconds.

### Reading the results

**ATS Score ring** — overall match score (0–100). Color-coded: green ≥70, yellow ≥50, red <50.

**Breakdown bars:**
- Keywords — exact and synonymous term overlap
- Skills — required vs. your skills
- Experience — years / level match
- Pref. Match — how well the role fits your stated preferences

**Apply / Skip badge** — the LLM's recommendation, also filtered against your Apply Threshold from Settings.

**Cold Email** — only shown on "Apply" recommendations. Expand the section to copy a ready-to-send subject and body.

**LinkedIn Recruiter Search** — copy the query or click "Open in LinkedIn" to find recruiters at the company.

---

## 5. Supported Job Boards

| Board | Status |
|---|---|
| LinkedIn (`linkedin.com/jobs/*`) | Supported |
| Indeed (`indeed.com/viewjob*`, `indeed.com/jobs*`) | Supported |

To add a new board, see [Adding a New Job Board](#adding-a-new-job-board) below.

---

## 6. API Reference

### `GET /health`
Returns `{"status": "ok"}`. Use to confirm the backend is running.

### `POST /analyze`
Analyzes a job posting against a resume.

**Request body:**
```json
{
  "resume_text": "...",
  "job": {
    "title": "Senior Backend Engineer",
    "company": "Acme Corp",
    "location": "San Francisco, CA",
    "description": "...",
    "source": "linkedin"
  },
  "preferences": {
    "domains": ["Software Engineering"],
    "tech_stack": ["Python", "FastAPI"],
    "target_roles": ["Backend Engineer"],
    "experience_level": "senior",
    "job_types": ["full-time"],
    "work_mode": "remote",
    "excluded_keywords": []
  },
  "provider": "claude"
}
```

**Optional headers:**
- `X-Anthropic-Key` — override the server's Anthropic API key
- `X-XAI-Key` — override the server's xAI API key

**Response:**
```json
{
  "ats_score": 82,
  "ats_breakdown": {
    "keyword_match": 85,
    "skills_match": 80,
    "experience_match": 83,
    "preference_alignment": 90
  },
  "recommendation": "apply",
  "reasoning": "Strong Python and FastAPI alignment...",
  "cold_email": {
    "recommended": true,
    "subject": "Experienced Python Engineer — Senior Backend role",
    "body": "Hi [Name], ..."
  },
  "recruiter_search_template": "recruiter OR \"talent acquisition\" \"Acme Corp\" \"San Francisco\"",
  "provider_used": "claude"
}
```

### `POST /resume/parse`
Extracts text from a PDF resume.

**Request:** `multipart/form-data` with a `file` field (PDF, max 5 MB).

**Response:**
```json
{
  "text": "...",
  "page_count": 2
}
```

---

## 7. Docker (optional)

To run the backend in a container:

```bash
cd backend
docker build -t jobchrome-api .
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e XAI_API_KEY=xai-... \
  jobchrome-api
```

---

## 8. Adding a New Job Board

**1. Create a scraper** in `extension/content_scripts/scrapers/`:

```js
// extension/content_scripts/scrapers/glassdoor.js
export function scrape() {
  const title       = document.querySelector('...')?.innerText?.trim();
  const company     = document.querySelector('...')?.innerText?.trim();
  const location    = document.querySelector('...')?.innerText?.trim();
  const description = document.querySelector('...')?.innerText?.trim();

  if (!title || !description) return null;
  return { title, company: company || "", location: location || "", description, source: "glassdoor" };
}
```

**2. Register it** in `extension/content_scripts/index.js`:

```js
const SCRAPERS = {
  "www.linkedin.com": () => import(chrome.runtime.getURL("content_scripts/scrapers/linkedin.js")),
  "www.indeed.com":   () => import(chrome.runtime.getURL("content_scripts/scrapers/indeed.js")),
  "www.glassdoor.com": () => import(chrome.runtime.getURL("content_scripts/scrapers/glassdoor.js")), // add this
};
```

**3. Add the host permission** in `extension/manifest.json`:

```json
"host_permissions": [
  "https://www.linkedin.com/*",
  "https://www.indeed.com/*",
  "https://www.glassdoor.com/*"
]
```

No backend changes needed.

---

## 9. Adding a New LLM Provider

**1. Create a provider** in `backend/services/llm/`:

```python
# backend/services/llm/gemini.py
from services.llm.base import LLMProvider, build_system_prompt, build_user_prompt, ANALYSIS_TOOL_SCHEMA

class GeminiProvider(LLMProvider):
    def __init__(self, api_key=None):
        ...

    async def analyze(self, resume_text, job, preferences):
        ...
```

**2. Register it** in `backend/services/llm/__init__.py`:

```python
from services.llm.gemini import GeminiProvider

PROVIDERS = {
    "claude": ClaudeProvider,
    "grok":   GrokProvider,
    "gemini": GeminiProvider,  # add this
}
```

**3. Add the option** to `extension/sidepanel/sidepanel.html` (both the Analyze tab dropdown and the Settings tab dropdown):

```html
<option value="gemini">Gemini (Google)</option>
```

---

## Troubleshooting

**"No job posting detected on this page"**
The page's DOM may not have finished loading, or the job board's selectors have changed. Try scrolling to the job description before clicking Analyze.

**"Could not reach backend"**
Make sure the backend is running (`uvicorn main:app --reload`) and the Backend URL in Settings matches (default: `http://localhost:8000`).

**PDF shows "no extractable text"**
The PDF is likely image-based (scanned). Paste the resume text manually instead.

**Extension not loading**
Ensure Developer mode is on in `chrome://extensions` and you selected the `extension/` folder (the one containing `manifest.json`), not the project root.
