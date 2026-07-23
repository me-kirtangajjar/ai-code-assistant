export interface AIExplanationContext {
  language: 'python';
  submittedCode: string;
  errorType: string | null;
  stderr: string;
  traceback: string | null;
}

export interface ExecutionExplanationContext extends AIExplanationContext {
  status: 'success' | 'python_error' | 'runner_error';
}

export type AIProviderErrorCode =
  | 'AI_TIMEOUT'
  | 'AI_NETWORK_ERROR'
  | 'AI_AUTHENTICATION_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE';

export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;

  constructor(code: AIProviderErrorCode) {
    super('The AI explanation provider is unavailable.');
    this.name = 'AIProviderError';
    this.code = code;
  }
}
