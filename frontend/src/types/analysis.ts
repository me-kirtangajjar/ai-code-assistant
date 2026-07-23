export type ExecutionStatus = 'success' | 'python_error' | 'runner_error';

export interface SubmissionResult {
  id: string;
  code: string;
  language: 'python';
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  errorType: string | null;
  traceback: string | null;
  aiExplanation: string | null;
  createdAt: string;
}

export interface AIExplanationSections {
  whatHappened: string | null;
  whyItHappened: string | null;
  howToFixIt: string | null;
  correctedCode: string | null;
}
