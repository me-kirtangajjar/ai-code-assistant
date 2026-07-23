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
  const runnerResult = await executePython({
    language: 'python',
    code: input.code,
  });

  const aiProvider: AIProvider = getAIProvider();
  const aiExplanation = await generateExplanationForExecution(aiProvider, {
    status: runnerResult.status,
    language: 'python',
    submittedCode: input.code,
    errorType: runnerResult.errorType,
    stderr: runnerResult.stderr,
    traceback: runnerResult.traceback,
  });

  try {
    const submission = await createSubmission({
      userId,
      code: input.code,
      result: runnerResult,
      aiExplanation,
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
