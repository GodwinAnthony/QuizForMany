/**
 * Canonical Socket.IO event names — mirror of backend/src/config/events.js.
 * Keep both files in sync when adding new events.
 */

export const HOST_EVENTS = Object.freeze({
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

export const PLAYER_EVENTS = Object.freeze({
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
