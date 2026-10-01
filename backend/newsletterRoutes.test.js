const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const { registerNewsletterRoutes, CONSENT_TEXT } = require('./newsletterRoutes');

test('newsletter consent, confirmation, throttling and unsubscribe work end to end', { skip: !process.env.NEWSLETTER_TEST_DATABASE_URL }, async () => {
  const schema = `newsletter_test_${crypto.randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString: process.env.NEWSLETTER_TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.NEWSLETTER_TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  const deliveries = []; let failDelivery = false; let ready = true; let server;
  try {
    const app = express(); app.use(express.json());
    const service = registerNewsletterRoutes(app, pool, { publicAppUrl: 'https://ventus.example', signingSecret: 'test-only-newsletter-secret', emailReady: () => ready,
      sendConfirmation: async data => { if (failDelivery) throw new Error('Provider failed'); deliveries.push(data); } });
    await service.ensureSchema(); await service.ensureSchema();
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api/newsletter`;
    const post = (action, body) => fetch(`${base}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const signup = { email: 'guest@example.test', consent: true };
    assert.equal((await post('subscribe', { ...signup, consent: false })).status, 400);
    assert.equal((await post('subscribe', { ...signup, email: '<bad>@example.test' })).status, 400);
    assert.equal((await post('subscribe', { ...signup, website: 'bot-spam' })).status, 200);
    ready = false; assert.equal((await post('subscribe', signup)).status, 503); ready = true;
    assert.equal((await pool.query('SELECT * FROM newsletter_subscribers')).rows.length, 0);
    const results = await Promise.all([post('subscribe', signup), post('subscribe', { ...signup, email: ' GUEST@example.test ' })]);
    assert.deepEqual(results.map(r => r.status), [200, 200]);
    assert.equal(deliveries.length, 1);
    const row = (await pool.query('SELECT * FROM newsletter_subscribers')).rows[0];
    assert.equal(row.status, 'pending'); assert.equal(row.consent_text, CONSENT_TEXT); assert.equal(row.source, 'homepage-popup');
    assert.equal(row.confirmation_delivery_status, 'sent');
    const token = url => new URLSearchParams(new URL(url).hash.slice(1)).get('token');
    const confirm = token(deliveries[0].confirmUrl), unsubscribe = token(deliveries[0].unsubscribeUrl);
    assert.notEqual(row.confirmation_hash, confirm);
    assert.equal((await post('confirm', { token: 'bad' })).status, 400);
    assert.equal((await post('confirm', { token: confirm })).status, 200);
    assert.equal((await post('confirm', { token: confirm })).status, 200);
    assert.equal((await pool.query('SELECT status FROM newsletter_subscribers')).rows[0].status, 'subscribed');
    assert.equal((await post('subscribe', signup)).status, 200); assert.equal(deliveries.length, 1);
    assert.equal((await fetch(`${base}/unsubscribe?token=${unsubscribe}`)).status, 404);
    assert.equal((await post('unsubscribe', { token: unsubscribe.slice(0, -1) + (unsubscribe.endsWith('0') ? '1' : '0') })).status, 400);
    assert.equal((await post('unsubscribe', { token: unsubscribe })).status, 200);
    assert.equal((await post('unsubscribe', { token: unsubscribe })).status, 200);
    assert.equal((await pool.query('SELECT status FROM newsletter_subscribers')).rows[0].status, 'unsubscribed');
    assert.equal((await post('confirm', { token: confirm })).status, 410);
    await pool.query("UPDATE newsletter_subscribers SET requested_at=NOW()-INTERVAL '16 minutes'");
    assert.equal((await post('subscribe', signup)).status, 200);
    assert.equal(deliveries.length, 2);
    assert.equal((await pool.query('SELECT status FROM newsletter_subscribers')).rows[0].status, 'unsubscribed');
    await pool.query("UPDATE newsletter_subscribers SET confirmation_expires_at=NOW()-INTERVAL '1 second'");
    assert.equal((await post('confirm', { token: token(deliveries[1].confirmUrl) })).status, 410);
    failDelivery = true;
    const failedSignup = { email: 'delivery-failure@example.test', consent: true };
    assert.equal((await post('subscribe', failedSignup)).status, 503);
    assert.equal((await post('subscribe', failedSignup)).status, 503);
    assert.equal(deliveries.length, 2);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  }
});
