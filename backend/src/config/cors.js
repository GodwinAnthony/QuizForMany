/**
 * CORS policy for the HTTP API and Socket.IO.
 *
 * Reads CORS_ORIGIN from the environment. Accepted forms:
 *   • Unset / empty      → allow local dev origins + any *.onrender.com host
 *                          (this is what makes a fresh Render deploy work
 *                          without extra configuration).
 *   • "*"                → allow every origin (fine for a fully public API).
 *   • Comma-separated    → e.g. "https://quizpulse.onrender.com,https://foo.com"
 *
 * Same-origin requests (frontend served from the backend itself) never
 * carry an `Origin` header for navigation and are always allowed — the
 * check below returns true for missing origins.
 */

// Origins we always allow, even if the operator forgot to configure
// CORS_ORIGIN. Covers Vite dev on 5173 and a couple of common dev URLs.
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173', // vite preview
  'http://127.0.0.1:4173',
];

// Regex matchers we always accept. `*.onrender.com` covers the case
// where the operator connects a Static Site to a Web Service on Render
// without setting CORS_ORIGIN — a very common footgun. Any concrete
// origin explicitly listed in CORS_ORIGIN still takes precedence.
const DEFAULT_PATTERNS = [
  /^https?:\/\/([a-z0-9-]+\.)*onrender\.com$/i,
];

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCorsConfig() {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  const wildcard = raw === '*';
  const configured = wildcard ? [] : parseList(raw);

  // The full allow-list = configured origins + built-in dev origins.
  const staticAllow = new Set([...configured, ...DEV_ORIGINS]);

  // Predicate used by both Express CORS and socket.io.
  function isAllowed(origin) {
    // Same-origin requests, curl, server-to-server, health checks etc.
    // send no Origin header — always allow those.
    if (!origin) return true;
    if (wildcard) return true;
    if (staticAllow.has(origin)) return true;
    return DEFAULT_PATTERNS.some((rx) => rx.test(origin));
  }

  // Express-style: (origin, callback). When we allow, we pass the exact
  // origin back (never "*") so Access-Control-Allow-Credentials can be
  // set on the response without the browser rejecting it.
  const originFn = (origin, cb) => {
    if (isAllowed(origin)) return cb(null, origin || true);
    return cb(new Error(`Origin ${origin} is not allowed by CORS policy`));
  };

  const expressOptions = {
    origin: originFn,
    credentials: false, // no cookies — Socket.IO uses its own auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  };

  // Socket.IO takes a slightly different shape but accepts the same
  // origin function.
  const socketOptions = {
    origin: (origin, cb) => {
      if (isAllowed(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not allowed by CORS policy`), false);
    },
    methods: ['GET', 'POST'],
    credentials: false,
  };

  function describe() {
    if (wildcard) return 'wildcard (*)';
    const parts = [
      configured.length ? `configured=[${configured.join(', ')}]` : null,
      `dev=[${DEV_ORIGINS.join(', ')}]`,
      `patterns=[${DEFAULT_PATTERNS.map(String).join(', ')}]`,
    ].filter(Boolean);
    return parts.join('; ');
  }

  return { expressOptions, socketOptions, isAllowed, describe };
}

module.exports = { buildCorsConfig };
