import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

import { getEnvironment } from '../config/index.js';
import type {
  DockerExecutionOutcome,
  ExecutionTerminationCause,
  RunnerIdentity,
} from './runner.types.js';

const DOCKER_COMMAND_OUTPUT_LIMIT_BYTES = 65_536;
const DOCKER_COMMAND_TIMEOUT_MS = 5_000;
const CONTAINER_TERMINATION_GRACE_MS = 2_000;
const CONTAINER_ID_PATTERN = /^[a-f\d]{12,64}$/i;

interface DockerCommandResult {
  stdout: string;
  exitCode: number | null;
  spawnFailed: boolean;
  timedOut: boolean;
}

interface DockerContainerState {
  Status?: string;
  Running?: boolean;
  OOMKilled?: boolean;
  ExitCode?: number;
  Error?: string;
}

const appendBoundedChunk = (
  chunks: Buffer[],
  chunk: Buffer,
  currentBytes: number,
  maximumBytes: number,
): number => {
  const remainingBytes = Math.max(0, maximumBytes - currentBytes);

  if (remainingBytes > 0) {
    chunks.push(chunk.subarray(0, remainingBytes));
  }

  return Math.min(maximumBytes, currentBytes + chunk.length);
};

const runDockerCommand = (
  argumentsList: readonly string[],
  timeoutMs = DOCKER_COMMAND_TIMEOUT_MS,
): Promise<DockerCommandResult> =>
  new Promise((resolve) => {
    const child = spawn('docker', argumentsList, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdoutChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let spawnFailed = false;
    let settled = false;

    const finish = (exitCode: number | null, timedOut: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        exitCode,
        spawnFailed,
        timedOut,
      });
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes = appendBoundedChunk(
        stdoutChunks,
        chunk,
        stdoutBytes,
        DOCKER_COMMAND_OUTPUT_LIMIT_BYTES,
      );
    });

    child.stderr.resume();
    child.once('error', () => {
      spawnFailed = true;
      finish(null, false);
    });
    child.once('close', (exitCode) => {
      finish(exitCode, false);
    });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish(null, true);
    }, timeoutMs);
  });

const assertContainerId = (containerId: string): void => {
  if (!CONTAINER_ID_PATTERN.test(containerId)) {
    throw new Error('Docker returned an invalid container identifier.');
  }
};

const createContainer = async (
  workspacePath: string,
  executionId: string,
  identity: RunnerIdentity,
): Promise<string> => {
  if (workspacePath.includes(',') || /[\r\n]/.test(workspacePath)) {
    throw new Error('Execution workspace path cannot be represented safely as a Docker mount.');
  }

  const { executionCpuLimit, executionMemoryMb, executionPidLimit, pythonRunnerImage } =
    getEnvironment();
  const memoryLimit = `${executionMemoryMb}m`;
  const result = await runDockerCommand([
    'container',
    'create',
    '--pull',
    'never',
    '--name',
    `ai-code-exec-${executionId}`,
    '--label',
    'ai-code-error-feedback.managed=true',
    '--label',
    `ai-code-error-feedback.execution=${executionId}`,
    '--network',
    'none',
    '--memory',
    memoryLimit,
    '--memory-swap',
    memoryLimit,
    '--cpus',
    String(executionCpuLimit),
    '--pids-limit',
    String(executionPidLimit),
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges=true',
    '--cgroupns',
    'private',
    '--ipc',
    'none',
    '--user',
    `${identity.uid}:${identity.gid}`,
    '--workdir',
    '/workspace',
    '--restart',
    'no',
    '--log-driver',
    'none',
    '--stop-timeout',
    '1',
    '--no-healthcheck',
    '--init',
    '--mount',
    `type=bind,source=${workspacePath},target=/workspace,readonly`,
    pythonRunnerImage,
  ]);

  if (result.spawnFailed || result.timedOut || result.exitCode !== 0) {
    throw new Error('Docker could not create the execution container.');
  }

  const containerId = result.stdout.trim();
  assertContainerId(containerId);
  return containerId;
};

const killContainer = async (containerId: string): Promise<void> => {
  assertContainerId(containerId);
  await runDockerCommand(['container', 'kill', containerId], CONTAINER_TERMINATION_GRACE_MS);
};

const inspectContainer = async (containerId: string): Promise<DockerContainerState> => {
  assertContainerId(containerId);
  const result = await runDockerCommand([
    'container',
    'inspect',
    '--format',
    '{{json .State}}',
    containerId,
  ]);

  if (result.spawnFailed || result.timedOut || result.exitCode !== 0) {
    throw new Error('Docker could not inspect the execution container.');
  }

  const parsedState: unknown = JSON.parse(result.stdout);

  if (typeof parsedState !== 'object' || parsedState === null) {
    throw new Error('Docker returned an invalid container state.');
  }

  return parsedState as DockerContainerState;
};

export const forceRemoveContainer = async (containerId: string): Promise<void> => {
  assertContainerId(containerId);
  const result = await runDockerCommand(['container', 'rm', '--force', containerId]);

  if (result.spawnFailed || result.timedOut || result.exitCode !== 0) {
    throw new Error('Docker could not remove the execution container.');
  }
};

export const listManagedContainerIds = async (): Promise<string[]> => {
  const result = await runDockerCommand([
    'container',
    'ls',
    '--all',
    '--quiet',
    '--filter',
    'label=ai-code-error-feedback.managed=true',
  ]);

  if (result.spawnFailed || result.timedOut || result.exitCode !== 0) {
    throw new Error('Docker could not list managed execution containers.');
  }

  const containerIds = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const containerId of containerIds) {
    assertContainerId(containerId);
  }

  return containerIds;
};

export const executeInDocker = async (
  workspacePath: string,
  executionId: string,
  identity: RunnerIdentity,
): Promise<DockerExecutionOutcome> => {
  const { executionOutputLimitBytes, executionTimeoutMs } = getEnvironment();
  const startedAt = performance.now();
  let containerId: string | null = null;

  try {
    containerId = await createContainer(workspacePath, executionId, identity);
  } catch {
    return {
      containerId,
      stdout: '',
      stderr: '',
      exitCode: null,
      executionTime: Math.max(0, Math.round(performance.now() - startedAt)),
      terminationCause: 'docker_failure',
      oomKilled: false,
    };
  }

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let totalOutputBytes = 0;
  let terminationCause: ExecutionTerminationCause | null = null;
  let terminationPromise: Promise<void> | null = null;
  let startSpawnFailed = false;

  const requestTermination = (cause: 'timeout' | 'output_limit'): void => {
    if (terminationCause) {
      return;
    }

    terminationCause = cause;
    terminationPromise = killContainer(containerId as string).catch(() => undefined);
  };

  const captureChunk = (target: Buffer[], chunk: Buffer): void => {
    const previousBytes = totalOutputBytes;
    totalOutputBytes = appendBoundedChunk(
      target,
      chunk,
      totalOutputBytes,
      executionOutputLimitBytes,
    );

    if (chunk.length > executionOutputLimitBytes - previousBytes) {
      requestTermination('output_limit');
    }
  };

  let startProcess: ReturnType<typeof spawn>;

  try {
    startProcess = spawn('docker', ['container', 'start', '--attach', containerId], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch {
    return {
      containerId,
      stdout: '',
      stderr: '',
      exitCode: null,
      executionTime: Math.max(0, Math.round(performance.now() - startedAt)),
      terminationCause: 'docker_failure',
      oomKilled: false,
    };
  }

  if (!startProcess.stdout || !startProcess.stderr) {
    return {
      containerId,
      stdout: '',
      stderr: '',
      exitCode: null,
      executionTime: Math.max(0, Math.round(performance.now() - startedAt)),
      terminationCause: 'runner_failure',
      oomKilled: false,
    };
  }

  startProcess.stdout.on('data', (chunk: Buffer) => {
    captureChunk(stdoutChunks, chunk);
  });
  startProcess.stderr.on('data', (chunk: Buffer) => {
    captureChunk(stderrChunks, chunk);
  });

  const timeout = setTimeout(() => {
    requestTermination('timeout');
  }, executionTimeoutMs);

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    startProcess.once('error', () => {
      startSpawnFailed = true;
      finish();
    });
    startProcess.once('close', finish);

    const attachmentFailsafe = setTimeout(() => {
      if (terminationCause) {
        startProcess.kill('SIGKILL');
        finish();
      }
    }, executionTimeoutMs + CONTAINER_TERMINATION_GRACE_MS);
    attachmentFailsafe.unref();
  });

  clearTimeout(timeout);

  if (terminationPromise) {
    await terminationPromise;
  }

  const executionTime = Math.max(0, Math.round(performance.now() - startedAt));
  const stdout = Buffer.concat(stdoutChunks).toString('utf8');
  const stderr = Buffer.concat(stderrChunks).toString('utf8');

  if (startSpawnFailed) {
    return {
      containerId,
      stdout,
      stderr: '',
      exitCode: null,
      executionTime,
      terminationCause: 'docker_failure',
      oomKilled: false,
    };
  }

  try {
    const state = await inspectContainer(containerId);
    const hasDockerRuntimeError = Boolean(state.Error) || state.Status === 'created';

    return {
      containerId,
      stdout,
      stderr: hasDockerRuntimeError ? '' : stderr,
      exitCode: Number.isInteger(state.ExitCode) ? (state.ExitCode as number) : null,
      executionTime,
      terminationCause:
        terminationCause ?? (hasDockerRuntimeError ? 'docker_failure' : 'completed'),
      oomKilled: state.OOMKilled === true,
    };
  } catch {
    return {
      containerId,
      stdout,
      stderr,
      exitCode: null,
      executionTime,
      terminationCause: terminationCause ?? 'runner_failure',
      oomKilled: false,
    };
  }
};
