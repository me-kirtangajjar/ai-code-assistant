export type HistorySubmissionStatus = 'success' | 'python_error' | 'runner_error';

export interface HistoryQuery {
  page: number;
  limit: number;
}

export interface HistoryItem {
  id: string;
  codePreview: string;
  language: 'python';
  status: HistorySubmissionStatus;
  executionTime: number;
  errorType: string | null;
  createdAt: string;
}

export interface HistoryPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface HistoryListResult {
  items: HistoryItem[];
  pagination: HistoryPagination;
}

export interface HistorySubmission {
  id: string;
  code: string;
  language: 'python';
  status: HistorySubmissionStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  errorType: string | null;
  traceback: string | null;
  aiExplanation: string | null;
  createdAt: string;
}
