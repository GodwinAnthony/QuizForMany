/**
 * sessionStore
 * ------------
 * In-memory registry of active live-quiz sessions. Each session is
 * created when a host starts a quiz and is discarded when the quiz
 * ends. Players are keyed by (pin + normalized-name) so they can
 * reconnect on the same device (or a new device) without losing
 * their accumulated score.
 *
 * Nothing here is persisted — this is deliberate: quizzes on disk
 * describe the *content*, sessions describe a *single live run*.
 */

const {
  REVEAL_DURATION_MS,
  LEADERBOARD_DURATION_MS,
} = require('../config/constants');

const sessions = new Map(); // pin -> session

function generatePin(existingPins) {
  // Reject leading zeros so the PIN is always visually six digits.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    if (!existingPins.has(pin)) return pin;
  }
  throw new Error('Could not generate a unique PIN');
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function createSession({ quiz, hostSocketId }) {
  const pin = generatePin(new Set(sessions.keys()));
  const session = {
    pin,
    quiz,
    hostSocketId,
    // Lifecycle: 'lobby' → 'question' → 'reveal' → 'leaderboard' → 'question' | 'final' | 'ended'
    phase: 'lobby',
    paused: false,
    createdAt: Date.now(),

    currentQuestionIndex: -1,
    questionStartedAt: 0,
    questionDeadline: 0,
    questionTimer: null,
    revealTimer: null,
    leaderboardTimer: null,

    // Config (pulled from central constants so pacing tweaks live in one place).
    revealDurationMs: REVEAL_DURATION_MS,
    leaderboardDurationMs: LEADERBOARD_DURATION_MS,

    // Player registry — keyed by normalized name so reconnects match.
    // Value shape:
    //   { id, name, socketId|null, connected, score, answers: Map(qIndex -> answer) }
    players: new Map(),
  };
  sessions.set(pin, session);
  return session;
}

function getSession(pin) {
  return sessions.get(String(pin || ''));
}

function deleteSession(pin) {
  const s = sessions.get(pin);
  if (s) {
    clearTimeout(s.questionTimer);
    clearTimeout(s.revealTimer);
    clearTimeout(s.leaderboardTimer);
  }
  return sessions.delete(pin);
}

/** Public snapshots (safe to send to sockets). */

function publicPlayerList(session, { onlyActive = false } = {}) {
  return Array.from(session.players.values())
    .filter((p) => (onlyActive ? p.connected : true))
    .map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      score: p.score,
    }));
}

function participantSummary(session) {
  const players = Array.from(session.players.values());
  const active = players.filter((p) => p.connected);
  const offline = players.filter((p) => !p.connected);
  return {
    total: players.length,
    active: active.length,
    offline: offline.length,
    activeNames: active.map((p) => p.name),
    offlineNames: offline.map((p) => p.name),
  };
}

function leaderboard(session, limit = 10) {
  return Array.from(session.players.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      score: p.score,
    }));
}

function answerDistribution(session) {
  const q = session.quiz.questions[session.currentQuestionIndex];
  if (!q) return { counts: [], total: 0, answered: 0, totalPlayers: 0 };
  const counts = new Array(q.options.length).fill(0);
  let answered = 0;
  for (const p of session.players.values()) {
    if (!p.connected) continue;
    const a = p.answers.get(session.currentQuestionIndex);
    if (a && typeof a.optionIndex === 'number') {
      counts[a.optionIndex] = (counts[a.optionIndex] || 0) + 1;
      answered += 1;
    }
  }
  const totalPlayers = Array.from(session.players.values()).filter((p) => p.connected).length;
  return { counts, total: counts.reduce((s, c) => s + c, 0), answered, totalPlayers };
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  normalizeName,
  publicPlayerList,
  participantSummary,
  leaderboard,
  answerDistribution,
};
