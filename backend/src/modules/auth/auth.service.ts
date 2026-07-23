import bcrypt from 'bcrypt';

import { AppError } from '../../common/index.js';
import {
  createUser,
  findUserByEmail,
  isDuplicateEmailError,
  type UserDocument,
} from './auth.repository.js';
import { signAccessToken } from './auth.jwt.js';
import type { LoginInput, LoginResult, PublicUser, RegisterInput } from './auth.types.js';

const BCRYPT_ROUNDS = 12;

export const toPublicUser = (user: UserDocument): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

export const registerUser = async (input: RegisterInput): Promise<PublicUser> => {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return toPublicUser(user);
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists.');
    }

    throw error;
  }
};

export const loginUser = async (input: LoginInput): Promise<LoginResult> => {
  const user = await findUserByEmail(input.email, true);

  if (!user) {
    await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  return {
    accessToken: signAccessToken({
      userId: user._id.toString(),
      email: user.email,
    }),
    user: toPublicUser(user),
  };
};

export { verifyAccessToken } from './auth.jwt.js';
