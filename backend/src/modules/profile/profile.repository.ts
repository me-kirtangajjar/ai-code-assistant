import { Types } from 'mongoose';

import { SubmissionModel } from '../../database/index.js';
import type { ProfileStatistics } from './profile.types.js';

interface StatisticsAggregation extends ProfileStatistics {
  _id: null;
}

const EMPTY_STATISTICS: ProfileStatistics = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
};

export const getSubmissionStatistics = async (userId: string): Promise<ProfileStatistics> => {
  const [statistics] = await SubmissionModel.aggregate<StatisticsAggregation>([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        successfulRuns: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        failedRuns: {
          $sum: { $cond: [{ $in: ['$status', ['python_error', 'runner_error']] }, 1, 0] },
        },
      },
    },
  ]).exec();

  if (!statistics) {
    return EMPTY_STATISTICS;
  }

  return {
    totalRuns: statistics.totalRuns,
    successfulRuns: statistics.successfulRuns,
    failedRuns: statistics.failedRuns,
  };
};
