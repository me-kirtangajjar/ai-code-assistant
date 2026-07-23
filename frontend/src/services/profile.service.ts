import { apiRequest } from '@/lib';
import type { UserProfile } from '@/types';

export const getProfile = async (accessToken: string): Promise<UserProfile> => {
  const response = await apiRequest<{ profile: UserProfile }>('/profile', {
    method: 'GET',
    token: accessToken,
  });

  return response.data.profile;
};
