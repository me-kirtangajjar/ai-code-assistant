import type { HydratedDocument } from 'mongoose';

import { UserModel, type User } from '../../database/index.js';

export type UserDocument = HydratedDocument<User>;

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export const findUserByEmail = async (
  email: string,
  includePasswordHash = false,
): Promise<UserDocument | null> => {
  const query = UserModel.findOne({ email });

  if (includePasswordHash) {
    query.select('+passwordHash');
  }

  return query.exec();
};

export const findUserById = async (id: string): Promise<UserDocument | null> =>
  UserModel.findById(id).exec();

export const createUser = async (data: CreateUserData): Promise<UserDocument> =>
  UserModel.create(data);

export const isDuplicateEmailError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11_000;
