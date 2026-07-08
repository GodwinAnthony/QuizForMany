import { motion, AnimatePresence } from 'framer-motion';

import useCountUp from '../../hooks/useCountUp.js';
import { LEADERBOARD_SPRING } from '../../config/animation.js';

/**
 * Animated Top-10 leaderboard. Uses Framer Motion `layout` so rows
 * smoothly reorder frame-to-frame as ranks change. Spring stiffness
 * is tuned via config/animation.js so ranking transitions feel snappy.
 *
 * Scores use a count-up animation so the number visibly ticks toward
 * its new value instead of jumping — same visual behaviour as before,
 * just faster.
 */
export default function Leaderboard({ entries = [], title = 'Leaderboard' }) {
  return (
    <div className="glass p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="display text-2xl font-bold">🏆 {title}</h3>
        <div className="chip">Top {Math.min(10, entries.length)}</div>
      </div>
      <div className="space-y-2 relative">
        <AnimatePresence initial={false}>
          {entries.slice(0, 10).map((e) => (
            <motion.div
              key={e.name}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={LEADERBOARD_SPRING}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl border ${
                e.rank === 1
                  ? 'bg-yellow-500/15 border-yellow-400/40'
                  : e.rank === 2
                  ? 'bg-slate-300/10 border-slate-300/30'
                  : e.rank === 3
                  ? 'bg-orange-500/15 border-orange-400/30'
                  : 'bg-white/[0.05] border-white/10'
              }`}
            >
              <div className="w-10 text-center display text-xl font-bold">
                {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
              </div>
              <div className="flex-1 text-lg font-semibold truncate">{e.name}</div>
              <AnimatedScore value={e.score} />
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <div className="text-white/40 text-center py-6">No entries yet.</div>
        )}
      </div>
    </div>
  );
}

function AnimatedScore({ value }) {
  const shown = useCountUp(value);
  return <div className="display text-xl font-bold tabular-nums">{shown}</div>;
}
