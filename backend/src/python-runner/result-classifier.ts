import type { DockerExecutionOutcome, RunnerResult } from './runner.types.js';

const ERROR_TYPE_PATTERN = /^(?:[A-Za-z_]\w*\.)*([A-Za-z_]\w*):(?:\s|$)/;
const BARE_ERROR_TYPE_PATTERN =
  /^(?:[A-Za-z_]\w*\.)*([A-Za-z_]\w*(?:Error|Exception|Interrupt|Exit))$/;

const extractPythonErrorType = (stderr: string): string | null => {
  const lastLine = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!lastLine) {
    return null;
  }

  const match = ERROR_TYPE_PATTERN.exec(lastLine) ?? BARE_ERROR_TYPE_PATTERN.exec(lastLine);
  return match?.[1]?.slice(0, 100) ?? null;
};

const extractPythonTraceback = (stderr: string, errorType: string | null): string | null => {
  if (!errorType) {
    return null;
  }

  const lines = stderr.replaceAll('\r\n', '\n').split('\n');
  let startIndex = -1;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.startsWith('Traceback (most recent call last):')) {
      startIndex = index;
      break;
    }
  }

  if (startIndex < 0) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (/^\s*File "\/workspace\/main\.py"/.test(lines[index] ?? '')) {
        startIndex = index;
        break;
      }
    }
  }

  if (startIndex < 0) {
    return null;
  }

  const traceback = lines.slice(startIndex).join('\n').trimEnd();
  return traceback ? `${traceback}\n` : null;
};

export const classifyExecutionResult = (outcome: DockerExecutionOutcome): RunnerResult => {
  const commonResult = {
    stdout: outcome.stdout,
    stderr: outcome.stderr,
    exitCode: outcome.exitCode,
    executionTime: outcome.executionTime,
  };

  if (outcome.terminationCause === 'output_limit') {
    return {
      ...commonResult,
      status: 'runner_error',
      errorType: 'OutputLimitExceeded',
      traceback: null,
    };
  }

  if (outcome.terminationCause === 'timeout') {
    return {
      ...commonResult,
      status: 'runner_error',
      errorType: 'Timeout',
      traceback: null,
    };
  }

  if (outcome.oomKilled) {
    return {
      ...commonResult,
      status: 'runner_error',
      errorType: 'MemoryLimitExceeded',
      traceback: null,
    };
  }

  if (outcome.terminationCause === 'docker_failure') {
    return {
      ...commonResult,
      status: 'runner_error',
      errorType: 'DockerFailure',
      traceback: null,
    };
  }

  if (outcome.terminationCause === 'runner_failure' || outcome.exitCode === null) {
    return {
      ...commonResult,
      status: 'runner_error',
      errorType: 'RunnerFailure',
      traceback: null,
    };
  }

  if (outcome.exitCode === 0) {
    return {
      ...commonResult,
      status: 'success',
      errorType: null,
      traceback: null,
    };
  }

  const errorType = extractPythonErrorType(outcome.stderr);

  return {
    ...commonResult,
    status: 'python_error',
    errorType,
    traceback: extractPythonTraceback(outcome.stderr, errorType),
  };
};
