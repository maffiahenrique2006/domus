// Real PostgreSQL semantics and real Stripe signature verification; network calls
// are stubbed in this test process only. No test shortcuts enter production code.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import express from 'express';
import { build } from 'esbuild';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const dbRequire = createRequire(path.join(root, 'lib/db/package.json'));
const { PGlite } = dbRequire('@electric-sql/pglite');
let db, server, base, temp, stripe, subscriptions, sessions, creations;
const secret = 'whsec_unit_test_not_a_real_credential';
const subscription = (status='active', id='sub_1', customer='cus_1') => ({
  id, customer, status, livemode:false, cancel_at_period_end:false,
  metadata:{domus_user_id:'1'}, items:{data:[{price:{id:'price_test'}}]},
});
before(async () => {
  process.env.STRIPE_SECRET_KEY='sk_test_unit_test_not_a_real_credential';
  process.env.STRIPE_WEBHOOK_SECRET=secret;
  process.env.STRIPE_PRICE_ID='price_test';
  process.env.APP_URL='https://example.test';
  process.env.NODE_ENV='production'; process.env.LOG_LEVEL='silent';
  db = new PGlite();
  for (const file of ['000_auth_baseline.sql','002_billing_safety.sql']) {
    await db.exec(await readFile(path.join(root,'lib/db/migrations',file),'utf8'));
  }
  const query = async (sql, params) => { const result = await db.query(sql,params); return {...result,rowCount:result.affectedRows ?? result.rows.length}; };
  globalThis.__billingTestPool = { query, connect:async()=>({query,release(){}}) };
  temp=await mkdtemp(path.join(root,'artifacts/api-server/.billing-tests-'));
  const bundle=path.join(temp,'routes.mjs');
  await build({stdin:{contents:'export { default, billingWebhookRouter } from "./src/routes/billing.ts"; export { getStripeClient } from "./src/lib/stripe-client.ts";',resolveDir:path.join(root,'artifacts/api-server')},outfile:bundle,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^@workspace\/db$/},()=>({path:'test-db',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const pool=globalThis.__billingTestPool;'}));}}]});
  const routes=await import(pathToFileURL(bundle)); stripe=routes.getStripeClient();
  stripe.subscriptions.retrieve=async(id)=>{ if(!subscriptions.has(id)) throw Error('Unknown subscription'); return subscriptions.get(id); };
  stripe.subscriptions.update=async(id,change)=>Object.assign(subscriptions.get(id),change);
  stripe.prices.retrieve=async()=>({livemode:false,active:true,recurring:{interval:'month'}});
  stripe.checkout.sessions.retrieve=async(id)=>sessions.get(id);
  stripe.checkout.sessions.create=async()=>{creations++;const s={id:'cs_'+creations,url:'https://checkout.stripe.test/'+creations,status:'open',livemode:false};sessions.set(s.id,s);return s;};
  const app=express(); app.use('/api',routes.billingWebhookRouter); app.use(express.json());
  app.use(async(req,res,next)=>{const {rows:[u]}=await db.query('SELECT * FROM users WHERE id=1');req.user={id:u.id,email:u.email,plan:u.plan,stripeSubscriptionId:u.stripe_subscription_id};next();});
  app.use('/api',routes.default);
  server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve)); base='http://127.0.0.1:'+server.address().port;
});
beforeEach(async()=>{
  await db.exec('TRUNCATE domus_billing_events,domus_billing_state,users CASCADE');
  await db.query("INSERT INTO users(id,google_id,email,name) VALUES(1,'g1','one@example.test','One'),(2,'g2','two@example.test','Two')");
  subscriptions=new Map([['sub_1',subscription()]]); sessions=new Map(); creations=0;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await db?.close();if(temp)await rm(temp,{recursive:true});delete globalThis.__billingTestPool;});
const event = (id='evt_1',type='customer.subscription.updated',object=subscription())=>({id,type,livemode:false,created:100,data:{object}});
async function webhook(payload, signature) {
  const body=JSON.stringify(payload);
  const header=signature??stripe.webhooks.generateTestHeaderString({payload:body,secret});
  return fetch(base+'/api/billing/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':header},body});
}
async function user(id=1){return (await db.query('SELECT * FROM users WHERE id=$1',[id])).rows[0];}
test('rejects forged signatures before any billing write',async()=>{
  assert.equal((await webhook(event(),'t=0,v1=forged')).status,400);
  assert.equal((await user()).plan,'free');
  assert.equal((await db.query('SELECT * FROM domus_billing_events')).rows.length,0);
});
test('rejects live-mode events even with a valid signature',async()=>{
  assert.equal((await webhook({...event(),livemode:true})).status,400);
  assert.equal((await user()).plan,'free');
});
test('authentic matching active subscription activates only its owner and deduplicates delivery',async()=>{
  assert.equal((await webhook(event())).status,200);
  assert.equal((await user()).plan,'pro'); assert.equal((await user(2)).plan,'free');
  const replay=await webhook(event()); assert.equal((await replay.json()).duplicate,true);
  assert.equal((await db.query('SELECT * FROM domus_billing_events')).rows.length,1);
});
test('delayed active event cannot reactivate canceled subscription',async()=>{
  await webhook(event()); subscriptions.set('sub_1',subscription('canceled'));
  assert.equal((await webhook(event('evt_late'))).status,200);
  assert.equal((await user()).plan,'free');
});
test('wrong price never grants Pro',async()=>{
  subscriptions.get('sub_1').items.data[0].price.id='price_other';
  assert.equal((await webhook(event())).status,200);assert.equal((await user()).plan,'free');
  assert.equal((await user()).stripe_subscription_id,null);
});
test('unrelated subscription with no owner is acknowledged without retry or attachment',async()=>{
  const other={...subscription('active','sub_other','cus_other'),metadata:{}};
  const response=await webhook(event('evt_other','customer.subscription.updated',other));
  assert.equal(response.status,200);assert.equal((await response.json()).ignored,true);
  assert.equal((await user()).stripe_subscription_id,null);
});
test('shared Stripe customer alone cannot attach another subscription',async()=>{
  await db.query("UPDATE users SET stripe_customer_id='cus_1' WHERE id=1");
  const other={...subscription('active','sub_other'),metadata:{}};
  const response=await webhook(event('evt_other','customer.subscription.updated',other));
  assert.equal(response.status,200);assert.equal((await response.json()).ignored,true);
  assert.equal((await user()).stripe_subscription_id,null);
});
test('another product using a coincident numeric client reference is safely ignored',async()=>{
  await db.query("UPDATE users SET stripe_customer_id='cus_domus' WHERE id=1");
  subscriptions.get('sub_1').items.data[0].price.id='price_other';
  const checkout={id:'cs_other',subscription:'sub_1',customer:'cus_1',client_reference_id:'1'};
  const response=await webhook(event('evt_other_checkout','checkout.session.completed',checkout));
  assert.equal(response.status,200);assert.equal((await response.json()).ignored,true);
  assert.equal((await user()).stripe_customer_id,'cus_domus');
  assert.equal((await user()).stripe_subscription_id,null);
});
test('legacy checkout without subscription metadata still activates matching app price',async()=>{
  subscriptions.get('sub_1').metadata={};
  const checkout={id:'cs_legacy',subscription:'sub_1',customer:'cus_1',client_reference_id:'1',payment_status:'paid'};
  assert.equal((await webhook(event('evt_legacy','checkout.session.completed',checkout))).status,200);
  assert.equal((await user()).plan,'pro');
  subscriptions.get('sub_1').status='canceled';
  assert.equal((await webhook(event('evt_cancel','customer.subscription.deleted',{...subscription('canceled'),metadata:{}}))).status,200);
  assert.equal((await user()).plan,'free');
});
test('changing an already linked subscription to an unrelated price revokes Pro',async()=>{
  await webhook(event());subscriptions.get('sub_1').items.data[0].price.id='price_other';
  assert.equal((await webhook(event('evt_price_change'))).status,200);
  assert.equal((await user()).plan,'free');
});
test('owner/customer mismatch rolls back receipt so retry remains possible',async()=>{
  await db.query("UPDATE users SET stripe_customer_id='cus_different' WHERE id=1");
  assert.equal((await webhook(event())).status,500);assert.equal((await user()).plan,'free');
  assert.equal((await db.query('SELECT * FROM domus_billing_events')).rows.length,0);
});
test('unpaid incomplete checkout does not grant Pro merely because checkout completed',async()=>{
  subscriptions.set('sub_1',subscription('incomplete'));
  const checkout={id:'cs_test',subscription:'sub_1',customer:'cus_1',client_reference_id:'1',payment_status:'unpaid'};
  assert.equal((await webhook(event('evt_checkout','checkout.session.completed',checkout))).status,200);
  assert.equal((await user()).plan,'free');
});
test('repeated checkout reuses open session; an active subscription blocks new checkout',async()=>{
  let response=await fetch(base+'/api/billing/checkout',{method:'POST'});assert.equal(response.status,200);const first=await response.json();
  response=await fetch(base+'/api/billing/checkout',{method:'POST'});assert.deepEqual(await response.json(),first);assert.equal(creations,1);
  await webhook(event());response=await fetch(base+'/api/billing/checkout',{method:'POST'});assert.equal(response.status,409);
});
test('cancel requests end-of-period and does not falsely revoke current plan',async()=>{
  await webhook(event());const response=await fetch(base+'/api/billing/cancel',{method:'POST'});
  assert.equal(response.status,200);assert.equal(subscriptions.get('sub_1').cancel_at_period_end,true);assert.equal((await user()).plan,'pro');
});
