import { motion, AnimatePresence } from 'framer-motion';

/**
 * Lobby view shown before the quiz starts.
 * Displays PIN, QR code, and live list of joined participants.
 */
export default function Lobby({ pin, qr, joinUrl, players = [], summary, onStart, canStart }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* PIN + QR */}
      <div className="glass p-6 md:p-8 text-center">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-2">
          Join at
        </div>
        <div className="display text-xl md:text-2xl font-semibold mb-1 break-all">
          {joinUrl?.replace(/^https?:\/\//, '') || 'Open QuizPulse and enter the PIN'}
        </div>

        <div className="mt-6 mb-2 text-xs uppercase tracking-widest text-white/50">
          Quiz PIN
        </div>
        <div
          className="display font-extrabold tracking-[0.2em] leading-none text-6xl md:text-7xl bg-clip-text text-transparent bg-brand-gradient select-all"
          aria-label={`Quiz PIN ${pin}`}
        >
          {pin}
        </div>

        {qr && (
          <div className="mt-6 inline-block bg-white p-3 rounded-2xl shadow-glow">
            <img
              src={qr}
              alt="QR code to join quiz"
              className="w-44 h-44 md:w-52 md:h-52"
            />
          </div>
        )}

        <div className="mt-6">
          <button
            className="btn-primary w-full text-lg py-4"
            disabled={!canStart}
            onClick={onStart}
          >
            {canStart ? '▶ Start Quiz' : 'Waiting for players…'}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="glass p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="display text-2xl font-bold">Participants</h3>
          <div className="chip">
            {summary?.active ?? 0} / 300
          </div>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <div className="text-4xl mb-3 animate-pulse-soft">👥</div>
            <div>Waiting for players to join…</div>
            <div className="text-xs text-white/40 mt-2">
              Share the PIN or QR code to invite people.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[440px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="glass-sm px-3 py-2 flex items-center gap-2 text-sm"
                >
                  <span className="text-emerald-300">✓</span>
                  <span className="truncate">{p.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
