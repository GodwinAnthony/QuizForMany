import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer = null, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className={`relative glass w-full ${sizes[size]} p-6 animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
