const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const express = require('express'), jwt = require('jsonwebtoken'), { Pool } = require('pg');
const { registerUserAdmin } = require('./userAdmin');
const { createAccountAuthenticator, validateAccountSession, userManagerEmails } = require('./accountAccess');
const { registerHomepageRoutes } = require('./homepageRoutes');
const { registerCategoryRoutes } = require('./categoryRoutes');

test('user admin permissions, account management, billing privacy and session revocation', { skip: !process.env.USER_ADMIN_TEST_DATABASE_URL }, async t => {
  const url = process.env.USER_ADMIN_TEST_DATABASE_URL, schema = 'user_admin_test_' + crypto.randomBytes(8).toString('hex');
  const admin = new Pool({ connectionString: url }); await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
  const keys = ['USER_ADMIN_EMAILS', 'RESERVATION_MANAGER_EMAILS', 'HOMEPAGE_EDITOR_EMAILS', 'JWT_SECRET'];
  const previous = keys.map(key => process.env[key]);
  process.env.USER_ADMIN_EMAILS = 'admin@example.test, unconfirmedstaff@example.test';
  process.env.RESERVATION_MANAGER_EMAILS = 'admin@example.test';
  process.env.HOMEPAGE_EDITOR_EMAILS = 'editor@example.test';
  process.env.JWT_SECRET = 'test-only-secret';
  let server, sent = [], failEmail = false, verified = [], cancellations = [], providerCalls = [], wrongOwner = false, staffCode;
  try {
    await pool.query(`CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,first_name TEXT,last_name TEXT,phone TEXT,city_of_residence TEXT,
      password_hash TEXT,email_verified_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
      INSERT INTO users(id,email,first_name,last_name,password_hash,email_verified_at) VALUES
      (1,'admin@example.test','Ventus','Admin','private-hash',NOW()),(2,'editor@example.test','Content','Editor','private-hash',NOW()),
      (3,'client@example.test','Sample','Client','private-hash',NOW()),(4,'unconfirmedstaff@example.test','Unconfirmed','Staff','private-hash',NOW()),
      (5,'pending@example.test','Pending','Client','private-hash',NULL);
      INSERT INTO users(id,email,first_name,last_name,email_verified_at) SELECT n,'guest'||n||'@example.test','Guest',n::text,NOW() FROM generate_series(6,32)n;
      CREATE TABLE subscriptions(id BIGSERIAL PRIMARY KEY,user_id INTEGER,plan_id TEXT,status TEXT,amount_paid NUMERIC DEFAULT 0,currency CHAR(3),payment_provider TEXT,
        starts_at TIMESTAMPTZ DEFAULT NOW(),expires_at TIMESTAMPTZ,stripe_status TEXT,trial_ends_at TIMESTAMPTZ,cancel_at_period_end BOOLEAN DEFAULT false,renewal_amount_minor INTEGER,stripe_subscription_id TEXT,stripe_customer_id TEXT);
      INSERT INTO subscriptions(user_id,plan_id,status,currency,payment_provider,expires_at,stripe_status,renewal_amount_minor,stripe_subscription_id,stripe_customer_id)
        VALUES(3,'travel-yearly','active','GBP','stripe_subscription',NOW()+INTERVAL '1 year','active',29900,'sub_example','cus_example'),
        (6,'travel-trial','active','GBP','trial',NOW()+INTERVAL '7 days',NULL,NULL,NULL,NULL),
        (7,'travel-yearly','cancelled','GBP','stripe_subscription',NOW()-INTERVAL '1 day','canceled',29900,'sub_old','cus_old'),
        (8,'travel-yearly','inactive','GBP','stripe_subscription',NOW()-INTERVAL '1 day','past_due',29900,'sub_overdue','cus_overdue');
      CREATE TABLE reservations(user_id INTEGER,snapshot JSONB,cancellation_state TEXT,synced_at TIMESTAMPTZ DEFAULT NOW(),source TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE booking_requests(user_id INTEGER,request_reference TEXT,hotel_name TEXT,start_date DATE,end_date DATE,status TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE newsletter_subscribers(id UUID PRIMARY KEY,email TEXT,status TEXT,source TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),confirmed_at TIMESTAMPTZ,unsubscribed_at TIMESTAMPTZ);
      INSERT INTO newsletter_subscribers VALUES('00000000-0000-0000-0000-000000000001','lead@example.test','pending','main-site',NOW(),NULL,NULL);
      CREATE TABLE password_reset_tokens(id BIGSERIAL PRIMARY KEY,user_id INTEGER,token_hash CHAR(64),expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE email_verification_tokens(id BIGSERIAL PRIMARY KEY,user_id INTEGER,token_hash CHAR(64),expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());`);
    await pool.query('INSERT INTO reservations(user_id,snapshot,source) VALUES(3,$1,\'supplier\')', [JSON.stringify({ id: 101, hotel_id: 42, hotel_name: 'Example Hotel', state: 'booked', check_in: '2027-12-01', check_out: '2027-12-04', currency: 'GBP', total_cost: '1500', credit_card: { number: 'private-card' }, secret: 'private-token', rooms: [{ guest_name: 'Sample Client', room_type: 'Suite' }] })]);
    const app = express(); app.use(express.json());
    const authenticate = createAccountAuthenticator(pool, process.env.JWT_SECRET);
    const homepage = registerHomepageRoutes(app, pool, authenticate, { sendEditorCode: async details => { staffCode = details.code; } });
    registerCategoryRoutes(app, pool, authenticate, homepage);
    await homepage.ensureHomepageSchema();
    await pool.query("INSERT INTO homepage_editor_verifications(user_id,email,verified_at)VALUES(1,'admin@example.test',NOW()),(2,'editor@example.test',NOW())");
    const provider = { subscriptions: { retrieve: async id => { providerCalls.push(['subscription', id]); return { customer: 'cus_example', metadata: { ventus_user_id: wrongOwner ? '1' : '3' }, default_payment_method: { card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, number: 'private-card' } } }; } }, invoices: { list: async params => { providerCalls.push(['invoices', params.customer]); return { data: [{ id: 'in_example', number: 'VT-1', status: 'paid', amount_paid: 29900, amount_due: 29900, currency: 'gbp', created: 1720000000, hosted_invoice_url: 'https://invoice.example/1', private: 'private-token' }] }; } } };
    const service = registerUserAdmin(app, pool, authenticate, { emailReady: () => true, sendReset: async details => { if (failEmail) throw new Error('provider failed'); sent.push(details); }, sendVerification: async target => { verified.push(target.id); }, cancelRenewal: async id => { cancellations.push(id); return { cancelAtPeriodEnd: true }; }, stripeClient: provider, publicAppUrl: 'https://ventus.example' });
    await service.ensureSchema(); await service.ensureSchema();
    app.get('/session', authenticate, (req, res) => res.json({ id: req.user.id }));
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const check = async (name, action) => { await action(); t.diagnostic(name); };
    const token = (id, version) => jwt.sign({ id, ...(version === undefined ? {} : { authVersion: version }) }, process.env.JWT_SECRET);
    const request = (path, { id = 1, method = 'GET', body, accessToken } = {}) => fetch(base + path, { method, headers: { ...(id ? { Authorization: 'Bearer ' + (accessToken || token(id)) } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    await check('only allowlisted verified staff can access any client data', async () => {
      for (const path of ['/api/admin/users', '/api/admin/users/3', '/api/admin/users/3/billing', '/api/admin/newsletter']) {
        assert.equal((await request(path, { id: 0 })).status, 401);
        assert.equal((await request(path, { id: 3 })).status, 403);
        assert.equal((await request(path, { id: 2 })).status, 403);
      }
      const response = await request('/api/admin/users', { id: 4 }); assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'ADMIN_VERIFICATION_REQUIRED');
      delete process.env.USER_ADMIN_EMAILS; assert.deepEqual(userManagerEmails(), ['admin@example.test']); process.env.USER_ADMIN_EMAILS = 'admin@example.test, unconfirmedstaff@example.test';
      assert.equal((await request('/api/homepage/admin', { id: 1 })).status, 403);
      assert.equal((await request('/api/homepage/admin/verification-code', { id: 4, method: 'POST', body: {} })).status, 200);
      assert.ok(staffCode);
      assert.equal((await request('/api/homepage/admin/verify-email', { id: 4, method: 'POST', body: { code: staffCode } })).status, 200);
      assert.equal((await request('/api/admin/users', { id: 4 })).status, 200);
      assert.equal((await request('/api/homepage/admin', { id: 4 })).status, 403);
      const access = await (await request('/api/admin/access')).json(); assert.equal(access.userManager, true); assert.equal(access.contentEditor, false);
    });
    await check('search, status, pagination and profiles exclude credentials and raw payment data', async () => {
      const response = await request('/api/admin/users'); assert.equal(response.headers.get('cache-control'), 'private, no-store');
      const listing = await response.json(); assert.equal(listing.total, 32); assert.equal(listing.users.length, 25); assert.equal(listing.summary.active, 1); assert.equal(listing.summary.trial, 1);
      assert.equal((await (await request('/api/admin/users?page=2')).json()).users.length, 7);
      const found = await (await request('/api/admin/users?q=Sample&status=active')).json(); assert.equal(found.total, 1); assert.equal(found.users[0].id, '3');
      assert.equal((await (await request('/api/admin/users?q=%25')).json()).total, 0);
      assert.equal((await (await request('/api/admin/users?status=past_due')).json()).users[0].id, '8');
      assert.equal((await request('/api/admin/users?page=-1')).status, 400);
      const profile = await (await request('/api/admin/users/3')).json(); assert.equal(profile.bookings[0].id, '101'); assert.equal(profile.canLinkBookings, true);
      assert.ok(!JSON.stringify(profile).includes('private-')); assert.equal(profile.bookings[0].can_cancel, false);
      assert.equal((await request('/api/admin/users/999')).status, 404);
      assert.equal((await (await request('/api/admin/newsletter')).json()).subscribers[0].status, 'pending');
    });
    await check('profile editing uses versions, validates fields and records administrative activity', async () => {
      const data = { version: 1, firstName: 'Updated', lastName: 'Client', phone: '+44 123456', cityOfResidence: 'London', notes: 'Requested a profile update.' };
      assert.equal((await request('/api/admin/users/3', { method: 'PUT', body: { ...data, email: 'other@example.test' } })).status, 400);
      assert.equal((await request('/api/admin/users/3', { method: 'PUT', body: { ...data, firstName: '' } })).status, 400);
      const results = await Promise.all([1,2].map(() => request('/api/admin/users/3', { method: 'PUT', body: data })));
      assert.deepEqual(results.map(item => item.status).sort(), [200,409]);
      const updated = await (await request('/api/admin/users/3')).json(); assert.equal(updated.user.firstName, 'Updated'); assert.equal(updated.user.version, 2); assert.equal(updated.history[0].action, 'profile_updated');
      assert.equal((await pool.query('SELECT email FROM users WHERE id=3')).rows[0].email, 'client@example.test');
    });
    await check('suspension ends old sessions permanently and cannot suspend staff', async () => {
      const old = token(3);
      assert.equal((await request('/session', { id: 3, accessToken: old })).status, 200);
      assert.equal((await request('/api/admin/users/3/access', { method: 'POST', body: { suspended: true, reason: 'Client request', version: 2 } })).status, 200);
      assert.equal((await request('/session', { id: 3, accessToken: old })).status, 401);
      assert.equal((await request('/api/admin/users/3/access', { method: 'POST', body: { suspended: false, reason: 'Client request', version: 3 } })).status, 200);
      assert.equal((await request('/session', { id: 3, accessToken: old })).status, 401);
      assert.equal((await request('/session', { id: 3, accessToken: token(3, 2) })).status, 200);
      assert.equal((await request('/api/admin/users/1/access', { method: 'POST', body: { suspended: true, reason: 'Unsafe action', version: 1 } })).status, 409);
      await pool.query('UPDATE users SET auth_version=auth_version+1 WHERE id=3');
      await assert.rejects(validateAccountSession(pool, { id: 3, authVersion: 2 }), /session is no longer/);
    });
    await check('password reset uses expiring hashed links, correct recipient and concurrent email throttling', async () => {
      const responses = await Promise.all([1,2].map(() => request('/api/admin/users/3/password-reset', { method: 'POST', body: {} })));
      assert.deepEqual(responses.map(item => item.status).sort(), [200,429]); assert.equal(sent.length, 1); assert.equal(sent[0].to, 'client@example.test');
      const raw = new URLSearchParams(new URL(sent[0].resetUrl).hash.slice(1)).get('token');
      const stored = (await pool.query('SELECT * FROM password_reset_tokens WHERE user_id=3')).rows[0];
      assert.equal(stored.token_hash, crypto.createHash('sha256').update(raw).digest('hex')); assert.ok(stored.expires_at > new Date()); assert.ok(stored.expires_at < new Date(Date.now()+3605000));
      const profile = await (await request('/api/admin/users/3')).text(); assert.ok(!profile.includes(raw)); assert.ok(!profile.includes(stored.token_hash));
      failEmail = true; assert.equal((await request('/api/admin/users/6/password-reset', { method: 'POST', body: {} })).status, 502);
      assert.equal((await pool.query('SELECT * FROM password_reset_tokens WHERE user_id=6')).rowCount, 0); failEmail = false;
      const confirms = await Promise.all([1,2].map(() => request('/api/admin/users/5/verification-email', { method: 'POST', body: {} })));
      assert.deepEqual(confirms.map(item => item.status).sort(), [200,429]); assert.deepEqual(verified, [5]);
    });
    await check('billing is read-only, correctly scoped and only exposes masked card details', async () => {
      const response = await request('/api/admin/users/3/billing'), data = await response.json(); assert.equal(response.status, 200); assert.equal(data.paymentMethod.last4, '4242'); assert.equal(data.invoices[0].amountPaid, 299);
      assert.ok(!JSON.stringify(data).includes('private-')); assert.deepEqual(providerCalls, [['subscription','sub_example'],['invoices','cus_example']]);
      wrongOwner = true; assert.equal((await request('/api/admin/users/3/billing')).status, 409); assert.equal(providerCalls.filter(call=>call[0]==='invoices').length, 1);
      assert.equal((await (await request('/api/admin/users/6/billing')).json()).available, false);
      assert.equal((await request('/api/admin/users/3/cancel-renewal', { method: 'POST', body: {} })).status, 400); assert.equal(cancellations.length, 0);
      assert.equal((await request('/api/admin/users/3/cancel-renewal', { method: 'POST', body: { acknowledged: true } })).status, 200); assert.deepEqual(cancellations, [3]);
      assert.ok(!(await pool.query('SELECT details::text FROM user_admin_events')).rows.some(row => row.details.includes('private-')));
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve)); await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
    keys.forEach((key,index) => previous[index] === undefined ? delete process.env[key] : process.env[key] = previous[index]);
  }
});
