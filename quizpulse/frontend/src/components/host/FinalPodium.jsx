import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

/**
 * Final results screen. Shows a top-3 podium with confetti, plus
 * a scrollable list of the remaining rankings.
 */
export default function FinalPodium({ podium = [], full = [] }) {
  useEffect(() => {
    // Bursts of confetti staggered for drama.
    const end = Date.now() + 3500;
    const shoot = () => {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#facc15'],
      });
      if (Date.now() < end) requestAnimationFrame(shoot);
    };
    shoot();
  }, []);

  const [gold, silver, bronze] = podium;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="chip mb-3 mx-auto w-fit">🎉 Quiz complete</div>
        <h2 className="display text-4xl md:text-5xl font-bold">Final Results</h2>
      </div>

      <div className="grid grid-cols-3 items-end gap-4 mb-10">
        <PodiumBar
          entry={silver}
          height="h-40"
          delay={0.2}
          medal="🥈"
          gradient="from-slate-300/40 to-slate-500/20"
        />
        <PodiumBar
          entry={gold}
          height="h-56"
          delay={0}
          medal="🥇"
          gradient="from-yellow-300/50 to-yellow-500/20"
          big
        />
        <PodiumBar
          entry={bronze}
          height="h-32"
          delay={0.4}
          medal="🥉"
          gradient="from-orange-300/40 to-orange-500/20"
        />
      </div>

      {full.length > 3 && (
        <div className="glass p-4 md:p-6">
          <h3 className="display text-lg font-semibold mb-3">Full Rankings</h3>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {full.slice(3).map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-right text-white/50 tabular-nums">
                    {e.rank}
                  </span>
                  <span className="font-medium">{e.name}</span>
                </div>
                <span className="display font-bold tabular-nums">{e.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumBar({ entry, height, delay, medal, gradient, big = false }) {
  if (!entry) {
    return <div className={`${height} rounded-t-2xl bg-white/[0.03] border border-white/5`} />;
  }
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      className="flex flex-col items-center"
    >
      <div className="text-3xl mb-1">{medal}</div>
      <div className={`text-center ${big ? 'display text-xl' : 'text-base'} font-semibold truncate max-w-full px-2`}>
        {entry.name}
      </div>
      <div className={`display font-bold tabular-nums ${big ? 'text-3xl' : 'text-2xl'} mt-1`}>
        {entry.score}
      </div>
      <div
        className={`mt-3 w-full ${height} rounded-t-2xl border border-white/15 bg-gradient-to-b ${gradient}`}
      />
    </motion.div>
  );
}
