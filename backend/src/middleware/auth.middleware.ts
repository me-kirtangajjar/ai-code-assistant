import type { RequestHandler } from 'express';

import { AppError } from '../common/index.js';
import { findUserById } from '../modules/auth/auth.repository.js';
import { toPublicUser, verifyAccessToken } from '../modules/auth/auth.service.js';

const readBearerToken = (authorizationHeader: string | undefined): string => {
  if (!authorizationHeader) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  const [scheme, token, additionalPart] = authorizationHeader.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token || additionalPart) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Provide a valid bearer token.');
  }

  return token;
};

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const token = readBearerToken(request.header('authorization'));
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.userId);

    if (!user || user.email !== payload.email) {
      throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid.');
    }

    request.authenticatedUser = toPublicUser(user);
    next();
  } catch (error) {
    next(error);
  }
};
