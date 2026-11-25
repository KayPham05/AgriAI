import assert from 'node:assert/strict';
import { test } from 'node:test';

import { restoreSession } from '../../src/features/auth/restoreSession.ts';

const apiOrigin = 'https://api.example.test';
const user = { id: 'd10629d0-af82-4404-8888-e4192c3bce3c', role: 'User', fullName: 'Nguyễn An' };
const restoredUser = { status: 'user', userId: user.id, fullName: 'Nguyễn An' };

function fixture(token, request) {
  return {
    readToken: async () => token,
    clearToken: async () => { token = null; },
    apiOrigin,
    request,
  };
}

test('a fresh install opens Welcome without calling the API', async () => {
  let requested = false;
  const deps = fixture(null, async () => { requested = true; });
  assert.deepEqual(await restoreSession(deps), { status: 'guest' });
  assert.equal(requested, false);
});

test('validates a saved token with the actual profile endpoint before restoring User', async () => {
  let request;
  const deps = fixture('saved-token', async (url, init) => {
    request = { url, ...init };
    return Response.json(user);
  });
  assert.deepEqual(await restoreSession(deps), restoredUser);
  assert.equal(request.url, `${apiOrigin}/api/auth/me`);
  assert.equal(request.method, 'GET');
  assert.equal(new Headers(request.headers).get('Authorization'), 'Bearer saved-token');
  assert.equal(request.credentials, 'omit');
  assert.equal(request.redirect, 'error');
});

test('401 deletes the saved token before showing Welcome', async () => {
  const deps = fixture('expired-token', async () => new Response(null, { status: 401 }));
  assert.deepEqual(await restoreSession(deps), { status: 'guest' });
  assert.equal(await deps.readToken(), null);
});

test('does not show Guest if invalid-token cleanup fails', async () => {
  const deps = fixture('expired-token', async () => new Response(null, { status: 401 }));
  deps.clearToken = async () => { throw new Error('Secure storage unavailable'); };
  assert.deepEqual(await restoreSession(deps), { status: 'retry', reason: 'unavailable' });
});

test('a SecureStore read failure offers retry without attempting to authenticate', async () => {
  let requested = false;
  const deps = fixture(null, async () => { requested = true; });
  deps.readToken = async () => { throw new Error('Secure storage unavailable'); };
  assert.deepEqual(await restoreSession(deps), { status: 'retry', reason: 'unavailable' });
  assert.equal(requested, false);
});

test('timeout preserves the token and the next attempt can restore User', async () => {
  let requests = 0;
  let abortObserved = false;
  const deps = fixture('saved-token', async (_url, { signal }) => {
    if (++requests === 2) return Response.json(user);
    return new Promise((_, reject) => signal.addEventListener('abort', () => {
      abortObserved = true;
      reject(signal.reason);
    }, { once: true }));
  });
  assert.deepEqual(await restoreSession({ ...deps, timeoutMs: 20 }), { status: 'retry', reason: 'timeout' });
  assert.equal(abortObserved, true);
  assert.equal(await deps.readToken(), 'saved-token');
  assert.deepEqual(await restoreSession(deps), restoredUser);
});

test('a successful Admin response does not grant a mobile session', async () => {
  const deps = fixture('admin-token', async () => Response.json({ ...user, role: 'Admin' }));
  assert.deepEqual(await restoreSession(deps), { status: 'unsupported-account' });
});

for (const [failure, reason, request] of [
  ['network failure', 'network', async () => { throw new Error('offline'); }],
  ['server failure', 'unavailable', async () => new Response(null, { status: 503 })],
  ['malformed profile', 'unavailable', async () => Response.json({ id: '', role: 'User' })],
  ['missing display name', 'unavailable', async () => Response.json({ id: user.id, role: 'User' })],
  ['malformed JSON', 'unavailable', async () => new Response('{')],
]) {
  test(`${failure} offers retry without deleting the token`, async () => {
    const deps = fixture('saved-token', request);
    assert.deepEqual(await restoreSession(deps), { status: 'retry', reason });
    assert.equal(await deps.readToken(), 'saved-token');
  });
}

test('does not send a token over HTTP in a release build', async () => {
  let requested = false;
  const deps = fixture('saved-token', async () => { requested = true; });
  assert.deepEqual(await restoreSession({ ...deps, apiOrigin: 'http://api.example.test' }), { status: 'retry', reason: 'unavailable' });
  assert.equal(requested, false);
});
