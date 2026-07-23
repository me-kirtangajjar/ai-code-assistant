'use client';

import { useState } from 'react';

import {
  Button,
  Card,
  CodeEditor,
  Container,
  ErrorMessage,
  ExecutionResult,
  Loading,
  ProtectedRoute,
} from '@/components';
import { useAuth, useExecution } from '@/hooks';

const DEFAULT_CODE = 'print("Hello World")';

function DashboardContent() {
  const { bootstrapError, user } = useAuth();
  const { clearResult, error, execute, isRunning, result } = useExecution();
  const [code, setCode] = useState(DEFAULT_CODE);

  const handleCodeChange = (nextCode: string): void => {
    setCode(nextCode);
    if (result || error) clearResult();
  };

  return (
    <Container as="main" className="py-8 lg:py-10">
      <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">Code workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Run code and review output, interpreter errors, and educational feedback.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          Code · 5 second limit · No stdin
        </div>
      </div>

      {bootstrapError ? (
        <div className="mb-6">
          <ErrorMessage title="Session verification unavailable" message={bootstrapError} />
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Code editor</h2>
              <p className="mt-1 text-sm text-slate-500">Write or paste your source code.</p>
            </div>
            <Button
              type="button"
              onClick={() => void execute(code)}
              disabled={isRunning || !code.trim()}
              aria-busy={isRunning}
            >
              {isRunning ? 'Running…' : 'Run code'}
            </Button>
          </div>

          <CodeEditor value={code} onChange={handleCodeChange} readOnly={isRunning} />

          <div className="mt-3 flex justify-between gap-4 text-xs text-slate-500">
            <span>Source code only</span>
            <span>{code.length.toLocaleString()} / 100,000 characters</span>
          </div>
        </Card>

        <Card className="min-h-[520px] p-4 sm:p-6" aria-live="polite" aria-busy={isRunning}>
          {isRunning ? <Loading label="Code is running securely…" /> : null}

          {!isRunning && error ? <ErrorMessage message={error} title="Execution failed" /> : null}

          {!isRunning && result ? <ExecutionResult result={result} onUseCode={handleCodeChange} /> : null}

          {!isRunning && !error && !result ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center px-5 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 font-mono text-lg font-bold text-blue-700">
                &gt;_
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Ready to run</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your execution status, stdout, stderr, timing, error type, and AI feedback will
                appear here.
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </Container>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
