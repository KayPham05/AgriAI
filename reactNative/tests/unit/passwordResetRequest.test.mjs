import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as auth from '../../src/features/auth/submitLogin.ts';

function deps(response) {
  const calls = [];
  return { calls, apiOrigin: 'https://api.example.test', request: async (url, init) => { calls.push({ url, init }); return response; } };
}

test('requests reset with only normalized email and accepts an empty 202 response', async () => {
  const d = deps(new Response(null, { status: 202 }));
  assert.deepEqual(await auth.requestPasswordReset(' User@Example.test ', d), { kind: 'accepted', email: 'user@example.test' });
  assert.equal(d.calls[0].url, 'https://api.example.test/api/auth/forgot-password');
  assert.deepEqual(JSON.parse(d.calls[0].init.body), { email: 'user@example.test' });
  assert.equal(d.calls[0].init.credentials, 'omit');
  assert.equal(d.calls[0].init.redirect, 'error');
  assert.equal(d.calls[0].init.headers.Authorization, undefined);
});

test('validates required, malformed and oversized emails before sending', async () => {
  for (const [email, error] of [[' ', 'required'], ['no-at', 'format'], ['a'.repeat(250)+'@example.test', 'format']]) {
    const d = deps(new Response(null, { status: 202 }));
    assert.deepEqual(await auth.requestPasswordReset(email, d), { kind: 'invalid', fields: { email: error } });
    assert.equal(d.calls.length, 0);
  }
});

test('maps throttling, validation and unexpected statuses without claiming email delivery', async () => {
  for (const [status, expected] of [[429, {kind:'error',error:'rate-limited'}], [400, {kind:'invalid',fields:{email:'format'}}], [200,{kind:'error',error:'service'}], [500,{kind:'error',error:'service'}]]) {
    assert.deepEqual(await auth.requestPasswordReset('user@example.test', deps(new Response(null,{status}))), expected);
  }
});

test('never sends release credentials to an insecure or malformed origin', async () => {
  for (const apiOrigin of ['http://api.example.test','not-url','https://u:p@example.test','https://api.example.test/path']) {
    const d = { ...deps(new Response(null,{status:202})), apiOrigin };
    assert.deepEqual(await auth.requestPasswordReset('user@example.test',d), {kind:'error',error:'service'});
    assert.equal(d.calls.length,0);
  }
});

test('allows local HTTP only when explicitly enabled', async () => {
  const d = { ...deps(new Response(null,{status:202})), apiOrigin:'http://127.0.0.1:5080',allowHttp:true };
  assert.equal((await auth.requestPasswordReset('user@example.test',d)).kind,'accepted');
});

test('reports network errors and timeout without automatically resending email', async () => {
  const d = deps();
  d.request = async () => { throw new TypeError('offline'); };
  assert.deepEqual(await auth.requestPasswordReset('user@example.test',d),{kind:'error',error:'network'});
  let sends=0;
  d.timeoutMs=10;
  d.request = async (_, init) => {
    sends++;
    return new Promise((_, reject) => init.signal.addEventListener('abort',()=>reject(new Error('aborted'))));
  };
  assert.deepEqual(await auth.requestPasswordReset('user@example.test',d),{kind:'error',error:'timeout'});
  assert.equal(sends,1);
});

test('honors cancellation before dispatch and discards a late accepted response', async () => {
  const controller = new AbortController();
  const d = { ...deps(new Response(null,{status:202})), signal:controller.signal };
  controller.abort();
  assert.deepEqual(await auth.requestPasswordReset('user@example.test',d),{kind:'cancelled'});
  assert.equal(d.calls.length,0);
  const next = new AbortController();
  d.signal=next.signal;
  d.request=async()=> { next.abort(); return new Response(null,{status:202}); };
  assert.deepEqual(await auth.requestPasswordReset('user@example.test',d),{kind:'cancelled'});
});
