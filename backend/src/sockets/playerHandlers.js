/**
 * playerHandlers
 * --------------
 * Player-initiated socket events:
 *   PLAYER.JOIN            Join a session by PIN + name (also handles reconnect)
 *   PLAYER.SUBMIT_ANSWER   Submit an option for the current question
 *   disconnect             Mark player offline; keep score for reconnect
 */

const { nanoid } = require('nanoid');

const {
  getSession,
  normalizeName,
  answerDistribution,
} = require('../utils/sessionStore');
const { computeScore } = require('../utils/scoring');
const {
  broadcastLobby,
  broadcastPresence,
  broadcastAnswerStats,
  finishQuestion,
} = require('./gameEngine');
const {
  MAX_PLAYERS_PER_SESSION,
  MAX_NAME_LENGTH,
  EARLY_FINISH_GRACE_MS,
  roomForPlayers,
} = require('../config/constants');
const { PLAYER } = require('../config/events');

module.exports = function registerPlayerHandlers(io, socket) {
  socket.data.session = null;

  socket.on(PLAYER.JOIN, ({ pin, name }, ack) => {
    const session = getSession(pin);
    if (!session) return ack?.({ ok: false, error: 'Invalid PIN' });
    if (session.phase === 'final' || session.phase === 'ended') {
      return ack?.({ ok: false, error: 'Quiz has ended' });
    }

    const cleanName = String(name || '').trim().slice(0, MAX_NAME_LENGTH);
    if (!cleanName) return ack?.({ ok: false, error: 'Name required' });
    const key = normalizeName(cleanName);
    if (!key) return ack?.({ ok: false, error: 'Name required' });

    let player = session.players.get(key);
    if (!player) {
      if (session.players.size >= MAX_PLAYERS_PER_SESSION) {
        return ack?.({ ok: false, error: 'Session is full' });
      }
      player = {
        id: nanoid(10),
        name: cleanName,
        socketId: socket.id,
        connected: true,
        score: 0,
        answers: new Map(),
      };
      session.players.set(key, player);
    } else {
      // Reconnect — keep score & answers, refresh binding.
      player.socketId = socket.id;
      player.connected = true;
      player.name = cleanName;
    }

    socket.data.session = { pin: session.pin, key };
    socket.join(roomForPlayers(session.pin));

    // State snapshot for landing screen.
    const state = { phase: session.phase, totalScore: player.score };
    if (session.phase === 'question') {
      const q = session.quiz.questions[session.currentQuestionIndex];
      state.question = {
        index: session.currentQuestionIndex,
        total: session.quiz.questions.length,
        question: q.question,
        options: q.options,
        timer: q.timer,
        startedAt: session.questionStartedAt,
        deadline: session.questionDeadline,
      };
      const rec = player.answers.get(session.currentQuestionIndex);
      state.alreadyAnswered = !!rec;
      state.selectedOption = rec?.optionIndex ?? null;
    } else if (session.phase === 'reveal') {
      const q = session.quiz.questions[session.currentQuestionIndex];
      const rec = player.answers.get(session.currentQuestionIndex) || {};
      state.reveal = {
        questionIndex: session.currentQuestionIndex,
        correctIndex: q.correctIndex,
        yourAnswer: rec.optionIndex ?? null,
        wasCorrect: rec.optionIndex === q.correctIndex,
      };
    } else if (session.phase === 'leaderboard') {
      state.waiting = true;
    } else if (session.phase === 'final') {
      state.final = true;
    }

    ack?.({
      ok: true,
      playerId: player.id,
      quizTitle: session.quiz.title,
      state,
    });

    broadcastLobby(io, session);
    broadcastPresence(io, session);
  });

  socket.on(PLAYER.SUBMIT_ANSWER, ({ optionIndex }, ack) => {
    const ctx = socket.data.session;
    if (!ctx) return ack?.({ ok: false, error: 'Not in a session' });
    const session = getSession(ctx.pin);
    if (!session) return ack?.({ ok: false, error: 'Session gone' });
    if (session.phase !== 'question' || session.paused) {
      return ack?.({ ok: false, error: 'Not accepting answers right now' });
    }
    const player = session.players.get(ctx.key);
    if (!player) return ack?.({ ok: false, error: 'Player missing' });

    const qIndex = session.currentQuestionIndex;
    if (player.answers.has(qIndex)) return ack?.({ ok: false, error: 'Already answered' });

    const q = session.quiz.questions[qIndex];
    const idx = Number(optionIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= q.options.length) {
      return ack?.({ ok: false, error: 'Invalid option' });
    }

    const responseTimeMs = Math.max(0, Date.now() - session.questionStartedAt);
    const isCorrect = idx === q.correctIndex;
    const points = computeScore({
      isCorrect,
      responseTimeMs,
      timerSeconds: q.timer,
    });
    player.score += points;
    player.answers.set(qIndex, { optionIndex: idx, points, responseTimeMs });

    ack?.({ ok: true });

    broadcastAnswerStats(io, session);

    // Early-finish if every connected player has answered. Reduced grace
    // window (constants.EARLY_FINISH_GRACE_MS) makes the transition to the
    // reveal / leaderboard feel snappier.
    const dist = answerDistribution(session);
    if (dist.totalPlayers > 0 && dist.answered >= dist.totalPlayers) {
      clearTimeout(session.questionTimer);
      session.questionTimer = setTimeout(
        () => finishQuestion(io, session),
        EARLY_FINISH_GRACE_MS,
      );
    }
  });

  socket.on('disconnect', () => {
    const ctx = socket.data.session;
    if (!ctx) return;
    const session = getSession(ctx.pin);
    if (!session) return;
    const player = session.players.get(ctx.key);
    if (!player) return;
    if (player.socketId === socket.id) {
      player.connected = false;
      player.socketId = null;
    }
    broadcastLobby(io, session);
    broadcastPresence(io, session);
  });
};
