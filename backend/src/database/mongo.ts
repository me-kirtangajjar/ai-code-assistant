import mongoose from 'mongoose';

import { getErrorMessage, logger } from '../common/index.js';
import { getEnvironment } from '../config/index.js';
import { UserModel } from './models/user.model.js';

export type DatabaseStatus =
  'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';

const connectionStates: Readonly<Record<number, DatabaseStatus>> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersRegistered = false;
let hasConnected = false;
let disconnectingIntentionally = false;

const registerConnectionListeners = (): void => {
  if (listenersRegistered) {
    return;
  }

  mongoose.connection.on('disconnected', () => {
    if (disconnectingIntentionally || !hasConnected) {
      return;
    }

    logger.warn('MongoDB connection disconnected.', { databaseStatus: getDatabaseStatus() });
  });

  mongoose.connection.on('error', (error) => {
    if (!hasConnected) {
      return;
    }

    logger.error('MongoDB connection error.', {
      code: 'MONGODB_CONNECTION_ERROR',
      error: getErrorMessage(error),
    });
  });

  listenersRegistered = true;
};

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

export const getDatabaseStatus = (): DatabaseStatus =>
  connectionStates[mongoose.connection.readyState] ?? 'unknown';

export const connectDatabase = async (): Promise<void> => {
  registerConnectionListeners();

  if (getDatabaseStatus() === 'connected') {
    return;
  }

  try {
    const { mongodbUri } = getEnvironment();

    await mongoose.connect(mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });

    await UserModel.init();

    hasConnected = true;
    logger.info('MongoDB connection established.', { databaseStatus: getDatabaseStatus() });
  } catch (error) {
    logger.error('MongoDB connection failed.', {
      code: 'MONGODB_CONNECTION_FAILED',
      error: getErrorMessage(error),
    });

    throw new Error('Unable to connect to MongoDB.', { cause: error });
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (getDatabaseStatus() === 'disconnected') {
    return;
  }

  disconnectingIntentionally = true;

  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed.', { databaseStatus: getDatabaseStatus() });
  } finally {
    disconnectingIntentionally = false;
    hasConnected = false;
  }
};
