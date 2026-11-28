import assert from 'node:assert/strict';
import test from 'node:test';

import * as auth from '../../src/features/auth/submitLogin.ts';

const challenge = '4b11b778-4435-470d-8e80-0dde42b90546';
const replacement = '647012c5-d885-4984-8b92-16d8b938e851';
const code = '04182736';
const user = { id: 'fixture-user', fullName: 'Mai Anh', role: 'User' };
const origin = 'https://api.example.test';

function fixture(response) {
  const calls = [];
  const saved = [];
  return {
    calls, saved, apiOrigin: origin,
    request: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      return response();
    },
    saveToken: async (token) => { saved.push(token); },
  };
}

test('verifies exactly eight digits and persists only a confirmed User', async () => {
  const deps = fixture(() => Response.json({ token: 'fixture-session', user }));
  assert.deepEqual(await auth.verifyLoginOtp(challenge, code, deps), {
    kind: 'authenticated', userId: user.id, fullName: user.fullName,
  });
  assert.deepEqual(deps.calls.map(({ url, body }) => ({ url, body })), [
    { url: origin + '/api/auth/two-factor/login', body: { challengeId: challenge, code } },
  ]);
  assert.equal(deps.calls[0].headers.Authorization, undefined);
  assert.deepEqual(deps.saved, ['fixture-session']);
});

test('rejects an incomplete code locally and treats server 400 as invalid or expired', async () => {
  const deps = fixture(() => new Response(null, { status: 400 }));
  assert.deepEqual(await auth.verifyLoginOtp(challenge, '123', deps), { kind: 'error', error: 'invalid-code' });
  assert.equal(deps.calls.length, 0);
  assert.deepEqual(await auth.verifyLoginOtp(challenge, code, deps), { kind: 'error', error: 'invalid-code' });
  assert.equal(deps.calls.length, 1);
  assert.deepEqual(deps.saved, []);
});

test('resend uses its own endpoint and returns the new challenge without storing a token', async () => {
  const deps = fixture(() => Response.json({ challengeId: replacement, token: 'fixture-session' }));
  assert.deepEqual(await auth.resendLoginOtp(challenge, deps), { kind: 'resent', challengeId: replacement });
  assert.deepEqual(deps.calls[0].body, { challengeId: challenge });
  assert.equal(deps.calls[0].url, origin + '/api/auth/two-factor/login/resend');
  assert.deepEqual(deps.saved, []);
});

test('resend rejects an unchanged challenge and maps 429 to a retryable limit', async () => {
  const same = fixture(() => Response.json({ challengeId: challenge }));
  assert.deepEqual(await auth.resendLoginOtp(challenge, same), { kind: 'error', error: 'service' });
  const limited = fixture(() => new Response(null, { status: 429 }));
  assert.deepEqual(await auth.resendLoginOtp(challenge, limited), { kind: 'error', error: 'rate-limited' });
});

test('verify refuses Admin and aborts a late response without persisting', async () => {
  const admin = fixture(() => Response.json({ token: 'fixture-session', user: { ...user, role: 'Admin' } }));
  assert.deepEqual(await auth.verifyLoginOtp(challenge, code, admin), { kind: 'error', error: 'unsupported-account' });
  const controller = new AbortController();
  const deps = fixture(() => {
    controller.abort();
    return Response.json({ token: 'fixture-session', user });
  });
  assert.deepEqual(await auth.verifyLoginOtp(challenge, code, { ...deps, signal: controller.signal }), { kind: 'cancelled' });
  assert.deepEqual(admin.saved, []);
  assert.deepEqual(deps.saved, []);
});

test('verification preserves the pending challenge when offline and succeeds on a manual retry', async () => {
  const deps = fixture(() => { throw new TypeError('offline'); });
  assert.deepEqual(await auth.verifyLoginOtp(challenge, code, deps), { kind: 'error', error: 'network' });
  assert.deepEqual(deps.saved, []);
  deps.request = async (url, init) => {
    deps.calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return Response.json({ token: 'fixture-session', user });
  };
  assert.equal((await auth.verifyLoginOtp(challenge, code, deps)).kind, 'authenticated');
  assert.equal(deps.calls.length, 2);
  assert.deepEqual(deps.calls[1].body, { challengeId: challenge, code });
});

test('resend timeout sends once and retains no session', async () => {
  const deps = fixture(() => null);
  deps.request = async (_url, init) => {
    deps.calls.push(init);
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  };
  assert.deepEqual(await auth.resendLoginOtp(challenge, { ...deps, timeoutMs: 10 }), { kind: 'error', error: 'timeout' });
  assert.equal(deps.calls.length, 1);
  assert.deepEqual(deps.saved, []);
});

test('verification waits for secure persistence and reports failure without authenticating', async () => {
  const deps = fixture(() => Response.json({ token: 'fixture-session', user }));
  let rejectSave;
  deps.saveToken = () => new Promise((_, reject) => { rejectSave = reject; });
  let settled = false;
  const result = auth.verifyLoginOtp(challenge, code, deps).then((value) => { settled = true; return value; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  rejectSave(new Error('keychain unavailable'));
  assert.deepEqual(await result, { kind: 'error', error: 'storage' });
});
