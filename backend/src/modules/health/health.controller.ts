import type { RequestHandler } from 'express';

import { getDatabaseStatus } from '../../database/index.js';
import type { HealthResponse } from './health.types.js';

export const getHealth: RequestHandler<Record<string, never>, HealthResponse> = (
  _request,
  response,
) => {
  response.status(200).json({
    success: true,
    message: 'Service health retrieved successfully.',
    data: {
      database: {
        status: getDatabaseStatus(),
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};
