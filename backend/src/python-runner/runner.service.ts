import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { getEnvironment } from '../config/index.js';
import { cleanupExecution } from './cleanup.service.js';
import { executeInDocker } from './docker.service.js';
import { classifyExecutionResult } from './result-classifier.js';
import type {
  ExecutionWorkspace,
  RunnerIdentity,
  RunnerRequest,
  RunnerResult,
} from './runner.types.js';
import { createWorkspace } from './workspace.service.js';

let activeExecutions = 0;

const getRunnerIdentity = (): RunnerIdentity => {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1_000;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 1_000;

  if (uid === 0) {
    return { uid: 65_534, gid: 65_534 };
  }

  return { uid, gid };
};

const createRunnerFailure = (startedAt: number): RunnerResult => ({
  status: 'runner_error',
  stdout: '',
  stderr: '',
  exitCode: null,
  executionTime: Math.max(0, Math.round(performance.now() - startedAt)),
  errorType: 'RunnerFailure',
  traceback: null,
});

export const executePython = async (request: RunnerRequest): Promise<RunnerResult> => {
  const startedAt = performance.now();
  const { executionMaxConcurrency } = getEnvironment();

  if (activeExecutions >= executionMaxConcurrency) {
    return createRunnerFailure(startedAt);
  }

  activeExecutions += 1;
  const executionId = randomUUID();
  const identity = getRunnerIdentity();
  let workspace: ExecutionWorkspace | null = null;
  let containerId: string | null = null;

  try {
    if (request.language !== 'python') {
      return createRunnerFailure(startedAt);
    }

    workspace = await createWorkspace(request.code, identity);
    const outcome = await executeInDocker(workspace.directoryPath, executionId, identity);
    containerId = outcome.containerId;
    return classifyExecutionResult(outcome);
  } catch {
    return createRunnerFailure(startedAt);
  } finally {
    await cleanupExecution({
      executionId,
      containerId,
      workspacePath: workspace?.directoryPath ?? null,
    });
    activeExecutions -= 1;
  }
};
