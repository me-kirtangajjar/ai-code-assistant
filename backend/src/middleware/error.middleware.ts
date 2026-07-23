import type { ErrorRequestHandler, RequestHandler } from 'express';

import { AppError, getErrorMessage, logger } from '../common/index.js';

interface ExpressBodyError {
  status?: number;
  type?: string;
}

const isExpressBodyError = (error: unknown): error is ExpressBodyError =>
  typeof error === 'object' && error !== null;

const sendFailure = (
  response: Parameters<ErrorRequestHandler>[2],
  statusCode: number,
  message: string,
  errors: readonly { code: string; message: string; field?: string }[],
): void => {
  response.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  void request;
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route was not found.'));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  if (error instanceof AppError) {
    sendFailure(response, error.statusCode, error.message, error.errors);
    return;
  }

  if (isExpressBodyError(error) && error.status === 400 && error.type === 'entity.parse.failed') {
    sendFailure(response, 400, 'Request body contains invalid JSON.', [
      {
        code: 'INVALID_JSON',
        message: 'Provide a valid JSON request body.',
      },
    ]);
    return;
  }

  if (isExpressBodyError(error) && error.status === 413) {
    sendFailure(response, 413, 'Request payload is too large.', [
      {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Reduce the request payload size.',
      },
    ]);
    return;
  }

  logger.error('Unhandled request error.', {
    method: request.method,
    requestId: request.requestId,
    route: request.route?.path ?? 'unmatched',
    error: getErrorMessage(error),
  });

  sendFailure(response, 500, 'An unexpected error occurred.', [
    {
      code: 'INTERNAL_ERROR',
      message: 'The request could not be completed.',
    },
  ]);
};
