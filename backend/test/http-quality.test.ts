import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { createApp } from '../src/app.js';

test('HTTP boundary applies security, correlation, and consistent error responses', async (context) => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  context.after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  await context.test('returns security headers and preserves a safe request ID', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Request-Id': 'sprint8-test-request' },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'sprint8-test-request');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-powered-by'), null);
  });

  await context.test('replaces an unsafe request ID', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Request-Id': 'unsafe request id' },
    });

    assert.match(response.headers.get('x-request-id') ?? '', /^[A-Fa-f\d-]{36}$/);
  });

  await context.test(
    'returns the standard not-found envelope without reflecting the path',
    async () => {
      const response = await fetch(`${baseUrl}/not-a-real-route`);
      const body = (await response.json()) as {
        success: boolean;
        message: string;
        errors: Array<{ code: string }>;
      };

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Route was not found.');
      assert.equal(body.errors[0]?.code, 'ROUTE_NOT_FOUND');
      assert.doesNotMatch(JSON.stringify(body), /not-a-real-route/);
    },
  );

  await context.test('returns the standard invalid-JSON envelope', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const body = (await response.json()) as {
      success: boolean;
      errors: Array<{ code: string }>;
    };

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.errors[0]?.code, 'INVALID_JSON');
  });
});
