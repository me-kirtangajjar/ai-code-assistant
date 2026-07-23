import type { RequestHandler } from 'express';

import { AppError } from '../../common/index.js';
import { analyzeCode } from './analysis.service.js';
import type { AnalysisInput } from './analysis.types.js';

export const runAnalysis: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  response.setHeader('Cache-Control', 'no-store');
  const result = await analyzeCode(request.authenticatedUser.id, request.body as AnalysisInput);

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

export const explainSubmission: RequestHandler = async (request, response) => {
  if (!request.authenticatedUser) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  const id = request.params.id as string;
  const { generateExplanationForSubmission } = await import('./analysis.service.js');
  
  response.setHeader('Cache-Control', 'no-store');
  const submission = await generateExplanationForSubmission(request.authenticatedUser.id, id);

  response.status(200).json({
    success: true,
    message: 'AI explanation generated successfully.',
    data: {
      submission,
    },
  });
};
