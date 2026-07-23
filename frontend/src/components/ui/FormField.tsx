import type { InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ id, label, error, hint, className = '', ...props }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`min-h-11 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${error ? 'border-red-400' : 'border-slate-300'} ${className}`}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        aria-errormessage={error ? errorId : undefined}
      />
      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-sm text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
