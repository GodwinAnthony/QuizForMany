import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-sm px-4 py-3 text-sm animate-slide-up ${
              t.type === 'error'
                ? 'border-red-400/40 text-red-100'
                : t.type === 'success'
                ? 'border-emerald-400/40 text-emerald-100'
                : ''
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx) || { push: () => {} };
}

/** Lightweight standalone toast without needing a provider. */
export function useLocalToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  const view = msg ? (
    <div className="fixed top-4 right-4 z-[100] glass-sm px-4 py-3 text-sm animate-slide-up">
      {msg}
    </div>
  ) : null;
  return { show: setMsg, view };
}
