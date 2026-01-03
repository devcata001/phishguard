# PhishGuard — Phishing Email Detection (Local Web App)

A beginner-friendly phishing email detector with:

- **Frontend:** HTML/CSS/vanilla JS (dark cybersecurity UI)
- **Backend:** Python Flask API (`POST /analyze`)
- **Detection:** keyword scanning + suspicious link detection (no external APIs)

## Project structure

```
frontend/
	index.html
	styles.css
	app.js

backend/
	app.py
	requirements.txt
	analyzers/
	tests/
```

> Note: The repository also contains some older placeholder files (`app.py`, `templates/`, `static/`) at the root. The new implementation lives in `frontend/` and `backend/`.

## Run locally

### 1) Start the backend (Flask API)

Create a virtual environment (recommended), then install dependencies:

```bash
cd /home/catalyst/phishguard
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Run the API:

```bash
python backend/app.py
```

You should have:

- Health check: `GET http://127.0.0.1:5000/health`
- Analyzer: `POST http://127.0.0.1:5000/analyze`

### 2) Open the frontend

Open `frontend/index.html` in your browser.

If your browser blocks `file://` fetch requests, use a tiny local static server (optional):

```bash
cd /home/catalyst/phishguard/frontend
python3 -m http.server 5173
```

Then open:

- `http://127.0.0.1:5173`

## API usage

### `POST /analyze`

Request body:

```json
{ "text": "Subject: Urgent...\n\nBody..." }
```

Response:

```json
{
  "risk_level": "SAFE",
  "score": 12,
  "reasons": ["..."]
}
```

## Extend the detector

- Add/modify keyword rules in `backend/analyzers/keyword_scanner.py`
- Add new URL heuristics in `backend/analyzers/url_detector.py`
- Adjust score thresholds in `backend/analyzers/engine.py`

## Run tests

```bash
cd /home/catalyst/phishguard
pytest -q
```
