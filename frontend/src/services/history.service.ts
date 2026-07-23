import { apiRequest } from '@/lib';
import type { HistoryPageResult, SubmissionDetail } from '@/types';

export const getHistory = async (
  accessToken: string,
  page: number,
  limit = 10,
): Promise<HistoryPageResult> => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await apiRequest<HistoryPageResult>(`/history?${query.toString()}`, {
    method: 'GET',
    token: accessToken,
  });

  return response.data;
};

export const getSubmission = async (
  accessToken: string,
  submissionId: string,
): Promise<SubmissionDetail> => {
  const response = await apiRequest<{ submission: SubmissionDetail }>(
    `/history/${encodeURIComponent(submissionId)}`,
    {
      method: 'GET',
      token: accessToken,
    },
  );

  return response.data.submission;
};
