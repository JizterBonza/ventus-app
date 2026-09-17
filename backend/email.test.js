const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getPasswordResetEmailProvider, sendPasswordResetEmail, sendHomepageEditorCode, sendBookingRequestNotification } = require('./email');

const originalEnvironment = { ...process.env };
const originalFetch = global.fetch;
let requests;

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (/^(MAILGUN_|RESEND_|EMAILJS_|PASSWORD_RESET_|BOOKING_)/.test(key)) delete process.env[key];
  }
  Object.assign(process.env, {
    MAILGUN_API_KEY: 'test-only-key',
    MAILGUN_DOMAIN: 'mg.example.com',
    MAILGUN_FROM_EMAIL: 'Ventus Travel <no-reply@mg.example.com>',
    PASSWORD_RESET_REPLY_TO: 'team@example.com'
  });
  requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(JSON.stringify({ id: 'test-message', message: 'Queued. Thank you.' }), { status: 200 });
  };
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
  global.fetch = originalFetch;
});

const reset = {
  to: 'member@example.com',
  firstName: '<Member & guest>',
  resetUrl: 'https://destinations.example.com/reset-password?token=test-token&next=home'
};

const booking = {
  reference: 'VT-TEST', hotelId: 123, hotelName: 'Example Hotel',
  startDate: '2027-01-01', endDate: '2027-01-03',
  guestName: 'Test Guest', guestEmail: 'guest@example.com', guestPhone: '+440000000000',
  roomType: 'Suite', rooms: [{ adults: 2, children: [] }],
  quotedAmount: 100, quotedCurrency: 'GBP', specialRequests: 'Example request'
};

test('password reset uses Mailgun with its private key, escaped HTML and tracking disabled', async () => {
  process.env.RESEND_API_KEY = 'unused-test-key';
  assert.equal(getPasswordResetEmailProvider(), 'mailgun');
  await sendPasswordResetEmail(reset);
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.equal(request.url, 'https://api.mailgun.net/v3/mg.example.com/messages');
  assert.equal(Buffer.from(request.headers.Authorization.slice(6), 'base64').toString(), 'api:test-only-key');
  assert.equal(request.redirect, 'error');
  assert.equal(request.body.get('from'), process.env.MAILGUN_FROM_EMAIL);
  assert.deepEqual(request.body.getAll('to'), ['member@example.com']);
  assert.equal(request.body.get('h:Reply-To'), 'team@example.com');
  assert.match(request.body.get('html'), /&lt;Member &amp; guest&gt;/);
  assert.match(request.body.get('html'), /token=test-token&amp;next=home/);
  assert.ok(request.body.get('text').includes(reset.resetUrl));
  for (const option of ['o:tracking', 'o:tracking-clicks', 'o:tracking-opens']) {
    assert.equal(request.body.get(option), 'no');
  }
});

test('EU region uses the EU Mailgun endpoint', async () => {
  process.env.MAILGUN_REGION = 'eu';
  await sendPasswordResetEmail(reset);
  assert.equal(requests[0].url, 'https://api.eu.mailgun.net/v3/mg.example.com/messages');
});

test('homepage editor verification is delivered only to the account email', async () => {
  await sendHomepageEditorCode({ to: 'editor@example.com', code: 'A1B2C3D4E5F6' });
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.getAll('to'), ['editor@example.com']);
  assert.match(requests[0].body.get('text'), /A1B2C3D4E5F6/);
  assert.match(requests[0].body.get('subject'), /Verify your Ventus homepage editor access/);
  assert.equal(requests[0].body.get('o:tracking'), 'no');
});

test('booking notifications send separate team and guest emails with correct reply addresses', async () => {
  process.env.BOOKING_NOTIFICATION_EMAIL = 'bookings@example.com';
  process.env.BOOKING_FROM_EMAIL = 'Ventus Bookings <bookings@mg.example.com>';
  assert.equal(await sendBookingRequestNotification(booking), true);
  assert.equal(requests.length, 2);
  const [team, guest] = requests.map(request => request.body);
  assert.deepEqual(team.getAll('to'), ['bookings@example.com']);
  assert.deepEqual(guest.getAll('to'), ['guest@example.com']);
  assert.equal(team.get('h:Reply-To'), 'guest@example.com');
  assert.equal(guest.get('h:Reply-To'), 'team@example.com');
  assert.equal(team.get('from'), process.env.BOOKING_FROM_EMAIL);
  assert.match(team.get('text'), /Quote shown: GBP 100/);
  assert.match(guest.get('text'), /No payment has been taken/);
  assert.ok(!guest.get('text').includes(booking.guestPhone));
});

test('provider failures surface safely without fallback or exposing message content', async () => {
  process.env.RESEND_API_KEY = 'unused-test-key';
  process.env.PASSWORD_RESET_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL;
  global.fetch = async (url) => {
    requests.push(url);
    return new Response('Private reset token and recipient details', { status: 401 });
  };
  await assert.rejects(sendPasswordResetEmail(reset), { message: 'Mailgun email delivery failed (HTTP 401)' });
  assert.equal(requests.length, 1);
});

test('invalid Mailgun region or domain is rejected before sending credentials', async () => {
  process.env.MAILGUN_REGION = 'https://example.com';
  await assert.rejects(sendPasswordResetEmail(reset), /MAILGUN_REGION/);
  process.env.MAILGUN_REGION = 'US';
  process.env.MAILGUN_DOMAIN = 'mg.example.com/../../other-domain';
  await assert.rejects(sendPasswordResetEmail(reset), /MAILGUN_DOMAIN/);
  assert.equal(requests.length, 0);
});

test('unconfigured email reports unavailable without sending', async () => {
  delete process.env.MAILGUN_API_KEY;
  assert.equal(getPasswordResetEmailProvider(), null);
  await assert.rejects(sendPasswordResetEmail(reset), /not configured/);
  assert.equal(await sendBookingRequestNotification(booking), false);
  assert.equal(requests.length, 0);
});

test('existing Resend configuration continues to work without Mailgun credentials', async () => {
  delete process.env.MAILGUN_API_KEY;
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.PASSWORD_RESET_FROM_EMAIL = 'Ventus <team@example.com>';
  assert.equal(getPasswordResetEmailProvider(), 'resend');
  await sendPasswordResetEmail(reset);
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(requests[0].body).to, ['member@example.com']);
});

test('existing EmailJS fallback remains available without Mailgun or Resend credentials', async () => {
  delete process.env.MAILGUN_API_KEY;
  Object.assign(process.env, { EMAILJS_SERVICE_ID: 'test-service', EMAILJS_TEMPLATE_ID: 'test-template', EMAILJS_PUBLIC_KEY: 'test-public-key' });
  assert.equal(getPasswordResetEmailProvider(), 'emailjs');
  await sendPasswordResetEmail(reset);
  assert.equal(requests[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.equal(JSON.parse(requests[0].body).template_params.reset_url, reset.resetUrl);
});
