/**
 * quizStore
 * ---------
 * Simple JSON-file persistence for quizzes. Each quiz is stored as
 * a single JSON file under backend/src/data. No database required.
 */

const fs = require('fs/promises');
const path = require('path');
const { nanoid } = require('nanoid');

const DATA_DIR = path.resolve(__dirname, '../data');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function quizPath(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

/** Return every quiz stored on disk, newest first. */
async function listQuizzes() {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const quizzes = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf8');
      quizzes.push(JSON.parse(raw));
    } catch {
      // Skip malformed files rather than crash the listing.
    }
  }
  quizzes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return quizzes;
}

async function getQuiz(id) {
  try {
    const raw = await fs.readFile(quizPath(id), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeQuestion(q, idx) {
  const options = Array.isArray(q.options)
    ? q.options.map((o) => String(o ?? '')).filter((o) => o.length > 0)
    : [];
  const correctIndex = Math.max(0, Math.min(options.length - 1, Number(q.correctIndex) || 0));
  const timer = Math.max(5, Math.min(120, Number(q.timer) || 20));
  const basePoints = Math.max(0, Math.min(1000, Number(q.basePoints) || 100));
  return {
    id: q.id || nanoid(8),
    question: String(q.question || `Question ${idx + 1}`).trim(),
    options: options.length >= 2 ? options.slice(0, 4) : ['Option A', 'Option B'],
    correctIndex,
    timer,
    basePoints,
  };
}

function normalizeQuiz(input, existing = null) {
  const now = Date.now();
  return {
    id: existing?.id || input.id || nanoid(10),
    title: String(input.title || 'Untitled Quiz').trim(),
    description: String(input.description || '').trim(),
    questions: Array.isArray(input.questions)
      ? input.questions.map((q, i) => normalizeQuestion(q, i))
      : [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function createQuiz(input) {
  const quiz = normalizeQuiz(input);
  await fs.writeFile(quizPath(quiz.id), JSON.stringify(quiz, null, 2));
  return quiz;
}

async function updateQuiz(id, input) {
  const existing = await getQuiz(id);
  if (!existing) return null;
  const merged = normalizeQuiz({ ...existing, ...input, id }, existing);
  await fs.writeFile(quizPath(merged.id), JSON.stringify(merged, null, 2));
  return merged;
}

async function deleteQuiz(id) {
  try {
    await fs.unlink(quizPath(id));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  ensureDataDir,
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  normalizeQuiz,
};
