import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

import { SOCKET_URL } from '../config/env.js';

const SocketContext = createContext(null);

/**
 * Provides a shared Socket.IO connection to the app.
 *
 * The URL resolution mirrors the REST base URL (see config/env.js) so
 * the client connects to:
 *   • the value of VITE_API_URL / VITE_SERVER_URL when set at build,
 *   • otherwise `window.location.origin` (same-origin — works for both
 *     local dev (Vite proxies `/socket.io/*`) and Render single-service).
 *
 * We prefer `websocket` transport with a `polling` fallback because
 * some managed hosts (including Render Free) may delay or restrict
 * the initial upgrade path; polling first ensures the handshake
 * always succeeds, then upgrades transparently.
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // When SOCKET_URL is an empty string, socket.io-client connects
    // to the current page's origin — exactly what we want for
    // same-origin deployments.
    const s = io(SOCKET_URL || undefined, {
      // polling → websocket upgrade is the safest handshake path on
      // managed hosts. socket.io still upgrades to WS as soon as it can.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      // Same-origin deployments don't need credentials; when the
      // backend is a different origin, CORS is configured on the
      // server (see server.js) to allow this client's origin.
      withCredentials: false,
    });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => {
      // Non-fatal: socket.io will keep retrying. Surface for debugging
      // Render CORS / URL misconfigurations without spamming users.
      // eslint-disable-next-line no-console
      console.warn('[socket] connect_error:', err.message);
    });

    setSocket(s);
    return () => {
      s.close();
    };
  }, []);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
