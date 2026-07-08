import { useEffect, useState } from 'react';

/**
 * useCountdown — track ms remaining until an absolute `deadline`
 * (or a frozen `pausedRemainingMs` when the quiz is paused).
 *
 * Extracted so both the host CountdownRing and the player timer
 * can share the exact same ticking logic.
 */
export default function useCountdown({ deadline, paused, pausedRemainingMs, tick = 200 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setNow(Date.now()), tick);
    return () => clearInterval(id);
  }, [paused, tick]);

  const remainingMs = paused
    ? Math.max(0, pausedRemainingMs || 0)
    : Math.max(0, deadline - now);

  return {
    remainingMs,
    seconds: Math.ceil(remainingMs / 1000),
  };
}
