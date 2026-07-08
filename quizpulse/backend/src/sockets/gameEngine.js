/**
 * gameEngine
 * ----------
 * The pure question-lifecycle logic. Extracted so both hostHandlers
 * (timer-driven) and playerHandlers (early-finish when everyone
 * answered) can invoke the same transitions.
 *
 * Exports:
 *   sendCurrentQuestion(io, session)
 *   finishQuestion(io, session)          — called by timer or early
 *   showLeaderboardThenAdvance(io, session)
 *   finalizeQuiz(io, session)
 *   scheduleQuestionEnd(io, session)
 */

const {
  publicPlayerList,
  participantSummary,
  leaderboard,
  answerDistribution,
} = require('../utils/sessionStore');
const { roomForHost, roomForPlayers } = require('../config/constants');
const { HOST, PLAYER } = require('../config/events');

function broadcastLobby(io, session) {
  io.to(roomForHost(session.pin)).emit(HOST.LOBBY_UPDATE, {
    players: publicPlayerList(session, { onlyActive: true }),
    summary: participantSummary(session),
  });
  io.to(roomForPlayers(session.pin)).emit(PLAYER.LOBBY_UPDATE, {
    count: participantSummary(session).active,
  });
}

function broadcastPresence(io, session) {
  io.to(roomForHost(session.pin)).emit(HOST.PRESENCE_UPDATE, {
    summary: participantSummary(session),
    players: publicPlayerList(session, { onlyActive: true }),
  });
}

function broadcastAnswerStats(io, session) {
  const dist = answerDistribution(session);
  io.to(roomForHost(session.pin)).emit(HOST.ANSWER_STATS, {
    counts: dist.counts,
    answered: dist.answered,
    totalPlayers: dist.totalPlayers,
    questionIndex: session.currentQuestionIndex,
  });
}

function sendCurrentQuestion(io, session) {
  const q = session.quiz.questions[session.currentQuestionIndex];
  if (!q) return;
  const now = Date.now();
  session.phase = 'question';
  session.paused = false;
  session.questionStartedAt = now;
  session.questionDeadline = now + q.timer * 1000;

  const publicQuestion = {
    index: session.currentQuestionIndex,
    total: session.quiz.questions.length,
    question: q.question,
    options: q.options,
    timer: q.timer,
    startedAt: session.questionStartedAt,
    deadline: session.questionDeadline,
  };

  io.to(roomForHost(session.pin)).emit(HOST.QUESTION, {
    ...publicQuestion,
    correctIndex: q.correctIndex,
  });
  io.to(roomForPlayers(session.pin)).emit(PLAYER.QUESTION, publicQuestion);

  broadcastAnswerStats(io, session);
  scheduleQuestionEnd(io, session);
}

function scheduleQuestionEnd(io, session) {
  clearTimeout(session.questionTimer);
  const remaining = Math.max(0, session.questionDeadline - Date.now());
  session.questionTimer = setTimeout(() => finishQuestion(io, session), remaining);
}

function finishQuestion(io, session) {
  if (session.phase !== 'question') return;
  clearTimeout(session.questionTimer);
  session.phase = 'reveal';

  const q = session.quiz.questions[session.currentQuestionIndex];

  let correctCount = 0;
  let wrongCount = 0;
  let noAnswerCount = 0;
  for (const player of session.players.values()) {
    const rec = player.answers.get(session.currentQuestionIndex);
    if (!rec || rec.optionIndex == null) {
      player.answers.set(session.currentQuestionIndex, { optionIndex: null, points: 0 });
      noAnswerCount += 1;
    } else if (rec.optionIndex === q.correctIndex) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
  }

  const dist = answerDistribution(session);

  io.to(roomForHost(session.pin)).emit(HOST.QUESTION_RESULT, {
    questionIndex: session.currentQuestionIndex,
    correctIndex: q.correctIndex,
    counts: dist.counts,
    correctCount,
    wrongCount,
    noAnswerCount,
    totalPlayers: dist.totalPlayers,
  });

  for (const player of session.players.values()) {
    if (!player.connected || !player.socketId) continue;
    const rec = player.answers.get(session.currentQuestionIndex) || {};
    io.to(player.socketId).emit(PLAYER.QUESTION_RESULT, {
      questionIndex: session.currentQuestionIndex,
      correctIndex: q.correctIndex,
      yourAnswer: rec.optionIndex,
      wasCorrect: rec.optionIndex === q.correctIndex,
      totalScore: player.score,
    });
  }

  clearTimeout(session.revealTimer);
  session.revealTimer = setTimeout(
    () => showLeaderboardThenAdvance(io, session),
    session.revealDurationMs,
  );
}

function showLeaderboardThenAdvance(io, session) {
  session.phase = 'leaderboard';
  io.to(roomForHost(session.pin)).emit(HOST.LEADERBOARD, {
    questionIndex: session.currentQuestionIndex,
    top: leaderboard(session, 10),
  });

  for (const player of session.players.values()) {
    if (!player.connected || !player.socketId) continue;
    io.to(player.socketId).emit(PLAYER.WAITING_NEXT, {
      totalScore: player.score,
    });
  }

  clearTimeout(session.leaderboardTimer);
  session.leaderboardTimer = setTimeout(() => {
    const next = session.currentQuestionIndex + 1;
    if (next >= session.quiz.questions.length) {
      finalizeQuiz(io, session);
    } else {
      session.currentQuestionIndex = next;
      sendCurrentQuestion(io, session);
    }
  }, session.leaderboardDurationMs);
}

function finalizeQuiz(io, session) {
  session.phase = 'final';
  const finalBoard = leaderboard(session, 100);

  io.to(roomForHost(session.pin)).emit(HOST.FINAL, {
    top: finalBoard,
    podium: finalBoard.slice(0, 3),
  });

  for (const player of session.players.values()) {
    if (!player.connected || !player.socketId) continue;
    io.to(player.socketId).emit(PLAYER.FINAL, {
      totalScore: player.score,
    });
  }
}

module.exports = {
  broadcastLobby,
  broadcastPresence,
  broadcastAnswerStats,
  sendCurrentQuestion,
  scheduleQuestionEnd,
  finishQuestion,
  showLeaderboardThenAdvance,
  finalizeQuiz,
};
