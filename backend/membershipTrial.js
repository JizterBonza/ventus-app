const TRIAL_DAYS = 7;
const failure = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function ensureTrialSchema(pool) {
  // Keep the row after expiry or upgrade: changing an email cannot restart a trial.
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_one_membership_trial_per_user
    ON subscriptions(user_id) WHERE payment_provider = 'trial'`);
}

async function findActiveMembership(userId, client) {
  return (await client.query(`SELECT id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at
    FROM subscriptions WHERE user_id = $1 AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY (payment_provider <> 'trial') DESC, starts_at DESC LIMIT 1`, [userId])).rows[0] || null;
}

async function getTrialStatus(user, membership, client) {
  const trial = (await client.query(`SELECT expires_at FROM subscriptions
    WHERE user_id = $1 AND payment_provider = 'trial' LIMIT 1`, [user.id])).rows[0];
  return {
    eligible: Boolean(user.email_verified_at && !membership && !trial),
    used: Boolean(trial),
    expiresAt: trial?.expires_at?.toISOString() || null,
  };
}

async function endTrialOnUpgrade(userId, client) {
  await client.query(`UPDATE subscriptions SET status = 'converted', updated_at = NOW()
    WHERE user_id = $1 AND payment_provider = 'trial' AND status = 'active'`, [userId]);
}

function createTrialHandler({ pool, serializeSubscription }) {
  return async (req, res) => {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      // Serialize concurrent starts and upgrades. The unique index is a second safeguard.
      const user = (await client.query('SELECT id, email_verified_at FROM users WHERE id = $1 FOR UPDATE', [req.user.id])).rows[0];
      if (!user) throw failure('Account not found.', 404);
      if (!user.email_verified_at) throw failure('Please confirm your email before starting your free trial.', 403);
      const membership = await findActiveMembership(user.id, client);
      if (membership && membership.payment_provider !== 'trial') throw failure('Your membership is already active.', 409);
      if (membership) {
        await client.query('COMMIT');
        return res.json({ success: true, subscription: serializeSubscription(membership) });
      }
      const trial = await getTrialStatus(user, membership, client);
      if (trial.used) throw failure('You have already used your free trial. Choose an annual membership to continue.', 409);
      const inserted = await client.query(`INSERT INTO subscriptions
        (user_id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at)
        VALUES ($1, 'travel-trial', 'active', 0, 'GBP', 'trial', NOW(), NOW() + INTERVAL '168 hours') RETURNING *`, [user.id]);
      await client.query('COMMIT');
      res.status(201).json({ success: true, subscription: serializeSubscription(inserted.rows[0]) });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      res.status(error.statusCode || 503).json({ success: false, error: error.statusCode ? error.message : 'Unable to start your trial. Please try again.' });
    } finally {
      if (client) client.release();
    }
  };
}

module.exports = { TRIAL_DAYS, ensureTrialSchema, findActiveMembership, getTrialStatus, endTrialOnUpgrade, createTrialHandler };
