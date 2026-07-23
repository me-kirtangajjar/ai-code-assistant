export interface ProfileIdentity {
  name: string;
  email: string;
  createdAt: string;
}

export interface ProfileStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

export interface ProfileResponse extends ProfileIdentity {
  statistics: ProfileStatistics;
}
