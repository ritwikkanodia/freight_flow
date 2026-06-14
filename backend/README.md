# TMS Backend (Flask + SQLite)

Minimal API serving load data from a SQLite database.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py          # creates tms.db and loads the mock data
python app.py           # serves on http://127.0.0.1:5001
```

Re-run `python seed.py` any time to rebuild the database from scratch.

## Schema (`schema.sql`)

- **loads** — one row per load. One-to-one detail (pickup/drop-off stops,
  driver) is kept inline as columns.
- **tasks** — one-to-many; ordered checklist items per load.
- **postings** — one-to-many; load-board postings (Trucker Path, DAT, ...).

## Endpoints

| Method | Path                | Description                              |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/api/health`       | Health check                             |
| GET    | `/api/loads`        | Load list (summary fields for the table) |
| GET    | `/api/loads/<id>`   | Single load with tasks + postings        |

Responses use camelCase to match the frontend's `Load` TypeScript interface.

## Frontend connection

The Next.js app reads `API_BASE_URL` (default `http://127.0.0.1:5001`). To
point it elsewhere, set it in the frontend's environment, e.g. `.env.local`:

```
API_BASE_URL=http://127.0.0.1:5001
```
