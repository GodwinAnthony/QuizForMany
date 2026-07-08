import { useEffect, useRef, useState } from 'react';

import { SCORE_COUNTUP_MS } from '../config/animation.js';

/**
 * useCountUp — smoothly animate a number toward a target value.
 * Uses requestAnimationFrame with an ease-out curve so score
 * transitions feel snappy but still readable.
 *
 * Used by the leaderboard rows to visualise score increases
 * without the number just jumping.
 */
export default function useCountUp(target, duration = SCORE_COUNTUP_MS) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (target === value) return undefined;
    fromRef.current = value;
    startRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      // easeOutCubic
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(fromRef.current + (target - fromRef.current) * eased);
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // We deliberately depend only on `target` — internal `value` updates
    // must not re-trigger the effect or the animation would restart every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
