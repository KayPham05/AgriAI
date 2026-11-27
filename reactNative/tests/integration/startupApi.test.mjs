import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { restoreSession } from '../../src/features/auth/restoreSession.ts';

test('restores a real backend session and deletes it locally after server revocation', { timeout: 20_000 }, async () => {
  const origin = new URL(process.env.AGRI158_QA_API_URL ?? '');
  assert.equal(origin.hostname, '127.0.0.1', 'Use a disposable loopback QA backend.');
  const suffix = randomUUID();
  const fullName = 'Nguyễn An';
  const register = await fetch(new URL('/api/auth/register', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName,
      email: `agri158-${suffix}@example.test`,
      password: `Aa!9-${suffix}`,
    }),
  });
  assert.equal(register.status, 200, 'Registration should create the isolated User session.');
  const registration = await register.json();
  let token = registration.token;
  assert.ok(typeof token === 'string' && token.length > 0);

  const deps = {
    apiOrigin: origin.origin,
    allowHttp: true,
    request: fetch,
    readToken: async () => token,
    clearToken: async () => { token = null; },
  };
  try {
    assert.deepEqual(await restoreSession(deps), {
      status: 'user', userId: registration.user.id, fullName,
    });
  } finally {
    const logout = await fetch(new URL('/api/auth/logout', origin), {
      method: 'POST',
      headers: { Authorization: `Bearer ${registration.token}` },
    });
    assert.equal(logout.status, 204, 'Backend must revoke the fixture session.');
  }
  assert.deepEqual(await restoreSession(deps), { status: 'guest' });
  assert.ok(token === null, 'The revoked token must be deleted.');
});
