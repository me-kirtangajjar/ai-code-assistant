import type { Server } from 'node:http';

import type { Express } from 'express';

import { createApp } from './app.js';
import { getErrorMessage, logger } from './common/index.js';
import { getEnvironment } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import { cleanupStaleExecutionResources } from './python-runner/index.js';

type ShutdownReason = 'SIGINT' | 'SIGTERM' | 'SERVER_ERROR';

const listen = (app: Express, port: number): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = app.listen(port);

    const handleError = (error: Error): void => {
      server.off('listening', handleListening);
      reject(error);
    };

    const handleListening = (): void => {
      server.off('error', handleError);
      resolve(server);
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const registerShutdownHandlers = (server: Server): void => {
  let shuttingDown = false;

  const shutdown = async (reason: ShutdownReason): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info('Application shutdown started.', { reason });

    try {
      await closeServer(server);
      await disconnectDatabase();
      logger.info('Application shutdown completed.', { reason });
    } catch (error) {
      logger.error('Application shutdown failed.', {
        reason,
        error: getErrorMessage(error),
      });
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  server.on('error', (error) => {
    logger.error('Express server error.', {
      code: 'HTTP_SERVER_ERROR',
      error: getErrorMessage(error),
    });
    process.exitCode = 1;
    void shutdown('SERVER_ERROR');
  });
};

export const startServer = async (): Promise<Server> => {
  const { nodeEnv, port } = getEnvironment();

  await connectDatabase();
  await cleanupStaleExecutionResources();

  try {
    const server = await listen(createApp(), port);
    registerShutdownHandlers(server);

    logger.info('Express server started.', {
      nodeEnv,
      port,
    });

    return server;
  } catch (error) {
    await disconnectDatabase();
    throw error;
  }
};
