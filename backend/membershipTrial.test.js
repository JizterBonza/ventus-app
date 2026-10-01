const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const { ensureTrialSchema, createTrialHandler, getTrialStatus, findActiveMembership, endTrialOnUpgrade } = require('./membershipTrial');

test('free trials are verified, single-use, concurrent-safe and expire in seven days', { skip: !process.env.TRIAL_TEST_DATABASE_URL }, async (t) => {
  const schema = `trial_test_${crypto.randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString: process.env.TRIAL_TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.TRIAL_TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  let server;
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY, email_verified_at TIMESTAMPTZ)');
    await pool.query('INSERT INTO users VALUES (1, NOW()), (2, NULL), (3, NOW()), (4, NOW())');
    await pool.query(`CREATE TABLE subscriptions (id BIGSERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
      plan_id TEXT, status TEXT, amount_paid NUMERIC, currency TEXT, payment_provider TEXT,
      starts_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW())`);
    await ensureTrialSchema(pool); await ensureTrialSchema(pool);
    await pool.query("INSERT INTO subscriptions (user_id,plan_id,status,payment_provider,starts_at) VALUES (3,'travel-yearly','active','legacy',NOW())");
    const app = express(); app.use(express.json());
    app.post('/trial', (req, res, next) => {
      const id = Number(req.get('authorization'));
      if (!id) return res.sendStatus(401);
      req.user = { id }; next();
    }, createTrialHandler({ pool, serializeSubscription: s => s }));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const post = (user, body = {}) => fetch(`http://127.0.0.1:${server.address().port}/trial`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: String(user) }, body: JSON.stringify(body) });
    const check = async (name, run) => { await run(); t.diagnostic(name); };
    await check('requires a verified account and leaves existing memberships alone', async () => {
      assert.equal((await post(0)).status, 401);
      assert.equal((await post(2)).status, 403);
      assert.equal((await post(99)).status, 404);
      assert.equal((await post(3)).status, 409);
      assert.equal((await getTrialStatus({ id: 2 }, null, pool)).eligible, false);
      assert.equal((await getTrialStatus({ id: 1, email_verified_at: new Date() }, null, pool)).eligible, true);
    });
    let initial;
    await check('repeated starts return the same trial, ignoring client identity and duration', async () => {
      const responses = await Promise.all([post(1, { userId: 2, days: 365, expiresAt: '2099-01-01' }), post(1)]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
      const rows = (await pool.query("SELECT * FROM subscriptions WHERE payment_provider='trial'")).rows;
      assert.equal(rows.length, 1); initial = rows[0];
      assert.equal(initial.user_id, 1);
      assert.equal(Number(initial.amount_paid), 0);
      assert.equal(initial.expires_at - initial.starts_at, 7 * 86400000);
      assert.equal((await findActiveMembership(1, pool)).payment_provider, 'trial');
      assert.equal((await (await post(1)).json()).subscription.expires_at, initial.expires_at.toISOString());
    });
    await check('expiry removes member access and cannot be reset', async () => {
      await pool.query("UPDATE subscriptions SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=1");
      assert.equal(await findActiveMembership(1, pool), null);
      assert.equal((await post(1)).status, 409);
      const status = await getTrialStatus({ id: 1, email_verified_at: new Date() }, null, pool);
      assert.equal(status.eligible, false); assert.equal(status.used, true);
    });
    await check('an annual upgrade takes priority and never restores trial eligibility', async () => {
      assert.equal((await post(4)).status, 201);
      await pool.query(`INSERT INTO subscriptions (user_id,plan_id,status,payment_provider,starts_at,expires_at)
        VALUES (4,'travel-yearly','active','stripe',NOW(),NOW()+INTERVAL '1 year')`);
      assert.equal((await findActiveMembership(4, pool)).payment_provider, 'stripe');
      await endTrialOnUpgrade(4, pool);
      assert.equal((await pool.query("SELECT status FROM subscriptions WHERE user_id=4 AND payment_provider='trial'")).rows[0].status, 'converted');
      await pool.query("UPDATE subscriptions SET status='refunded' WHERE user_id=4 AND payment_provider='stripe'");
      assert.equal(await findActiveMembership(4, pool), null);
      assert.equal((await post(4)).status, 409);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  }
});
