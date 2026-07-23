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
        setError('Enter code before running it.');
        setIsRunning(false);
        return;
      }

      if (code.length > 100000) {
        setError('Code must contain at most 100000 characters.');
        setIsRunning(false);
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
          'Execution could not be completed.',
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
