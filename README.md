# Temple & Pilgrimage Crowd Management (SIH25165)

A full-stack simulation-based platform to manage temple crowd flow, darshan slot booking with QR passes, live heatmaps, admin simulations, emergency alerts, and analytics for Somnath, Dwarka, Ambaji, and Pavagadh.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS, React Router, React-Leaflet, Chart.js
- API: Vercel Serverless Functions under `frontend/api/*` (Node 18+, ESM)
- Persistence: GitHub-backed JSON via GitHub Contents API (no MongoDB)
- Auth: JWT (planned)

## Monorepo Structure
- `frontend/` React app, serverless API under `frontend/api/*`, shared libs
- `vercel.json` routes API and static output (Vite `dist/`)

## Prerequisites
- Node.js 18+
- GitHub repository to store JSON data (can be same repo)

## Environment Variables (Vercel)
Set these in your Vercel Project Settings → Environment Variables:

```
# GitHub JSON storage (Contents API)
GITHUB_OWNER=your-github-username-or-org
GITHUB_REPO=your-repo-for-data (can be this repo name)
GITHUB_TOKEN=ghp_xxx_with_repo_contents_scope
GITHUB_BRANCH=main            # optional, default: main
GITHUB_DATA_DIR=data          # optional, default: data

# Optional future auth
JWT_SECRET=change_this_in_prod
```

Local `.env` for the frontend is optional now; the API client uses same-origin (`''`).

## Local Setup
1) Run the frontend (serverless uses remote GitHub API, no DB needed)
```
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173
- API example: http://localhost:5173/api/temples/kashi-vishwanath/realtime

## AI Tutor
- A floating AI Tutor widget is available on all pages.
- Serverless endpoints for assistant are planned; current UI may be stubbed.

## Sample Logins
- Admin: `admin@temple.com` / `admin123`
- Pilgrims: 
  - `rajesh@example.com` / `pilgrim123`
  - `priya@example.com` / `pilgrim123`
  - `amit@example.com` / `pilgrim123`

## Key Serverless Endpoints (current)
- Realtime temple info: `GET /api/temples/[id]/realtime`

Data source: `frontend/data/temples.json` (seed file) and external website/RSS scraping.

## Features Overview
- User (Pilgrim)
  - Register/Login, book slots, get QR pass, view live heatmap and route planner
- Admin
  - Slot management APIs, crowd simulation updates, emergency alerts, analytics
- Visualization
  - Leaflet map with areas/facilities, occupancy progress, charts

## Deployment (Vercel)
1) Push repo to GitHub (e.g., `cdinesh22/tcmse`).
2) On Vercel, Import Project from GitHub.
3) Project Settings → General:
   - Framework Preset: Vite
4) Project Settings → Environment Variables: add `GITHUB_*` and `JWT_SECRET` as above.
5) `vercel.json` is included and routes:
   - `/api/*` → `frontend/api/*` (Node serverless)
   - `/assets/*` → `frontend/dist/assets/*`
   - `/*` → `frontend/dist/index.html`
6) Deploy. Test: `https://<your-app>.vercel.app/api/temples/kashi-vishwanath/realtime`

## Roadmap
- Auth endpoints as serverless
- Bookings/slots as JSON-backed endpoints
- Admin tools to edit `temples.json` via API
- Optional email/SMS notifications
