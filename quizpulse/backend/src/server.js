/**
 * QuizPulse backend entrypoint.
 *
 * Starts an Express HTTP server and mounts Socket.IO for real-time
 * quiz gameplay. Also exposes REST endpoints for quiz CRUD and
 * import (JSON / CSV / XLSX).
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

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main() {
  await ensureDataDir();

  const app = express();
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json({ limit: '10mb' }));

  // REST routes
  app.use('/api/quizzes', quizzesRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Optional: serve built frontend when deployed together
  const publicDir = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(publicDir));

  const httpServer = http.createServer(app);

  // Socket.IO configured for high concurrency and low latency
  const io = new SocketServer(httpServer, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
    // pingInterval / pingTimeout tuned so we detect disconnects quickly
    // but don't kill players on flaky mobile networks.
    pingInterval: 20000,
    pingTimeout: 25000,
    maxHttpBufferSize: 1e6,
  });

  registerSocketHandlers(io);

  httpServer.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🎯 QuizPulse backend listening on :${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal server error:', err);
  process.exit(1);
});
