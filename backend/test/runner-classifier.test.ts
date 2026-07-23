import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyExecutionResult } from '../src/python-runner/result-classifier.js';
import type { DockerExecutionOutcome } from '../src/python-runner/runner.types.js';

const createOutcome = (
  overrides: Partial<DockerExecutionOutcome> = {},
): DockerExecutionOutcome => ({
  containerId: '0123456789ab',
  stdout: '',
  stderr: '',
  exitCode: 0,
  executionTime: 25,
  terminationCause: 'completed',
  oomKilled: false,
  ...overrides,
});

test('classifies a zero exit code as a successful Python execution', () => {
  assert.deepEqual(classifyExecutionResult(createOutcome({ stdout: 'Hello\n' })), {
    status: 'success',
    stdout: 'Hello\n',
    stderr: '',
    exitCode: 0,
    executionTime: 25,
    errorType: null,
    traceback: null,
  });
});

test('extracts Python error type and traceback from interpreter output', () => {
  const stderr =
    'Traceback (most recent call last):\n' +
    '  File "/workspace/main.py", line 1, in <module>\n' +
    'ZeroDivisionError: division by zero\n';

  const result = classifyExecutionResult(
    createOutcome({
      stderr,
      exitCode: 1,
    }),
  );

  assert.equal(result.status, 'python_error');
  assert.equal(result.errorType, 'ZeroDivisionError');
  assert.equal(result.traceback, stderr);
});

test('gives output-limit and timeout policies precedence over Python exit details', () => {
  const outputLimited = classifyExecutionResult(
    createOutcome({
      exitCode: 137,
      terminationCause: 'output_limit',
    }),
  );
  const timedOut = classifyExecutionResult(
    createOutcome({
      exitCode: 137,
      terminationCause: 'timeout',
    }),
  );

  assert.equal(outputLimited.status, 'runner_error');
  assert.equal(outputLimited.errorType, 'OutputLimitExceeded');
  assert.equal(timedOut.status, 'runner_error');
  assert.equal(timedOut.errorType, 'Timeout');
});

test('classifies memory and Docker failures without creating Python tracebacks', () => {
  const outOfMemory = classifyExecutionResult(
    createOutcome({
      exitCode: 137,
      oomKilled: true,
    }),
  );
  const dockerFailure = classifyExecutionResult(
    createOutcome({
      containerId: null,
      exitCode: null,
      terminationCause: 'docker_failure',
    }),
  );

  assert.equal(outOfMemory.status, 'runner_error');
  assert.equal(outOfMemory.errorType, 'MemoryLimitExceeded');
  assert.equal(outOfMemory.traceback, null);
  assert.equal(dockerFailure.status, 'runner_error');
  assert.equal(dockerFailure.errorType, 'DockerFailure');
  assert.equal(dockerFailure.traceback, null);
});
