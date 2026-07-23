import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import type { Request, RequestHandler } from 'express';

import { logger } from '../common/index.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const getRequestId = (request: Request): string => {
  const suppliedRequestId = request.header('x-request-id')?.trim();
  return suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
};

const getRouteLabel = (request: Request): string => {
  const routePath: unknown = request.route?.path;
  return typeof routePath === 'string' ? `${request.baseUrl}${routePath}` : 'unmatched';
};

export const requestContext: RequestHandler = (request, response, next) => {
  const startedAt = performance.now();
  const requestId = getRequestId(request);

  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  response.once('finish', () => {
    logger.info('HTTP request completed.', {
      requestId,
      method: request.method,
      route: getRouteLabel(request),
      statusCode: response.statusCode,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
  });

  next();
};
