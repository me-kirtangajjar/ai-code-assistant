import { ApiClientError } from './api-client';

interface ProtectedRequestError {
  message: string;
  shouldLogout: boolean;
}

export const isAuthenticationFailure = (error: unknown): boolean =>
  error instanceof ApiClientError && error.status === 401;

export const resolveProtectedRequestError = (
  error: unknown,
  fallbackMessage: string,
): ProtectedRequestError => {
  if (isAuthenticationFailure(error)) {
    return {
      message: 'Your session has expired. Please log in again.',
      shouldLogout: true,
    };
  }

  return {
    message: error instanceof Error ? error.message : fallbackMessage,
    shouldLogout: false,
  };
};
