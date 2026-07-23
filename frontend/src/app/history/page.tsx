'use client';

import Link from 'next/link';

import {
  Button,
  Card,
  Container,
  ErrorMessage,
  HistoryItemCard,
  Loading,
  ProtectedRoute,
} from '@/components';
import { useHistory } from '@/hooks';

function HistoryContent() {
  const { changePage, error, history, isLoading, page } = useHistory();

  return (
    <Container as="main" className="py-8 lg:py-10">
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-700">Saved submissions</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Execution history</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review your previous Python runs and educational feedback.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-5">
          <Loading label="Loading submission history…" />
        </Card>
      ) : null}

      {!isLoading && error ? <ErrorMessage title="History unavailable" message={error} /> : null}

      {!isLoading && !error && history?.items.length === 0 ? (
        <Card className="p-8 text-center sm:p-12">
          <h2 className="text-xl font-bold text-slate-950">No submissions yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Run your first Python program to create a saved history item.
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white"
            href="/dashboard"
          >
            Open code editor
          </Link>
        </Card>
      ) : null}

      {!isLoading && !error && history && history.items.length > 0 ? (
        <>
          <div className="space-y-4">
            {history.items.map((item) => (
              <HistoryItemCard key={item.id} item={item} />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              Page {page} of {Math.max(history.pagination.totalPages, 1)} ·{' '}
              {history.pagination.totalItems} total submissions
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!history.pagination.hasPreviousPage}
                onClick={() => changePage(page - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!history.pagination.hasNextPage}
                onClick={() => changePage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </Container>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
