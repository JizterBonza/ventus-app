const crypto = require('crypto');
const Stripe = require('stripe');

const stripeIsConfigured = () => /^(sk|rk)_(test|live)_\S+$/.test(process.env.STRIPE_SECRET_KEY || '') &&
  /^whsec_\S+$/.test(process.env.STRIPE_WEBHOOK_SECRET || '');
const stripeIsLive = () => /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '');
const failure = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, publicError: true });

async function ensureStripeMembershipSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS stripe_membership_orders (
    id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL,
    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL,
    livemode BOOLEAN NOT NULL,
    stripe_session_id TEXT UNIQUE,
    payment_intent_id TEXT UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_stripe_membership_user ON stripe_membership_orders(user_id, created_at DESC)');
  await pool.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_stripe_session ON subscriptions(stripe_session_id)');
}

function createStripeMembershipHandlers({ pool, getMembershipQuote, getActiveSubscription, publicAppUrl, stripeClient }) {
  const getStripe = () => {
    if (!stripeIsConfigured()) throw failure('Secure card checkout is temporarily unavailable.', 503);
    return stripeClient || new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 });
  };

  // The browser and webhook share this path. A redirect alone never grants access.
  const fulfill = async (sessionId) => {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent.latest_charge'] });
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      return { active: false, pending: true };
    }
    const payment = session.payment_intent;
    const charge = payment?.latest_charge;
    if (session.mode !== 'payment' || !payment?.id || payment.status !== 'succeeded' || !charge?.id) {
      throw failure('The membership payment could not be verified.');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT * FROM stripe_membership_orders WHERE id = $1 FOR UPDATE', [session.metadata?.ventus_order_id]);
      const order = rows[0];
      if (!order || order.stripe_session_id !== session.id ||
        String(order.user_id) !== session.client_reference_id ||
        order.amount_minor !== session.amount_total || order.currency.trim().toLowerCase() !== session.currency ||
        order.livemode !== session.livemode || order.livemode !== stripeIsLive()) {
        throw failure('The payment does not match this membership order.');
      }
      // A late/replayed completion must not restore access after a refund/dispute.
      if (charge.refunded || charge.disputed || ['REFUNDED', 'DISPUTED'].includes(order.status)) {
        await client.query('COMMIT');
        return { active: false, pending: false };
      }
      await client.query(`INSERT INTO subscriptions (
        user_id, plan_id, status, amount_paid, currency, payment_provider, stripe_session_id, starts_at, expires_at
      ) VALUES ($1, $2, 'active', $3, $4, 'stripe', $5, NOW(), NOW() + INTERVAL '1 year')
      ON CONFLICT (stripe_session_id) DO NOTHING`,
      [order.user_id, order.plan_id, order.amount_minor / 100, order.currency, session.id]);
      await client.query(`UPDATE stripe_membership_orders SET status = 'PAID', payment_intent_id = $2, updated_at = NOW() WHERE id = $1`, [order.id, payment.id]);
      const membership = await client.query('SELECT status, expires_at FROM subscriptions WHERE stripe_session_id = $1', [session.id]);
      await client.query('COMMIT');
      const subscription = membership.rows[0];
      return { active: subscription?.status === 'active' && new Date(subscription.expires_at).getTime() > Date.now(), pending: false };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const checkout = async (req, res) => {
    let client;
    try {
      const stripe = getStripe();
      const planId = req.body.planId || 'travel-yearly';
      if (planId !== 'travel-yearly') throw failure('Invalid membership plan.');
      const quote = getMembershipQuote(planId, req.body.couponCode);
      if (!quote.couponValid) throw failure('Invalid membership code.');
      if (quote.finalPrice <= 0) throw failure('Use complimentary activation for this membership.');
      const amount = Math.round(quote.finalPrice * 100);
      client = await pool.connect();
      await client.query('BEGIN');
      // Serialize repeated clicks/tabs and reuse the open checkout to avoid duplicate payments.
      const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      if (!user.rows.length) throw failure('Account not found.', 404);
      if (await getActiveSubscription(req.user.id, client)) throw failure('This account already has an active membership.', 409);
      const previous = await client.query(`SELECT * FROM stripe_membership_orders WHERE user_id = $1 AND status = 'OPEN' ORDER BY created_at DESC`, [req.user.id]);
      for (const order of previous.rows) {
        if (order.livemode !== stripeIsLive()) continue;
        const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        if (session.status === 'complete') throw failure('Your payment is being confirmed. Refresh your membership page shortly.', 409);
        if (session.status === 'open' && order.amount_minor === amount && order.currency.trim() === quote.currency) {
          await client.query('COMMIT');
          return res.json({ success: true, url: session.url });
        }
        if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
        await client.query("UPDATE stripe_membership_orders SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1", [order.id]);
      }
      const orderId = crypto.randomUUID();
      await client.query(`INSERT INTO stripe_membership_orders (id, user_id, plan_id, amount_minor, currency, livemode)
        VALUES ($1, $2, $3, $4, $5, $6)`, [orderId, req.user.id, quote.planId, amount, quote.currency, stripeIsLive()]);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        client_reference_id: String(req.user.id),
        metadata: { ventus_order_id: orderId },
        payment_intent_data: { metadata: { ventus_order_id: orderId } },
        line_items: [{ quantity: 1, price_data: {
          currency: quote.currency.toLowerCase(), unit_amount: amount,
          product_data: { name: 'Ventus Travel — one-year membership' },
        } }],
        success_url: `${publicAppUrl}/subscription?stripe_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicAppUrl}/subscription?checkout=cancelled`,
      }, { idempotencyKey: `ventus-membership-${orderId}` });
      if (!session.id || !session.url) throw failure('Stripe could not open checkout.', 502);
      await client.query('UPDATE stripe_membership_orders SET stripe_session_id = $2 WHERE id = $1', [orderId, session.id]);
      await client.query('COMMIT');
      res.status(201).json({ success: true, url: session.url });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Stripe checkout failed:', error.type || error.statusCode || 'internal');
      res.status(error.publicError ? error.statusCode : 502).json({ success: false, error: error.publicError ? error.message : 'Unable to open card checkout. Please try again.' });
    } finally {
      if (client) client.release();
    }
  };

  const confirm = async (req, res) => {
    try {
      const sessionId = req.body.sessionId;
      if (typeof sessionId !== 'string' || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(sessionId)) throw failure('Invalid checkout reference.');
      const order = await pool.query('SELECT id FROM stripe_membership_orders WHERE stripe_session_id = $1 AND user_id = $2', [sessionId, req.user.id]);
      if (!order.rows.length) throw failure('Checkout was not found for this account.', 404);
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, ...await fulfill(sessionId) });
    } catch (error) {
      console.error('Stripe confirmation failed:', error.type || error.statusCode || 'internal');
      res.status(error.publicError ? error.statusCode : 502).json({ success: false, error: error.publicError ? error.message : 'Unable to verify payment. Please refresh shortly; do not pay again.' });
    }
  };

  const webhook = async (req, res) => {
    let event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      return res.status(error.statusCode === 503 ? 503 : 400).json({ success: false, error: 'Unable to verify Stripe webhook.' });
    }
    if (event.livemode !== stripeIsLive()) return res.status(400).json({ success: false, error: 'Incorrect Stripe payment mode.' });
    try {
      const object = event.data.object;
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.metadata?.ventus_order_id) {
        await fulfill(object.id);
      }
      if ((event.type === 'charge.refunded' && object.refunded) || event.type === 'charge.dispute.created') {
        // Retrieve the intent for metadata even when this event precedes checkout completion.
        const intent = await getStripe().paymentIntents.retrieve(object.payment_intent);
        if (intent.metadata?.ventus_order_id) {
          const status = event.type === 'charge.refunded' ? 'REFUNDED' : 'DISPUTED';
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const order = await client.query(`UPDATE stripe_membership_orders SET status = $2, payment_intent_id = $3, updated_at = NOW()
              WHERE id = $1 RETURNING stripe_session_id`, [intent.metadata.ventus_order_id, status, intent.id]);
            if (order.rows.length) await client.query(`UPDATE subscriptions SET status = $2, updated_at = NOW() WHERE stripe_session_id = $1`, [order.rows[0].stripe_session_id, status.toLowerCase()]);
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
          } finally {
            client.release();
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Stripe webhook processing failed:', error.type || error.statusCode || 'internal');
      // A failed durable write must be retried by Stripe.
      res.status(500).json({ success: false, error: 'Unable to process Stripe webhook.' });
    }
  };

  return { checkout, confirm, webhook };
}

module.exports = { stripeIsConfigured, ensureStripeMembershipSchema, createStripeMembershipHandlers };
