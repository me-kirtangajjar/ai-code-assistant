import assert from 'node:assert/strict';
import test from 'node:test';

import type { AIProvider } from '../src/modules/ai/ai.provider.js';
import { buildErrorExplanationPrompt } from '../src/modules/ai/ai.prompts.js';
import {
  generateErrorExplanation,
  generateExplanationForExecution,
} from '../src/modules/ai/ai.service.js';
import { AIProviderError, type AIExplanationContext } from '../src/modules/ai/ai.types.js';
import { GeminiProvider } from '../src/modules/ai/providers/gemini.provider.js';
import { MockAIProvider } from '../src/modules/ai/providers/mock.provider.js';

const baseContext: AIExplanationContext = {
  language: 'python',
  submittedCode: '1 / 0',
  errorType: 'ZeroDivisionError',
  stderr: 'ZeroDivisionError: division by zero\n',
  traceback: 'Traceback (most recent call last):\nZeroDivisionError: division by zero\n',
};

test('mock provider returns a deterministic ZeroDivisionError explanation', async () => {
  const provider = new MockAIProvider();
  const first = await generateErrorExplanation(provider, baseContext);
  const second = await generateErrorExplanation(provider, baseContext);

  assert.equal(first, second);
  assert.match(first ?? '', /Python cannot divide a number by zero/);
  assert.match(first ?? '', /```python/);
});

test('mock provider explains SyntaxError', async () => {
  const explanation = await generateErrorExplanation(new MockAIProvider(), {
    ...baseContext,
    submittedCode: 'if True print("hello")',
    errorType: 'SyntaxError',
    stderr: 'SyntaxError: invalid syntax\n',
    traceback: 'File "/workspace/main.py", line 1\nSyntaxError: invalid syntax\n',
  });

  assert.match(explanation ?? '', /syntax is incomplete or incorrectly structured/);
});

test('analysis status gate can skip AI for success and runner errors', async () => {
  let calls = 0;
  const provider: AIProvider = {
    async generateExplanation() {
      calls += 1;
      return 'unexpected';
    },
  };

  assert.equal(
    await generateExplanationForExecution(provider, { ...baseContext, status: 'success' }),
    null,
  );
  assert.equal(
    await generateExplanationForExecution(provider, { ...baseContext, status: 'runner_error' }),
    null,
  );
  assert.equal(calls, 0);
  assert.equal(
    await generateExplanationForExecution(provider, { ...baseContext, status: 'python_error' }),
    'unexpected',
  );
  assert.equal(calls, 1);
});

test('AI provider failure degrades to a null explanation', async () => {
  const provider: AIProvider = {
    async generateExplanation() {
      throw new AIProviderError('AI_UNAVAILABLE');
    },
  };

  assert.equal(await generateErrorExplanation(provider, baseContext), null);
});

test('Gemini network failure becomes a controlled failure and preserves null fallback', async () => {
  const provider = new GeminiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.5-flash',
    timeoutMs: 1_000,
    fetchImplementation: (async () => {
      throw new TypeError('network unavailable');
    }) as typeof fetch,
  });

  assert.equal(await generateErrorExplanation(provider, baseContext), null);
});

test('Gemini maps invalid-key and rate-limit responses to controlled error codes', async () => {
  for (const [status, expectedCode] of [
    [403, 'AI_AUTHENTICATION_ERROR'],
    [429, 'AI_RATE_LIMITED'],
  ] as const) {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'gemini-3.5-flash',
      timeoutMs: 1_000,
      fetchImplementation: (async () => new Response(null, { status })) as typeof fetch,
    });

    await assert.rejects(
      provider.generateExplanation(baseContext),
      (error: unknown) => error instanceof AIProviderError && error.code === expectedCode,
    );
  }
});

test('Gemini parses a successful response without exposing configuration in the prompt', async () => {
  let requestBody = '';
  const provider = new GeminiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.5-flash',
    timeoutMs: 1_000,
    fetchImplementation: (async (_input, init) => {
      requestBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Beginner explanation' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
  });

  assert.equal(await provider.generateExplanation(baseContext), 'Beginner explanation');
  assert.match(requestBody, /ZeroDivisionError/);
  assert.doesNotMatch(requestBody, /test-key|userId|accessToken|email/);
});

test('Gemini timeout becomes a controlled timeout failure', async () => {
  const provider = new GeminiProvider({
    apiKey: 'test-key',
    model: 'gemini-3.5-flash',
    timeoutMs: 10,
    fetchImplementation: ((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      })) as typeof fetch,
  });

  await assert.rejects(
    provider.generateExplanation(baseContext),
    (error: unknown) => error instanceof AIProviderError && error.code === 'AI_TIMEOUT',
  );
});

test('prompt contains only the required execution context and anti-injection instructions', () => {
  const prompt = buildErrorExplanationPrompt(baseContext);

  assert.match(prompt, /submittedCode/);
  assert.match(prompt, /pythonErrorType/);
  assert.match(prompt, /stderr/);
  assert.match(prompt, /traceback/);
  assert.match(prompt, /execute the code/);
  assert.doesNotMatch(prompt, /userId|accessToken|email|databaseId|\/workspace\//);
});
