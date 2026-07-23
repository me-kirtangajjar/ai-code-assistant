import type { ApiErrorDetail, ApiFailure, ApiSuccess } from '@/types';

const API_PREFIX = '/api/v1';

const fallbackMessages: Readonly<Record<number, string>> = {
  400: 'Check the information you entered and try again.',
  401: 'Your session is invalid or has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested service could not be found.',
  409: 'This information is already in use.',
  413: 'The submitted content is too large.',
  422: 'The code produced more output than the allowed limit.',
  500: 'The server encountered an unexpected error.',
  503: 'The service is temporarily unavailable. Please try again.',
  504: 'Python execution exceeded the allowed time.',
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(message: string, status = 0, code = 'NETWORK_ERROR', details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  getFieldMessage(field: string): string | undefined {
    return this.details.find((detail) => detail.field === field)?.message;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: unknown;
}

const isApiFailure = (value: unknown): value is ApiFailure => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiFailure>;
  return candidate.success === false && typeof candidate.message === 'string';
};

const isApiSuccess = <T>(value: unknown): value is ApiSuccess<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ApiSuccess<T>>;
  return candidate.success === true && typeof candidate.message === 'string' && 'data' in candidate;
};

export const apiRequest = async <T>(
  path: string,
  { token, body, headers, ...options }: ApiRequestOptions = {},
): Promise<ApiSuccess<T>> => {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError(
      'Unable to reach the server. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new ApiClientError(
      fallbackMessages[response.status] ?? 'The server returned an invalid response.',
      response.status,
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok || isApiFailure(responseBody)) {
    const failure = isApiFailure(responseBody) ? responseBody : null;
    const details = Array.isArray(failure?.errors) ? failure.errors : [];
    throw new ApiClientError(
      failure?.message ||
        fallbackMessages[response.status] ||
        'The request could not be completed.',
      response.status,
      details[0]?.code ?? `HTTP_${response.status}`,
      details,
    );
  }

  if (!isApiSuccess<T>(responseBody)) {
    throw new ApiClientError(
      'The server returned an invalid response.',
      response.status,
      'INVALID_RESPONSE',
    );
  }

  return responseBody;
};
