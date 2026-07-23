import { config as loadEnvironmentFile } from 'dotenv';
import { z } from 'zod';

loadEnvironmentFile({ quiet: true });

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65_535),
    MONGODB_URI: z
      .string()
      .min(1)
      .refine((value) => value === value.trim(), 'MONGODB_URI must not contain outer whitespace.')
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.',
      ),
    JWT_SECRET: z
      .string()
      .min(32)
      .refine((value) => value === value.trim(), 'JWT_SECRET must not contain outer whitespace.')
      .refine((value) => Buffer.byteLength(value, 'utf8') >= 32, {
        message: 'JWT_SECRET must contain at least 32 UTF-8 bytes.',
      }),
    JWT_EXPIRES_IN: z.literal('7d'),
    PYTHON_RUNNER_IMAGE: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._/@:-]{0,254}$/)
      .default('ai-code-error-feedback-python-runner:1.0.0'),
    EXECUTION_TIMEOUT_MS: z.coerce.number().int().min(100).max(5_000).default(5_000),
    EXECUTION_MEMORY_MB: z.coerce.number().int().min(32).max(256).default(256),
    EXECUTION_CPU_LIMIT: z.coerce.number().positive().max(1).default(1),
    EXECUTION_OUTPUT_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(1_048_576)
      .default(1_048_576),
    EXECUTION_PID_LIMIT: z.coerce.number().int().min(8).max(64).default(64),
    EXECUTION_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
    GEMINI_API_KEY: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    GEMINI_MODEL: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9._-]{0,100}$/)
      .default('gemini-3.5-flash'),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
  })
  .superRefine((environment, context) => {
    if (environment.AI_PROVIDER === 'gemini' && !environment.GEMINI_API_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is required when AI_PROVIDER is gemini.',
      });
    }

    if (
      environment.NODE_ENV === 'production' &&
      /replace|example|change-me|development/i.test(environment.JWT_SECRET)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must use a production secret.',
      });
    }
  });

export type Environment = Readonly<{
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: '7d';
  pythonRunnerImage: string;
  executionTimeoutMs: number;
  executionMemoryMb: number;
  executionCpuLimit: number;
  executionOutputLimitBytes: number;
  executionPidLimit: number;
  executionMaxConcurrency: number;
  aiProvider: 'mock' | 'gemini';
  geminiApiKey: string | undefined;
  geminiModel: string;
  geminiTimeoutMs: number;
}>;

let cachedEnvironment: Environment | undefined;

export const getEnvironment = (): Environment => {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    const invalidFields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
      .filter(Boolean)
      .join(', ');

    throw new Error(
      `Invalid backend environment configuration: ${invalidFields || 'unknown field'}.`,
    );
  }

  cachedEnvironment = Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    mongodbUri: result.data.MONGODB_URI,
    jwtSecret: result.data.JWT_SECRET,
    jwtExpiresIn: result.data.JWT_EXPIRES_IN,
    pythonRunnerImage: result.data.PYTHON_RUNNER_IMAGE,
    executionTimeoutMs: result.data.EXECUTION_TIMEOUT_MS,
    executionMemoryMb: result.data.EXECUTION_MEMORY_MB,
    executionCpuLimit: result.data.EXECUTION_CPU_LIMIT,
    executionOutputLimitBytes: result.data.EXECUTION_OUTPUT_LIMIT_BYTES,
    executionPidLimit: result.data.EXECUTION_PID_LIMIT,
    executionMaxConcurrency: result.data.EXECUTION_MAX_CONCURRENCY,
    aiProvider: result.data.AI_PROVIDER,
    geminiApiKey: result.data.GEMINI_API_KEY,
    geminiModel: result.data.GEMINI_MODEL,
    geminiTimeoutMs: result.data.GEMINI_TIMEOUT_MS,
  });

  return cachedEnvironment;
};
