import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { requestPasswordReset } from '../../src/features/auth/submitLogin.ts';

test('live API accepts a synthetic unknown email without establishing a session', async () => {
  const origin = new URL(process.env.AGRI164_API_URL ?? 'http://127.0.0.1:5080');
  assert.equal(origin.hostname, '127.0.0.1', 'Use the explicitly local project API');
  const health = await fetch(new URL('/api/health', origin), {signal:AbortSignal.timeout(10000)});
  assert.equal(health.status,200);
  assert.equal((await health.json()).checks.database,'Healthy');
  const email = `agri164-${randomUUID()}@example.invalid`;
  const result = await requestPasswordReset(email, {apiOrigin:origin.origin,allowHttp:true,request:fetch});
  assert.deepEqual(result,{kind:'accepted',email});
  // This checks the neutral request contract; it does not claim mailbox delivery.
});
