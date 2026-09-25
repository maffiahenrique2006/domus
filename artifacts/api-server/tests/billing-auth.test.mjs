// Exercise production app middleware and session-cookie handling over HTTP.
// Routes and DB transport are isolated test doubles; auth/origin logic is real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import crypto from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
let base,server,temp;
const secret='unit-test-session-secret-never-a-real-credential';
const token='a'.repeat(64);
function signedCookie(value){const signature=crypto.createHmac('sha256',secret).update(value).digest('base64').replace(/=+$/,'');return 'domus_session='+encodeURIComponent('s:'+value+'.'+signature);}
before(async()=>{
  process.env.NODE_ENV='test';process.env.LOG_LEVEL='silent';process.env.APP_URL='https://example.test';process.env.SESSION_SECRET=secret;
  temp=await mkdtemp(path.join(root,'artifacts/api-server/.billing-auth-tests-'));
  const bundle=path.join(temp,'app.mjs');
  const authPath=path.join(root,'artifacts/api-server/src/lib/auth.ts');
  await build({entryPoints:[path.join(root,'artifacts/api-server/src/app.ts')],outfile:bundle,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-transports',setup(b){
    b.onResolve({filter:/^@workspace\/db$/},()=>({path:'db',namespace:'test'}));
    b.onResolve({filter:/^\.\/routes$/},()=>({path:'routes',namespace:'test'}));
    b.onResolve({filter:/^\.\/routes\/billing$/},()=>({path:'webhook',namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},args=>({resolveDir:path.join(root,'artifacts/api-server'),contents:args.path==='webhook'?'import {Router} from "express";export const billingWebhookRouter=Router();':args.path==='routes'?`import {Router} from 'express';import {requireAuth} from ${JSON.stringify(authPath)};const r=Router();r.get('/public',(_q,s)=>s.json({ok:true}));r.post('/write',requireAuth,(_q,s)=>s.json({ok:true}));r.get('/private',requireAuth,(q,s)=>s.json({id:q.user.id}));export default r;`:`import {pgTable,text,integer} from 'drizzle-orm/pg-core';export const sessionsTable=pgTable('sessions',{token:text('token')});export const usersTable=pgTable('users',{id:integer('id')});export const db={select:()=>({from:table=>({where:async()=>table===sessionsTable?globalThis.__authTestSessions:globalThis.__authTestUsers})})};`}));
  }}]});
  globalThis.__authTestSessions=[{expiresAt:new Date(Date.now()+60000),userId:1}];globalThis.__authTestUsers=[{id:1,plan:'free'}];
  const {default:app}=await import(pathToFileURL(bundle));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(temp)await rm(temp,{recursive:true});delete globalThis.__authTestSessions;delete globalThis.__authTestUsers;});
test('anonymous API request is unauthorized and not cacheable',async()=>{
  const r=await fetch(base+'/api/private');assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('forged cookie cannot authenticate; genuine signed cookie can',async()=>{
  assert.equal((await fetch(base+'/api/private',{headers:{cookie:'domus_session='+token}})).status,401);
  const r=await fetch(base+'/api/private',{headers:{cookie:signedCookie(token)}});assert.equal(r.status,200);assert.deepEqual(await r.json(),{id:1});
});
test('expired session is rejected despite a valid signature',async()=>{
  globalThis.__authTestSessions[0].expiresAt=new Date(Date.now()-1000);
  assert.equal((await fetch(base+'/api/private',{headers:{cookie:signedCookie(token)}})).status,401);
  globalThis.__authTestSessions[0].expiresAt=new Date(Date.now()+60000);
});
test('cross-origin mutation is forbidden even with valid session',async()=>{
  assert.equal((await fetch(base+'/api/write',{method:'POST',headers:{cookie:signedCookie(token),origin:'https://attacker.test'}})).status,403);
  assert.equal((await fetch(base+'/api/write',{method:'POST',headers:{cookie:signedCookie(token),'sec-fetch-site':'cross-site'}})).status,403);
  assert.equal((await fetch(base+'/api/write',{method:'POST',headers:{cookie:signedCookie(token),origin:'https://example.test'}})).status,200);
});
test('bad JSON produces safe error without stack leakage',async()=>{
  const r=await fetch(base+'/api/write',{method:'POST',headers:{'content-type':'application/json'},body:'{broken'});
  assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:'Requisição inválida ou muito grande.'});
});
