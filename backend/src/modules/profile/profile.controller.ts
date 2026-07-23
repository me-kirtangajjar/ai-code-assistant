import type { RequestHandler } from 'express';

import { AppError } from '../../common/index.js';
import { getProfile } from './profile.service.js';

export const getCurrentProfile: RequestHandler = async (request, response) => {
  const user = request.authenticatedUser;

  if (!user) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  const profile = await getProfile(user.id, {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  });

  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    success: true,
    message: 'Profile retrieved successfully.',
    data: { profile },
  });
};
