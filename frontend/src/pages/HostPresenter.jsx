import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageShell from '../components/common/PageShell.jsx';
import Modal from '../components/common/Modal.jsx';
import PresenceBar from '../components/host/PresenceBar.jsx';
import Lobby from '../components/host/Lobby.jsx';
import AnswerChart from '../components/host/AnswerChart.jsx';
import CountdownRing from '../components/host/CountdownRing.jsx';
import Leaderboard from '../components/host/Leaderboard.jsx';
import FinalPodium from '../components/host/FinalPodium.jsx';
import { useLocalToast } from '../components/common/Toast.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import { HOST_EVENTS } from '../services/socketEvents.js';

export default function HostPresenter() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { show, view } = useLocalToast();

  const cached = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`quizpulse:session:${pin}`) || 'null');
    } catch {
      return null;
    }
  }, [pin]);

  const [phase, setPhase] = useState('lobby');
  const [players, setPlayers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, offline: 0, offlineNames: [] });

  const [currentQ, setCurrentQ] = useState(null);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [counts, setCounts] = useState([]);
  const [answered, setAnswered] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const [reveal, setReveal] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [finalData, setFinalData] = useState(null);

  const [paused, setPaused] = useState(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState(0);

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Wire up socket listeners
  useEffect(() => {
    if (!socket) return undefined;

    const onLobby = ({ players: p, summary: s }) => {
      setPlayers(p);
      setSummary(s);
    };
    const onPresence = ({ summary: s, players: p }) => {
      setSummary(s);
      setPlayers(p);
    };
    const onQuestion = (q) => {
      setPhase('question');
      setCurrentQ(q);
      setCorrectIndex(typeof q.correctIndex === 'number' ? q.correctIndex : null);
      setCounts(new Array(q.options.length).fill(0));
      setAnswered(0);
      setReveal(null);
      setLeaderboard([]);
      setPaused(false);
    };
    const onAnswerStats = ({ counts: c, answered: a, totalPlayers: tp }) => {
      setCounts(c);
      setAnswered(a);
      setTotalPlayers(tp);
    };
    const onResult = (r) => {
      setPhase('reveal');
      setReveal(r);
      setCorrectIndex(r.correctIndex);
      setCounts(r.counts);
    };
    const onLeaderboard = ({ top }) => {
      setPhase('leaderboard');
      setLeaderboard(top);
    };
    const onFinal = (data) => {
      setPhase('final');
      setFinalData(data);
    };
    const onPaused = ({ remainingMs }) => {
      setPaused(true);
      setPausedRemainingMs(remainingMs);
    };
    const onResumed = ({ deadline }) => {
      setPaused(false);
      setCurrentQ((q) => (q ? { ...q, deadline } : q));
    };

    socket.on(HOST_EVENTS.LOBBY_UPDATE, onLobby);
    socket.on(HOST_EVENTS.PRESENCE_UPDATE, onPresence);
    socket.on(HOST_EVENTS.QUESTION, onQuestion);
    socket.on(HOST_EVENTS.ANSWER_STATS, onAnswerStats);
    socket.on(HOST_EVENTS.QUESTION_RESULT, onResult);
    socket.on(HOST_EVENTS.LEADERBOARD, onLeaderboard);
    socket.on(HOST_EVENTS.FINAL, onFinal);
    socket.on(HOST_EVENTS.PAUSED, onPaused);
    socket.on(HOST_EVENTS.RESUMED, onResumed);

    return () => {
      socket.off(HOST_EVENTS.LOBBY_UPDATE, onLobby);
      socket.off(HOST_EVENTS.PRESENCE_UPDATE, onPresence);
      socket.off(HOST_EVENTS.QUESTION, onQuestion);
      socket.off(HOST_EVENTS.ANSWER_STATS, onAnswerStats);
      socket.off(HOST_EVENTS.QUESTION_RESULT, onResult);
      socket.off(HOST_EVENTS.LEADERBOARD, onLeaderboard);
      socket.off(HOST_EVENTS.FINAL, onFinal);
      socket.off(HOST_EVENTS.PAUSED, onPaused);
      socket.off(HOST_EVENTS.RESUMED, onResumed);
    };
  }, [socket]);

  // If host reloaded on this URL, ask server to re-attach us to the session.
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit(HOST_EVENTS.RECONNECT, { pin }, (resp) => {
      if (!resp?.ok) {
        show('Session not found — returning to dashboard.');
        setTimeout(() => navigate('/host'), 1200);
        return;
      }
      setPhase(resp.phase || 'lobby');
      setSummary(resp.summary || {});
      setPlayers(resp.players || []);
    });
  }, [socket, connected, pin, navigate, show]);

  const start = () => {
    socket?.emit(HOST_EVENTS.START_QUIZ, { pin }, (r) => {
      if (!r?.ok) show(r?.error || 'Could not start');
    });
  };
  const pause = () => socket?.emit(HOST_EVENTS.PAUSE, { pin });
  const resume = () => socket?.emit(HOST_EVENTS.RESUME, { pin });
  const restart = () => socket?.emit(HOST_EVENTS.RESTART_QUESTION, { pin });
  const endQuiz = () => {
    socket?.emit(HOST_EVENTS.END_QUIZ, { pin });
    setShowEndConfirm(false);
  };
  const closeSession = () => {
    socket?.emit(HOST_EVENTS.CLOSE_SESSION, { pin }, () => navigate('/host'));
  };

  return (
    <PageShell
      right={
        <>
          {phase === 'final' ? (
            <button className="btn-primary" onClick={closeSession}>
              Back to Dashboard
            </button>
          ) : (
            <button
              className="btn-danger text-sm"
              onClick={() => setShowEndConfirm(true)}
            >
              End Quiz
            </button>
          )}
        </>
      }
    >
      {view}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Presence bar always visible except on final */}
        {phase !== 'final' && <PresenceBar summary={summary} />}

        {/* --- LOBBY --- */}
        {phase === 'lobby' && (
          <Lobby
            pin={pin}
            qr={cached?.qr}
            joinUrl={cached?.joinUrl}
            players={players}
            summary={summary}
            onStart={start}
            canStart={summary.active > 0}
          />
        )}

        {/* --- QUESTION / REVEAL --- */}
        {(phase === 'question' || phase === 'reveal') && currentQ && (
          <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="glass p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="chip">
                  Question {currentQ.index + 1} / {currentQ.total}
                </div>
                <div className="text-sm text-white/60 tabular-nums">
                  {answered} / {totalPlayers} answered
                </div>
              </div>
              <h2 className="display text-2xl md:text-3xl font-bold leading-snug mb-6">
                {currentQ.question}
              </h2>
              <AnswerChart
                options={currentQ.options}
                counts={counts}
                correctIndex={phase === 'reveal' ? correctIndex : null}
              />
            </div>

            <aside className="glass p-5 md:p-6 flex flex-col items-center gap-4 lg:w-64">
              <CountdownRing
                deadline={currentQ.deadline}
                total={currentQ.timer}
                paused={paused}
                pausedRemainingMs={pausedRemainingMs}
              />

              {phase === 'reveal' && reveal && (
                <div className="w-full space-y-2">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-white/50">
                      Correct answer
                    </div>
                    <div className="display text-lg font-semibold mt-1">
                      {String.fromCharCode(65 + reveal.correctIndex)}.{' '}
                      {currentQ.options[reveal.correctIndex]}
                    </div>
                  </div>
                  <MiniStat label="Correct" value={reveal.correctCount} tone="emerald" />
                  <MiniStat label="Wrong" value={reveal.wrongCount} tone="rose" />
                  <MiniStat label="No answer" value={reveal.noAnswerCount} />
                </div>
              )}

              {phase === 'question' && (
                <div className="w-full flex flex-col gap-2">
                  {paused ? (
                    <button className="btn-primary text-sm" onClick={resume}>
                      ▶ Resume
                    </button>
                  ) : (
                    <button className="btn-secondary text-sm" onClick={pause}>
                      ⏸ Pause
                    </button>
                  )}
                  <button className="btn-ghost text-sm" onClick={restart}>
                    ↻ Restart Question
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* --- LEADERBOARD --- */}
        {phase === 'leaderboard' && (
          <Leaderboard entries={leaderboard} />
        )}

        {/* --- FINAL --- */}
        {phase === 'final' && finalData && (
          <FinalPodium podium={finalData.podium} full={finalData.top} />
        )}
      </div>

      <Modal
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title="End the quiz?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setShowEndConfirm(false)}>
              Keep going
            </button>
            <button className="btn-danger" onClick={endQuiz}>
              End Quiz
            </button>
          </>
        }
      >
        <p className="text-white/70">
          This will jump straight to the final results screen. Players who
          haven't answered the current question will get 0 points for it.
        </p>
      </Modal>
    </PageShell>
  );
}

function MiniStat({ label, value, tone = 'default' }) {
  const cls =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'rose'
      ? 'text-rose-300'
      : 'text-white';
  return (
    <div className="glass-sm px-3 py-2 flex items-center justify-between">
      <span className="text-xs text-white/60">{label}</span>
      <span className={`display font-bold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}
