export interface ProfileStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

export interface UserProfile {
  name: string;
  email: string;
  createdAt: string;
  statistics: ProfileStatistics;
}
