import Link from 'next/link';

import { Card, Container } from '@/components';

export default function NotFoundPage() {
  return (
    <Container as="main" className="py-12">
      <Card className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm font-semibold text-blue-700">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you requested does not exist or is no longer available.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white"
          href="/dashboard"
        >
          Return to dashboard
        </Link>
      </Card>
    </Container>
  );
}
