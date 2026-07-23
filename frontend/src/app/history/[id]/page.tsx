'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  Card,
  Container,
  ErrorMessage,
  ExecutionResult,
  Loading,
  ProtectedRoute,
} from '@/components';
import { useSubmission } from '@/hooks';
import { formatDateTime } from '@/lib';

function SubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const { error, isLoading, submission } = useSubmission(params.id);

  return (
    <Container as="main" className="py-8 lg:py-10">
      <Link className="text-sm font-semibold text-blue-700" href="/history">
        ← Back to history
      </Link>

      <div className="mt-5 mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Saved submission</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Submission details
          </h1>
        </div>
        {submission ? (
          <time className="text-sm text-slate-500" dateTime={submission.createdAt}>
            {formatDateTime(submission.createdAt)}
          </time>
        ) : null}
      </div>

      {isLoading ? (
        <Card className="p-5">
          <Loading label="Loading submission…" />
        </Card>
      ) : null}

      {!isLoading && error ? <ErrorMessage title="Submission unavailable" message={error} /> : null}

      {!isLoading && !error && submission ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-950">Submitted code</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {submission.language}
              </span>
            </div>
            <pre className="mt-4 max-h-[640px] min-h-64 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-100">
              {submission.code}
            </pre>
          </Card>

          <Card className="p-4 sm:p-6">
            <ExecutionResult result={submission} />
          </Card>
        </div>
      ) : null}
    </Container>
  );
}

export default function SubmissionDetailPage() {
  return (
    <ProtectedRoute>
      <SubmissionDetailContent />
    </ProtectedRoute>
  );
}
