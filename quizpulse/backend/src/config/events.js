/**
 * Canonical Socket.IO event names.
 *
 * Both host and player socket handlers import from here so the
 * event vocabulary stays consistent and typos surface immediately.
 * The corresponding client-side mirror is at
 * frontend/src/services/socketEvents.js — keep them in sync.
 */

const HOST = Object.freeze({
  // Client → server
  CREATE_SESSION: 'host:createSession',
  RECONNECT: 'host:reconnect',
  START_QUIZ: 'host:startQuiz',
  PAUSE: 'host:pause',
  RESUME: 'host:resume',
  RESTART_QUESTION: 'host:restartQuestion',
  END_QUIZ: 'host:endQuiz',
  CLOSE_SESSION: 'host:closeSession',

  // Server → client
  LOBBY_UPDATE: 'host:lobbyUpdate',
  PRESENCE_UPDATE: 'host:presenceUpdate',
  QUESTION: 'host:question',
  ANSWER_STATS: 'host:answerStats',
  QUESTION_RESULT: 'host:questionResult',
  LEADERBOARD: 'host:leaderboard',
  FINAL: 'host:final',
  PAUSED: 'host:paused',
  RESUMED: 'host:resumed',
});

const PLAYER = Object.freeze({
  // Client → server
  JOIN: 'player:join',
  SUBMIT_ANSWER: 'player:submitAnswer',

  // Server → client
  LOBBY_UPDATE: 'player:lobbyUpdate',
  QUESTION: 'player:question',
  QUESTION_RESULT: 'player:questionResult',
  WAITING_NEXT: 'player:waitingNext',
  FINAL: 'player:final',
  SESSION_CLOSED: 'player:sessionClosed',
  PAUSED: 'player:paused',
  RESUMED: 'player:resumed',
});

module.exports = { HOST, PLAYER };
