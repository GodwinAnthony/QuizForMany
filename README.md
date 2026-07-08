# QuizPulse — Real-Time Live Quiz Platform

A production-ready, real-time live quiz platform inspired by Mentimeter and Kahoot. Built with React, Node.js, Express, and Socket.IO. Supports **300+ concurrent participants** with low-latency real-time communication.

## Features

- 🎯 Host, edit, delete, and reorder quizzes
- 🚀 Real-time gameplay with Socket.IO (300+ concurrent players)
- 📱 Join via 6-digit PIN or QR code
- 📊 Live answer distribution bar chart (Chart.js)
- 🏆 Animated leaderboard shown on host screen only
- 🔌 Automatic reconnection — players continue with saved score
- 🧑‍🤝‍🧑 Waiting room with live participant list
- 📡 Connection monitoring (active / offline counts + names)
- ⏱️ Per-question timer, automatic flow (no host clicks between questions)
- ⚡ Speed-based scoring: 100 pts fastest correct → gradually down to 50 pts
- 🎉 Confetti final results with podium
- 📥 Import quizzes from JSON, CSV, or Excel (.xlsx)
- 🎛️ Host controls: Start, Pause, Resume, Restart Question, End
- 🎨 Dark theme, purple/blue gradients, glassmorphism

## Tech Stack

| Layer     | Technology                     |
| --------- | ------------------------------ |
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | Node.js + Express              |
| Realtime  | Socket.IO                      |
| Charts    | Chart.js (react-chartjs-2)     |
| Animation | Framer Motion                  |
| QR Codes  | qrcode                         |
| Storage   | JSON files (no database)       |

## Project Structure

```
quizpulse/
├── .editorconfig
├── .gitignore
├── .vscode/
├── LICENSE
├── README.md
├── package.json                 # Root scripts (dev / build / render-build)
├── render.yaml                  # Render Blueprint (one-click deploy)
│
├── backend/                     # ── Server ────────────────────────────
│   ├── .env.example
│   ├── package.json
│   ├── quizzes/                 # Bundled sample quizzes
│   └── src/
│       ├── server.js            # Express + Socket.IO entrypoint
│       ├── config/
│       │   ├── constants.js
│       │   ├── cors.js          # CORS allow-list (env-driven)
│       │   └── events.js
│       ├── routes/quizzes.js
│       ├── sockets/…
│       └── utils/…
│
└── frontend/                    # ── Client ────────────────────────────
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js           # /api and /socket.io dev proxy
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── config/
        │   ├── env.js           # API_BASE_URL / SOCKET_URL resolution
        │   └── animation.js
        ├── services/
        │   ├── api.js
        │   └── socketEvents.js
        ├── hooks/…
        ├── contexts/SocketContext.jsx
        ├── components/…
        ├── pages/…
        └── styles/index.css
```

## Local development

```bash
npm run install:all   # install both workspaces
npm run dev           # run frontend (:5173) and backend (:4000) in parallel
```

Open http://localhost:5173. The Vite dev server proxies `/api` and
`/socket.io` to the backend, so the frontend uses purely relative URLs —
identical to production.

Env vars are optional in dev:

- `frontend/.env` → `VITE_DEV_PROXY_TARGET=http://localhost:4000` (default)
- `backend/.env`  → `PORT=4000`, `CORS_ORIGIN=`

## Deploying to Render (recommended: single service)

The simplest path is one Render **Web Service** that hosts backend + built
frontend on the same origin. Zero CORS setup, one URL to share.

### Option A — one click via Blueprint

The repository ships with `render.yaml`. In Render, click
**New → Blueprint** and point at your GitHub repo. That's it.

### Option B — manual Web Service

1. **New → Web Service** → connect the repo.
2. **Environment:** Node.
3. **Build command:**
   ```
   npm run render-build
   ```
   (installs both workspaces + builds `frontend/dist`)
4. **Start command:**
   ```
   npm run render-start
   ```
5. **Health check path:** `/api/health`
6. **Environment variables** — all optional:
   - Leave `PORT` **unset** — Render injects it, the app reads
     `process.env.PORT`.
   - Leave `CORS_ORIGIN` empty. Any `*.onrender.com` host is
     auto-allowed. Set it explicitly (`https://your-domain.com,…`) only
     when you attach a custom domain.
   - Leave `VITE_API_URL` empty. The frontend falls back to
     `window.location.origin`.

The backend serves `frontend/dist` and routes `/api/*` and
`/socket.io/*` to itself. Client-side routes (`/host`, `/play?pin=…`)
survive full reloads via an SPA catch-all.

## Deploying as two services (advanced)

If you prefer a separate **Static Site** for the frontend and **Web
Service** for the backend:

- **Backend Web Service**
  - Root: `backend`
  - Build: `npm install`
  - Start: `npm start`
  - Env: `CORS_ORIGIN=https://<your-static-site>.onrender.com`
- **Frontend Static Site**
  - Root: `frontend`
  - Build: `npm install && npm run build`
  - Publish dir: `dist`
  - Env: `VITE_API_URL=https://<your-backend>.onrender.com`
  - Add a redirect/rewrite rule: `/*  →  /index.html  (200)` (SPA).

Everything else works the same — the frontend hits `${VITE_API_URL}/api/*`
and connects Socket.IO to the same base URL.

## Environment variable reference

| Variable                 | Where     | Purpose                                                                 |
| ------------------------ | --------- | ----------------------------------------------------------------------- |
| `PORT`                   | backend   | HTTP port. Set by Render; defaults to 4000 locally.                     |
| `HOST`                   | backend   | Bind address. Defaults to `0.0.0.0`.                                    |
| `CORS_ORIGIN`            | backend   | Comma-separated allow-list, `*`, or empty (auto-allow onrender.com).    |
| `VITE_API_URL`           | frontend  | Backend base URL. Empty = same-origin via `window.location.origin`.     |
| `VITE_SERVER_URL`        | frontend  | Legacy alias for `VITE_API_URL`.                                        |
| `VITE_DEV_PROXY_TARGET`  | frontend  | Where `npm run dev` proxies `/api` and `/socket.io`. Local only.        |

## Import Format

**JSON:**

```json
{
  "title": "General Knowledge",
  "questions": [
    {
      "question": "Capital of France?",
      "options": ["Paris", "London", "Berlin", "Madrid"],
      "correctIndex": 0,
      "timer": 20,
      "basePoints": 100
    }
  ]
}
```

**CSV headers:** `question,option1,option2,option3,option4,correctIndex,timer,basePoints`

**Excel:** same columns in the first sheet.

## Tuning the Leaderboard / Pacing

| Setting                      | File                               |
| ---------------------------- | ---------------------------------- |
| Reveal duration              | `backend/src/config/constants.js`  |
| Leaderboard duration         | `backend/src/config/constants.js`  |
| Early-finish grace           | `backend/src/config/constants.js`  |
| Leaderboard spring animation | `frontend/src/config/animation.js` |
| Chart animation duration     | `frontend/src/config/animation.js` |
| Score count-up duration      | `frontend/src/config/animation.js` |

## License

MIT — original code, original UI. Not affiliated with Mentimeter or Kahoot.
