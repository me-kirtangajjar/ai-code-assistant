import { logger } from '../common/index.js';
import { forceRemoveContainer, listManagedContainerIds } from './docker.service.js';
import { listManagedWorkspaces, removeWorkspace } from './workspace.service.js';

interface CleanupResources {
  executionId: string;
  containerId: string | null;
  workspacePath: string | null;
}

export const cleanupExecution = async ({
  executionId,
  containerId,
  workspacePath,
}: CleanupResources): Promise<void> => {
  if (containerId) {
    try {
      await forceRemoveContainer(containerId);
    } catch {
      logger.warn('Execution container cleanup failed.', {
        code: 'EXECUTION_CONTAINER_CLEANUP_FAILED',
        executionId,
      });
    }
  }

  if (workspacePath) {
    try {
      await removeWorkspace(workspacePath);
    } catch {
      logger.warn('Execution workspace cleanup failed.', {
        code: 'EXECUTION_WORKSPACE_CLEANUP_FAILED',
        executionId,
      });
    }
  }
};

export const cleanupStaleExecutionResources = async (): Promise<void> => {
  try {
    const containerIds = await listManagedContainerIds();

    for (const containerId of containerIds) {
      await forceRemoveContainer(containerId).catch(() => {
        logger.warn('Stale execution container cleanup failed.', {
          code: 'STALE_EXECUTION_CONTAINER_CLEANUP_FAILED',
          containerId,
        });
      });
    }
  } catch {
    logger.warn('Stale execution container reconciliation was unavailable.', {
      code: 'STALE_EXECUTION_CONTAINER_RECONCILIATION_UNAVAILABLE',
    });
  }

  try {
    const workspacePaths = await listManagedWorkspaces();

    for (const workspacePath of workspacePaths) {
      await removeWorkspace(workspacePath).catch(() => {
        logger.warn('Stale execution workspace cleanup failed.', {
          code: 'STALE_EXECUTION_WORKSPACE_CLEANUP_FAILED',
        });
      });
    }
  } catch {
    logger.warn('Stale execution workspace reconciliation was unavailable.', {
      code: 'STALE_EXECUTION_WORKSPACE_RECONCILIATION_UNAVAILABLE',
    });
  }
};
