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
├── .vscode/                     # Recommended VS Code extensions & settings
├── LICENSE
├── README.md
├── package.json                 # Root scripts (dev / build / start)
│
├── backend/                     # ── Server ────────────────────────────
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── quizzes/                 # Bundled sample quizzes (JSON + CSV)
│   └── src/
│       ├── server.js            # Express + Socket.IO entrypoint
│       ├── config/
│       │   ├── constants.js     # Session pacing, room helpers, caps
│       │   └── events.js        # Canonical Socket.IO event names
│       ├── routes/
│       │   └── quizzes.js       # REST API for quiz CRUD + import
│       ├── sockets/
│       │   ├── index.js         # Wires host + player handlers
│       │   ├── gameEngine.js    # Pure question-lifecycle transitions
│       │   ├── hostHandlers.js  # Host-initiated events
│       │   └── playerHandlers.js# Player-initiated events
│       ├── utils/
│       │   ├── quizStore.js     # JSON-file quiz persistence
│       │   ├── sessionStore.js  # In-memory live-session state
│       │   ├── scoring.js       # Speed-based scoring logic
│       │   └── importers.js     # CSV / XLSX / JSON parsers
│       └── data/                # Runtime quiz JSON files (gitignored)
│
└── frontend/                    # ── Client ────────────────────────────
    ├── .env.example
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── main.jsx             # React entrypoint
        ├── App.jsx              # Route table
        ├── config/
        │   ├── env.js           # SERVER_URL, JOIN_BASE_URL
        │   └── animation.js     # Leaderboard / chart / count-up timings
        ├── services/
        │   ├── api.js           # REST client
        │   └── socketEvents.js  # Mirrors backend/src/config/events.js
        ├── hooks/
        │   ├── useCountUp.js    # Score count-up animation
        │   └── useCountdown.js  # Shared server-deadline countdown
        ├── contexts/
        │   └── SocketContext.jsx
        ├── components/
        │   ├── common/          # Logo, Modal, PageShell, Toast
        │   └── host/            # Lobby, CountdownRing, AnswerChart,
        │                        # Leaderboard, FinalPodium, PresenceBar
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── HostDashboard.jsx
        │   ├── HostQuizEditor.jsx
        │   ├── HostPresenter.jsx
        │   └── PlayerPage.jsx
        └── styles/
            └── index.css
```

## Getting Started

### 1. Install dependencies

From the repository root:

```bash
# Install both frontend and backend at once
npm run install:all
```

Or install them individually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Run development servers

From the repository root:

```bash
# Runs frontend (:5173) and backend (:4000) in parallel
npm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1 — backend on port 4000
cd backend && npm run dev

# Terminal 2 — frontend on port 5173
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Production build

```bash
npm run build          # from the repo root — builds frontend
npm start              # runs backend (serves the built frontend if present)
```

Point `VITE_SERVER_URL` at your backend URL before building for a deployment target other than localhost.

### Environment Variables

**Frontend** (`frontend/.env`):

```
VITE_SERVER_URL=http://localhost:4000
```

**Backend** (`backend/.env`):

```
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

## Working with GitHub Desktop

The repository is organised to be commit-ready:

- Root `.gitignore` covers `node_modules/`, build output, env files, and runtime quiz data
- Recommended VS Code extensions live in `.vscode/extensions.json`
- Opening the repo folder in VS Code / GitHub Desktop works out of the box — no restructuring needed
- Add the folder in GitHub Desktop → "Create repository" → publish

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

All timing knobs are centralised — you never have to grep the codebase:

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
