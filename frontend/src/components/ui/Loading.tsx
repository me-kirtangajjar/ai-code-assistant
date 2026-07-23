interface LoadingProps {
  label?: string;
  compact?: boolean;
}

export function Loading({ label = 'Loading…', compact = false }: LoadingProps) {
  return (
    <div
      className={`flex items-center justify-center gap-3 text-slate-600 ${compact ? 'py-2' : 'min-h-48 py-10'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-atomic="true"
    >
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold tracking-widest text-blue-800"
        aria-hidden="true"
      >
        …
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
