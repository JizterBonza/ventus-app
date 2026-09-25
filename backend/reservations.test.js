const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const { registerReservationRoutes } = require('./reservationRoutes');
const { bookingPayload, isPublicHotelProxyRequest, sanitizeBooking, canCancel, createSupplier } = require('./reservationSupplier');

const booking = (id, extra = {}) => ({ id, hotel_id: 42, hotel_name: 'Example Hotel', city: 'London', check_in: '2027-12-01',
  check_out: '2027-12-04', state: 'booked', confirmation_number: `CONF${id}`, total_cost: '1500.00', currency: 'GBP',
  is_cancellable: true, cancellation_deadline: '2027-11-30 12:00:00',
  rooms: [{ guest_name: 'Sample Guest', room_type: 'Suite', adults: 2, cancellation_policy: 'Free before 12:00 hotel local time on 30 November. Later cancellation: one night.', benefits: ['Breakfast'] }], ...extra });
const payload = (session = 'session-one') => ({ session_id: session, rate_index: 'rate-1', hotel_id: 42,
  start_date: '2027-12-01', end_date: '2027-12-04', guest_name: 'Sample Guest', guest_email: 'guest@example.test',
  rooms: [{ adults: 2, children: [], send_email_to_guest: true }] });

test('booking validation suppresses LE guest email and rejects raw cards and invalid dates', () => {
  assert.equal(bookingPayload(payload()).rooms[0].send_email_to_guest, false);
  const multiRoom = bookingPayload({ ...payload(), rooms: [
    { adults: 2, send_email_to_guest: true }, { adults: 1, send_email_to_guest: true },
  ] });
  assert.deepEqual(multiRoom.rooms.map((room) => room.send_email_to_guest), [false, false]);
  assert.equal(multiRoom.rooms[0].guest_email, 'guest@example.test');
  assert.throws(() => bookingPayload({ ...payload(), start_date: '2027-02-31' }));
  assert.throws(() => bookingPayload({ ...payload(), credit_card: { number: 'ignored' } }));
  const sanitized = sanitizeBooking({ ...booking(1), credit_card: { number: 'private' }, guest_email: 'private', links: { href: 'private' } });
  assert.equal(sanitized.credit_card, undefined);
  assert.equal(sanitized.guest_email, undefined);
  assert.equal(canCancel(sanitized), true);
  assert.equal(canCancel(sanitizeBooking(booking(1, { is_cancellable: false }))), false);
  assert.equal(canCancel(sanitizeBooking(booking(1, { rooms: [{ room_type: 'Suite' }] }))), false);
});

test('generic hotel proxy cannot forward booking access or mutations', () => {
  for (const path of ['/v2/hotels/bookings', '/v2/hotels/bookings/1', '/v2/hotels/%62ookings/1', '/v2//hotels/bookings/1']) {
    for (const method of ['GET', 'POST', 'DELETE', 'PATCH']) assert.equal(isPublicHotelProxyRequest(method, path), false);
  }
  assert.equal(isPublicHotelProxyRequest('GET', '/v2/hotels/42/calendar'), true);
  assert.equal(isPublicHotelProxyRequest('POST', '/v2/hotels/availability'), true);
  assert.equal(isPublicHotelProxyRequest('DELETE', '/v2/hotels/42'), false);
});

test('supplier adapter uses documented endpoints and only treats HTTP 200 as completed cancellation', async () => {
  const calls = [];
  let status = 200;
  const supplier = createSupplier({ baseUrl: 'https://supplier.example', token: 'test-token', fetchImpl: async (url, options) => {
    calls.push({ url, options }); return new Response('', { status });
  } });
  await supplier('DELETE', '/123');
  assert.equal(calls[0].url, 'https://supplier.example/v2/hotels/bookings/123');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  status = 202;
  await assert.rejects(supplier('DELETE', '/123'), /not yet confirmed/);
});

test('reservation ownership, lifecycle, cancellation and durable email with PostgreSQL', { skip: !process.env.RESERVATIONS_TEST_DATABASE_URL }, async (t) => {
  const schema = `reservations_test_${crypto.randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString: process.env.RESERVATIONS_TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.RESERVATIONS_TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  const original = { manager: process.env.RESERVATION_MANAGER_EMAILS, webhook: process.env.LE_WEBHOOK_ACCESS_KEY };
  process.env.RESERVATION_MANAGER_EMAILS = 'staff@example.test';
  process.env.LE_WEBHOOK_ACCESS_KEY = 'a-test-only-webhook-key-with-32-characters';
  let server; let service;
  const sent = []; const calls = []; const upstream = new Map();
  let activeMember = true; let failEmail = true; let failCreate = false; let failCancel = false; let nextId = 100;
  const eventually = async (condition) => {
    for (let i = 0; i < 80; i += 1) { if (await condition()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
    assert.fail('Timed out waiting for durable work');
  };
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, email_verified_at TIMESTAMPTZ)');
    await pool.query("INSERT INTO users VALUES (1, 'owner@example.test', NOW()), (2, 'other@example.test', NOW()), (3, 'staff@example.test', NOW()), (4, 'unverified@example.test', NULL)");
    await pool.query('CREATE TABLE homepage_editor_verifications (user_id INTEGER PRIMARY KEY, email TEXT, verified_at TIMESTAMPTZ)');
    await pool.query("INSERT INTO homepage_editor_verifications VALUES (3, 'staff@example.test', NOW())");
    const app = express(); app.use(express.json());
    const auth = (req, res, next) => { const userId = Number(req.get('authorization')); if (!userId) return res.sendStatus(401); req.user = { id: userId }; next(); };
    const supplier = async (method, path, body) => {
      calls.push({ method, path, body });
      if (method === 'POST') {
        if (failCreate) throw new Error('Supplier network timeout');
        const result = booking(++nextId, body.session_id === 'pending' ? { state: 'pending', confirmation_number: '' } : {});
        upstream.set(String(result.id), result); return structuredClone(result);
      }
      if (method === 'GET' && path === '') return [...upstream.values()].map((entry) => structuredClone(entry));
      const result = upstream.get(path.slice(1));
      if (!result) throw Object.assign(new Error('Unknown'), { definitive: true });
      if (method === 'DELETE') { if (failCancel) throw new Error('Supplier network timeout'); result.state = 'cancelled'; result.is_cancellable = false; return null; }
      return structuredClone(result);
    };
    service = registerReservationRoutes(app, pool, auth, { getActiveSubscription: async () => activeMember,
      supplier, sendEmail: async (message) => { if (failEmail) throw new Error('Email provider down'); sent.push(message); } });
    await service.ensureSchema(); await service.ensureSchema();
    app.use('/v2', (req, res) => res.sendStatus(isPublicHotelProxyRequest(req.method, new URL(req.originalUrl, 'http://local').pathname) ? 200 : 404));
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, body, user = 1, headers = {}) => fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: String(user), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const api = (path = '', body, user = 1) => request(`/api/reservations${path}`, body, user);
    const check = async (name, fn) => { await fn(); t.diagnostic(name); };

    await check('a confirmed booking is owned by the signed-in member and LE guest email is suppressed', async () => {
      assert.equal((await api('', undefined, 0)).status, 401);
      const response = await request('/v2/hotels/bookings', { ...payload(), user_id: 2 });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).id, '101');
      assert.equal(calls[0].body.rooms[0].send_email_to_guest, false);
      const row = (await pool.query('SELECT * FROM reservations WHERE supplier_id = 101')).rows[0];
      assert.equal(row.user_id, 1);
      assert.equal(row.guest_email, 'guest@example.test');
      assert.equal((await request('/v2/hotels/bookings', payload())).status, 200);
      assert.equal(calls.filter((call) => call.method === 'POST').length, 1);
      assert.equal((await request('/v2/hotels/bookings', payload(), 2)).status, 409);
    });
    await check('failed email delivery leaves a durable job and retry sends once', async () => {
      await eventually(async () => (await pool.query('SELECT attempts FROM reservation_emails')).rows[0]?.attempts === 1);
      assert.equal(sent.length, 0); failEmail = false;
      await pool.query('UPDATE reservation_emails SET available_at = NOW()');
      await service.worker.drain();
      assert.equal(sent.length, 1); assert.equal(sent[0].recipient, 'guest@example.test');
      await service.worker.drain(); assert.equal(sent.length, 1);
    });
    await check('other users cannot read or cancel reservations; raw supplier routes are blocked', async () => {
      const count = calls.length;
      assert.deepEqual((await (await api('', undefined, 2)).json()).bookings, []);
      assert.equal((await api('/101', undefined, 2)).status, 404);
      assert.equal((await api('/101/cancellation-preview', {}, 2)).status, 404);
      assert.equal(calls.length, count);
      assert.equal((await request('/v2/hotels/bookings/101')).status, 404);
      assert.equal((await request('/v2/hotels/bookings')).status, 404);
    });
    await check('expired members can manage existing reservations and must accept current cancellation terms', async () => {
      activeMember = false;
      assert.equal((await request('/v2/hotels/bookings', payload('another'))).status, 403);
      const preview = await (await api('/101/cancellation-preview', {})).json();
      assert.equal((await api('/101/cancel', { reviewId: preview.reviewId, acknowledged: false })).status, 400);
      assert.equal((await api('/101/cancel', { reviewId: preview.reviewId, acknowledged: true }, 2)).status, 404);
      upstream.get('101').rooms[0].cancellation_policy = 'Changed cancellation policy.';
      assert.equal((await api('/101/cancel', { reviewId: preview.reviewId, acknowledged: true })).status, 409);
      assert.equal(calls.filter((call) => call.method === 'DELETE').length, 0);
      upstream.get('101').is_cancellable = false;
      assert.equal((await api('/101/cancellation-preview', {})).status, 409);
      upstream.get('101').is_cancellable = true;
      const current = await (await api('/101/cancellation-preview', {})).json();
      await pool.query("UPDATE reservation_cancellation_reviews SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1", [current.reviewId]);
      assert.equal((await api('/101/cancel', { reviewId: current.reviewId, acknowledged: true })).status, 409);
      const fresh = await (await api('/101/cancellation-preview', {})).json();
      const responses = await Promise.all([api('/101/cancel', { reviewId: fresh.reviewId, acknowledged: true }), api('/101/cancel', { reviewId: fresh.reviewId, acknowledged: true })]);
      assert.ok(responses.some((response) => response.status === 200));
      assert.equal(calls.filter((call) => call.method === 'DELETE').length, 1);
      assert.equal((await (await api('/101')).json()).booking.state, 'cancelled');
      await eventually(() => sent.some((message) => message.kind === 'cancelled'));
    });
    await check('pending bookings await authoritative confirmation; webhooks cannot spoof status', async () => {
      activeMember = true;
      await request('/v2/hotels/bookings', payload('pending'));
      assert.equal((await pool.query('SELECT * FROM reservation_emails WHERE supplier_id = 102')).rows.length, 0);
      const event = { event: 'hotel_booking_cancel', data: { id: 102, state: 'cancelled' } };
      assert.equal((await request('/api/le/webhook', event)).status, 401);
      upstream.get('102').state = 'booked'; upstream.get('102').confirmation_number = 'CONF102';
      assert.equal((await request('/api/le/webhook', event, 0, { 'x-ventus-webhook-key': process.env.LE_WEBHOOK_ACCESS_KEY })).status, 200);
      assert.equal((await (await api('/102')).json()).booking.state, 'booked');
      await eventually(() => sent.some((message) => message.kind === 'confirmed' && message.booking.id === '102'));
    });
    await check('uncertain cancellation cannot be repeated and never displays a false cancellation', async () => {
      const preview = await (await api('/102/cancellation-preview', {})).json(); failCancel = true;
      assert.equal((await api('/102/cancel', { reviewId: preview.reviewId, acknowledged: true })).status, 503);
      assert.equal((await api('/102/cancellation-preview', {})).status, 409);
      assert.equal((await (await api('/102')).json()).booking.state, 'booked');
      assert.equal((await pool.query("SELECT * FROM reservation_emails WHERE supplier_id = 102 AND kind = 'cancelled'")).rows.length, 0);
      upstream.get('102').state = 'cancelled'; upstream.get('102').is_cancellable = false;
      assert.equal((await (await api('/102')).json()).booking.cancellation_state, null);
      await eventually(() => sent.some((message) => message.kind === 'cancelled' && message.booking.id === '102'));
    });
    await check('staff link existing bookings without leaking agency-wide records or resending old emails', async () => {
      upstream.set('301', booking(301));
      assert.equal((await api('/admin/unlinked', undefined, 1)).status, 403);
      assert.equal((await api('/admin/link', { bookingId: 301, email: 'other@example.test', ownershipVerified: true }, 1)).status, 403);
      const unlinked = await (await api('/admin/unlinked', undefined, 3)).json();
      assert.deepEqual(unlinked.bookings.map((entry) => entry.id), ['301']);
      assert.equal((await api('/admin/link', { bookingId: 301, email: 'unverified@example.test', ownershipVerified: true }, 3)).status, 400);
      assert.equal((await api('/admin/link', { bookingId: 301, email: 'other@example.test', ownershipVerified: true }, 3)).status, 200);
      assert.equal((await api('/admin/link', { bookingId: 301, email: 'owner@example.test', ownershipVerified: true }, 3)).status, 409);
      assert.equal((await api('/301', undefined, 1)).status, 404);
      assert.equal((await api('/301', undefined, 2)).status, 200);
      assert.equal((await pool.query('SELECT * FROM reservation_emails WHERE supplier_id = 301')).rows.length, 0);
    });
    await check('timed-out booking creation is not submitted a second time', async () => {
      failCreate = true;
      const before = calls.filter((call) => call.method === 'POST').length;
      assert.equal((await request('/v2/hotels/bookings', payload('uncertain'))).status, 503);
      assert.equal((await request('/v2/hotels/bookings', payload('uncertain'))).status, 409);
      assert.equal(calls.filter((call) => call.method === 'POST').length, before + 1);
    });
  } finally {
    service?.stop();
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
    for (const [key, value] of [['RESERVATION_MANAGER_EMAILS', original.manager], ['LE_WEBHOOK_ACCESS_KEY', original.webhook]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
