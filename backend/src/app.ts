import express, { type Express } from 'express';

import {
  errorHandler,
  notFoundHandler,
  requestContext,
  securityHeaders,
} from './middleware/index.js';
import { analysisRouter } from './modules/analysis/analysis.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { historyRouter } from './modules/history/history.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(requestContext);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/analysis', analysisRouter);
  app.use('/api/v1/history', historyRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
