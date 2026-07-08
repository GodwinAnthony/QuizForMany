import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import PageShell from '../components/common/PageShell.jsx';
import { useLocalToast } from '../components/common/Toast.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import { PLAYER_EVENTS } from '../services/socketEvents.js';

const OPTION_STYLES = [
  { bg: 'from-fuchsia-500 to-purple-600', label: 'A' },
  { bg: 'from-blue-500 to-cyan-600', label: 'B' },
  { bg: 'from-pink-500 to-rose-600', label: 'C' },
  { bg: 'from-emerald-500 to-teal-600', label: 'D' },
];

/**
 * The player-facing page: join form → waiting room → per-question
 * answer screen → post-question waiting screen → final score.
 *
 * NOTE: Players never see the leaderboard, their rank, or other
 * players' scores. They only ever see their own total.
 */
export default function PlayerPage() {
  const { socket, connected } = useSocket();
  const { show, view } = useLocalToast();
  const [searchParams] = useSearchParams();

  const initialPin = searchParams.get('pin') || '';

  // Persist name+pin locally so a reconnect after a browser refresh
  // rejoins automatically with the exact same identity.
  const cached = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('quizpulse:player') || 'null') || {};
    } catch {
      return {};
    }
  }, []);

  const [pin, setPin] = useState(initialPin || cached.pin || '');
  const [name, setName] = useState(cached.name || '');
  const [joined, setJoined] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');

  const [state, setState] = useState(null); // last known player state
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [phase, setPhase] = useState('waiting'); // waiting|question|reveal|next|final|closed
  const [reveal, setReveal] = useState(null);
  const [question, setQuestion] = useState(null);
  const [paused, setPaused] = useState(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState(0);

  const rejoinTimer = useRef(null);

  // Wire listeners
  useEffect(() => {
    if (!socket) return undefined;

    const onQuestion = (q) => {
      setQuestion(q);
      setSelected(null);
      setSubmitted(false);
      setReveal(null);
      setPhase('question');
      setPaused(false);
    };
    const onResult = (r) => {
      setReveal(r);
      setTotalScore(r.totalScore ?? 0);
      setPhase('reveal');
    };
    const onWaiting = ({ totalScore: ts }) => {
      setTotalScore(ts);
      setPhase('next');
    };
    const onFinal = ({ totalScore: ts }) => {
      setTotalScore(ts);
      setPhase('final');
    };
    const onLobby = () => {
      // Kept for potential lobby-visible extensions.
    };
    const onSessionClosed = () => {
      setPhase('closed');
    };
    const onPaused = ({ remainingMs }) => {
      setPaused(true);
      setPausedRemainingMs(remainingMs);
    };
    const onResumed = ({ deadline }) => {
      setPaused(false);
      setQuestion((q) => (q ? { ...q, deadline } : q));
    };

    socket.on(PLAYER_EVENTS.QUESTION, onQuestion);
    socket.on(PLAYER_EVENTS.QUESTION_RESULT, onResult);
    socket.on(PLAYER_EVENTS.WAITING_NEXT, onWaiting);
    socket.on(PLAYER_EVENTS.FINAL, onFinal);
    socket.on(PLAYER_EVENTS.LOBBY_UPDATE, onLobby);
    socket.on(PLAYER_EVENTS.SESSION_CLOSED, onSessionClosed);
    socket.on(PLAYER_EVENTS.PAUSED, onPaused);
    socket.on(PLAYER_EVENTS.RESUMED, onResumed);

    return () => {
      socket.off(PLAYER_EVENTS.QUESTION, onQuestion);
      socket.off(PLAYER_EVENTS.QUESTION_RESULT, onResult);
      socket.off(PLAYER_EVENTS.WAITING_NEXT, onWaiting);
      socket.off(PLAYER_EVENTS.FINAL, onFinal);
      socket.off(PLAYER_EVENTS.LOBBY_UPDATE, onLobby);
      socket.off(PLAYER_EVENTS.SESSION_CLOSED, onSessionClosed);
      socket.off(PLAYER_EVENTS.PAUSED, onPaused);
      socket.off(PLAYER_EVENTS.RESUMED, onResumed);
    };
  }, [socket]);

  // Auto-rejoin on reconnect if we've already joined this session once.
  useEffect(() => {
    if (!socket || !connected || !joined) return;
    // Fire a fresh join with the cached credentials — the server
    // recognises it as a reconnect and restores the score.
    doJoin(pin, name, /* silent = */ true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const doJoin = (rawPin, rawName, silent = false) => {
    if (!socket) return;
    const cleanPin = String(rawPin).trim();
    const cleanName = String(rawName).trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      if (!silent) show('Enter a valid 6-digit PIN');
      return;
    }
    if (!cleanName) {
      if (!silent) show('Enter your name');
      return;
    }
    socket.emit(PLAYER_EVENTS.JOIN, { pin: cleanPin, name: cleanName }, (resp) => {
      if (!resp?.ok) {
        if (!silent) show(resp?.error || 'Could not join');
        return;
      }
      sessionStorage.setItem(
        'quizpulse:player',
        JSON.stringify({ pin: cleanPin, name: cleanName }),
      );
      setJoined(true);
      setQuizTitle(resp.quizTitle || 'Quiz');
      setState(resp.state);
      setTotalScore(resp.state?.totalScore || 0);

      if (resp.state.phase === 'question' && resp.state.question) {
        setQuestion(resp.state.question);
        setPhase('question');
        setSubmitted(!!resp.state.alreadyAnswered);
        setSelected(resp.state.selectedOption ?? null);
      } else if (resp.state.phase === 'reveal') {
        setReveal(resp.state.reveal);
        setPhase('reveal');
      } else if (resp.state.phase === 'leaderboard') {
        setPhase('next');
      } else if (resp.state.phase === 'final') {
        setPhase('final');
      } else {
        setPhase('waiting');
      }
    });
  };

  const submitAnswer = (idx) => {
    if (submitted || !socket) return;
    setSelected(idx);
    setSubmitted(true);
    socket.emit(PLAYER_EVENTS.SUBMIT_ANSWER, { optionIndex: idx }, (resp) => {
      if (!resp?.ok) {
        setSubmitted(false);
        setSelected(null);
        show(resp?.error || 'Could not submit');
      }
    });
  };

  // -------- Rendering --------

  if (!joined) {
    return (
      <PageShell>
        {view}
        <div className="max-w-md mx-auto pt-4">
          <div className="glass p-6 md:p-8">
            <h1 className="display text-3xl font-bold mb-1">Join a quiz</h1>
            <p className="text-white/60 text-sm mb-6">
              Enter the 6-digit PIN from the host screen.
            </p>

            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
              Quiz PIN
            </label>
            <input
              className="input text-2xl tracking-[0.3em] text-center display"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 mt-4">
              Your name
            </label>
            <input
              className="input"
              placeholder="e.g. Alex"
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button
              className="btn-primary w-full mt-6 text-lg py-4"
              onClick={() => doJoin(pin, name)}
              disabled={!connected}
            >
              {connected ? 'Join Quiz →' : 'Connecting…'}
            </button>

            <p className="text-xs text-white/40 mt-4 text-center">
              You can also join by scanning the QR code on the host screen.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showNav={false}>
      {view}
      <div className="max-w-xl mx-auto pt-4 pb-8">
        <PlayerHeader name={name} quizTitle={quizTitle} totalScore={totalScore} />

        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <ScreenBox key="waiting">
              <div className="text-5xl mb-4 animate-pulse-soft">⏳</div>
              <div className="display text-2xl font-bold mb-2">You're in!</div>
              <p className="text-white/60">
                Waiting for the host to start the quiz…
              </p>
            </ScreenBox>
          )}

          {phase === 'question' && question && (
            <QuestionScreen
              key={`q-${question.index}`}
              q={question}
              selected={selected}
              submitted={submitted}
              onSelect={submitAnswer}
              paused={paused}
              pausedRemainingMs={pausedRemainingMs}
            />
          )}

          {phase === 'reveal' && reveal && (
            <RevealScreen
              key={`r-${reveal.questionIndex}`}
              reveal={reveal}
              question={question}
            />
          )}

          {phase === 'next' && (
            <ScreenBox key="next">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">
                Your Total Score
              </div>
              <div className="display text-6xl font-extrabold bg-clip-text text-transparent bg-brand-gradient">
                {totalScore}
              </div>
              <div className="text-white/50 mt-1 mb-4">Points</div>
              <div className="text-white/60 text-sm animate-pulse-soft">
                Waiting for the next question…
              </div>
            </ScreenBox>
          )}

          {phase === 'final' && (
            <ScreenBox key="final">
              <div className="text-5xl mb-3">🎉</div>
              <div className="display text-2xl font-bold mb-1">Quiz complete!</div>
              <div className="text-xs uppercase tracking-widest text-white/50 mt-4 mb-1">
                Your Final Score
              </div>
              <div className="display text-6xl font-extrabold bg-clip-text text-transparent bg-brand-gradient">
                {totalScore}
              </div>
              <div className="text-white/50 mt-1">Points</div>
              <p className="text-white/60 text-sm mt-6">
                See the host screen for the final leaderboard.
              </p>
            </ScreenBox>
          )}

          {phase === 'closed' && (
            <ScreenBox key="closed">
              <div className="text-4xl mb-3">👋</div>
              <div className="display text-2xl font-bold">Session ended</div>
              <p className="text-white/60 mt-2">
                The host has closed the quiz.
              </p>
            </ScreenBox>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

function PlayerHeader({ name, quizTitle, totalScore }) {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <div>
        <div className="text-xs text-white/40 uppercase tracking-widest">
          {quizTitle}
        </div>
        <div className="display text-lg font-semibold">{name}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-white/40 uppercase tracking-widest">
          Score
        </div>
        <div className="display text-xl font-bold tabular-nums">{totalScore}</div>
      </div>
    </div>
  );
}

function ScreenBox({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="glass p-8 text-center"
    >
      {children}
    </motion.div>
  );
}

function QuestionScreen({ q, selected, submitted, onSelect, paused, pausedRemainingMs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [paused]);

  const remainingMs = paused
    ? pausedRemainingMs
    : Math.max(0, q.deadline - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const pct = Math.max(0, Math.min(1, remainingMs / (q.timer * 1000)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <div className="glass p-5 mb-4">
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>Question {q.index + 1} / {q.total}</span>
          <span className="tabular-nums">{seconds}s</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-brand-gradient transition-all"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <div className="display text-xl md:text-2xl font-bold mt-4">
          {q.question}
        </div>
      </div>

      {submitted ? (
        <div className="glass p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="display text-xl font-bold mb-1">Answer locked in!</div>
          <p className="text-white/60 text-sm">
            You chose{' '}
            <span className="font-semibold text-white">
              {String.fromCharCode(65 + selected)}. {q.options[selected]}
            </span>
          </p>
          <p className="text-white/50 text-xs mt-4">
            Waiting for the timer to end…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const style = OPTION_STYLES[i % OPTION_STYLES.length];
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                disabled={paused || submitted}
                className={`text-left rounded-2xl p-4 md:p-5 font-semibold shadow-lg
                            bg-gradient-to-br ${style.bg}
                            hover:brightness-110 active:scale-[0.98]
                            transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className="text-xs opacity-80 uppercase tracking-widest mb-1">
                  Option {style.label}
                </div>
                <div className="text-lg leading-snug">{opt}</div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function RevealScreen({ reveal, question }) {
  const correct = reveal.wasCorrect;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`glass p-8 text-center border-2 ${
        correct ? 'border-emerald-400/50' : 'border-rose-400/40'
      }`}
    >
      <div className="text-5xl mb-3">{correct ? '✅' : '❌'}</div>
      <div className="display text-2xl font-bold mb-2">
        {correct ? 'Correct!' : reveal.yourAnswer == null ? 'No answer' : 'Not this time'}
      </div>
      <div className="text-white/70 text-sm">
        Correct answer was{' '}
        <span className="font-semibold text-white">
          {String.fromCharCode(65 + reveal.correctIndex)}.{' '}
          {question?.options?.[reveal.correctIndex] ?? ''}
        </span>
      </div>
      <div className="text-xs uppercase tracking-widest text-white/40 mt-6 mb-1">
        Your Total Score
      </div>
      <div className="display text-4xl font-extrabold bg-clip-text text-transparent bg-brand-gradient">
        {reveal.totalScore}
      </div>
    </motion.div>
  );
}
