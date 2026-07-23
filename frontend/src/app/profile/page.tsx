'use client';

import { Card, Container, ErrorMessage, Loading, ProtectedRoute } from '@/components';
import { useProfile } from '@/hooks';
import { formatDateTime } from '@/lib';

function ProfileContent() {
  const { error, isLoading, profile } = useProfile();

  return (
    <Container as="main" className="py-8 lg:py-10">
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-700">Student account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          View your account details and Python execution statistics.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-5">
          <Loading label="Loading profile…" />
        </Card>
      ) : null}

      {!isLoading && error ? <ErrorMessage title="Profile unavailable" message={error} /> : null}

      {!isLoading && !error && profile ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">Account information</h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Name
                </dt>
                <dd className="mt-1 break-words text-base font-semibold text-slate-950">
                  {profile.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Email
                </dt>
                <dd className="mt-1 break-words text-base text-slate-800">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Account created
                </dt>
                <dd className="mt-1 text-base text-slate-800">
                  <time dateTime={profile.createdAt}>{formatDateTime(profile.createdAt)}</time>
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">Execution statistics</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-800">Total runs</p>
                <p className="mt-2 text-3xl font-bold text-blue-950">
                  {profile.statistics.totalRuns}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-800">Successful runs</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">
                  {profile.statistics.successfulRuns}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-5">
                <p className="text-sm font-medium text-red-800">Failed runs</p>
                <p className="mt-2 text-3xl font-bold text-red-950">
                  {profile.statistics.failedRuns}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-500">
              Failed runs include Python errors and runner failures. Statistics are read-only and
              scoped to your account.
            </p>
          </Card>
        </div>
      ) : null}
    </Container>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
