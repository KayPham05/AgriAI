import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { resendLoginOtp, submitLogin, verifyLoginOtp } from '../../src/features/auth/submitLogin.ts';

async function receivedCode(inbox, recipient, subject, index = 0) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const files = (await readdir(inbox)).filter((name) => name.endsWith('.json')).sort();
    const messages = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(inbox, file), 'utf8'))));
    const matching = messages.filter((message) => message.to === recipient && message.subject === subject);
    const code = matching[index]?.body.match(/>([0-9]{8})<\/div>/)?.[1];
    if (code) return code;
    await delay(250);
  }
  assert.fail('The isolated SMTP inbox did not receive the expected OTP');
}

test('live login OTP requires the newest emailed code before storing a session', { timeout: 120_000 }, async () => {
  const origin = new URL(process.env.AGRI163_QA_API_URL);
  assert.equal(origin.hostname, '127.0.0.1', 'Use a disposable loopback QA backend');
  const inbox = process.env.AGRI163_QA_INBOX;
  assert.ok(inbox, 'Point AGRI163_QA_INBOX at the isolated SMTP inbox directory');
  const email = `agri163-${randomUUID()}@example.test`;
  const password = `Qa9${randomUUID()}`;
  const fullName = 'Mobile OTP QA';
  const tokens = [];
  const emailSubject = 'Mã đăng nhập AgriAI';

  const post = (path, body, token) => fetch(new URL(`/api/auth/${path}`, origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
  const deps = {
    apiOrigin: origin.origin,
    allowHttp: true,
    request: fetch,
    saveToken: async (token) => { tokens.push(token); },
  };

  try {
    const registered = await post('register', { email, password, fullName });
    assert.equal(registered.status, 200);
    const account = await registered.json();
    tokens.push(account.token);
    const setup = await post('two-factor/setup', undefined, account.token);
    assert.equal(setup.status, 200);
    const { challengeId } = await setup.json();
    const setupCode = await receivedCode(inbox, email, 'Mã bật xác thực hai lớp AgriAI');
    assert.deepEqual(await verifyLoginOtp(challengeId, setupCode, deps), { kind: 'error', error: 'invalid-code' });
    assert.equal(tokens.length, 1);
    const enabled = await post('two-factor/setup/verify', { challengeId, code: setupCode }, account.token);
    assert.equal(enabled.status, 204);

    const login = await submitLogin({ email, password }, deps);
    assert.equal(login.kind, 'otp-required');
    assert.equal(tokens.length, 1);
    const original = await receivedCode(inbox, email, emailSubject);
    const wrong = original === '00000000' ? '11111111' : '00000000';
    assert.deepEqual(await verifyLoginOtp(login.challengeId, wrong, deps), { kind: 'error', error: 'invalid-code' });

    // The backend owns the 60-second expiry. Verify it before requesting a replacement.
    await delay(61_000);
    assert.deepEqual(await verifyLoginOtp(login.challengeId, original, deps), { kind: 'error', error: 'invalid-code' });
    assert.equal(tokens.length, 1);
    const resend = await resendLoginOtp(login.challengeId, deps);
    assert.equal(resend.kind, 'resent');
    assert.ok(resend.challengeId !== login.challengeId);
    assert.equal(tokens.length, 1);
    assert.deepEqual(await verifyLoginOtp(login.challengeId, original, deps), { kind: 'error', error: 'invalid-code' });

    const latest = await receivedCode(inbox, email, emailSubject, 1);
    const verified = await verifyLoginOtp(resend.challengeId, latest, deps);
    assert.deepEqual(verified, { kind: 'authenticated', userId: account.user.id, fullName });
    assert.equal(tokens.length, 2);
    const profile = await fetch(new URL('/api/auth/me', origin), { headers: { Authorization: `Bearer ${tokens[1]}` } });
    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).id, account.user.id);
    assert.deepEqual(await verifyLoginOtp(resend.challengeId, latest, deps), { kind: 'error', error: 'invalid-code' });
    assert.equal(tokens.length, 2);
  } finally {
    for (const token of tokens) assert.equal((await post('logout', undefined, token)).status, 204);
  }
});
