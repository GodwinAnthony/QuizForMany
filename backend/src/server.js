/**
 * QuizPulse backend entrypoint.
 *
 * Responsibilities:
 *   • Boot an Express HTTP server on `process.env.PORT` (never hardcoded —
 *     Render assigns the port for you and the process MUST bind to it).
 *   • Mount Socket.IO on the same server for real-time gameplay.
 *   • Expose REST endpoints for quiz CRUD and import (JSON / CSV / XLSX).
 *   • Serve the built frontend from `frontend/dist` when present, so a
 *     single Render Web Service can host the whole app on one origin.
 *   • Configure CORS so both local dev (Vite on :5173) and Render
 *     deployments (single-service same-origin OR two-service split)
 *     work out of the box.
 */

require('dotenv').config();

const http = require('http');
const path = require('path');
const cors = require('cors');
const express = require('express');
const { Server: SocketServer } = require('socket.io');

const quizzesRouter = require('./routes/quizzes');
const registerSocketHandlers = require('./sockets');
const { ensureDataDir } = require('./utils/quizStore');
const { buildCorsConfig } = require('./config/cors');

// Render (and virtually every managed host) supplies the port via
// process.env.PORT. We only fall back to 4000 for local development.
const PORT = Number(process.env.PORT) || 4000;

// Bind to 0.0.0.0 so containerised platforms (Render, Fly, Railway…)
// can reach the process from outside the container.
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  await ensureDataDir();

  const app = express();

  // ── CORS ────────────────────────────────────────────────────────────────
  // buildCorsConfig() returns a validated middleware config from
  // process.env.CORS_ORIGIN (comma-separated allow-list) plus sensible
  // defaults for local dev. See config/cors.js for the exact policy.
  const corsConfig = buildCorsConfig();
  app.use(cors(corsConfig.expressOptions));
  // Handle preflight for every route — required for JSON POST/PUT/DELETE
  // and multipart file uploads coming from a different origin.
  app.options('*', cors(corsConfig.expressOptions));

  app.use(express.json({ limit: '10mb' }));

  // ── REST API ────────────────────────────────────────────────────────────
  app.use('/api/quizzes', quizzesRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // ── Static frontend (single-service deployment) ─────────────────────────
  // When the frontend has been built with `npm run build`, its output
  // ends up in frontend/dist. Serving it from here lets Render host the
  // whole app as one Web Service, which is the simplest deployment.
  const publicDir = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(publicDir));

  // SPA catch-all: anything that isn't `/api/*` or `/socket.io/*` and
  // wasn't matched by a static file falls through to the SPA's index.html
  // so client-side routes (e.g. /host, /play?pin=…) survive a page reload.
  app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res, next) => {
    res.sendFile(path.join(publicDir, 'index.html'), (err) => {
      // If the frontend hasn't been built (two-service deployment), just
      // return 404 for non-API routes rather than crashing.
      if (err) next();
    });
  });

  // ── HTTP + Socket.IO server ─────────────────────────────────────────────
  const httpServer = http.createServer(app);

  const io = new SocketServer(httpServer, {
    cors: corsConfig.socketOptions,
    // pingInterval / pingTimeout tuned so we detect disconnects quickly
    // but don't kill players on flaky mobile networks.
    pingInterval: 20000,
    pingTimeout: 25000,
    maxHttpBufferSize: 1e6,
    // `transports` left to defaults ('polling', 'websocket'): starting on
    // polling is the safest handshake path on managed hosts and upgrades
    // to websocket automatically.
  });

  registerSocketHandlers(io);

  httpServer.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`🎯 QuizPulse backend listening on http://${HOST}:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`   CORS policy: ${corsConfig.describe()}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal server error:', err);
  process.exit(1);
});
