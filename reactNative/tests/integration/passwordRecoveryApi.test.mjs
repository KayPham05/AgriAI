import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {requestPasswordReset,verifyPasswordResetCode,resetPassword,submitLogin} from '../../src/features/auth/submitLogin.ts';

test('real API/DB/SMTP recovery changes the password, consumes the code and revokes old sessions',async()=>{
 const origin=new URL(process.env.AGRI_RECOVERY_API_URL);
 assert.equal(origin.hostname,'127.0.0.1');assert.equal(origin.port,'15066','Use only the isolated recovery fixture, never the project DB');
 const inbox=process.env.AGRI_RECOVERY_INBOX;assert.ok(inbox);
 const email=`recovery-${randomUUID()}@example.test`;
 const oldPassword='InitialQa!123',password='ReplacementQa!456';
 const register=await fetch(new URL('/api/auth/register',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:oldPassword,fullName:'Recovery QA'})});
 assert.equal(register.status,200);const account=await register.json();
 const saved=[];
 const deps={apiOrigin:origin.origin,allowHttp:true,request:fetch,saveToken:async token=>saved.push(token)};
 assert.equal((await requestPasswordReset(email,deps)).kind,'accepted');
 let code;
 for(let i=0;i<20&&!code;i++){
  const messages=await Promise.all((await readdir(inbox)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(join(inbox,f),'utf8'))));
  code=messages.find(m=>m.to===email&&m.subject==='M\u00e3 \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u AgriAI')?.body.match(/>([0-9]{8})<\/div>/)?.[1];
  if(!code)await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(code,'Expected a real SMTP-delivered reset code in the isolated inbox');
 assert.deepEqual(await verifyPasswordResetCode(code,deps),{kind:'verified'});
 assert.deepEqual(saved,[]);
 assert.equal((await fetch(new URL('/api/auth/me',origin),{headers:{Authorization:`Bearer ${account.token}`}})).status,200);
 assert.deepEqual(await resetPassword({code,password,confirmPassword:password},deps),{kind:'reset'});
 assert.deepEqual(saved,[]);
 assert.equal((await fetch(new URL('/api/auth/me',origin),{headers:{Authorization:`Bearer ${account.token}`}})).status,401);
 assert.deepEqual(await verifyPasswordResetCode(code,deps),{kind:'error',error:'invalid-code'});
 assert.deepEqual(await resetPassword({code,password,confirmPassword:password},deps),{kind:'error',error:'invalid-code'});
 assert.deepEqual(await submitLogin({email,password:oldPassword},deps),{kind:'error',error:'credentials'});
 const login=await submitLogin({email,password},deps);
 assert.equal(login.kind,'authenticated');assert.equal(login.userId,account.user.id);assert.equal(saved.length,1);
 const logout=await fetch(new URL('/api/auth/logout',origin),{method:'POST',headers:{Authorization:`Bearer ${saved[0]}`}});
 assert.equal(logout.status,204);
});
