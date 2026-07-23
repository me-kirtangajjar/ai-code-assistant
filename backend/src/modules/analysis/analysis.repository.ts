import { Types, type HydratedDocument } from 'mongoose';

import { SubmissionModel, type Submission } from '../../database/index.js';
import type { RunnerResult } from '../../python-runner/index.js';

export type SubmissionDocument = HydratedDocument<Submission>;

interface CreateSubmissionData {
  userId: string;
  code: string;
  result: RunnerResult;
  aiExplanation: string | null;
}

export const createSubmission = async ({
  userId,
  code,
  result,
  aiExplanation,
}: CreateSubmissionData): Promise<SubmissionDocument> =>
  SubmissionModel.create({
    userId: new Types.ObjectId(userId),
    code,
    language: 'python',
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    executionTime: result.executionTime,
    errorType: result.errorType,
    traceback: result.traceback,
    aiExplanation,
  });

export const getSubmissionById = async (id: string, userId: string): Promise<SubmissionDocument | null> =>
  SubmissionModel.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

export const updateSubmissionExplanation = async (
  id: string,
  aiExplanation: string | null,
): Promise<SubmissionDocument | null> =>
  SubmissionModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: { aiExplanation } },
    { new: true },
  );
