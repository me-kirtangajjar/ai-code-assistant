import type { ExecutionStatus, SubmissionResult } from './analysis';

export interface HistoryItem {
  id: string;
  codePreview: string;
  language: 'python';
  status: ExecutionStatus;
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

export interface HistoryPageResult {
  items: HistoryItem[];
  pagination: HistoryPagination;
}

export type SubmissionDetail = SubmissionResult;
