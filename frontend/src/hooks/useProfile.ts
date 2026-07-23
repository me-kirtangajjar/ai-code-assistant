'use client';

import { useEffect, useState } from 'react';

import { resolveProtectedRequestError } from '@/lib';
import { getProfile } from '@/services';
import type { UserProfile } from '@/types';
import { useAuth } from './useAuth';

interface UseProfileResult {
  profile: UserProfile | null;
  error: string | null;
  isLoading: boolean;
}

export const useProfile = (): UseProfileResult => {
  const { accessToken, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (!accessToken) {
      return () => {
        isActive = false;
      };
    }

    void getProfile(accessToken)
      .then((result) => {
        if (isActive) setProfile(result);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;

        const resolvedError = resolveProtectedRequestError(
          requestError,
          'Profile could not be loaded.',
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
  }, [accessToken, logout]);

  return { profile, error, isLoading };
};
