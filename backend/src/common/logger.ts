type LogContext = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY_PATTERN = /authorization|cookie|password|secret|token|api.?key|mongodb.?uri/i;
const MONGODB_CREDENTIAL_PATTERN = /(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi;
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~-]+/gi;

const redactString = (value: string): string =>
  value
    .replace(MONGODB_CREDENTIAL_PATTERN, '$1[REDACTED]@')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]');

const sanitizeValue = (key: string, value: unknown): unknown => {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  return value;
};

const sanitizeContext = (context: LogContext): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(key, value)]),
  );

const createEntry = (level: string, message: string, context: LogContext) =>
  JSON.stringify({
    ...sanitizeContext(context),
    timestamp: new Date().toISOString(),
    level,
    message: redactString(message),
  });

export const logger = {
  info(message: string, context: LogContext = {}): void {
    console.info(createEntry('info', message, context));
  },
  warn(message: string, context: LogContext = {}): void {
    console.warn(createEntry('warn', message, context));
  },
  error(message: string, context: LogContext = {}): void {
    console.error(createEntry('error', message, context));
  },
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? redactString(error.message) : 'Unknown error';
