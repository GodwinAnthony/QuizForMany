/**
 * Backend-wide constants.
 *
 * Centralising these makes it easy to tune game pacing, room-name
 * conventions, and player limits without hunting through the code.
 */

// -- Session pacing (ms) -----------------------------------------------------
// These were reduced (from 4000 / 5000) to make the post-question flow feel
// snappier — the reveal and leaderboard both appear and dismiss faster.
const REVEAL_DURATION_MS = 2000;
const LEADERBOARD_DURATION_MS = 3000;

// Extra grace after the last player answers before we finish the question,
// so the last "answer locked in" UI has a beat to settle. Reduced from 400.
const EARLY_FINISH_GRACE_MS = 150;

// -- Player caps -------------------------------------------------------------
const MAX_PLAYERS_PER_SESSION = 500;
const MAX_NAME_LENGTH = 32;

// -- Rooms -------------------------------------------------------------------
const roomForPlayers = (pin) => `quiz:${pin}`;
const roomForHost = (pin) => `host:${pin}`;

module.exports = {
  REVEAL_DURATION_MS,
  LEADERBOARD_DURATION_MS,
  EARLY_FINISH_GRACE_MS,
  MAX_PLAYERS_PER_SESSION,
  MAX_NAME_LENGTH,
  roomForPlayers,
  roomForHost,
};
