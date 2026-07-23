import jsonwebtoken, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { AppError } from '../../common/index.js';
import { getEnvironment } from '../../config/index.js';
import type { AccessTokenPayload } from './auth.types.js';

const accessTokenPayloadSchema: z.ZodType<AccessTokenPayload> = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  email: z.string().email(),
});

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const { jwtExpiresIn, jwtSecret } = getEnvironment();

  return jsonwebtoken.sign(payload, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: jwtExpiresIn as SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const { jwtSecret } = getEnvironment();

  try {
    const decoded = jsonwebtoken.verify(token, jwtSecret, {
      algorithms: ['HS256'],
    });
    const result = accessTokenPayloadSchema.safeParse(decoded);

    if (!result.success) {
      throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid.');
    }

    return result.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof jsonwebtoken.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'The access token has expired.');
    }

    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid.');
  }
};
