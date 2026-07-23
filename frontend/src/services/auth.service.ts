import { apiRequest } from '@/lib';
import type { AuthUser, LoginInput, LoginResult, RegisterInput } from '@/types';

export const register = async (input: RegisterInput): Promise<AuthUser> => {
  const response = await apiRequest<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });

  return response.data.user;
};

export const login = async (input: LoginInput): Promise<LoginResult> => {
  const response = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });

  return response.data;
};

export const getCurrentUser = async (accessToken: string): Promise<AuthUser> => {
  const response = await apiRequest<{ user: AuthUser }>('/auth/me', {
    method: 'GET',
    token: accessToken,
  });

  return response.data.user;
};
