/**
 * Environment / runtime configuration for the frontend.
 *
 * We resolve the backend base URL in this order:
 *   1. import.meta.env.VITE_API_URL     — preferred (new name)
 *   2. import.meta.env.VITE_SERVER_URL  — legacy name, still honoured
 *   3. window.location.origin           — same-origin fallback
 *
 * There is DELIBERATELY no `http://localhost:4000` fallback. Baking a
 * localhost URL into the production bundle is what breaks Render:
 * the shipped JS ends up trying to talk to the *end-user's* machine
 * on port 4000. Using `window.location.origin` means:
 *   - In local dev, Vite's proxy (see vite.config.js) forwards `/api`
 *     and `/socket.io` to the backend on port 4000.
 *   - On Render (single service), the browser already loaded the SPA
 *     from the backend URL, so same-origin just works.
 *   - On Render (two services), you set VITE_API_URL to the backend
 *     service URL before `npm run build`.
 *
 * Trailing slashes on the base URL are stripped so callers can
 * safely concatenate with `${API_BASE_URL}/api/...`.
 */

function pickBaseUrl() {
  const fromEnv =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SERVER_URL ||
    '';

  const raw = (fromEnv && fromEnv.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // Strip trailing slashes so `${base}/api/x` never becomes `//api/x`.
  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = pickBaseUrl();

// The Socket.IO base URL is the same host as the API. When both are
// same-origin (empty string or window.location.origin), socket.io-client
// happily connects to the current page's origin.
export const SOCKET_URL = API_BASE_URL;

// Legacy export kept so any straggling `import { SERVER_URL }` still works.
export const SERVER_URL = API_BASE_URL;

// URL players scan / open to join a session. Always the site the host is
// looking at right now — never the backend, which may be a different domain.
export const JOIN_BASE_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/play` : '/play';
