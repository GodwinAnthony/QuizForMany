import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config.
 *
 * The dev-mode proxy forwards `/api/*` and `/socket.io/*` to the
 * backend on port 4000. That's what makes it safe for the frontend
 * to use RELATIVE URLs (no localhost baked in). The exact same code
 * that runs against `window.location.origin` on Render works locally
 * because Vite silently proxies those two path prefixes across.
 *
 * If the developer prefers to point Vite at a different backend URL
 * during local development, they can set VITE_DEV_PROXY_TARGET in
 * `frontend/.env` (defaults to http://localhost:4000).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true, // upgrade websocket connections through the proxy
        },
      },
    },
    preview: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
