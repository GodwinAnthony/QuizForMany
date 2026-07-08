import { useRef, useState, useEffect } from 'react';

/**
 * Small top-of-dashboard summary: Total / Active / Offline.
 * The Offline count is a button that opens a dropdown with names.
 */
export default function PresenceBar({ summary }) {
  const { total = 0, active = 0, offline = 0, offlineNames = [] } = summary || {};
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="glass-sm px-4 py-3 flex flex-wrap items-center gap-3 md:gap-6">
      <Metric label="Total Participants" value={total} />
      <div className="h-6 w-px bg-white/10 hidden md:block" />
      <Metric label="Active Players" value={active} tone="emerald" />
      <div className="h-6 w-px bg-white/10 hidden md:block" />
      <div className="relative" ref={ref}>
        <button
          type="button"
          className={`flex items-center gap-3 rounded-xl px-2 py-1 -mx-2 transition-colors ${
            offline > 0 ? 'hover:bg-white/5' : 'opacity-70 cursor-default'
          }`}
          onClick={() => offline > 0 && setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Metric label="Offline Players" value={offline} tone="rose" />
          {offline > 0 && (
            <span className="text-white/40 text-xs">{open ? '▲' : '▼'}</span>
          )}
        </button>
        {open && offline > 0 && (
          <div className="absolute z-30 mt-2 right-0 min-w-[220px] glass-sm p-3">
            <div className="text-xs text-white/50 uppercase tracking-widest mb-2">
              Offline Players ({offline})
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {offlineNames.map((n, i) => (
                <div key={i} className="text-sm px-2 py-1.5 rounded-md hover:bg-white/5">
                  • {n}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'rose'
      ? 'text-rose-300'
      : 'text-white';
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-widest text-white/50">{label}</span>
      <span className={`display text-xl font-bold ${toneCls}`}>{value}</span>
    </div>
  );
}
