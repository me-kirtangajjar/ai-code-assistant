import type { RunnerResult } from '../../python-runner/index.js';

export interface AnalysisInput {
  code: string;
}

export interface SubmissionResponse {
  id: string;
  code: string;
  language: 'python';
  status: 'success' | 'python_error' | 'runner_error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  errorType: string | null;
  traceback: string | null;
  aiExplanation: string | null;
  createdAt: string;
}

export interface AnalysisResult {
  runnerResult: RunnerResult;
  submission: SubmissionResponse;
}
