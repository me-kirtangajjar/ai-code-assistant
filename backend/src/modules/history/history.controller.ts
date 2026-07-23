import type { RequestHandler } from 'express';

import { AppError } from '../../common/index.js';
import { getSubmissionDetail, getSubmissionHistory } from './history.service.js';
import { parseHistoryQuery, parseSubmissionId } from './history.validator.js';

const requireAuthenticatedUser = (user: Express.Request['authenticatedUser']) => {
  if (!user) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  return user;
};

export const listHistory: RequestHandler = async (request, response) => {
  const user = requireAuthenticatedUser(request.authenticatedUser);
  const query = parseHistoryQuery(request.query);
  const result = await getSubmissionHistory(user.id, query);

  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    success: true,
    message: 'Submission history retrieved successfully.',
    data: result,
  });
};

export const getHistoryDetail: RequestHandler = async (request, response) => {
  const user = requireAuthenticatedUser(request.authenticatedUser);
  const rawSubmissionId = request.params.id;
  const submissionId = parseSubmissionId(
    typeof rawSubmissionId === 'string' ? rawSubmissionId : undefined,
  );
  const submission = await getSubmissionDetail(user.id, submissionId);

  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    success: true,
    message: 'Submission retrieved successfully.',
    data: { submission },
  });
};
