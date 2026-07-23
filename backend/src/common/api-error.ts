export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly errors: readonly ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    errors: readonly ApiErrorDetail[] = [{ code, message }],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
