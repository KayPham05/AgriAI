import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as auth from '../../src/features/auth/submitLogin.ts';
const origin='https://api.example.test';
function fixture(status=204){
 const calls=[];
 return {calls,apiOrigin:origin,request:async(url,init)=>{calls.push({url,init});return new Response(null,{status});}};
}

test('verifies reset codes with the recovery endpoint and only the code payload',async()=>{
 const d=fixture();
 assert.deepEqual(await auth.verifyPasswordResetCode('01234567',d),{kind:'verified'});
 assert.equal(d.calls[0].url,origin+'/api/auth/reset-password/verify');
 assert.deepEqual(JSON.parse(d.calls[0].init.body),{code:'01234567'});
 assert.equal(d.calls[0].init.credentials,'omit');
});

test('rejects non-eight-digit codes locally and maps expired/wrong codes without advancing',async()=>{
 for(const code of ['1234567','123456789','1234567a',' 12345678']){
  const d=fixture();
  assert.deepEqual(await auth.verifyPasswordResetCode(code,d),{kind:'error',error:'invalid-code'});
  assert.equal(d.calls.length,0);
 }
 assert.deepEqual(await auth.verifyPasswordResetCode('12345678',fixture(400)),{kind:'error',error:'invalid-code'});
 assert.deepEqual(await auth.verifyPasswordResetCode('12345678',fixture(200)),{kind:'error',error:'service'});
});

const values={code:'01234567',password:' new password ',confirmPassword:' new password '};
test('sends only code and the exact password and accepts only reset HTTP 204',async()=>{
 const d=fixture();
 assert.deepEqual(await auth.resetPassword(values,d),{kind:'reset'});
 assert.equal(d.calls[0].url,origin+'/api/auth/reset-password');
 assert.deepEqual(JSON.parse(d.calls[0].init.body),{code:'01234567',password:' new password '});
 assert.deepEqual(await auth.resetPassword(values,fixture(400)),{kind:'error',error:'invalid-code'});
 assert.deepEqual(await auth.resetPassword(values,fixture(200)),{kind:'error',error:'service'});
});

test('checks confirmation, minimum length and UTF-8 bytes before dispatch',async()=>{
 for(const [input,field,error] of [
  [{...values,confirmPassword:'new password'},'confirmPassword','mismatch'],
  [{...values,password:'',confirmPassword:''},'password','required'],
  [{...values,password:'12345',confirmPassword:'12345'},'password','too-short'],
  [{...values,password:'a'.repeat(73),confirmPassword:'a'.repeat(73)},'password','too-long'],
  [{...values,password:'\u{1F331}'.repeat(19),confirmPassword:'\u{1F331}'.repeat(19)},'password','too-long'],
 ]){
  const d=fixture();const result=await auth.resetPassword(input,d);
  assert.equal(result.kind,'invalid');assert.equal(result.fields[field],error);assert.equal(d.calls.length,0);
 }
 const password='\u{1F331}'.repeat(18);
 assert.deepEqual(await auth.resetPassword({...values,password,confirmPassword:password},fixture()),{kind:'reset'});
});

test('keeps reset errors retryable without saving a session or automatically repeating requests',async()=>{
 assert.deepEqual(await auth.verifyPasswordResetCode('12345678',fixture(429)),{kind:'error',error:'rate-limited'});
 const d=fixture();d.request=async()=>{throw new Error('offline');};
 assert.deepEqual(await auth.resetPassword(values,d),{kind:'error',error:'network'});
 const c=new AbortController();c.abort();
 const next={...fixture(),signal:c.signal};
 assert.deepEqual(await auth.verifyPasswordResetCode('12345678',next),{kind:'cancelled'});
 assert.equal(next.calls.length,0);
});
