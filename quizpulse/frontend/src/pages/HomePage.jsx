import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo.jsx';

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 md:px-10 py-6 flex items-center justify-between">
        <Logo size="md" />
        <div className="text-xs text-white/50 hidden sm:block">
          Real-time. Low latency. Up to 300+ players.
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 md:px-10">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
          {/* Hero */}
          <div className="text-center md:text-left">
            <div className="chip mb-6 mx-auto md:mx-0 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span>Live · Realtime · Interactive</span>
            </div>
            <h1 className="display text-4xl md:text-6xl font-bold leading-tight">
              Run a live quiz{' '}
              <span className="bg-clip-text text-transparent bg-brand-gradient">
                in seconds.
              </span>
            </h1>
            <p className="mt-5 text-white/70 text-lg leading-relaxed max-w-lg mx-auto md:mx-0">
              Host presentation-ready quizzes. Players join with a PIN or QR
              code. Live charts, speed-based scoring, animated leaderboards —
              all in your browser.
            </p>
          </div>

          {/* Actions */}
          <div className="glass p-6 md:p-8 space-y-4">
            <div className="text-center mb-2">
              <div className="text-xs uppercase tracking-widest text-white/50">
                Get started
              </div>
            </div>
            <Link
              to="/host"
              className="btn-primary w-full text-lg py-4 group"
            >
              <span>🎤</span>
              <span>Host Quiz</span>
              <span className="opacity-60 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              to="/play"
              className="btn-secondary w-full text-lg py-4 group"
            >
              <span>🎮</span>
              <span>Join Quiz</span>
              <span className="opacity-60 group-hover:translate-x-1 transition-transform">→</span>
            </Link>

            <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              <Stat label="Players" value="300+" />
              <Stat label="Latency" value="< 100ms" />
              <Stat label="Setup" value="No login" />
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 md:px-10 py-6 text-center text-xs text-white/40">
        Built with React, Socket.IO and Chart.js. No database, no accounts —
        just quizzes.
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="display text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">
        {label}
      </div>
    </div>
  );
}
