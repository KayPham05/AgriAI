import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { restoreSession } from '../../src/features/auth/restoreSession.ts';
import { submitLogin, submitRegistration } from '../../src/features/auth/submitLogin.ts';

test('live API registers a User, rejects invalid credentials and issues a usable login session', async () => {
  const origin = new URL(process.env.AGRI160_QA_API_URL);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'Use a disposable local API and database');

  const password = `Qa9${randomUUID()}`;
  const email = `login-${randomUUID()}@example.test`;
  const fullName = 'Mobile Login QA';
  const authRequest = (path, init) => fetch(new URL(`/api/auth/${path}`, origin), init);
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const tokens = [];
  try {
    const deps = {
      apiOrigin: origin.origin,
      allowHttp: true,
      request: fetch,
      saveToken: async (token) => { tokens.push(token); },
    };

    const registered = await submitRegistration({ email, password, fullName }, deps);
    assert.equal(registered.kind, 'authenticated');
    assert.equal(registered.fullName, fullName);
    assert.equal(tokens.length, 1);
    const registeredMe = await authRequest('me', { headers: bearer(tokens[0]) });
    assert.equal(registeredMe.status, 200);
    assert.equal((await registeredMe.json()).id, registered.userId);

    const invalid = await submitLogin({ email, password: `${password}wrong` }, deps);
    assert.deepEqual(invalid, { kind: 'error', error: 'credentials' });
    assert.equal(tokens.length, 1);

    const result = await submitLogin({ email: ` ${email.toUpperCase()} `, password }, deps);
    assert.deepEqual(result, { kind: 'authenticated', userId: registered.userId, fullName });
    assert.equal(tokens.length, 2);

    const me = await authRequest('me', { headers: bearer(tokens[1]) });
    assert.equal(me.status, 200);
    const user = await me.json();
    assert.equal(user.id, registered.userId);
    assert.equal(user.role, 'User');

    let savedToken = tokens[1];
    const startup = {
      apiOrigin: origin.origin,
      allowHttp: true,
      request: fetch,
      readToken: async () => savedToken,
      clearToken: async () => { savedToken = null; },
    };
    assert.deepEqual(await restoreSession(startup), { status: 'user', userId: user.id, fullName });

    const revoked = await authRequest('logout', { method: 'POST', headers: bearer(tokens[1]) });
    assert.equal(revoked.status, 204);
    tokens.pop();
    assert.deepEqual(await restoreSession(startup), { status: 'guest' });
    assert.equal(savedToken, null);
  } finally {
    for (const token of tokens) {
      const revoke = await authRequest('logout', { method: 'POST', headers: bearer(token) });
      assert.equal(revoke.status, 204);
    }
  }
});
