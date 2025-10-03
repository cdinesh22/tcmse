# Temple & Pilgrimage Crowd Management (SIH25165)

A full-stack simulation-based platform to manage temple crowd flow, darshan slot booking with QR passes, live heatmaps, admin simulations, emergency alerts, and analytics for Somnath, Dwarka, Ambaji, and Pavagadh.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS, React Router, React-Leaflet, Chart.js
- Backend: Node.js + Express.js
- Database: MongoDB (Mongoose)
- Auth: JWT-based authentication

## Monorepo Structure
- `backend/` Express API, MongoDB models, seed scripts
- `frontend/` React app with Tailwind, routing, dashboards

## Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB URI

## Environment Variables
Create `backend/.env` from `.env.example` and adjust as required:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/temple_crowd_management
JWT_SECRET=change_this_in_prod
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173

# Optional email config
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Seed admin
ADMIN_EMAIL=admin@temple.com
ADMIN_PASSWORD=admin123
NODE_ENV=development

# AI Assistant (Gemini)
# Create an API key at https://aistudio.google.com/app/apikey and set it here
GEMINI_API_KEY=your_gemini_api_key_here
```

Create `frontend/.env` from `.env.example` if needed:
```
VITE_BACKEND_URL=http://localhost:5000
VITE_APP_NAME=Temple & Pilgrimage Crowd Management
```

## Local Setup
1) Install backend deps and seed database
```
cd backend
npm install
npm run seed
npm run dev
```

2) In a new terminal, run the frontend
```
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

## AI Tutor
- A floating AI Tutor widget is available on all pages.
- It helps with booking flow, slot issues, timings, heatmaps, and general site usage.
- Backend route: `POST /api/assistant` and `GET /api/assistant/stream` (SSE streaming).
- Frontend component: `frontend/src/components/AITutor.jsx` mounted in `frontend/src/App.jsx`.
- Requirements:
  - Set `GEMINI_API_KEY` in `backend/.env`
  - Ensure `VITE_BACKEND_URL` in `frontend/.env` points to your backend (default `http://localhost:5000`).
  - Restart both backend and frontend after setting env variables.

## Sample Logins
- Admin: `admin@temple.com` / `admin123`
- Pilgrims: 
  - `rajesh@example.com` / `pilgrim123`
  - `priya@example.com` / `pilgrim123`
  - `amit@example.com` / `pilgrim123`

## Key API Endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Temples: `/api/temples`, `/api/temples/:id/status`
- Slots: `/api/slots`, `/api/slots/bulk`
- Bookings: `/api/bookings`, `/api/bookings/:id`
- Simulation: `/api/simulation/:templeId`, `/api/simulation/:templeId/update`, `/api/simulation/:templeId/alert`
- Analytics/Admin: `/api/admin/dashboard`, `/api/analytics/overview`

## Features Overview
- User (Pilgrim)
  - Register/Login, book slots, get QR pass, view live heatmap and route planner
- Admin
  - Slot management APIs, crowd simulation updates, emergency alerts, analytics
- Visualization
  - Leaflet map with areas/facilities, occupancy progress, charts

## Deployment Notes
- Frontend (Vercel): point to `frontend/`
- Backend (Render/Heroku): point to `backend/`
- Set `FRONTEND_URL` on backend to your deployed frontend URL
- Set `VITE_BACKEND_URL` on frontend to your backend URL

## Roadmap
- Email/SMS notifications via a provider (optional in this demo)
- Enhanced admin slot management UI (create/edit/delete)
- Realtime updates via websockets (Socket.IO)
