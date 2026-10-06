const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto');
const express=require('express'),{Pool}=require('pg'),Stripe=require('stripe');
const {ensureRecurringSchema,createRecurringMembership}=require('./recurringMembership');
const {ensureStripeMembershipSchema,createStripeMembershipHandlers}=require('./stripeMembership');
const {ensureTrialSchema,findActiveMembership,getTrialStatus}=require('./membershipTrial');
const {ensureReminderSchema,reminderSchedule,monthBefore,createMembershipReminderWorker}=require('./membershipReminders');
const {registerLoyaltyRoutes}=require('./loyaltyRoutes');

test('reminders use calendar months and separate trial/renewal schedules',()=>{
  assert.equal(monthBefore('2030-03-31T15:30:00Z').toISOString(),'2030-02-28T15:30:00.000Z');
  const sub={status:'active',stripe_status:'trialing',trial_ends_at:'2030-03-31T15:30:00Z'};
  assert.deepEqual(reminderSchedule(sub).map(x=>x.kind),['trial-3-days','trial-1-day']);
  assert.equal(reminderSchedule({...sub,cancel_at_period_end:true}).length,0);
  assert.equal(reminderSchedule({...sub,status:'inactive'}).length,0);
  assert.equal(reminderSchedule({...sub,stripe_status:'active',expires_at:sub.trial_ends_at}).length,3);
});
test('recurring checkout, signed lifecycle events, one-click cancellation, reminders and loyalty isolation', {skip:!process.env.STRIPE_TEST_DATABASE_URL},async t=>{
  const schema='recurring_test_'+crypto.randomBytes(6).toString('hex'),url=process.env.STRIPE_TEST_DATABASE_URL;
  const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);
  const pool=new Pool({connectionString:url,options:`-c search_path=${schema}`});
  const before=[process.env.STRIPE_SECRET_KEY,process.env.STRIPE_WEBHOOK_SECRET];
  process.env.STRIPE_SECRET_KEY='sk_test_example';process.env.STRIPE_WEBHOOK_SECRET='whsec_example';
  let server;
  try{
    await pool.query(`CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,first_name TEXT,email_verified_at TIMESTAMPTZ);
      INSERT INTO users SELECT n,'guest'||n||'@example.test','Guest',NOW() FROM generate_series(1,6)n;
      CREATE TABLE subscriptions(id BIGSERIAL PRIMARY KEY,user_id INTEGER,plan_id TEXT,status TEXT,amount_paid NUMERIC,currency CHAR(3),payment_provider TEXT,
      starts_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,updated_at TIMESTAMPTZ DEFAULT NOW());`);
    await ensureTrialSchema(pool);await ensureStripeMembershipSchema(pool);await ensureRecurringSchema(pool);await ensureRecurringSchema(pool);await ensureReminderSchema(pool);
    const sessions=new Map(),subs=new Map();let created=0,cancelled=0;
    const sdk=new Stripe('sk_test_example');
    const provider={webhooks:sdk.webhooks,checkout:{sessions:{
      create:async params=>{const id='cs_test_'+ ++created;const session={id,status:'open',payment_status:'unpaid',mode:params.mode,livemode:false,metadata:params.metadata,client_reference_id:params.client_reference_id,url:'https://checkout.stripe.com/'+id,params};sessions.set(id,session);return structuredClone(session);},
      retrieve:async id=>structuredClone(sessions.get(id)),expire:async id=>{sessions.get(id).status='expired';},
    }},subscriptions:{retrieve:async id=>structuredClone(subs.get(id)),update:async(id,params)=>{Object.assign(subs.get(id),params);cancelled++;return structuredClone(subs.get(id));},cancel:async id=>{subs.get(id).status='canceled';return structuredClone(subs.get(id));}},
      invoicePayments:{list:async()=>({data:[{invoice:'in_refunded'}]})},invoices:{retrieve:async()=>({parent:{subscription_details:{subscription:[...subs.values()].find(s=>s.customer==='cus_2').id}}})},
      paymentIntents:{retrieve:async()=>({metadata:{}})},
      billingPortal:{configurations:{list:async()=>({data:[{id:'bpc_ventus',active:true,metadata:{ventus_portal:'membership_v1'}}]})},sessions:{create:async params=>({url:'https://billing.stripe.com/session/'+params.customer})}}};
    const quote=(plan,coupon)=>{if(plan!=='travel-yearly')throw Object.assign(new Error('Invalid plan'),{publicError:true,statusCode:400});return {planId:plan,finalPrice:coupon==='FREE'?0:299,currency:'GBP',couponValid:coupon!=='BAD'};};
    const handlers=createRecurringMembership({pool,stripeClient:provider,getMembershipQuote:quote,getActiveSubscription:(id,client)=>findActiveMembership(id,client||pool),serializeSubscription:s=>s||null,publicAppUrl:'https://ventus.example'});
    const legacy=createStripeMembershipHandlers({pool,stripeClient:provider,recurring:handlers,getMembershipQuote:quote});
    const app=express();app.use('/webhook',express.raw({type:'application/json'}));app.use(express.json());
    const auth=(req,res,next)=>{const id=Number(req.get('authorization'));if(!id)return res.sendStatus(401);req.user={id};next();};
    app.post('/checkout',auth,handlers.checkout);app.post('/confirm',auth,handlers.confirm);app.post('/cancel',auth,handlers.cancel);app.get('/status',auth,handlers.status);app.post('/portal',auth,handlers.portal);app.post('/webhook',legacy.webhook);
    const loyalty=registerLoyaltyRoutes(app,pool,auth);await loyalty.ensureSchema();
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;
    const request=(path,body={},user=1,method='POST')=>fetch(base+path,{method,headers:{Authorization:String(user),'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
    const hook=(type,object,extra={})=>{const payload=JSON.stringify({id:'evt_test',type,livemode:false,data:{object},...extra});return fetch(base+'/webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':sdk.webhooks.generateTestHeaderString({payload,secret:'whsec_example'})},body:payload});};
    const complete=(session,trial=true)=>{
      const now=Math.floor(Date.now()/1000),id='sub_'+session.id;
      Object.assign(session,{status:'complete',payment_status:trial?'no_payment_required':'paid',customer:'cus_'+session.client_reference_id,subscription:id});
      const sub={id,metadata:session.params.subscription_data.metadata,livemode:false,customer:session.customer,status:trial?'trialing':'active',collection_method:'charge_automatically',default_payment_method:{id:'pm_card'},
        start_date:now,trial_end:trial?now+7*86400:null,cancel_at_period_end:false,
        items:{data:[{quantity:1,current_period_end:now+(trial?7:365)*86400,price:{unit_amount:29900,currency:'gbp',recurring:{interval:'year',interval_count:1}}}]},
        latest_invoice:{id:'in_'+id,status:'paid',amount_paid:trial?0:29900,currency:'gbp'}};
      subs.set(id,sub);return sub;
    };
    const check=async(name,fn)=>{await fn();t.diagnostic(name);};
    await check('checkout requires authentication, verified email and explicit renewal consent',async()=>{
      assert.equal((await request('/checkout',{},0)).status,401);assert.equal((await request('/checkout')).status,400);
      await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=6');assert.equal((await request('/checkout',{acceptRecurring:true},6)).status,403);
    });
    await check('duplicate starts reuse one server-priced checkout with mandatory card and seven-day trial',async()=>{
      const result=await Promise.all([request('/checkout',{acceptRecurring:true,amount:1}),request('/checkout',{acceptRecurring:true})]);
      assert.deepEqual(result.map(r=>r.status).sort(),[200,201]);assert.equal(created,1);
      const p=sessions.get('cs_test_1').params;assert.equal(p.mode,'subscription');assert.equal(p.payment_method_collection,'always');assert.equal(p.subscription_data.trial_period_days,7);assert.equal(p.line_items[0].price_data.unit_amount,29900);assert.deepEqual(p.line_items[0].price_data.recurring,{interval:'year'});
      assert.equal((await request('/confirm',{sessionId:'cs_test_1'},2)).status,404);
      assert.equal((await(await request('/confirm',{sessionId:'cs_test_1'})).json()).active,false);
    });
    const session=sessions.get('cs_test_1'),sub=complete(session);
    await check('signed checkout activates once; altered price, account and unsigned events fail closed',async()=>{
      assert.equal((await request('/webhook',{type:'checkout.session.completed'})).status,400);
      sub.items.data[0].price.unit_amount=1;assert.equal((await request('/confirm',{sessionId:session.id})).status,400);sub.items.data[0].price.unit_amount=29900;
      sub.metadata.ventus_user_id='2';assert.equal((await request('/confirm',{sessionId:session.id})).status,400);sub.metadata.ventus_user_id='1';
      const results=await Promise.all([hook('checkout.session.completed',session),request('/confirm',{sessionId:session.id}),hook('customer.subscription.updated',sub)]);
      assert.ok(results.every(r=>r.status===200));assert.equal((await pool.query('SELECT * FROM subscriptions WHERE user_id=1')).rows.length,1);
      assert.equal((await request('/checkout',{acceptRecurring:true})).status,409);
      assert.equal((await getTrialStatus({id:1,email_verified_at:new Date()},null,pool)).used,true);
    });
    await check('one-click cancellation preserves remaining trial, cannot cancel another user, and late events cannot restore renewal',async()=>{
      assert.equal((await request('/cancel',{},2)).status,404);
      assert.equal((await request('/cancel',{subscriptionId:'sub_another'})).status,200);assert.equal(cancelled,1);
      assert.equal((await request('/cancel')).status,200);assert.equal(cancelled,1);
      assert.equal((await hook('customer.subscription.updated',{...sub,cancel_at_period_end:false})).status,200);
      const saved=(await pool.query('SELECT * FROM subscriptions WHERE user_id=1')).rows[0];assert.equal(saved.cancel_at_period_end,true);assert.equal(saved.status,'active');
      sub.status='canceled';assert.equal((await hook('customer.subscription.deleted',sub)).status,200);
      assert.equal((await findActiveMembership(1,pool)),null);
      await request('/checkout',{acceptRecurring:true});assert.equal(sessions.get('cs_test_2').params.subscription_data.trial_period_days,undefined);
    });
    await check('paid renewals extend access, failed renewals revoke it, old webhook snapshots cannot undo recovery',async()=>{
      await request('/checkout',{acceptRecurring:true},2);const s=[...sessions.values()].find(x=>x.client_reference_id==='2');const paid=complete(s,false);
      await request('/confirm',{sessionId:s.id},2);
      const first=(await findActiveMembership(2,pool)).expires_at;
      paid.items.data[0].current_period_end+=365*86400;paid.latest_invoice.id='in_renewed';await hook('invoice.paid',{parent:{subscription_details:{subscription:paid.id}}});
      assert.ok((await findActiveMembership(2,pool)).expires_at>first);
      paid.status='past_due';paid.latest_invoice.status='open';await hook('invoice.payment_failed',{subscription:paid.id});assert.equal(await findActiveMembership(2,pool),null);
      assert.equal((await request('/checkout',{acceptRecurring:true},2)).status,409);
      paid.status='active';paid.latest_invoice.status='paid';await hook('invoice.payment_failed',{subscription:paid.id});assert.ok(await findActiveMembership(2,pool));
    });
    await check('legacy no-card trials never receive another automatic trial or silently become subscriptions',async()=>{
      await pool.query("INSERT INTO subscriptions(user_id,plan_id,status,payment_provider,starts_at,expires_at)VALUES(3,'travel-trial','active','trial',NOW(),NOW()+INTERVAL '7 days')");
      await request('/checkout',{acceptRecurring:true},3);const s=[...sessions.values()].find(x=>x.client_reference_id==='3');assert.equal(s.params.subscription_data.trial_period_days,undefined);
      assert.equal((await findActiveMembership(3,pool)).payment_provider,'trial');
    });
    await check('reminders retry failures, avoid repeats and suppress cancelled or expired notices',async()=>{
      const s=(await pool.query('SELECT * FROM subscriptions WHERE user_id=2')).rows[0];
      await pool.query("UPDATE subscriptions SET expires_at=NOW()+INTERVAL '20 hours' WHERE id=$1",[s.id]);
      let sends=0,fail=true;const worker=createMembershipReminderWorker(pool,async()=>{},async()=>{sends++;if(fail)throw new Error('mail unavailable');});
      await worker.drain();assert.equal(sends,1);assert.equal((await pool.query('SELECT sent_at FROM membership_reminder_emails WHERE kind=\'renewal-1-day\' AND subscription_id=$1',[s.id])).rows[0].sent_at,null);
      fail=false;await pool.query('UPDATE membership_reminder_emails SET available_at=NOW() WHERE sent_at IS NULL');await worker.drain();assert.equal(sends,2);await worker.drain();assert.equal(sends,2);
      await pool.query("UPDATE subscriptions SET expires_at=NOW()+INTERVAL '19 hours',cancel_at_period_end=true WHERE id=$1",[s.id]);await worker.drain();assert.equal(sends,2);
      await pool.query("UPDATE subscriptions SET expires_at=NOW()+INTERVAL '18 hours',cancel_at_period_end=false WHERE id=$1",[s.id]);
      let syncAttempts=0;
      const unavailable=createMembershipReminderWorker(pool,async()=>{syncAttempts++;throw new Error('provider unavailable');},async()=>{throw new Error('must not send stale notice');});
      await unavailable.drain();assert.equal(syncAttempts,1);await unavailable.drain();assert.equal(syncAttempts,1);
      const queued=(await pool.query('SELECT attempts,available_at FROM membership_reminder_emails WHERE subscription_id=$1 AND sent_at IS NULL AND superseded_at IS NULL ORDER BY available_at DESC LIMIT 1',[s.id])).rows[0];
      assert.equal(queued.attempts,1);assert.ok(queued.available_at>new Date());
    });
    await check('billing portal uses the account customer and full refunds cannot be replayed into active access',async()=>{
      const portal=await(await request('/portal',{},2)).json();assert.equal(portal.url,'https://billing.stripe.com/session/cus_2');
      assert.equal((await request('/portal',{},5)).status,404);
      const paid=[...subs.values()].find(s=>s.customer==='cus_2');
      assert.equal((await hook('charge.refunded',{refunded:true,payment_intent:'pi_refunded'})).status,200);
      assert.equal(paid.cancel_at_period_end,true);
      assert.equal(await findActiveMembership(2,pool),null);
      await hook('customer.subscription.updated',paid);assert.equal(await findActiveMembership(2,pool),null);
    });
    await check('loyalty numbers persist only in their owner’s profile',async()=>{
      assert.equal((await request('/api/loyalty-cards',{programme:'World of Hyatt',number:'123456'})).status,201);
      const own=await(await request('/api/loyalty-cards',{},1,'GET')).json();assert.equal(own.cards.length,1);
      assert.equal((await(await request('/api/loyalty-cards',{},2,'GET')).json()).cards.length,0);
      await request('/api/loyalty-cards/'+own.cards[0].id,{},2,'DELETE');assert.equal((await(await request('/api/loyalty-cards',{},1,'GET')).json()).cards.length,1);
      assert.equal((await request('/api/loyalty-cards',{programme:'Hyatt',number:'<invalid>'})).status,400);
      await request('/api/loyalty-cards/'+own.cards[0].id,{},1,'DELETE');assert.equal((await(await request('/api/loyalty-cards',{},1,'GET')).json()).cards.length,0);
    });
  }finally{
    if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
    ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'].forEach((key,i)=>{if(before[i]===undefined)delete process.env[key];else process.env[key]=before[i];});
  }
});
