/**
 * scoring
 * -------
 * Compute per-question scores based on correctness AND speed.
 *
 * Rules (per requirements):
 *   - Wrong / no answer   = 0
 *   - Correct answer      = at least 50, at most 100
 *   - Fastest correct     = 100
 *   - Others decay toward 50 the longer they take, relative to the
 *     question's timer window.
 *
 * Formula:
 *   speedFactor = 1 - (responseTimeMs / (timerSeconds * 1000))
 *   speedFactor = clamp(speedFactor, 0, 1)
 *   score       = 50 + round(50 * speedFactor)
 */

function computeScore({ isCorrect, responseTimeMs, timerSeconds }) {
  if (!isCorrect) return 0;
  const total = Math.max(1, Number(timerSeconds)) * 1000;
  const t = Math.max(0, Math.min(total, Number(responseTimeMs) || 0));
  const speedFactor = 1 - t / total;
  const bonus = Math.round(50 * speedFactor);
  return Math.max(50, Math.min(100, 50 + bonus));
}

module.exports = { computeScore };
