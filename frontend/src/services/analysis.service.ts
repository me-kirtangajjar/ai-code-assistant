import { apiRequest } from '@/lib';
import type { SubmissionResult } from '@/types';

export const runPythonCode = async (
  code: string,
  accessToken: string,
): Promise<SubmissionResult> => {
  const response = await apiRequest<{ submission: SubmissionResult }>('/analysis/run', {
    method: 'POST',
    token: accessToken,
    body: { code },
  });

  return response.data.submission;
};
