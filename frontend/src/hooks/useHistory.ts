'use client';

import { useCallback, useEffect, useState } from 'react';

import { resolveProtectedRequestError } from '@/lib';
import { getHistory } from '@/services';
import type { HistoryPageResult } from '@/types';
import { useAuth } from './useAuth';

interface UseHistoryResult {
  history: HistoryPageResult | null;
  error: string | null;
  isLoading: boolean;
  page: number;
  changePage: (page: number) => void;
}

export const useHistory = (): UseHistoryResult => {
  const { accessToken, logout } = useAuth();
  const [history, setHistory] = useState<HistoryPageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isActive = true;

    if (!accessToken) {
      return () => {
        isActive = false;
      };
    }

    void getHistory(accessToken, page)
      .then((result) => {
        if (isActive) setHistory(result);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;

        const resolvedError = resolveProtectedRequestError(
          requestError,
          'Submission history could not be loaded.',
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
  }, [accessToken, logout, page]);

  const changePage = useCallback(
    (nextPage: number): void => {
      if (nextPage < 1 || nextPage === page) return;
      setError(null);
      setIsLoading(true);
      setPage(nextPage);
    },
    [page],
  );

  return { history, error, isLoading, page, changePage };
};
