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
  explanation: string;
  suggestedFix: string;
  correctedCode: string | null;
}
