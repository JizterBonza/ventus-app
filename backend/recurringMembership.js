const crypto = require('crypto');
const Stripe = require('stripe');
const { stripeIsConfigured } = require('./stripeMembership');
const { getTrialStatus, endTrialOnUpgrade } = require('./membershipTrial');
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, publicError: true });
const live = () => /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '');
const objectId = value => typeof value === 'string' ? value : value?.id;
const periodEnd = sub => sub.items?.data?.[0]?.current_period_end || sub.current_period_end;
const epoch = n => Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;

async function ensureRecurringSchema(pool) {
  await pool.query(`ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_status TEXT,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS renewal_amount_minor INTEGER`);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_stripe_recurring ON subscriptions(stripe_subscription_id)');
  await pool.query(`CREATE TABLE IF NOT EXISTS recurring_membership_orders (
    id UUID PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL CHECK(amount_minor > 0), currency CHAR(3) NOT NULL,
    livemode BOOLEAN NOT NULL, trial_days INTEGER NOT NULL DEFAULT 0, access_blocked BOOLEAN NOT NULL DEFAULT false,
    stripe_session_id TEXT UNIQUE, stripe_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'OPEN', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('ALTER TABLE recurring_membership_orders ADD COLUMN IF NOT EXISTS access_blocked BOOLEAN NOT NULL DEFAULT false');
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_orders_user ON recurring_membership_orders(user_id,created_at DESC)`);
}

function createRecurringMembership({ pool, getMembershipQuote, getActiveSubscription, serializeSubscription, publicAppUrl, stripeClient }) {
  const stripe = () => {
    if (!stripeIsConfigured()) throw fail('Secure membership checkout is temporarily unavailable.', 503);
    return stripeClient || new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 });
  };
  const route = fn => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { await fn(req, res); } catch (e) {
      console.error('Recurring membership request failed:', e.publicError ? e.statusCode : 'provider-or-database');
      res.status(e.publicError ? e.statusCode : 502).json({ success: false, error: e.publicError ? e.message : 'Unable to update your membership. Please try again.' });
    }
  };

  // Lock the account before retrieving current Stripe state. Out-of-order webhook
  // deliveries can therefore never overwrite a more recent cancellation or renewal.
  const sync = async subscriptionId => {
    let order = (await pool.query('SELECT * FROM recurring_membership_orders WHERE stripe_subscription_id = $1', [subscriptionId])).rows[0];
    if (!order) {
      const remote = await stripe().subscriptions.retrieve(subscriptionId);
      if (!remote.metadata?.ventus_recurring_order_id) return null;
      order = (await pool.query('SELECT * FROM recurring_membership_orders WHERE id = $1', [remote.metadata.ventus_recurring_order_id])).rows[0];
      if (!order) return null;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [order.user_id]);
      const sub = await stripe().subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice', 'default_payment_method'] });
      const item = sub.items?.data?.[0], price = item?.price;
      if (sub.metadata?.ventus_recurring_order_id !== order.id || sub.metadata?.ventus_user_id !== String(order.user_id) ||
          sub.livemode !== order.livemode || sub.livemode !== live() || sub.items?.data?.length !== 1 || item.quantity !== 1 ||
          price?.unit_amount !== order.amount_minor || price?.currency !== order.currency.trim().toLowerCase() ||
          price?.recurring?.interval !== 'year' || price?.recurring?.interval_count !== 1 ||
          sub.collection_method !== 'charge_automatically' || !objectId(sub.customer)) throw fail('This subscription does not match the membership order.');
      const session = await stripe().checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status !== 'complete' || session.mode !== 'subscription' || objectId(session.subscription) !== sub.id ||
          session.client_reference_id !== String(order.user_id) || session.metadata?.ventus_recurring_order_id !== order.id ||
          session.livemode !== order.livemode || objectId(session.customer) !== objectId(sub.customer)) throw fail('The membership checkout could not be verified.');
      const trial = sub.status === 'trialing';
      const invoice = sub.latest_invoice;
      const paid = sub.status === 'active' && invoice?.status === 'paid' && invoice?.amount_paid >= order.amount_minor && invoice?.currency === 'gbp';
      const validTrial = trial && order.trial_days === 7 && Boolean(objectId(sub.default_payment_method)) && epoch(sub.trial_end) > new Date();
      const expiry = epoch(trial ? sub.trial_end : periodEnd(sub)) || epoch(sub.ended_at) || new Date();
      const blocked = (await client.query('SELECT access_blocked FROM recurring_membership_orders WHERE id=$1',[order.id])).rows[0]?.access_blocked;
      const status = !blocked && (validTrial || paid) && expiry > new Date() ? 'active' : sub.status === 'canceled' ? 'cancelled' : 'inactive';
      await client.query(`INSERT INTO subscriptions(user_id,plan_id,status,amount_paid,currency,payment_provider,
        stripe_session_id,stripe_subscription_id,stripe_customer_id,stripe_status,trial_ends_at,cancel_at_period_end,
        renewal_amount_minor,starts_at,expires_at)
        VALUES($1,'travel-yearly',$2,$3,'GBP','stripe_subscription',$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT(stripe_subscription_id) DO UPDATE SET status=EXCLUDED.status,amount_paid=EXCLUDED.amount_paid,
        stripe_status=EXCLUDED.stripe_status,trial_ends_at=EXCLUDED.trial_ends_at,cancel_at_period_end=EXCLUDED.cancel_at_period_end,
        expires_at=EXCLUDED.expires_at,updated_at=NOW()`,
      [order.user_id,status,paid ? invoice.amount_paid / 100 : 0,session.id,sub.id,objectId(sub.customer),sub.status,
        epoch(sub.trial_end),Boolean(sub.cancel_at_period_end),order.amount_minor,epoch(sub.start_date) || new Date(),expiry]);
      await client.query(`UPDATE recurring_membership_orders SET stripe_subscription_id=$2,status='COMPLETE' WHERE id=$1`,[order.id,sub.id]);
      if (status === 'active') await endTrialOnUpgrade(order.user_id, client);
      const saved = (await client.query('SELECT * FROM subscriptions WHERE stripe_subscription_id=$1',[sub.id])).rows[0];
      await client.query('COMMIT');
      return saved;
    } catch(e) { await client.query('ROLLBACK').catch(()=>{}); throw e; } finally { client.release(); }
  };

  const checkout = route(async (req,res) => {
    if (req.body.acceptRecurring !== true) throw fail('Please review and accept the annual renewal terms before continuing.');
    const quote = getMembershipQuote(req.body.planId || 'travel-yearly',req.body.couponCode);
    if (!quote.couponValid || quote.finalPrice <= 0) throw fail('Please use a valid annual membership or complimentary code.');
    const amount = Math.round(quote.finalPrice * 100), provider = stripe();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const user = (await client.query('SELECT id,email,email_verified_at FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];
      if (!user) throw fail('Account not found.',404);
      if (!user.email_verified_at) throw fail('Confirm your email before starting your membership.',403);
      const current = await getActiveSubscription(user.id,client);
      if (current && current.payment_provider !== 'trial') throw fail('Your membership is already active.',409);
      // A failed payment still has a live subscription. Never create a second one.
      const continuing = (await client.query(`SELECT stripe_status FROM subscriptions WHERE user_id=$1 AND payment_provider='stripe_subscription'
        AND stripe_status NOT IN ('canceled','incomplete_expired') LIMIT 1`,[user.id])).rows[0];
      if (continuing) throw fail('You already have a subscription. Manage its payment details in My Membership.',409);
      const trial = await getTrialStatus(user,current,client);
      const trialDays = trial.eligible ? 7 : 0;
      const previous = (await client.query("SELECT * FROM recurring_membership_orders WHERE user_id=$1 AND status='OPEN' ORDER BY created_at DESC",[user.id])).rows;
      for (const old of previous) {
        if (!old.stripe_session_id || old.livemode !== live()) continue;
        const session = await provider.checkout.sessions.retrieve(old.stripe_session_id);
        if (session.status === 'complete') throw fail('Your membership is being confirmed. Refresh My Membership before trying again.',409);
        if (session.status === 'open' && old.amount_minor === amount && old.trial_days === trialDays) {
          await client.query('COMMIT'); return res.json({success:true,url:session.url});
        }
        if (session.status === 'open') await provider.checkout.sessions.expire(session.id);
        await client.query("UPDATE recurring_membership_orders SET status='EXPIRED' WHERE id=$1",[old.id]);
      }
      // Retire old one-off checkouts when a customer explicitly chooses the new plan.
      const legacy = (await client.query("SELECT * FROM stripe_membership_orders WHERE user_id=$1 AND status='OPEN'",[user.id])).rows;
      for (const old of legacy) {
        if (!old.stripe_session_id || old.livemode !== live()) continue;
        const session = await provider.checkout.sessions.retrieve(old.stripe_session_id);
        if (session.status === 'complete') throw fail('Your earlier payment is being confirmed. Please refresh before continuing.',409);
        if (session.status === 'open') await provider.checkout.sessions.expire(session.id);
        await client.query("UPDATE stripe_membership_orders SET status='EXPIRED' WHERE id=$1",[old.id]);
      }
      const id = crypto.randomUUID();
      await client.query(`INSERT INTO recurring_membership_orders(id,user_id,amount_minor,currency,livemode,trial_days)
        VALUES($1,$2,$3,'GBP',$4,$5)`,[id,user.id,amount,live(),trialDays]);
      const metadata = {ventus_recurring_order_id:id,ventus_user_id:String(user.id)};
      const session = await provider.checkout.sessions.create({
        mode:'subscription', payment_method_types:['card'], payment_method_collection:'always',
        client_reference_id:String(user.id), customer_email:user.email, metadata,
        line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:amount,recurring:{interval:'year'},
          product_data:{name:'Ventus Travel Club — annual membership'}}}],
        subscription_data:{metadata,...(trialDays ? {trial_period_days:7,trial_settings:{end_behavior:{missing_payment_method:'cancel'}}} : {})},
        custom_text:{submit:{message:`${trialDays ? '7 days complimentary, then ' : ''}£${quote.finalPrice.toFixed(2)} each year until cancelled. Cancel in one click from My Membership before your next payment.`}},
        success_url:`${publicAppUrl}/subscription?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:`${publicAppUrl}/subscription?checkout=cancelled`,
      },{idempotencyKey:`ventus-recurring-${id}`});
      if (!session.id || !session.url) throw fail('Secure checkout could not be opened.',502);
      await client.query('UPDATE recurring_membership_orders SET stripe_session_id=$2 WHERE id=$1',[id,session.id]);
      await client.query('COMMIT'); res.status(201).json({success:true,url:session.url});
    } catch(e) { await client.query('ROLLBACK').catch(()=>{}); throw e; } finally { client.release(); }
  });
  const confirm = route(async(req,res) => {
    if (typeof req.body.sessionId !== 'string' || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(req.body.sessionId)) throw fail('Invalid checkout reference.');
    const order = (await pool.query('SELECT * FROM recurring_membership_orders WHERE stripe_session_id=$1 AND user_id=$2',[req.body.sessionId,req.user.id])).rows[0];
    if (!order) throw fail('Checkout was not found for this account.',404);
    const session = await stripe().checkout.sessions.retrieve(order.stripe_session_id);
    if (session.status !== 'complete') return res.json({success:true,active:false,pending:session.status === 'open'});
    const sub = await sync(objectId(session.subscription));
    res.json({success:true,active:sub?.status === 'active',pending:sub?.stripe_status === 'incomplete'});
  });
  const status = route(async(req,res) => {
    let sub = (await pool.query("SELECT * FROM subscriptions WHERE user_id=$1 AND payment_provider='stripe_subscription' ORDER BY starts_at DESC,id DESC LIMIT 1",[req.user.id])).rows[0];
    if (sub && !['canceled','incomplete_expired'].includes(sub.stripe_status)) sub = await sync(sub.stripe_subscription_id);
    res.json({success:true,subscription:serializeSubscription(sub)});
  });
  const cancel = route(async(req,res) => {
    const client = await pool.connect(); let id;
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
      const sub = (await client.query("SELECT * FROM subscriptions WHERE user_id=$1 AND payment_provider='stripe_subscription' ORDER BY starts_at DESC,id DESC LIMIT 1",[req.user.id])).rows[0];
      if (!sub) throw fail('No recurring membership was found.',404);
      id = sub.stripe_subscription_id;
      const current = await stripe().subscriptions.retrieve(id);
      if (['trialing','active'].includes(current.status) && !current.cancel_at_period_end) {
        await stripe().subscriptions.update(id,{cancel_at_period_end:true,proration_behavior:'none'});
      } else if (!['trialing','active','canceled','incomplete_expired'].includes(current.status)) {
        // Stop retries for unpaid memberships as well as future renewal charges.
        await stripe().subscriptions.cancel(id,{invoice_now:false,prorate:false});
      }
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK').catch(()=>{}); throw e; } finally { client.release(); }
    res.json({success:true,subscription:serializeSubscription(await sync(id))});
  });
  let portalConfiguration;
  const portal = route(async(req,res) => {
    const sub = (await pool.query("SELECT * FROM subscriptions WHERE user_id=$1 AND payment_provider='stripe_subscription' ORDER BY starts_at DESC,id DESC LIMIT 1",[req.user.id])).rows[0];
    if (!sub?.stripe_customer_id) throw fail('No recurring membership was found.',404);
    if (!portalConfiguration) {
      portalConfiguration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION || (await stripe().billingPortal.configurations.list({limit:100})).data.find(c => c.active && c.metadata?.ventus_portal === 'membership_v1')?.id;
    }
    if (!portalConfiguration) throw fail('Billing details are temporarily unavailable. You can still cancel renewal here.',503);
    const configuration = portalConfiguration;
    const session = await stripe().billingPortal.sessions.create({customer:sub.stripe_customer_id,return_url:`${publicAppUrl}/subscription`,...(configuration ? {configuration} : {})});
    res.json({success:true,url:session.url});
  });
  const handleEvent = async event => {
    const object = event.data.object;
    if ((event.type === 'charge.refunded' && object.refunded) || event.type === 'charge.dispute.created') {
      if (object.payment_intent) {
        const payments = await stripe().invoicePayments.list({payment:{type:'payment_intent',payment_intent:objectId(object.payment_intent)},limit:100});
        for (const payment of payments.data) {
          const invoice = await stripe().invoices.retrieve(objectId(payment.invoice));
          const id = objectId(invoice.parent?.subscription_details?.subscription || invoice.subscription);
          if (!id) continue;
          const own = await pool.query('UPDATE recurring_membership_orders SET access_blocked=true WHERE stripe_subscription_id=$1 RETURNING id',[id]);
          if (own.rows.length) {
            const remote = await stripe().subscriptions.retrieve(id);
            if (['active','trialing'].includes(remote.status) && !remote.cancel_at_period_end) await stripe().subscriptions.update(id,{cancel_at_period_end:true,proration_behavior:'none'});
            await sync(id);
          }
        }
      }
    }
    if (event.type.startsWith('customer.subscription.')) return sync(object.id);
    if (event.type.startsWith('invoice.')) {
      const id = objectId(object.parent?.subscription_details?.subscription || object.subscription);
      if (id) return sync(id);
    }
    if (event.type.startsWith('checkout.session.') && object.metadata?.ventus_recurring_order_id && objectId(object.subscription)) return sync(objectId(object.subscription));
  };
  return {checkout,confirm,status,cancel,portal,sync,handleEvent};
}
module.exports = {ensureRecurringSchema,createRecurringMembership,periodEnd};
