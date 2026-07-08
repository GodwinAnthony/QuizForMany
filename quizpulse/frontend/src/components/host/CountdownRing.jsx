import useCountdown from '../../hooks/useCountdown.js';

/**
 * Circular countdown timer showing seconds remaining until `deadline`.
 * Purely visual — the authoritative timer lives on the server.
 */
export default function CountdownRing({ deadline, total, paused, pausedRemainingMs }) {
  const { remainingMs, seconds } = useCountdown({
    deadline,
    paused,
    pausedRemainingMs,
    tick: 200,
  });

  const pct = Math.max(0, Math.min(1, remainingMs / (total * 1000)));

  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const dash = c * pct;
  const color =
    pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.25s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="display text-2xl font-bold tabular-nums">{seconds}</div>
        <div className="text-[10px] uppercase tracking-widest text-white/50">
          {paused ? 'Paused' : 'Sec'}
        </div>
      </div>
    </div>
  );
}
