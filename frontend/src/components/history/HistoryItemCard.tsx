import Link from 'next/link';

import { formatDateTime } from '@/lib';
import type { HistoryItem } from '@/types';

const statusStyles = {
  success: 'bg-emerald-100 text-emerald-800',
  python_error: 'bg-amber-100 text-amber-900',
  runner_error: 'bg-red-100 text-red-800',
} as const;

const statusLabels = {
  success: 'Success',
  python_error: 'Execution error',
  runner_error: 'Runner error',
} as const;

export function HistoryItemCard({ item }: Readonly<{ item: HistoryItem }>) {
  return (
    <Link
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      href={`/history/${item.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}>
            {statusLabels[item.status]}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {item.language}
          </span>
        </div>
        <time className="text-xs text-slate-500" dateTime={item.createdAt}>
          {formatDateTime(item.createdAt)}
        </time>
      </div>

      <pre className="mt-4 max-h-20 overflow-hidden rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">
        {item.codePreview}
      </pre>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Execution time</dt>
          <dd className="mt-1 font-semibold text-slate-900">{item.executionTime} ms</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Error type</dt>
          <dd className="mt-1 break-words font-semibold text-slate-900">
            {item.errorType ?? 'None'}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
