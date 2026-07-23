import { Types, type HydratedDocument } from 'mongoose';

import { SubmissionModel, type Submission } from '../../database/index.js';

export type HistorySubmissionDocument = HydratedDocument<Submission>;

interface PaginatedSubmissions {
  submissions: HistorySubmissionDocument[];
  totalItems: number;
}

export const findSubmissionsByUser = async (
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedSubmissions> => {
  const ownershipFilter = { userId: new Types.ObjectId(userId) };
  const [submissions, totalItems] = await Promise.all([
    SubmissionModel.find(ownershipFilter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    SubmissionModel.countDocuments(ownershipFilter).exec(),
  ]);

  return { submissions, totalItems };
};

export const findSubmissionByIdAndUser = async (
  submissionId: string,
  userId: string,
): Promise<HistorySubmissionDocument | null> =>
  SubmissionModel.findOne({
    _id: new Types.ObjectId(submissionId),
    userId: new Types.ObjectId(userId),
  }).exec();
