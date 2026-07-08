/**
 * REST endpoints for quiz CRUD and file import.
 * All quizzes are persisted to backend/src/data/*.json.
 */

const express = require('express');
const multer = require('multer');

const {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} = require('../utils/quizStore');
const { parseImport } = require('../utils/importers');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (_req, res) => {
  const quizzes = await listQuizzes();
  // Return light summary to keep list responsive.
  res.json(
    quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      updatedAt: q.updatedAt,
      createdAt: q.createdAt,
    })),
  );
});

router.get('/:id', async (req, res) => {
  const quiz = await getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

router.post('/', async (req, res) => {
  const quiz = await createQuiz(req.body || {});
  res.status(201).json(quiz);
});

router.put('/:id', async (req, res) => {
  const quiz = await updateQuiz(req.params.id, req.body || {});
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

router.delete('/:id', async (req, res) => {
  const ok = await deleteQuiz(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Quiz not found' });
  res.json({ ok: true });
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const parsed = parseImport(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!parsed.questions || parsed.questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found in file' });
    }
    const quiz = await createQuiz(parsed);
    res.status(201).json(quiz);
  } catch (err) {
    res.status(400).json({ error: `Import failed: ${err.message}` });
  }
});

module.exports = router;
