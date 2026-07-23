import type { RequestHandler } from 'express';

import { AppError } from '../../common/index.js';
import { loginUser, registerUser } from './auth.service.js';
import type { BasicProfile, LoginInput, RegisterInput } from './auth.types.js';

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);

  response.setHeader('Cache-Control', 'no-store');
  response.status(201).json({
    success: true,
    message: 'Account registered successfully.',
    data: { user },
  });
};

export const login: RequestHandler = async (request, response) => {
  const result = await loginUser(request.body as LoginInput);

  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    success: true,
    message: 'Login successful.',
    data: result,
  });
};

export const getCurrentUser: RequestHandler = (request, response) => {
  if (!request.authenticatedUser) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }

  const profile: BasicProfile = {
    name: request.authenticatedUser.name,
    email: request.authenticatedUser.email,
    createdAt: request.authenticatedUser.createdAt,
  };

  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    success: true,
    message: 'Authenticated user retrieved successfully.',
    data: { user: profile },
  });
};
