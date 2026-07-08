import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageShell from '../components/common/PageShell.jsx';
import Modal from '../components/common/Modal.jsx';
import { useLocalToast } from '../components/common/Toast.jsx';
import { api } from '../services/api.js';

const blankQuestion = () => ({
  question: '',
  options: ['', ''],
  correctIndex: 0,
  timer: 20,
  basePoints: 100,
});

export default function HostQuizEditor() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const { show, view } = useLocalToast();

  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    questions: [blankQuestion()],
  });
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const q = await api.getQuiz(id);
        setQuiz({
          title: q.title || '',
          description: q.description || '',
          questions:
            q.questions?.length > 0 ? q.questions : [blankQuestion()],
        });
      } catch (e) {
        show(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canSave = useMemo(() => {
    if (!quiz.title.trim()) return false;
    if (quiz.questions.length === 0) return false;
    for (const q of quiz.questions) {
      if (!q.question.trim()) return false;
      const opts = q.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return false;
      if (q.correctIndex < 0 || q.correctIndex >= opts.length) return false;
    }
    return true;
  }, [quiz]);

  const updateQuestion = (idx, patch) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    }));
  };

  const addOption = (qIdx) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === qIdx && q.options.length < 4
          ? { ...q, options: [...q.options, ''] }
          : q,
      ),
    }));
  };

  const removeOption = (qIdx, oIdx) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIdx || q.options.length <= 2) return q;
        const options = q.options.filter((_, j) => j !== oIdx);
        let correctIndex = q.correctIndex;
        if (correctIndex === oIdx) correctIndex = 0;
        else if (correctIndex > oIdx) correctIndex -= 1;
        return { ...q, options, correctIndex };
      }),
    }));
  };

  const addQuestion = () => {
    setQuiz((prev) => ({ ...prev, questions: [...prev.questions, blankQuestion()] }));
  };

  const removeQuestion = (idx) => {
    setQuiz((prev) => ({
      ...prev,
      questions:
        prev.questions.length === 1
          ? [blankQuestion()]
          : prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const moveQuestion = (idx, dir) => {
    setQuiz((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.questions.length) return prev;
      const arr = [...prev.questions];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...prev, questions: arr };
    });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: quiz.title.trim(),
        description: quiz.description.trim(),
        questions: quiz.questions.map((q) => ({
          ...q,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      };
      if (editing) await api.updateQuiz(id, payload);
      else await api.createQuiz(payload);
      show('Saved');
      navigate('/host');
    } catch (e) {
      show(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="text-white/50">Loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      right={
        <>
          <button className="btn-ghost text-sm" onClick={() => navigate('/host')}>
            ← Back
          </button>
          <button
            className="btn-primary"
            disabled={!canSave || saving}
            onClick={save}
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create quiz'}
          </button>
        </>
      }
    >
      {view}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="glass p-6">
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
            Quiz title
          </label>
          <input
            className="input text-lg"
            placeholder="e.g. Team trivia night"
            value={quiz.title}
            onChange={(e) => setQuiz((p) => ({ ...p, title: e.target.value }))}
            maxLength={100}
          />
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 mt-4">
            Description (optional)
          </label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="What is this quiz about?"
            value={quiz.description}
            onChange={(e) => setQuiz((p) => ({ ...p, description: e.target.value }))}
            maxLength={280}
          />
        </div>

        {quiz.questions.map((q, idx) => (
          <QuestionCard
            key={idx}
            index={idx}
            total={quiz.questions.length}
            question={q}
            onChange={(patch) => updateQuestion(idx, patch)}
            onOptionChange={(oIdx, val) => updateOption(idx, oIdx, val)}
            onAddOption={() => addOption(idx)}
            onRemoveOption={(oIdx) => removeOption(idx, oIdx)}
            onRemove={() => removeQuestion(idx)}
            onMoveUp={() => moveQuestion(idx, -1)}
            onMoveDown={() => moveQuestion(idx, +1)}
            onPreview={() => setPreviewIndex(idx)}
          />
        ))}

        <button className="btn-secondary w-full py-4" onClick={addQuestion}>
          + Add question
        </button>
      </div>

      <Modal
        open={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        title={`Preview — Question ${previewIndex + 1}`}
        size="lg"
      >
        {previewIndex !== null && (
          <QuestionPreview q={quiz.questions[previewIndex]} />
        )}
      </Modal>
    </PageShell>
  );
}

function QuestionCard({
  index,
  total,
  question,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPreview,
}) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="chip">Question {index + 1} of {total}</div>
        <div className="flex gap-1">
          <IconBtn title="Move up" onClick={onMoveUp} disabled={index === 0}>▲</IconBtn>
          <IconBtn title="Move down" onClick={onMoveDown} disabled={index === total - 1}>▼</IconBtn>
          <IconBtn title="Preview" onClick={onPreview}>👁</IconBtn>
          <IconBtn title="Delete" onClick={onRemove} danger>🗑</IconBtn>
        </div>
      </div>

      <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
        Question
      </label>
      <textarea
        className="input min-h-[70px] resize-none"
        placeholder="What are you asking?"
        value={question.question}
        onChange={(e) => onChange({ question: e.target.value })}
        maxLength={280}
      />

      <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 mt-4">
        Options (2–4)
      </label>
      <div className="space-y-2">
        {question.options.map((opt, oIdx) => (
          <div key={oIdx} className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => onChange({ correctIndex: oIdx })}
              className={`w-10 h-10 shrink-0 rounded-xl border font-semibold transition-all ${
                question.correctIndex === oIdx
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
              title="Set as correct answer"
              aria-label="Mark as correct"
            >
              {question.correctIndex === oIdx ? '✓' : String.fromCharCode(65 + oIdx)}
            </button>
            <input
              className="input"
              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
              value={opt}
              onChange={(e) => onOptionChange(oIdx, e.target.value)}
              maxLength={140}
            />
            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(oIdx)}
                className="text-white/40 hover:text-red-300 px-2"
                aria-label="Remove option"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {question.options.length < 4 && (
          <button className="btn-ghost text-sm mt-1" onClick={onAddOption}>
            + Add option
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
            Timer (seconds)
          </label>
          <input
            type="number"
            min="5"
            max="120"
            className="input"
            value={question.timer}
            onChange={(e) =>
              onChange({ timer: Math.max(5, Math.min(120, Number(e.target.value) || 20)) })
            }
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">
            Base points
          </label>
          <input
            type="number"
            min="0"
            max="1000"
            className="input"
            value={question.basePoints}
            onChange={(e) =>
              onChange({ basePoints: Math.max(0, Math.min(1000, Number(e.target.value) || 100)) })
            }
          />
        </div>
      </div>
      <p className="text-xs text-white/40 mt-3">
        Scoring is speed-based: max 100 pts, min 50 pts for a correct answer.
        Base points are stored per question for future use.
      </p>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title, danger }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-lg text-sm transition-colors ${
        disabled
          ? 'text-white/20 cursor-not-allowed'
          : danger
          ? 'text-red-300 hover:bg-red-500/15'
          : 'text-white/70 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function QuestionPreview({ q }) {
  return (
    <div>
      <div className="text-white/60 text-sm mb-1">Timer: {q.timer}s</div>
      <div className="display text-2xl font-semibold mb-6">{q.question || '—'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl border ${
              i === q.correctIndex
                ? 'bg-emerald-500/15 border-emerald-400/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="text-xs text-white/50 mb-1">
              Option {String.fromCharCode(65 + i)}
              {i === q.correctIndex ? ' · Correct' : ''}
            </div>
            <div>{opt || <span className="text-white/40">(empty)</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
