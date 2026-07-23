'use client';

import { useCallback, useState } from 'react';

import { resolveProtectedRequestError } from '@/lib';
import { runPythonCode } from '@/services';
import type { SubmissionResult } from '@/types';
import { useAuth } from './useAuth';

interface UseExecutionResult {
  result: SubmissionResult | null;
  error: string | null;
  isRunning: boolean;
  execute: (code: string) => Promise<void>;
  clearResult: () => void;
}

export const useExecution = (): UseExecutionResult => {
  const { accessToken, logout } = useAuth();
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const execute = useCallback(
    async (code: string): Promise<void> => {
      if (!code.trim()) {
        setError('Enter Python code before running it.');
        return;
      }

      if (code.length > 100_000) {
        setError('Python code must contain at most 100000 characters.');
        return;
      }

      if (!accessToken) {
        setError('Your session is unavailable. Please log in again.');
        logout();
        return;
      }

      setIsRunning(true);
      setError(null);

      try {
        setResult(await runPythonCode(code, accessToken));
      } catch (requestError) {
        setResult(null);
        const resolvedError = resolveProtectedRequestError(
          requestError,
          'Python execution could not be completed.',
        );
        if (resolvedError.shouldLogout) logout();
        setError(resolvedError.message);
      } finally {
        setIsRunning(false);
      }
    },
    [accessToken, logout],
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, error, isRunning, execute, clearResult };
};
