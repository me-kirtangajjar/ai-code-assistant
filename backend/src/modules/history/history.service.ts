import { AppError, logger } from '../../common/index.js';
import {
  findSubmissionByIdAndUser,
  findSubmissionsByUser,
  type HistorySubmissionDocument,
} from './history.repository.js';
import type {
  HistoryItem,
  HistoryListResult,
  HistoryQuery,
  HistorySubmission,
} from './history.types.js';

const CODE_PREVIEW_LIMIT = 160;

const toHistoryItem = (submission: HistorySubmissionDocument): HistoryItem => ({
  id: submission._id.toString(),
  codePreview: submission.code.slice(0, CODE_PREVIEW_LIMIT),
  language: 'python',
  status: submission.status,
  executionTime: submission.executionTime ?? 0,
  errorType: submission.errorType ?? null,
  createdAt: submission.createdAt.toISOString(),
});

const toHistorySubmission = (submission: HistorySubmissionDocument): HistorySubmission => ({
  id: submission._id.toString(),
  code: submission.code,
  language: 'python',
  status: submission.status,
  stdout: submission.stdout,
  stderr: submission.stderr,
  exitCode: submission.exitCode ?? null,
  executionTime: submission.executionTime ?? 0,
  errorType: submission.errorType ?? null,
  traceback: submission.traceback ?? null,
  aiExplanation: submission.aiExplanation ?? null,
  createdAt: submission.createdAt.toISOString(),
});

export const getSubmissionHistory = async (
  userId: string,
  query: HistoryQuery,
): Promise<HistoryListResult> => {
  try {
    const { submissions, totalItems } = await findSubmissionsByUser(
      userId,
      query.page,
      query.limit,
    );
    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      items: submissions.map(toHistoryItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  } catch {
    logger.error('Submission history query failed.', {
      code: 'SUBMISSION_HISTORY_QUERY_FAILED',
    });
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Submission history could not be retrieved.');
  }
};

export const getSubmissionDetail = async (
  userId: string,
  submissionId: string,
): Promise<HistorySubmission> => {
  try {
    const submission = await findSubmissionByIdAndUser(submissionId, userId);

    if (!submission) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Submission was not found.');
    }

    return toHistorySubmission(submission);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Submission detail query failed.', {
      code: 'SUBMISSION_DETAIL_QUERY_FAILED',
    });
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Submission could not be retrieved.');
  }
};
