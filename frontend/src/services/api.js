/**
 * REST client for quiz CRUD + file import.
 *
 * All calls go through a single `request` helper that:
 *   • Prefixes the configured API base URL (may be empty for same-origin).
 *   • Adds JSON headers for JSON payloads (never for FormData — the
 *     browser needs to set its own multipart boundary).
 *   • Surfaces backend error messages from the JSON body when possible.
 *
 * The base URL comes from `config/env.js`, which safely resolves it
 * from VITE_API_URL / VITE_SERVER_URL / window.location.origin — with
 * NO hardcoded localhost fallback (that's what broke Render).
 */

import { API_BASE_URL } from '../config/env.js';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const isForm = options.body instanceof FormData;

  const headers = {
    // Only set Content-Type for JSON payloads. Setting it for FormData
    // would strip the multipart boundary and break file uploads.
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    // Turn low-level "Failed to fetch" / CORS errors into an actionable
    // message. Most Render deployment issues surface here.
    throw new Error(
      `Network error contacting the server. ` +
        `Check that the backend is running and CORS is configured for this origin. ` +
        `(${networkErr.message})`,
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listQuizzes: () => request('/api/quizzes'),
  getQuiz: (id) => request(`/api/quizzes/${id}`),
  createQuiz: (data) =>
    request('/api/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) =>
    request(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, { method: 'DELETE' }),
  importQuiz: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/api/quizzes/import', { method: 'POST', body: fd });
  },
};
