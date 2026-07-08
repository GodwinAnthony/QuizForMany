import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import PageShell from '../components/common/PageShell.jsx';
import Modal from '../components/common/Modal.jsx';
import { useLocalToast } from '../components/common/Toast.jsx';
import { api } from '../services/api.js';
import { HOST_EVENTS } from '../services/socketEvents.js';
import { useSocket } from '../contexts/SocketContext.jsx';
import { JOIN_BASE_URL } from '../config/env.js';

export default function HostDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const fileRef = useRef(null);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { show, view } = useLocalToast();

  const refresh = async () => {
    setLoading(true);
    try {
      setQuizzes(await api.listQuizzes());
    } catch (e) {
      show(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.importQuiz(file);
      show('Quiz imported');
      refresh();
    } catch (err) {
      show(err.message);
    } finally {
      setImportOpen(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startQuiz = (quiz) => {
    if (!socket) return;
    setStartingId(quiz.id);
    socket.emit(
      HOST_EVENTS.CREATE_SESSION,
      { quizId: quiz.id, joinBaseUrl: JOIN_BASE_URL },
      (resp) => {
        setStartingId(null);
        if (!resp?.ok) return show(resp?.error || 'Failed to start');
        // Stash join assets in sessionStorage so the presenter page has them.
        sessionStorage.setItem(
          `quizpulse:session:${resp.pin}`,
          JSON.stringify({
            pin: resp.pin,
            joinUrl: resp.joinUrl,
            qr: resp.qr,
            quiz: resp.quiz,
          }),
        );
        navigate(`/host/present/${resp.pin}`);
      },
    );
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteQuiz(deleteTarget.id);
      show('Deleted');
      refresh();
    } catch (e) {
      show(e.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <PageShell
      right={
        <>
          <Link to="/" className="btn-ghost text-sm">← Home</Link>
        </>
      }
    >
      {view}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="display text-3xl md:text-4xl font-bold">Your quizzes</h1>
            <p className="text-white/60 mt-1">
              Create, edit, and start live sessions.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setImportOpen(true)}
            >
              📥 Import
            </button>
            <Link to="/host/quiz/new" className="btn-primary">
              + New Quiz
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-white/50">Loading…</div>
        ) : quizzes.length === 0 ? (
          <div className="glass p-10 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <div className="display text-xl font-semibold mb-2">
              No quizzes yet
            </div>
            <p className="text-white/60 mb-6">
              Create your first quiz or import from JSON, CSV, or Excel.
            </p>
            <div className="flex justify-center gap-2">
              <Link to="/host/quiz/new" className="btn-primary">Create Quiz</Link>
              <button className="btn-secondary" onClick={() => setImportOpen(true)}>
                Import
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => (
              <div key={q.id} className="glass p-5 card-hover flex flex-col">
                <div className="flex-1">
                  <div className="chip mb-3">
                    {q.questionCount} question{q.questionCount === 1 ? '' : 's'}
                  </div>
                  <div className="display text-lg font-semibold leading-snug">
                    {q.title}
                  </div>
                  {q.description && (
                    <p className="text-white/60 text-sm mt-1 line-clamp-2">
                      {q.description}
                    </p>
                  )}
                  <div className="text-xs text-white/40 mt-3">
                    Updated {new Date(q.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="btn-primary flex-1 min-w-[130px] text-sm py-2.5"
                    onClick={() => startQuiz(q)}
                    disabled={startingId === q.id || q.questionCount === 0}
                  >
                    {startingId === q.id ? 'Starting…' : '▶ Start Live'}
                  </button>
                  <Link
                    to={`/host/quiz/${q.id}/edit`}
                    className="btn-secondary text-sm py-2.5"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn-danger text-sm py-2.5"
                    onClick={() => setDeleteTarget(q)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import quiz"
      >
        <p className="text-white/70 text-sm mb-4">
          Upload a JSON, CSV, or Excel (.xlsx) file. CSV / Excel columns:{' '}
          <code className="text-white/80">
            question, option1, option2, option3, option4, correctIndex, timer, basePoints
          </code>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,.xlsx,.xls,application/json,text/csv"
          onChange={handleImport}
          className="input"
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete quiz?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={doDelete}>
              Delete
            </button>
          </>
        }
      >
        <p className="text-white/70">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-white">
            {deleteTarget?.title}
          </span>
          ? This cannot be undone.
        </p>
      </Modal>
    </PageShell>
  );
}
