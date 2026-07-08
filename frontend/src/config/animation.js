/**
 * Frontend-wide animation timing constants.
 *
 * These were tuned to make the leaderboard / reveal flow feel more
 * responsive without changing any visual design. Adjust here to
 * globally speed up (or slow down) transitions.
 */

// Framer Motion spring — used for leaderboard row reordering.
// Higher stiffness + lower damping = snappier reorder.
export const LEADERBOARD_SPRING = {
  type: 'spring',
  stiffness: 500,
  damping: 22,
  mass: 0.6,
};

// Chart.js animation duration for the answer distribution bars.
export const CHART_ANIMATION_MS = 200;

// Score count-up duration (used by the animated score component).
export const SCORE_COUNTUP_MS = 500;

// Standard page/section fade-in duration for framer-motion screens.
export const SCREEN_FADE_MS = 180;
