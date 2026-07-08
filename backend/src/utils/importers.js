/**
 * importers
 * ---------
 * Parse quiz definitions from JSON, CSV, or XLSX buffers into the
 * canonical quiz shape used by quizStore.
 *
 * Expected columns for CSV / XLSX:
 *   question, option1, option2, option3, option4,
 *   correctIndex, timer, basePoints
 */

const { parse: parseCsv } = require('csv-parse/sync');
const XLSX = require('xlsx');

function rowsToQuestions(rows) {
  return rows
    .filter((r) => r && (r.question || r.Question))
    .map((r) => {
      const q = r.question ?? r.Question ?? '';
      const options = [
        r.option1 ?? r.Option1 ?? r['Option 1'],
        r.option2 ?? r.Option2 ?? r['Option 2'],
        r.option3 ?? r.Option3 ?? r['Option 3'],
        r.option4 ?? r.Option4 ?? r['Option 4'],
      ]
        .map((o) => (o == null ? '' : String(o).trim()))
        .filter((o) => o.length > 0);
      const correctIndex = Number(r.correctIndex ?? r.CorrectIndex ?? 0);
      const timer = Number(r.timer ?? r.Timer ?? 20);
      const basePoints = Number(r.basePoints ?? r.BasePoints ?? 100);
      return {
        question: String(q).trim(),
        options,
        correctIndex: Number.isFinite(correctIndex) ? correctIndex : 0,
        timer: Number.isFinite(timer) ? timer : 20,
        basePoints: Number.isFinite(basePoints) ? basePoints : 100,
      };
    });
}

function parseJson(buffer) {
  const data = JSON.parse(buffer.toString('utf8'));
  if (Array.isArray(data)) {
    return { title: 'Imported Quiz', questions: data };
  }
  return {
    title: data.title || 'Imported Quiz',
    description: data.description || '',
    questions: Array.isArray(data.questions) ? data.questions : [],
  };
}

function parseCsvBuffer(buffer) {
  const rows = parseCsv(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return {
    title: 'Imported Quiz',
    description: '',
    questions: rowsToQuestions(rows),
  };
}

function parseXlsxBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return {
    title: sheetName || 'Imported Quiz',
    description: '',
    questions: rowsToQuestions(rows),
  };
}

function parseImport(buffer, mimetype, filename = '') {
  const lower = filename.toLowerCase();
  if (mimetype === 'application/json' || lower.endsWith('.json')) {
    return parseJson(buffer);
  }
  if (mimetype === 'text/csv' || lower.endsWith('.csv')) {
    return parseCsvBuffer(buffer);
  }
  if (
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    mimetype.includes('sheet') ||
    mimetype.includes('excel')
  ) {
    return parseXlsxBuffer(buffer);
  }
  // Fallback: try JSON.
  return parseJson(buffer);
}

module.exports = { parseImport };
