import type { DatabaseStatus } from '../../database/index.js';

export interface HealthResponse {
  success: true;
  message: string;
  data: {
    database: {
      status: DatabaseStatus;
    };
    uptime: number;
    timestamp: string;
  };
}
