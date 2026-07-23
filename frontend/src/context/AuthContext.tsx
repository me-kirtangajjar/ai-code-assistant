'use client';

import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  isAuthenticationFailure,
  readAccessToken,
  removeAccessToken,
  saveAccessToken,
} from '@/lib';
import { getCurrentUser, login as loginRequest, register as registerRequest } from '@/services';
import type { AuthUser, LoginInput, RegisterInput } from '@/types';

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  bootstrapError: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => readAccessToken());
  const initialToken = useRef(accessToken);
  const [isLoading, setIsLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const storedToken = initialToken.current;

    if (!storedToken) {
      void Promise.resolve().then(() => {
        if (isActive) setIsLoading(false);
      });

      return () => {
        isActive = false;
      };
    }

    void getCurrentUser(storedToken)
      .then((currentUser) => {
        if (isActive) setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (!isActive) return;

        if (isAuthenticationFailure(error)) {
          removeAccessToken();
          setAccessToken(null);
          setUser(null);
          return;
        }

        setBootstrapError(
          error instanceof Error ? error.message : 'Unable to verify your current session.',
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = async (input: LoginInput): Promise<void> => {
    const result = await loginRequest(input);
    saveAccessToken(result.accessToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setBootstrapError(null);
  };

  const register = async (input: RegisterInput): Promise<void> => {
    await registerRequest(input);
  };

  const logout = (): void => {
    removeAccessToken();
    setAccessToken(null);
    setUser(null);
    setBootstrapError(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken),
      isLoading,
      bootstrapError,
      login,
      register,
      logout,
    }),
    [accessToken, bootstrapError, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
