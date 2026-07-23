import { z } from 'zod';

import { AppError } from '../../common/index.js';
import { createValidationError } from '../../middleware/validation.middleware.js';
import type { HistoryQuery } from './history.types.js';

const paginationSchema = z
  .object({
    page: z.coerce
      .number()
      .int('Page must be an integer.')
      .positive('Page must be positive.')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be an integer.')
      .min(1, 'Limit must be at least 1.')
      .max(50, 'Limit must be at most 50.')
      .default(10),
  })
  .strict();

const submissionIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const parseHistoryQuery = (query: unknown): HistoryQuery => {
  const result = paginationSchema.safeParse(query);

  if (!result.success) {
    throw createValidationError(result.error.issues);
  }

  return result.data;
};

export const parseSubmissionId = (id: string | undefined): string => {
  const result = submissionIdSchema.safeParse(id);

  if (!result.success) {
    throw new AppError(
      400,
      'INVALID_SUBMISSION_ID',
      'Submission identifier must be a 24-character hexadecimal value.',
    );
  }

  return result.data;
};
