'use client';

import { useEffect, useState } from 'react';

import { resolveProtectedRequestError } from '@/lib';
import { getSubmission } from '@/services';
import type { SubmissionDetail } from '@/types';
import { useAuth } from './useAuth';

interface UseSubmissionResult {
  submission: SubmissionDetail | null;
  error: string | null;
  isLoading: boolean;
}

export const useSubmission = (submissionId: string): UseSubmissionResult => {
  const { accessToken, logout } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (!accessToken || !submissionId) {
      return () => {
        isActive = false;
      };
    }

    void getSubmission(accessToken, submissionId)
      .then((result) => {
        if (isActive) setSubmission(result);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;

        const resolvedError = resolveProtectedRequestError(
          requestError,
          'Submission could not be loaded.',
        );
        if (resolvedError.shouldLogout) logout();
        setError(resolvedError.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, logout, submissionId]);

  return { submission, error, isLoading };
};
