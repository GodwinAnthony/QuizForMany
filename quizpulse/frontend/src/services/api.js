/**
 * REST client for quiz CRUD + file import.
 * All calls go through a single `request` helper that adds the base
 * URL, handles JSON serialisation, and surfaces backend error messages.
 */

import { SERVER_URL } from '../config/env.js';

async function request(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listQuizzes: () => request('/api/quizzes'),
  getQuiz: (id) => request(`/api/quizzes/${id}`),
  createQuiz: (data) => request('/api/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) =>
    request(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, { method: 'DELETE' }),
  importQuiz: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/quizzes/import', { method: 'POST', body: fd });
  },
};
