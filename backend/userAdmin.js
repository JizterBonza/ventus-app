const crypto = require('crypto');
const Stripe = require('stripe');
const { userManagerEmails, staffEmails } = require('./accountAccess');
const { sanitizeBooking } = require('./reservationSupplier');
const { getPasswordResetEmailProvider, sendPasswordResetEmail } = require('./email');
const fail = (message, statusCode = 400, code) => Object.assign(new Error(message), { statusCode, code });
const validId = value => /^[1-9]\d{0,9}$/.test(String(value)) && Number(value) <= 2147483647;
const iso = value => value?.toISOString?.() || value || null;
const statuses = ['registered', 'unverified', 'trial', 'active', 'past_due', 'expired', 'cancelled', 'suspended'];
const memberColumns = 'id, user_id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at, stripe_status, trial_ends_at, cancel_at_period_end, renewal_amount_minor';
const accounts = `WITH accounts AS (
  SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.city_of_residence, u.created_at, u.updated_at,
    u.email_verified_at, u.last_login_at, u.account_suspended_at, u.admin_version,
    (SELECT COUNT(*)::int FROM reservations r WHERE r.user_id=u.id) AS booking_count,
    m.expires_at AS membership_expires_at, m.cancel_at_period_end, m.payment_provider, m.stripe_status,
    CASE WHEN u.account_suspended_at IS NOT NULL THEN 'suspended'
      WHEN u.email_verified_at IS NULL THEN 'unverified'
      WHEN m.stripe_status IN ('past_due','unpaid','incomplete') AND m.status <> 'active' THEN 'past_due'
      WHEN m.status='active' AND (m.expires_at IS NULL OR m.expires_at>NOW()) THEN
        CASE WHEN m.payment_provider='trial' OR m.stripe_status='trialing' THEN 'trial' ELSE 'active' END
      WHEN m.status IN ('cancelled','canceled') THEN 'cancelled'
      WHEN m.id IS NOT NULL THEN 'expired' ELSE 'registered' END AS account_status
  FROM users u LEFT JOIN LATERAL (SELECT * FROM subscriptions WHERE user_id=u.id
    ORDER BY (status='active' AND (expires_at IS NULL OR expires_at>NOW())) DESC,
      (payment_provider<>'trial') DESC, starts_at DESC, id DESC LIMIT 1) m ON true
)`;
const displayUser = row => ({ id: String(row.id), email: row.email, firstName: row.first_name, lastName: row.last_name,
  phone: row.phone || '', cityOfResidence: row.city_of_residence || '', createdAt: iso(row.created_at),
  lastLoginAt: iso(row.last_login_at), emailVerified: Boolean(row.email_verified_at), status: row.account_status,
  suspended: Boolean(row.account_suspended_at), membershipExpiresAt: iso(row.membership_expires_at),
  cancelAtPeriodEnd: Boolean(row.cancel_at_period_end), bookingCount: Number(row.booking_count || 0), version: row.admin_version });
const displayMembership = row => ({ id: String(row.id), plan: row.plan_id, status: row.status, amountPaid: Number(row.amount_paid),
  currency: row.currency?.trim(), provider: row.payment_provider, startsAt: iso(row.starts_at), expiresAt: iso(row.expires_at),
  billingStatus: row.stripe_status, trialEndsAt: iso(row.trial_ends_at), cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  renewalAmount: row.renewal_amount_minor == null ? null : row.renewal_amount_minor / 100, recurring: row.payment_provider === 'stripe_subscription' });

function registerUserAdmin(app, pool, authenticate, { sendReset = sendPasswordResetEmail, emailReady = getPasswordResetEmailProvider,
  sendVerification, cancelRenewal, stripeClient, publicAppUrl = process.env.PUBLIC_APP_URL || 'https://destinations.ventustravel.co.uk' } = {}) {
  const route = fn => async (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    try { await fn(req, res, next); }
    catch (error) { if (!error.statusCode) console.error('User admin request failed:', error.code || 'provider-or-database');
      res.status(error.statusCode || 503).json({ success: false, error: error.statusCode ? error.message : 'Unable to complete this request. Please try again.', ...(error.code ? { code: error.code } : {}) }); }
  };
  const manager = route(async (req, res, next) => {
    const account = (await pool.query(`SELECT u.email, u.email_verified_at, v.verified_at FROM users u
      LEFT JOIN homepage_editor_verifications v ON v.user_id=u.id AND v.email=u.email WHERE u.id=$1`, [req.user.id])).rows[0];
    if (!account || !userManagerEmails().includes(account.email.toLowerCase()) || !account.email_verified_at) throw fail('User administrator access required.', 403);
    if (!account.verified_at) throw fail('Confirm your staff email before viewing client accounts.', 403, 'ADMIN_VERIFICATION_REQUIRED');
    req.adminEmail = account.email;
    next();
  });
  const protectedRoute = fn => [authenticate, manager, route(fn)];
  const user = async (id, client = pool, lock = false) => {
    if (!validId(id)) throw fail('Client account not found.', 404);
    const row = (await client.query(`SELECT id, email, first_name, last_name, phone, city_of_residence, email_verified_at,
      account_suspended_at, auth_version, admin_version, admin_notes FROM users WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [id])).rows[0];
    if (!row) throw fail('Client account not found.', 404);
    return row;
  };
  const audit = (client, req, target, action, details = {}) => client.query(
    'INSERT INTO user_admin_events(actor_id, user_id, action, details) VALUES($1,$2,$3,$4::jsonb)',
    [req.user.id, target, action, JSON.stringify(details)]);
  const transaction = async fn => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
    finally { client.release(); }
  };
  const pagination = query => {
    const page = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw fail('Invalid page number.');
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    if (q.length > 120) throw fail('Use a shorter search.');
    return { page, search: q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : null };
  };
  app.get('/api/admin/users', ...protectedRoute(async (req, res) => {
    const { page, search } = pagination(req.query), status = req.query.status || '';
    if (status && !statuses.includes(status)) throw fail('Invalid account status.');
    const where = `WHERE ($1::text IS NULL OR concat_ws(' ',first_name,last_name,email,phone) ILIKE $1) AND ($2::text='' OR account_status=$2)`;
    const totals = (await pool.query(`${accounts} SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE account_status='active')::int AS active,
      COUNT(*) FILTER(WHERE account_status='trial')::int AS trial,
      COUNT(*) FILTER(WHERE account_status='unverified')::int AS unverified,
      COUNT(*) FILTER(WHERE account_status='suspended')::int AS suspended FROM accounts ${where}`, [search, status])).rows[0];
    const rows = (await pool.query(`${accounts} SELECT * FROM accounts ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $3`, [search, status, (page - 1) * 25])).rows;
    res.json({ users: rows.map(displayUser), total: totals.total, page, pageSize: 25, summary: totals });
  }));
  app.get('/api/admin/newsletter', ...protectedRoute(async (req, res) => {
    const { page, search } = pagination(req.query), status = req.query.status || '';
    if (status && !['pending', 'subscribed', 'unsubscribed'].includes(status)) throw fail('Invalid email subscription status.');
    const where = 'WHERE ($1::text IS NULL OR email ILIKE $1) AND ($2::text=\'\' OR status=$2)';
    const total = (await pool.query(`SELECT COUNT(*)::int AS total FROM newsletter_subscribers ${where}`, [search, status])).rows[0].total;
    const rows = (await pool.query(`SELECT email,status,source,created_at,confirmed_at,unsubscribed_at FROM newsletter_subscribers ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $3`, [search, status, (page - 1) * 25])).rows;
    res.json({ subscribers: rows.map(row => ({ email: row.email, status: row.status, source: row.source, createdAt: iso(row.created_at), confirmedAt: iso(row.confirmed_at), unsubscribedAt: iso(row.unsubscribed_at) })), total, page, pageSize: 25 });
  }));
  app.get('/api/admin/users/:id', ...protectedRoute(async (req, res) => {
    const record = await user(req.params.id);
    const row = (await pool.query(`${accounts} SELECT * FROM accounts WHERE id=$1`, [record.id])).rows[0];
    const memberships = (await pool.query(`SELECT ${memberColumns} FROM subscriptions WHERE user_id=$1 ORDER BY starts_at DESC,id DESC`, [record.id])).rows;
    const bookings = (await pool.query('SELECT snapshot, cancellation_state, synced_at, source FROM reservations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [record.id])).rows;
    const requests = (await pool.query('SELECT request_reference, hotel_name, start_date, end_date, status, created_at FROM booking_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [record.id])).rows;
    const events = (await pool.query(`SELECT e.action,e.details,e.created_at,a.first_name,a.last_name FROM user_admin_events e
      LEFT JOIN users a ON a.id=e.actor_id WHERE e.user_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 50`, [record.id])).rows;
    res.json({ user: { ...displayUser(row), notes: record.admin_notes || '' }, memberships: memberships.map(displayMembership),
      bookings: bookings.map(booking => ({ ...sanitizeBooking(booking.snapshot), can_cancel: false, cancellation_state: booking.cancellation_state, synced_at: iso(booking.synced_at), source: booking.source })),
      bookingRequests: requests.map(item => ({ reference: item.request_reference, hotelName: item.hotel_name, checkIn: iso(item.start_date), checkOut: iso(item.end_date), status: item.status, createdAt: iso(item.created_at) })),
      history: events.map(event => ({ action: event.action, details: event.details, createdAt: iso(event.created_at), by: [event.first_name, event.last_name].filter(Boolean).join(' ') || 'Ventus administrator' })),
      canSuspend: !staffEmails().includes(record.email.toLowerCase()), canLinkBookings: (process.env.RESERVATION_MANAGER_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).includes(req.adminEmail.toLowerCase()) });
  }));
  app.put('/api/admin/users/:id', ...protectedRoute(async (req, res) => {
    const fields = { firstName: ['first_name', 100, true], lastName: ['last_name', 100, true], phone: ['phone', 80], cityOfResidence: ['city_of_residence', 160], notes: ['admin_notes', 5000] };
    if (!req.body || Object.keys(req.body).some(key => key !== 'version' && !fields[key]) || !Number.isSafeInteger(req.body.version)) throw fail('Invalid profile update.');
    const values = Object.entries(fields).map(([key, [, max, required]]) => {
      const value = req.body[key];
      if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw fail(`Enter a valid ${key}.`);
      return value.trim();
    });
    await transaction(async client => {
      const before = await user(req.params.id, client, true);
      if (before.admin_version !== req.body.version) throw fail('This profile changed. Refresh before saving.', 409);
      await client.query(`UPDATE users SET first_name=$2,last_name=$3,phone=$4,city_of_residence=$5,admin_notes=$6,
        admin_version=admin_version+1,updated_at=NOW() WHERE id=$1`, [before.id, ...values]);
      await audit(client, req, before.id, 'profile_updated', { fields: Object.entries(fields).filter(([, [column]], index) => (before[column] || '') !== values[index]).map(([key]) => key) });
    });
    res.json({ success: true, message: 'Client profile saved.' });
  }));
  app.post('/api/admin/users/:id/access', ...protectedRoute(async (req, res) => {
    const { suspended, reason, version } = req.body || {};
    if (typeof suspended !== 'boolean' || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500 || !Number.isSafeInteger(version)) throw fail('Confirm the action and enter a reason.');
    await transaction(async client => {
      const target = await user(req.params.id, client, true);
      if (staffEmails().includes(target.email.toLowerCase())) throw fail('Staff accounts cannot be suspended here.', 409);
      if (target.admin_version !== version) throw fail('This profile changed. Refresh before updating access.', 409);
      if (Boolean(target.account_suspended_at) === suspended) return;
      await client.query(`UPDATE users SET account_suspended_at=CASE WHEN $2 THEN NOW() ELSE NULL END,
        auth_version=auth_version+1,admin_version=admin_version+1,updated_at=NOW() WHERE id=$1`, [target.id, suspended]);
      await audit(client, req, target.id, suspended ? 'sign_in_suspended' : 'sign_in_restored', { reason: reason.trim() });
    });
    res.json({ success: true, message: suspended ? 'Sign-in suspended. Existing sessions have ended.' : 'Sign-in restored. The client can sign in again.' });
  }));
  app.post('/api/admin/users/:id/password-reset', ...protectedRoute(async (req, res) => {
    const target = await user(req.params.id);
    if (!emailReady()) throw fail('Password reset email is temporarily unavailable.', 503);
    // Lock the account while reserving an email request, so concurrent clicks cannot send multiple links.
    const raw = crypto.randomBytes(32).toString('base64url'), hash = crypto.createHash('sha256').update(raw).digest('hex');
    await transaction(async client => {
      await user(target.id, client, true);
      const recent = (await client.query("SELECT id FROM user_admin_events WHERE user_id=$1 AND action='password_reset_requested' AND created_at>NOW()-INTERVAL '2 minutes' LIMIT 1", [target.id])).rows;
      if (recent.length) throw fail('A reset email was requested recently. Please wait two minutes.', 429);
      await client.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,$3)', [target.id, hash, new Date(Date.now() + 3600000)]);
      await audit(client, req, target.id, 'password_reset_requested');
    });
    const resetUrl = new URL('/reset-password', publicAppUrl); resetUrl.hash = new URLSearchParams({ token: raw }).toString();
    try { await sendReset({ to: target.email, firstName: target.first_name, resetUrl: resetUrl.toString() }); }
    catch {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash=$1', [hash]);
      await audit(pool, req, target.id, 'password_reset_delivery_failed');
      throw fail('The reset email could not be sent. Please try again shortly.', 502);
    }
    await audit(pool, req, target.id, 'password_reset_sent');
    res.json({ success: true, message: `Password reset email sent to ${target.email}. The link expires in one hour.` });
  }));
  app.post('/api/admin/users/:id/verification-email', ...protectedRoute(async (req, res) => {
    const target = await user(req.params.id);
    if (target.email_verified_at) throw fail('This client has already confirmed their email.', 409);
    await transaction(async client => {
      await user(target.id, client, true);
      const recent = (await client.query(`SELECT 1 FROM email_verification_tokens WHERE user_id=$1 AND created_at>NOW()-INTERVAL '2 minutes'
        UNION ALL SELECT 1 FROM user_admin_events WHERE user_id=$1 AND action='verification_email_requested' AND created_at>NOW()-INTERVAL '2 minutes' LIMIT 1`, [target.id])).rows;
      if (recent.length) throw fail('A confirmation email was requested recently. Please wait two minutes.', 429);
      await audit(client, req, target.id, 'verification_email_requested');
    });
    await sendVerification(target); await audit(pool, req, target.id, 'verification_email_sent');
    res.json({ success: true, message: `Confirmation email sent to ${target.email}.` });
  }));
  app.get('/api/admin/users/:id/billing', ...protectedRoute(async (req, res) => {
    const target = await user(req.params.id);
    const sub = (await pool.query("SELECT stripe_subscription_id,stripe_customer_id FROM subscriptions WHERE user_id=$1 AND payment_provider='stripe_subscription' ORDER BY starts_at DESC,id DESC LIMIT 1", [target.id])).rows[0];
    if (!sub?.stripe_customer_id) return res.json({ invoices: [], paymentMethod: null, available: false });
    if (!stripeClient && !process.env.STRIPE_SECRET_KEY) throw fail('Billing details are temporarily unavailable.', 503);
    const provider = stripeClient || new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 1, timeout: 15000 });
    const remote = await provider.subscriptions.retrieve(sub.stripe_subscription_id, { expand: ['default_payment_method'] });
    const customerId = typeof remote.customer === 'string' ? remote.customer : remote.customer?.id;
    if (customerId !== sub.stripe_customer_id || remote.metadata?.ventus_user_id !== String(target.id)) throw fail('The billing record needs review before it can be displayed.', 409);
    const invoices = (await provider.invoices.list({ customer: sub.stripe_customer_id, limit: 30 })).data;
    const card = typeof remote.default_payment_method === 'object' ? remote.default_payment_method?.card : null;
    res.json({ available: true, paymentMethod: card ? { brand: card.brand, last4: card.last4, expiryMonth: card.exp_month, expiryYear: card.exp_year } : null,
      invoices: invoices.map(invoice => ({ id: invoice.id, number: invoice.number, status: invoice.status, amountPaid: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100, currency: invoice.currency.toUpperCase(), createdAt: iso(new Date(invoice.created * 1000)),
        url: /^https:\/\//.test(invoice.hosted_invoice_url || '') ? invoice.hosted_invoice_url : null })) });
  }));
  app.post('/api/admin/users/:id/cancel-renewal', ...protectedRoute(async (req, res) => {
    const target = await user(req.params.id);
    if (req.body?.acknowledged !== true) throw fail('Confirm that you want to stop this client’s membership renewal.');
    await audit(pool, req, target.id, 'renewal_cancellation_requested');
    const membership = await cancelRenewal(target.id);
    await audit(pool, req, target.id, 'renewal_cancelled');
    res.json({ success: true, membership, message: 'Membership renewal cancelled. Existing hotel reservations are unchanged.' });
  }));
  return { ensureSchema: () => pool.query(`ALTER TABLE users
      ADD COLUMN IF NOT EXISTS account_suspended_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS admin_version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS user_admin_events(id BIGSERIAL PRIMARY KEY, actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_user_admin_events_user ON user_admin_events(user_id,created_at DESC);`) };
}
module.exports = { registerUserAdmin, displayUser, displayMembership };
