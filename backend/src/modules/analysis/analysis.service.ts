import { AppError, logger } from '../../common/index.js';
import { getAIProvider, type AIProvider } from '../ai/ai.provider.js';
import { generateExplanationForExecution } from '../ai/ai.service.js';
import { executePython } from '../../python-runner/index.js';
import { createSubmission, type SubmissionDocument } from './analysis.repository.js';
import type { AnalysisInput, AnalysisResult, SubmissionResponse } from './analysis.types.js';

const toSubmissionResponse = (submission: SubmissionDocument): SubmissionResponse => ({
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

export const analyzeCode = async (
  userId: string,
  input: AnalysisInput,
): Promise<AnalysisResult> => {
  logger.info('Python execution started for analysis.', {});
  const runnerResult = await executePython({
    language: 'python',
    code: input.code,
  });

  logger.info('Python execution completed for analysis.', {
    executionStatus: runnerResult.status,
    errorType: runnerResult.errorType ?? 'none',
  });

  try {
    const submission = await createSubmission({
      userId,
      code: input.code,
      result: runnerResult,
      aiExplanation: null, // AI explanation decoupled
    });

    return {
      runnerResult,
      submission: toSubmissionResponse(submission),
    };
  } catch {
    logger.error('Submission persistence failed.', {
      code: 'SUBMISSION_PERSISTENCE_FAILED',
    });
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'The execution result could not be saved.');
  }
};

export const generateExplanationForSubmission = async (
  userId: string,
  submissionId: string,
): Promise<SubmissionResponse> => {
  const { getSubmissionById, updateSubmissionExplanation } = await import('./analysis.repository.js');
  const submission = await getSubmissionById(submissionId, userId);

  if (!submission) {
    throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'The requested submission could not be found.');
  }

  if (submission.status !== 'python_error' && submission.status !== 'runner_error') {
    return toSubmissionResponse(submission);
  }

  const aiProvider: AIProvider = getAIProvider();
  const aiExplanation = await generateExplanationForExecution(aiProvider, {
    status: submission.status,
    language: submission.language,
    submittedCode: submission.code,
    errorType: submission.errorType ?? null,
    stderr: submission.stderr ?? null,
    traceback: submission.traceback ?? null,
  });

  const updatedSubmission = await updateSubmissionExplanation(submissionId, aiExplanation);
  
  if (!updatedSubmission) {
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Could not update submission with AI explanation.');
  }

  return toSubmissionResponse(updatedSubmission);
};
