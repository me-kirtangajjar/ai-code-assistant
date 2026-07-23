import { AppError, logger } from '../../common/index.js';
import { getSubmissionStatistics } from './profile.repository.js';
import type { ProfileIdentity, ProfileResponse } from './profile.types.js';

export const getProfile = async (
  userId: string,
  identity: ProfileIdentity,
): Promise<ProfileResponse> => {
  try {
    const statistics = await getSubmissionStatistics(userId);

    return {
      ...identity,
      statistics,
    };
  } catch {
    logger.error('Profile statistics query failed.', {
      code: 'PROFILE_STATISTICS_QUERY_FAILED',
    });
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Profile could not be retrieved.');
  }
};
