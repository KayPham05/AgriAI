import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as auth from '../../src/features/auth/submitLogin.ts';

const { submitLogin } = auth;

const apiOrigin = 'https://api.example.test';
const credentials = { email: ' User@Example.test ', password: ' keep spaces ' };
const user = { id: 'qa-user', fullName: 'Nguyễn An', role: 'User' };
const token = 'unit-test-token';

function fixture(response) {
  const calls = [];
  const saved = [];
  return {
    calls, saved, apiOrigin,
    request: async (url, init) => { calls.push({ url, init }); return response(); },
    saveToken: async (value) => { saved.push(value); },
  };
}

test('registration posts the normalized full name and saves a verified User session', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  const result = await auth.submitRegistration({ ...credentials, fullName: '  Nguyễn An  ' }, deps);
  assert.deepEqual(result, { kind: 'authenticated', userId: user.id, fullName: user.fullName });
  assert.equal(deps.calls[0].url, `${apiOrigin}/api/auth/register`);
  assert.deepEqual(JSON.parse(deps.calls[0].init.body), {
    email: 'user@example.test', password: ' keep spaces ', fullName: 'Nguyễn An',
  });
  assert.deepEqual(deps.saved, [token]);
});

test('registration requires a name and six-character password before posting', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  assert.deepEqual(await auth.submitRegistration({ ...credentials, fullName: ' ', password: 'short' }, deps), {
    kind: 'invalid', fields: { fullName: 'required', password: 'too-short' },
  });
  assert.equal(deps.calls.length, 0);
});

test('registration rejects a login challenge instead of treating it as account creation', async () => {
  const deps = fixture(() => Response.json({ challengeId: 'challenge' }, { status: 202 }));
  assert.deepEqual(await auth.submitRegistration({ ...credentials, fullName: user.fullName }, deps), {
    kind: 'error', error: 'service',
  });
  assert.deepEqual(deps.saved, []);
});

test('normalizes only email and awaits SecureStore before returning a successful User', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  let releaseSave;
  deps.saveToken = async (value) => {
    deps.saved.push(value);
    await new Promise((resolve) => { releaseSave = resolve; });
  };
  let completed = false;
  const result = submitLogin(credentials, deps).then((value) => { completed = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(deps.saved, [token]);
  assert.equal(completed, false);
  releaseSave();
  assert.deepEqual(await result, { kind: 'authenticated', userId: user.id, fullName: user.fullName });
  assert.equal(deps.calls.length, 1);
  assert.equal(deps.calls[0].url, `${apiOrigin}/api/auth/login`);
  assert.equal(deps.calls[0].init.method, 'POST');
  assert.equal(deps.calls[0].init.redirect, 'error');
  assert.deepEqual(JSON.parse(deps.calls[0].init.body), { email: 'user@example.test', password: ' keep spaces ' });
});

test('202 returns only the in-memory challenge and never persists a session', async () => {
  const deps = fixture(() => Response.json({ challengeId: 'new-challenge', token }, { status: 202 }));
  assert.deepEqual(await submitLogin(credentials, deps), { kind: 'otp-required', challengeId: 'new-challenge' });
  assert.deepEqual(deps.saved, []);
});

test('invalid email and a blank password never reach the network', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  assert.deepEqual(await submitLogin({ email: 'a@@example.test', password: ' ' }, deps), {
    kind: 'invalid', fields: { email: 'format', password: 'required' },
  });
  assert.equal(deps.calls.length, 0);
});

test('counts password bytes, including astral Unicode, before sending credentials', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  assert.deepEqual(await submitLogin({ ...credentials, password: '🌱'.repeat(19) }, deps), {
    kind: 'invalid', fields: { password: 'too-long' },
  });
  assert.equal(deps.calls.length, 0);
  assert.equal((await submitLogin({ ...credentials, password: '🌱'.repeat(18) }, deps)).kind, 'authenticated');
});

for (const [name, response, error] of [
  ['401', () => new Response(null, { status: 401 }), 'credentials'],
  ['429', () => new Response(null, { status: 429 }), 'rate-limited'],
  ['503', () => new Response(null, { status: 503 }), 'service'],
  ['Admin', () => Response.json({ token, user: { ...user, role: 'Admin' } }), 'unsupported-account'],
  ['invalid JSON', () => new Response('{'), 'service'],
  ['empty challenge', () => Response.json({ challengeId: '' }, { status: 202 }), 'service'],
  ['missing token', () => Response.json({ user }), 'service'],
  ['offline', () => { throw new Error('offline'); }, 'network'],
]) {
  test(`${name} shows the matching error and retains no new session`, async () => {
    const deps = fixture(response);
    assert.deepEqual(await submitLogin(credentials, deps), { kind: 'error', error });
    assert.deepEqual(deps.saved, []);
  });
}

test('does not authenticate the User if secure storage fails', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  deps.saveToken = async () => { throw new Error('storage unavailable'); };
  assert.deepEqual(await submitLogin(credentials, deps), { kind: 'error', error: 'storage' });
});

test('reports timeout and sends only one request instead of retrying credentials automatically', async () => {
  const deps = fixture(() => null);
  deps.request = async (_url, { signal }) => {
    deps.calls.push(signal);
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  };
  assert.deepEqual(await submitLogin(credentials, { ...deps, timeoutMs: 20 }), { kind: 'error', error: 'timeout' });
  assert.equal(deps.calls.length, 1);
  assert.deepEqual(deps.saved, []);
});

test('rejects cleartext credentials in release', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  assert.deepEqual(await submitLogin(credentials, { ...deps, apiOrigin: 'http://api.example.test' }), {
    kind: 'error', error: 'service',
  });
  assert.equal(deps.calls.length, 0);
});

test('a caller cancellation skips both the request and token persistence', async () => {
  const deps = fixture(() => Response.json({ token, user }));
  const controller = new AbortController();
  controller.abort();
  assert.deepEqual(await submitLogin(credentials, { ...deps, signal: controller.signal }), { kind: 'cancelled' });
  assert.equal(deps.calls.length, 0);
  assert.deepEqual(deps.saved, []);
});

test('rejects a late success after the screen closes before storing a token', async () => {
  const controller = new AbortController();
  const deps = fixture(() => {
    controller.abort();
    return Response.json({ token, user });
  });
  assert.deepEqual(await submitLogin(credentials, { ...deps, signal: controller.signal }), { kind: 'cancelled' });
  assert.deepEqual(deps.saved, []);
});

for (const apiOrigin of ['not a URL', 'https://api.example.test/api', 'https://u:p@api.example.test']) {
  test(`rejects an invalid API origin without sending credentials: ${apiOrigin}`, async () => {
    const deps = fixture(() => Response.json({ token, user }));
    assert.deepEqual(await submitLogin(credentials, { ...deps, apiOrigin }), { kind: 'error', error: 'service' });
    assert.equal(deps.calls.length, 0);
  });
}


test('preserves server account lock duration without creating a session', async () => {
  const deps = fixture(() => Response.json({ code: 'LOGIN_LOCKED', retryAfterSeconds: 600 }, { status: 429 }));
  assert.deepEqual(await submitLogin(credentials, deps), { kind: 'error', error: 'login-locked', retryAfterSeconds: 600 });
  assert.deepEqual(deps.saved, []);
});

test('keeps generic throttling for invalid or missing account lock duration', async () => {
  for (const retryAfterSeconds of [undefined, -5, 0, '300', null, 1.5]) {
    const deps = fixture(() => Response.json({ code: 'LOGIN_LOCKED', retryAfterSeconds }, { status: 429 }));
    assert.deepEqual(await submitLogin(credentials, deps), { kind: 'error', error: 'rate-limited' });
  }
});
