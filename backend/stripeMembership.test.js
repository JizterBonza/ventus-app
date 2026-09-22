const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const Stripe = require('stripe');
const { Pool } = require('pg');
const { stripeIsConfigured, ensureStripeMembershipSchema, createStripeMembershipHandlers } = require('./stripeMembership');

test('Stripe requires both server credentials', () => {
  const before = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET];
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_test_example';
    delete process.env.STRIPE_WEBHOOK_SECRET;
    assert.equal(stripeIsConfigured(), false);
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
    assert.equal(stripeIsConfigured(), true);
    process.env.STRIPE_SECRET_KEY = 'your_stripe_key';
    assert.equal(stripeIsConfigured(), false);
  } finally {
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    });
  }
});

// Use a disposable PostgreSQL database. Each run also isolates and removes its own schema.
test('Stripe checkout and signed webhooks with PostgreSQL', { skip: !process.env.STRIPE_TEST_DATABASE_URL }, async (t) => {
  const schema = `stripe_test_${crypto.randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString: process.env.STRIPE_TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.STRIPE_TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  const before = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET];
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
  let server;
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    await pool.query('INSERT INTO users VALUES (1), (2), (3)');
    await pool.query(`CREATE TABLE subscriptions (
      id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), plan_id TEXT, status TEXT,
      amount_paid NUMERIC(12, 2), currency CHAR(3), payment_provider TEXT,
      starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await ensureStripeMembershipSchema(pool);
    await ensureStripeMembershipSchema(pool);
    const sessions = new Map();
    let createCount = 0;
    let throwOnCreate = false;
    const sdk = new Stripe('sk_test_example');
    const stripeClient = {
      webhooks: sdk.webhooks,
      checkout: { sessions: {
        create: async (params) => {
          if (throwOnCreate) throw Object.assign(new Error('Invalid API Key provided: SECRET'), { statusCode: 401 });
          const id = `cs_test_${++createCount}`;
          const session = { id, status: 'open', payment_status: 'unpaid', mode: params.mode, livemode: false,
            amount_total: params.line_items[0].price_data.unit_amount, currency: params.line_items[0].price_data.currency,
            client_reference_id: params.client_reference_id, metadata: params.metadata,
            url: `https://checkout.stripe.com/c/pay/${id}`, params };
          sessions.set(id, session);
          return session;
        },
        retrieve: async (id) => structuredClone(sessions.get(id)),
        expire: async (id) => { sessions.get(id).status = 'expired'; },
      } },
      paymentIntents: { retrieve: async (id) => {
        const session = [...sessions.values()].find((entry) => entry.payment_intent?.id === id);
        return { id, metadata: session.metadata };
      } },
    };
    const getActiveSubscription = async (userId, client = pool) => (await client.query("SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()", [userId])).rows[0];
    const handlers = createStripeMembershipHandlers({ pool, stripeClient, publicAppUrl: 'https://ventus.example', getActiveSubscription,
      getMembershipQuote: (plan, coupon) => {
        if (plan !== 'travel-yearly') throw Object.assign(new Error('Invalid plan'), { statusCode: 400, publicError: true });
        return { planId: plan, finalPrice: coupon === 'FREE' ? 0 : coupon === 'HALF' ? 149.50 : 299, currency: 'GBP', couponValid: coupon !== 'INVALID' };
      },
    });
    const app = express();
    app.use('/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json());
    const auth = (req, res, next) => {
      const id = Number(req.get('authorization'));
      if (!id) return res.sendStatus(401);
      req.user = { id }; next();
    };
    app.post('/checkout', auth, handlers.checkout);
    app.post('/confirm', auth, handlers.confirm);
    app.post('/webhook', handlers.webhook);
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (path, body, user = 1) => fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: String(user) }, body: JSON.stringify(body) });
    const webhook = (type, object, overrides = {}) => {
      const payload = JSON.stringify({ id: 'evt_test', type, livemode: false, data: { object }, ...overrides });
      const signature = sdk.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
      return fetch(`${base}/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload });
    };
    const pay = (session) => {
      Object.assign(session, { status: 'complete', payment_status: 'paid', payment_intent: {
        id: `pi_${session.id}`, status: 'succeeded', latest_charge: { id: `ch_${session.id}`, refunded: false, disputed: false },
      } });
    };

    const check = async (name, run) => { await run(); t.diagnostic(name); };
    await check('checkout authenticates, ignores browser prices and reuses concurrent sessions', async () => {
      assert.equal((await post('checkout', {}, 0)).status, 401);
      assert.equal((await post('checkout', { planId: 'different-plan' })).status, 400);
      assert.equal((await post('checkout', { couponCode: 'INVALID' })).status, 400);
      assert.equal((await post('checkout', { couponCode: 'FREE' })).status, 400);
      const responses = await Promise.all([post('checkout', { amount: 1 }), post('checkout', { amount: 1 })]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
      assert.equal(createCount, 1);
      const session = sessions.get('cs_test_1');
      assert.equal(session.amount_total, 29900);
      assert.equal(session.params.mode, 'payment');
      assert.equal(session.params.success_url, 'https://ventus.example/subscription?stripe_session_id={CHECKOUT_SESSION_ID}');
    });
    await check('coupon changes expire the previous checkout and use the server price', async () => {
      assert.equal((await post('checkout', { couponCode: 'HALF', price: 1 })).status, 201);
      assert.equal(sessions.get('cs_test_1').status, 'expired');
      assert.equal(sessions.get('cs_test_2').amount_total, 14950);
    });
    const session = sessions.get('cs_test_2');
    await check('unpaid sessions and another account never receive membership', async () => {
      assert.equal((await post('confirm', { sessionId: session.id }, 2)).status, 404);
      assert.equal((await post('confirm', { sessionId: '../../invalid' })).status, 400);
      assert.deepEqual(await (await post('confirm', { sessionId: session.id })).json(), { success: true, active: false, pending: true });
      assert.equal((await pool.query('SELECT * FROM subscriptions')).rows.length, 0);
    });
    pay(session);
    await check('signatures, mode, price, currency and account must match', async () => {
      assert.equal((await post('webhook', { type: 'checkout.session.completed' })).status, 400);
      assert.equal((await webhook('checkout.session.completed', session, { livemode: true })).status, 400);
      for (const [field, badValue] of [['amount_total', 1], ['currency', 'usd'], ['client_reference_id', '2'], ['livemode', true]]) {
        const previous = session[field]; session[field] = badValue;
        assert.equal((await post('confirm', { sessionId: session.id })).status, 400);
        session[field] = previous;
      }
      assert.equal((await pool.query('SELECT * FROM subscriptions')).rows.length, 0);
    });
    await check('webhook activates once even with simultaneous browser confirmation and retries', async () => {
      const responses = await Promise.all([webhook('checkout.session.completed', session), post('confirm', { sessionId: session.id }), webhook('checkout.session.completed', session)]);
      assert.ok(responses.every((response) => response.status === 200));
      const subscriptions = (await pool.query('SELECT * FROM subscriptions')).rows;
      assert.equal(subscriptions.length, 1);
      assert.equal(Number(subscriptions[0].amount_paid), 149.50);
      assert.equal(subscriptions[0].payment_provider, 'stripe');
      assert.ok(subscriptions[0].expires_at - subscriptions[0].starts_at >= 365 * 24 * 60 * 60 * 1000);
      assert.equal((await post('checkout', {})).status, 409);
    });
    await check('full refund revokes membership and late completion cannot reactivate it', async () => {
      const object = { refunded: true, payment_intent: session.payment_intent.id };
      assert.equal((await webhook('charge.refunded', object)).status, 200);
      assert.equal((await pool.query('SELECT status FROM subscriptions')).rows[0].status, 'refunded');
      assert.equal((await webhook('checkout.session.completed', session)).status, 200);
      assert.equal((await (await post('confirm', { sessionId: session.id })).json()).active, false);
      assert.equal((await pool.query('SELECT status FROM subscriptions')).rows[0].status, 'refunded');
    });
    await check('dispute arriving before completion prevents activation', async () => {
      await post('checkout', {}, 2);
      const next = sessions.get('cs_test_3'); pay(next);
      assert.equal((await webhook('charge.dispute.created', { payment_intent: next.payment_intent.id })).status, 200);
      assert.equal((await webhook('checkout.session.completed', next)).status, 200);
      assert.equal((await pool.query('SELECT * FROM subscriptions WHERE user_id = 2')).rows.length, 0);
    });
    await check('provider errors do not expose keys and failed transactions can be retried', async () => {
      throwOnCreate = true;
      const response = await post('checkout', {}, 3);
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /SECRET/);
      throwOnCreate = false;
      assert.equal((await post('checkout', {}, 3)).status, 201);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].forEach((key, index) => {
      if (before[index] === undefined) delete process.env[key];
      else process.env[key] = before[index];
    });
  }
});
