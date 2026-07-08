export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };
  return (
    <div className={`display font-bold ${sizes[size]} flex items-center gap-2`}>
      <span
        aria-hidden
        className="inline-block w-8 h-8 rounded-xl bg-brand-gradient shadow-glow"
      />
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
        QuizPulse
      </span>
    </div>
  );
}
