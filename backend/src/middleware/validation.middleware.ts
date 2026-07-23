import type { RequestHandler } from 'express';
import type { ZodIssue, ZodType } from 'zod';

import { AppError, type ApiErrorDetail } from '../common/index.js';

export const createValidationError = (issues: readonly ZodIssue[]): AppError => {
  const errors: ApiErrorDetail[] = issues.map((issue) => ({
    code: 'VALIDATION_ERROR',
    field: issue.path.map(String).join('.'),
    message: issue.message,
  }));

  return new AppError(400, 'VALIDATION_ERROR', 'Validation failed.', errors);
};

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(createValidationError(result.error.issues));
      return;
    }

    request.body = result.data;
    next();
  };
