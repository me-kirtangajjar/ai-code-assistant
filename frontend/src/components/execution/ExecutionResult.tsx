import { parseAIExplanation } from '@/lib';
import type { SubmissionResult } from '@/types';

interface ExecutionResultProps {
  result: SubmissionResult;
}

const statusStyles = {
  success: 'bg-emerald-100 text-emerald-800',
  python_error: 'bg-amber-100 text-amber-900',
  runner_error: 'bg-red-100 text-red-800',
} as const;

const statusLabels = {
  success: 'Success',
  python_error: 'Python error',
  runner_error: 'Runner error',
} as const;

function OutputBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</h3>
      <pre className="max-h-52 min-h-20 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">
        {value || 'No output.'}
      </pre>
    </div>
  );
}

export function ExecutionResult({ result }: ExecutionResultProps) {
  const aiSections = result.aiExplanation ? parseAIExplanation(result.aiExplanation) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Execution result
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Python output</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[result.status]}`}>
          {statusLabels[result.status]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate-500">Execution time</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{result.executionTime} ms</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Exit code</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{result.exitCode ?? 'N/A'}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-slate-500">Error type</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
            {result.errorType ?? 'None'}
          </dd>
        </div>
      </dl>

      <OutputBlock label="Standard output" value={result.stdout} />
      <OutputBlock label="Standard error" value={result.stderr} />

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-xl font-bold text-slate-950">AI feedback</h2>

        {!aiSections ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No AI explanation available.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Explanation</h3>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                {aiSections.explanation}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Suggested Fix</h3>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-700">
                {aiSections.suggestedFix}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Corrected Code</h3>
              {aiSections.correctedCode ? (
                <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">
                  {aiSections.correctedCode}
                </pre>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No corrected code was provided.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
