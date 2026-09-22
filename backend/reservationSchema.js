async function ensureReservationSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS reservations (
    supplier_id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    guest_email VARCHAR(255) NOT NULL,
    snapshot JSONB NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'website',
    linked_by INTEGER REFERENCES users(id),
    cancellation_state VARCHAR(20),
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reservations_owner ON reservations(user_id)');
  await pool.query(`CREATE TABLE IF NOT EXISTS reservation_attempts (
    session_hash CHAR(64) PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    state VARCHAR(20) NOT NULL DEFAULT 'submitting', supplier_id BIGINT REFERENCES reservations(supplier_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reservation_cancellation_reviews (
    id UUID PRIMARY KEY, supplier_id BIGINT NOT NULL REFERENCES reservations(supplier_id),
    user_id INTEGER NOT NULL REFERENCES users(id), fingerprint CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    used_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reservation_emails (
    id UUID PRIMARY KEY, supplier_id BIGINT NOT NULL REFERENCES reservations(supplier_id),
    kind VARCHAR(30) NOT NULL, recipient VARCHAR(255) NOT NULL, payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ, UNIQUE(supplier_id, kind, recipient)
  )`);
  await pool.query('ALTER TABLE reservation_emails ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ');
}

module.exports = { ensureReservationSchema };
