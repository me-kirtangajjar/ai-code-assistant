'use client';

import Link from 'next/link';

import { Button, Card, Container, ErrorMessage } from '@/components';

export default function ApplicationError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <Container as="main" className="py-12">
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        <ErrorMessage
          title="Page unavailable"
          message="This page could not be displayed. You can try again or return to the dashboard."
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
            href="/dashboard"
          >
            Return to dashboard
          </Link>
        </div>
      </Card>
    </Container>
  );
}
