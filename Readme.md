# Caatlyst: Application Assistant

## Project Summary

Catalyst is a job-search assistant built around a Chrome extension, a FastAPI backend, and a web dashboard. It helps users analyze resumes against job descriptions, generate AI-powered cold emails, prepare for live interviews, and manage applications from a single workflow.

The product is designed to reduce repetitive job-search work. Users can analyze fit for a role, tailor a resume, generate supporting documents, fill applications faster, and review activity from the dashboard without bouncing between separate tools.

## Repository Structure

This repository is organized into three main app areas under `app/`:

- `app/extension-frontend` - The Chrome extension UI. It handles the popup experience, background script, and content script used for analysis, autofill, and Gmail drafting.
- `app/server-backend` - The FastAPI backend. It performs resume analysis, interview/session orchestration, document generation, storage access, and AI integrations.
- `app/web-dashboard` - The authenticated dashboard used to manage resumes, applications, outreach history, interview sessions, and profile data.

Outside of `app/`, the repo also contains supporting scripts and project-level docs such as `git-backdate.sh`, `run_server.ps1`, and this README.

## Main Features

### Resume Analysis

The core experience starts with resume analysis against a job posting. Users can paste or upload a resume, provide a job description, and receive an AI-generated relevancy assessment with actionable suggestions. This is the fastest way to understand whether a resume aligns with a role before spending time applying.

### Live Interview

The application includes a live interview flow that helps users practice job interviews in a guided, interactive session. The backend coordinates the interview session and the dashboard keeps the session history organized so the user can resume or review progress later.

### Cold Email Generation Directly in Gmail

The extension can generate cold outreach emails and place them directly into Gmail workflows. The system uses the backend and Google Cloud / Gmail-related integrations to draft messages, so the user can move from lead or job discovery to outreach with less manual copying and editing.

### Application Autofill

The extension helps users autofill application fields using stored profile and resume information. This reduces repetitive form entry across job boards and makes it easier to apply to multiple roles quickly while keeping the data consistent.

## Additional Features

- Cover letter generation for roles that need a more tailored application packet.
- Resume tailoring so a base resume can be adapted to the target job before submitting.
- Application tracking in the web dashboard, including statuses, board/list views, and linked resume selection.
- Outreach history tracking so generated emails and outreach runs can be reviewed later.
- Profile management for CVs, personal info, and Gmail integration.

## Tech Stack

### Extension Frontend

- React + Vite for the Chrome extension UI.
- TypeScript for typed extension and UI logic.
- Chrome extension APIs for popup, background, and content-script behavior.
- Tailwind-style utility classes and local UI state for lightweight interactions.

### Web Dashboard

- Next.js for the authenticated dashboard pages.
- React + TypeScript for page rendering and state management.
- Tailwind CSS for layout, cards, forms, and skeleton loading states.
- React Icons for consistent iconography across dashboard pages.

### Backend

- FastAPI for the API layer.
- Python for orchestration, business logic, and integrations.
- LangChain-driven LLM workflows for analysis and generation tasks.
- Supabase and Google Cloud services for persistence and cloud-backed integrations.

### How GCP Is Used for Cold Email Generation

Google Cloud is part of the cold-email workflow infrastructure. The backend uses GCP credentials and project configuration to access Google-backed services during email generation and related AI operations. In practice, this supports secure service-account-based access and the runtime configuration needed for drafting outreach content that can be delivered into Gmail-centric workflows.

---

## Frontend Setup (extension-frontend)

Prerequisites

- Node.js (LTS recommended) and npm available on your PATH.

Install dependencies

Open PowerShell and run:

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\extension-frontend
npm install
```

Development (optional)

- Run the Vite dev server while developing UI (note: extension-specific dev workflows vary; you can work on UI in the browser or build and load the unpacked output):

```powershell
npm run dev
```

Build for production (what the extension will load)

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\extension-frontend
npm run build
```

- The build output is placed in `app/extension-frontend/dist/`. This folder contains `manifest.json`, icons and compiled JS/CSS assets.

Load the extension into Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable Developer Mode (toggle at top-right).
3. Click "Load unpacked" and select the `app/extension-frontend/dist` directory.

Notes

- Ensure the `manifest.json` in `dist` references compiled JS files (e.g. `background.js`, `content.js`, `popup.html` or `index.html` as appropriate). The Vite build in this project places compiled files under `dist`.
- If you change background or content script entrypoints, update the Vite config to emit separate entry chunks and update `manifest.json` accordingly.

---

## Backend Setup (server-backend)

Prerequisites

- Python 3.13+ (the project `pyproject.toml` requests >=3.13). Use your system Python or a compatible runtime.
- `uv` package manager (recommended in this repo) — install with `pip` or `pipx` if not available.

Install `uv` (once globally)

```powershell
# using pip
pip install uv

# or recommended: install via pipx
pipx install uv
```

Create / sync the environment and install dependencies

This repository includes an `uv.lock` (precise versions). From the backend folder run:

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\server-backend
# create virtual environment and install exact deps from uv.lock
uv sync
```

If you prefer to manage the venv manually (alternative):

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\server-backend
python -m venv .venv
.\.venv\Scripts\Activate
# then install packages (if you keep requirements or specify pip install commands)
uv pip install -r requirements.txt  # only if you created a requirements file
```

Environment variables (.env)

Create or update `app/server-backend/.env` with values required by the backend. Typical vars used in this repo include (example names — verify the code or `app/config.py` for exact keys):

```dotenv
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=./gcp-credentials.json
BUCKET_NAME=your-gcs-bucket-name
SUPABASE_DB_URL=postgresql://<user>:<pass>@...:5432/<db>
SUPABASE_KEY=your_supabase_key_here
# any other keys your app expects (check app/config.py)
```

Important notes for Google Cloud credentials

- `GOOGLE_APPLICATION_CREDENTIALS` must point to your service-account JSON file. You can use an absolute path or a repo-relative path like `./gcp-credentials.json` (and keep that file out of version control).
- Alternatively, create credentials programmatically using `google.oauth2.service_account.Credentials` if you need to avoid env var usage.

Run the backend (using uv so it uses the uv-managed venv)

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\server-backend
# run uvicorn within the uv environment
uv run uvicorn main:app --reload
```

Troubleshooting

- If you see: `pydantic.errors.PydanticImportError: BaseSettings has been moved`, install `pydantic-settings`:

```powershell
uv add pydantic-settings
```

- If Google Cloud raises `DefaultCredentialsError`, ensure `GOOGLE_APPLICATION_CREDENTIALS` is set and points to a valid JSON credentials file.
- If Supabase connectivity fails with `Network is unreachable`, try the connection pooling host/port or test connectivity from another network. Some networks block outgoing Postgres port 5432 or IPv6 may be problematic.

---

## Development tips

- Always run backend commands with `uv run ...` so the correct virtual environment is used.
- Use `uv add <pkg>` to add new dependencies and `uv sync` to sync across machines using the `uv.lock` file.
- Keep secrets out of Git: add credential filenames and `.env` to `.gitignore` (the repo already ignores `.env` and `gcp-credentials.json`).

## File structure (high level)

- `app/extension-frontend/` — React + Vite extension code and `dist` build output
- `app/server-backend/` — FastAPI app, `app/` package contains routers, services and config

---

If you'd like, I can also:

- Add a short `.env.example` with the required env var names (no secrets) to make onboarding easier.
- Add a short dev script for loading the extension automatically during UI dev.

---

License: add a license file if you intend to publish/redistribute.
