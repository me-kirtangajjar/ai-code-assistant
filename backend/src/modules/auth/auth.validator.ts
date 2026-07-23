import { z } from 'zod';

import type { LoginInput, RegisterInput } from './auth.types.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(64, 'Password must contain at most 64 characters.')
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'Password must contain at most 72 UTF-8 bytes.',
  });

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email must contain at most 254 characters.')
  .email('Enter a valid email address.');

export const registerSchema: z.ZodType<RegisterInput> = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters.')
    .max(100, 'Name must contain at most 100 characters.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema: z.ZodType<LoginInput> = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});
