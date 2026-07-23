import type { RequestHandler } from 'express';

import { AppError } from '../../common/index.js';
import { analyzeCode } from './analysis.service.js';
import type { AnalysisInput } from './analysis.types.js';

const throwRunnerError = (errorType: string | null): never => {
  if (errorType === 'OutputLimitExceeded') {
    throw new AppError(422, 'OUTPUT_LIMIT_EXCEEDED', 'Python execution exceeded the output limit.');
  }

  if (errorType === 'Timeout') {
    throw new AppError(504, 'EXECUTION_TIMEOUT', 'Python execution exceeded the time limit.');
  }

  throw new AppError(503, 'RUNNER_UNAVAILABLE', 'Python execution could not be completed safely.');
};

export const runAnalysis: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  response.setHeader('Cache-Control', 'no-store');
  const result = await analyzeCode(request.authenticatedUser.id, request.body as AnalysisInput);

  if (result.runnerResult.status === 'runner_error') {
    throwRunnerError(result.runnerResult.errorType);
  }

  response.status(201).json({
    success: true,
    message:
      result.runnerResult.status === 'success'
        ? 'Python execution completed successfully.'
        : 'Python execution completed with an error.',
    data: {
      submission: result.submission,
    },
  });
};
