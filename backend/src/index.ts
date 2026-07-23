import { getErrorMessage, logger } from './common/index.js';
import { disconnectDatabase } from './database/index.js';
import { startServer } from './server.js';

const bootstrap = async (): Promise<void> => {
  try {
    await startServer();
  } catch (error) {
    logger.error('Application startup failed.', {
      code: 'APPLICATION_STARTUP_FAILED',
      error: getErrorMessage(error),
    });

    try {
      await disconnectDatabase();
    } catch (disconnectError) {
      logger.error('MongoDB cleanup after startup failure failed.', {
        error: getErrorMessage(disconnectError),
      });
    }

    process.exitCode = 1;
  }
};

void bootstrap();
