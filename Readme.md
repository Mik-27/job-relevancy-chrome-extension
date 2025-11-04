# Job Relevancy — Chrome Extension

Resume Analyzer is a small Chrome extension + backend API that helps analyze a candidate's resume against a job posting using LLMs. The extension provides a popup UI where users can paste, upload, or choose a previously uploaded resume, then send the resume to the backend which runs a LangChain-driven analysis (Google Generative AI integration in this project).

This repository contains two main subprojects:

-   `app/extension-frontend` — The Chrome extension (React + Vite) that provides the popup UI, background script and a content script.
-   `app/server-backend` — A FastAPI backend that performs LLM analysis and storage operations (GCS, Supabase, etc.). Uses `uv` for environment & package management in this repo.

---

## Quick Architecture

-   Frontend (Chrome extension popup) calls the background script which sends requests to the backend API.
-   Backend exposes endpoints (FastAPI) such as `/api/analyze` that accept resume text and a job description and return a relevancy score + suggestions.

---

## Frontend Setup (extension-frontend)

Prerequisites

-   Node.js (LTS recommended) and npm available on your PATH.

Install dependencies

Open PowerShell and run:

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\extension-frontend
npm install
```

Development (optional)

-   Run the Vite dev server while developing UI (note: extension-specific dev workflows vary; you can work on UI in the browser or build and load the unpacked output):

```powershell
npm run dev
```

Build for production (what the extension will load)

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\extension-frontend
npm run build
```

-   The build output is placed in `app/extension-frontend/dist/`. This folder contains `manifest.json`, icons and compiled JS/CSS assets.

Load the extension into Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable Developer Mode (toggle at top-right).
3. Click "Load unpacked" and select the `app/extension-frontend/dist` directory.

Notes

-   Ensure the `manifest.json` in `dist` references compiled JS files (e.g. `background.js`, `content.js`, `popup.html` or `index.html` as appropriate). The Vite build in this project places compiled files under `dist`.
-   If you change background or content script entrypoints, update the Vite config to emit separate entry chunks and update `manifest.json` accordingly.

---

## Backend Setup (server-backend)

Prerequisites

-   Python 3.13+ (the project `pyproject.toml` requests >=3.13). Use your system Python or a compatible runtime.
-   `uv` package manager (recommended in this repo) — install with `pip` or `pipx` if not available.

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

-   `GOOGLE_APPLICATION_CREDENTIALS` must point to your service-account JSON file. You can use an absolute path or a repo-relative path like `./gcp-credentials.json` (and keep that file out of version control).
-   Alternatively, create credentials programmatically using `google.oauth2.service_account.Credentials` if you need to avoid env var usage.

Run the backend (using uv so it uses the uv-managed venv)

```powershell
cd C:\Mihir\Projects\jobs-chrome-extension\app\server-backend
# run uvicorn within the uv environment
uv run uvicorn main:app --reload
```

Troubleshooting

-   If you see: `pydantic.errors.PydanticImportError: BaseSettings has been moved`, install `pydantic-settings`:

```powershell
uv add pydantic-settings
```

-   If Google Cloud raises `DefaultCredentialsError`, ensure `GOOGLE_APPLICATION_CREDENTIALS` is set and points to a valid JSON credentials file.
-   If Supabase connectivity fails with `Network is unreachable`, try the connection pooling host/port or test connectivity from another network. Some networks block outgoing Postgres port 5432 or IPv6 may be problematic.

---

## Development tips

-   Always run backend commands with `uv run ...` so the correct virtual environment is used.
-   Use `uv add <pkg>` to add new dependencies and `uv sync` to sync across machines using the `uv.lock` file.
-   Keep secrets out of Git: add credential filenames and `.env` to `.gitignore` (the repo already ignores `.env` and `gcp-credentials.json`).

## File structure (high level)

-   `app/extension-frontend/` — React + Vite extension code and `dist` build output
-   `app/server-backend/` — FastAPI app, `app/` package contains routers, services and config

---

If you'd like, I can also:

-   Add a short `.env.example` with the required env var names (no secrets) to make onboarding easier.
-   Add a short dev script for loading the extension automatically during UI dev.

---

License: add a license file if you intend to publish/redistribute.
