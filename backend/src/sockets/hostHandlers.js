/**
 * hostHandlers
 * ------------
 * Every socket event initiated by the host presentation screen.
 * Question-flow logic itself lives in ./gameEngine so it can be
 * shared with the player handler (for early-finish when everyone
 * has answered).
 */

const QRCode = require('qrcode');

const { getQuiz } = require('../utils/quizStore');
const {
  createSession,
  getSession,
  deleteSession,
  publicPlayerList,
  participantSummary,
} = require('../utils/sessionStore');
const {
  sendCurrentQuestion,
  scheduleQuestionEnd,
  finalizeQuiz,
} = require('./gameEngine');
const { roomForHost, roomForPlayers } = require('../config/constants');
const { HOST, PLAYER } = require('../config/events');

async function buildJoinAssets(pin, publicJoinUrl) {
  const url = publicJoinUrl ? `${publicJoinUrl}?pin=${pin}` : `pin:${pin}`;
  const qr = await QRCode.toDataURL(url, {
    width: 400,
    color: { dark: '#0b0d21', light: '#ffffff' },
    margin: 1,
  });
  return { url, qr };
}

module.exports = function registerHostHandlers(io, socket) {
  socket.on(HOST.CREATE_SESSION, async ({ quizId, joinBaseUrl }, ack) => {
    try {
      const quiz = await getQuiz(quizId);
      if (!quiz || !quiz.questions.length) {
        return ack?.({ ok: false, error: 'Quiz not found or empty' });
      }
      const session = createSession({ quiz, hostSocketId: socket.id });
      socket.join(roomForHost(session.pin));
      socket.join(roomForPlayers(session.pin));

      const assets = await buildJoinAssets(session.pin, joinBaseUrl || '');
      ack?.({
        ok: true,
        pin: session.pin,
        joinUrl: assets.url,
        qr: assets.qr,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          questionCount: quiz.questions.length,
        },
      });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on(HOST.RECONNECT, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session) return ack?.({ ok: false, error: 'Session not found' });
    session.hostSocketId = socket.id;
    socket.join(roomForHost(pin));
    socket.join(roomForPlayers(pin));
    ack?.({
      ok: true,
      phase: session.phase,
      summary: participantSummary(session),
      players: publicPlayerList(session, { onlyActive: true }),
      quizTitle: session.quiz.title,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.quiz.questions.length,
    });
  });

  socket.on(HOST.START_QUIZ, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session) return ack?.({ ok: false, error: 'Session not found' });
    if (session.phase !== 'lobby') return ack?.({ ok: false, error: 'Already started' });
    session.currentQuestionIndex = 0;
    sendCurrentQuestion(io, session);
    ack?.({ ok: true });
  });

  socket.on(HOST.PAUSE, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session || session.phase !== 'question' || session.paused) return ack?.({ ok: false });
    clearTimeout(session.questionTimer);
    session.paused = true;
    session.pausedRemainingMs = Math.max(0, session.questionDeadline - Date.now());
    io.to(roomForHost(session.pin)).emit(HOST.PAUSED, { remainingMs: session.pausedRemainingMs });
    io.to(roomForPlayers(session.pin)).emit(PLAYER.PAUSED, { remainingMs: session.pausedRemainingMs });
    ack?.({ ok: true });
  });

  socket.on(HOST.RESUME, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session || !session.paused) return ack?.({ ok: false });
    const remaining = session.pausedRemainingMs || 0;
    session.paused = false;
    const q = session.quiz.questions[session.currentQuestionIndex];
    session.questionStartedAt = Date.now() - (q.timer * 1000 - remaining);
    session.questionDeadline = Date.now() + remaining;
    scheduleQuestionEnd(io, session);
    io.to(roomForHost(session.pin)).emit(HOST.RESUMED, { deadline: session.questionDeadline });
    io.to(roomForPlayers(session.pin)).emit(PLAYER.RESUMED, { deadline: session.questionDeadline });
    ack?.({ ok: true });
  });

  socket.on(HOST.RESTART_QUESTION, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session || session.currentQuestionIndex < 0) return ack?.({ ok: false });
    clearTimeout(session.questionTimer);
    clearTimeout(session.revealTimer);
    clearTimeout(session.leaderboardTimer);

    // Refund any points from this round and clear answers.
    for (const player of session.players.values()) {
      const rec = player.answers.get(session.currentQuestionIndex);
      if (rec) {
        player.score -= rec.points || 0;
        player.answers.delete(session.currentQuestionIndex);
      }
    }
    sendCurrentQuestion(io, session);
    ack?.({ ok: true });
  });

  socket.on(HOST.END_QUIZ, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session) return ack?.({ ok: false });
    clearTimeout(session.questionTimer);
    clearTimeout(session.revealTimer);
    clearTimeout(session.leaderboardTimer);
    finalizeQuiz(io, session);
    ack?.({ ok: true });
  });

  socket.on(HOST.CLOSE_SESSION, ({ pin }, ack) => {
    const session = getSession(pin);
    if (!session) return ack?.({ ok: false });
    io.to(roomForPlayers(pin)).emit(PLAYER.SESSION_CLOSED);
    deleteSession(pin);
    ack?.({ ok: true });
  });
};
