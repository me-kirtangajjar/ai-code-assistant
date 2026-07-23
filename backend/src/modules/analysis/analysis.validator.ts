import { z } from 'zod';

import type { AnalysisInput } from './analysis.types.js';

export const analysisSchema: z.ZodType<AnalysisInput> = z.strictObject({
  code: z
    .string()
    .max(100_000, 'Code must contain at most 100000 characters.')
    .refine((code) => code.trim().length > 0, 'Code must not be empty.'),
});
