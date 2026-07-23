export type RunnerStatus = 'success' | 'python_error' | 'runner_error';

export interface RunnerRequest {
  language: 'python';
  code: string;
}

export interface RunnerResult {
  status: RunnerStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  errorType: string | null;
  traceback: string | null;
}

export type ExecutionTerminationCause =
  'completed' | 'timeout' | 'output_limit' | 'docker_failure' | 'runner_failure';

export interface DockerExecutionOutcome {
  containerId: string | null;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  terminationCause: ExecutionTerminationCause;
  oomKilled: boolean;
}

export interface ExecutionWorkspace {
  directoryPath: string;
}

export interface RunnerIdentity {
  uid: number;
  gid: number;
}
