const crypto = require('crypto');
const { getAccountEmailProvider, sendNewsletterConfirmation } = require('./email');

const CONSENT_TEXT = 'I would like Ventus Travel emails about new hotels, destinations, membership benefits and saving opportunities. I can unsubscribe at any time.';
const CONSENT_VERSION = 'ventus-newsletter-2026-10-02';
const MESSAGE = 'Check your inbox to confirm your email. If you are already subscribed, you are all set.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

function registerNewsletterRoutes(app, pool, {
  sendConfirmation = sendNewsletterConfirmation,
  emailReady = getAccountEmailProvider,
  publicAppUrl = process.env.PUBLIC_APP_URL || 'https://destinations.ventustravel.co.uk',
  signingSecret = process.env.JWT_SECRET,
} = {}) {
  const base = publicAppUrl.replace(/\/$/, '');
  const attempts = new Map();
  const signature = id => crypto.createHmac('sha256', signingSecret).update(`newsletter-unsubscribe:${id}`).digest('hex');
  const unsubscribeToken = id => `${id}.${signature(id)}`;
  const tokenId = token => {
    if (typeof token !== 'string' || !/^[a-f\d-]{36}\.[a-f\d]{64}$/.test(token)) return null;
    const [id, mac] = token.split('.');
    return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(id), 'hex')) ? id : null;
  };
  const handle = handler => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { await handler(req, res); }
    catch { res.status(503).json({ success: false, error: 'We could not complete your request. Please try again later.' }); }
  };

  app.post('/api/newsletter/subscribe', handle(async (req, res) => {
    if (req.body?.website) return res.json({ success: true, message: MESSAGE });
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!validEmail(email) || req.body?.consent !== true) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address and agree to receive Ventus emails.' });
    }
    if (!emailReady() || !signingSecret) return res.status(503).json({ success: false, error: 'Email sign-up is temporarily unavailable. Please try again later.' });
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.expires <= now) attempts.delete(key);
    const ip = req.ip || 'unknown';
    const entry = attempts.get(ip) || { count: 0, expires: now + 15 * 60 * 1000 };
    entry.count += 1; attempts.set(ip, entry);
    if (entry.count > 100) return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });

    const client = await pool.connect();
    let delivery;
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO newsletter_subscribers (id, email, status) VALUES ($1, $2, 'pending') ON CONFLICT (email) DO NOTHING`, [crypto.randomUUID(), email]);
      const row = (await client.query('SELECT *, requested_at > NOW() - INTERVAL \'15 minutes\' AS recently_requested FROM newsletter_subscribers WHERE email = $1 FOR UPDATE', [email])).rows[0];
      if (row.recently_requested && row.status !== 'subscribed' && row.confirmation_delivery_status === 'failed') throw new Error('Recent delivery failed');
      // Do not re-enrol an unsubscribed address without a fresh email confirmation.
      if (row.status !== 'subscribed' && !row.recently_requested) {
        const token = crypto.randomBytes(32).toString('hex');
        await client.query(`UPDATE newsletter_subscribers SET confirmation_hash = $2, confirmation_expires_at = NOW() + INTERVAL '24 hours',
          requested_at = NOW(), confirmation_delivery_status = 'pending', consent_version = $3, consent_text = $4, source = 'homepage-popup' WHERE id = $1`,
        [row.id, hash(token), CONSENT_VERSION, CONSENT_TEXT]);
        delivery = { id: row.id, confirmationHash: hash(token), to: email, confirmUrl: `${base}/email-preferences#action=confirm&token=${token}`,
          unsubscribeUrl: `${base}/email-preferences#action=unsubscribe&token=${unsubscribeToken(row.id)}` };
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
    if (delivery) {
      try { await sendConfirmation(delivery); }
      catch (error) {
        await pool.query("UPDATE newsletter_subscribers SET confirmation_delivery_status = 'failed' WHERE id = $1 AND confirmation_hash = $2", [delivery.id, delivery.confirmationHash]);
        throw error;
      }
      await pool.query("UPDATE newsletter_subscribers SET confirmation_delivery_status = 'sent' WHERE id = $1 AND confirmation_hash = $2", [delivery.id, delivery.confirmationHash]);
    }
    res.json({ success: true, message: MESSAGE });
  }));

  app.post('/api/newsletter/confirm', handle(async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token)) return res.status(400).json({ success: false, error: 'This confirmation link is not valid.' });
    const result = await pool.query(`UPDATE newsletter_subscribers SET status = 'subscribed', confirmed_at = COALESCE(confirmed_at, NOW()), unsubscribed_at = NULL
      WHERE confirmation_hash = $1 AND confirmation_expires_at > NOW() RETURNING id`, [hash(token)]);
    if (!result.rows.length) return res.status(410).json({ success: false, error: 'This link has expired or is no longer valid. Please sign up again on the homepage.' });
    res.json({ success: true, message: 'Your email is confirmed. Welcome to the Ventus mailing list.' });
  }));

  app.post('/api/newsletter/unsubscribe', handle(async (req, res) => {
    if (!signingSecret) throw new Error('Signing unavailable');
    const id = tokenId(req.body?.token);
    if (!id) return res.status(400).json({ success: false, error: 'This unsubscribe link is not valid.' });
    await pool.query(`UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW(), confirmation_hash = NULL,
      confirmation_expires_at = NULL, confirmed_at = NULL WHERE id = $1`, [id]);
    res.json({ success: true, message: 'You are unsubscribed from Ventus marketing emails. Your account and bookings are unchanged.' });
  }));

  return {
    ensureSchema: () => pool.query(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id UUID PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'subscribed', 'unsubscribed')),
      consent_version TEXT, consent_text TEXT, source TEXT,
      confirmation_hash CHAR(64), confirmation_expires_at TIMESTAMPTZ, confirmation_delivery_status TEXT,
      requested_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ, unsubscribed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    ); CREATE INDEX IF NOT EXISTS idx_newsletter_confirmation ON newsletter_subscribers(confirmation_hash);`),
  };
}
module.exports = { registerNewsletterRoutes, CONSENT_TEXT, CONSENT_VERSION };
