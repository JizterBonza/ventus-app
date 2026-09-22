const crypto = require('crypto');
const { error, id, cancelled, confirmed, canCancel, fingerprint, sanitizeBooking, bookingPayload, createSupplier } = require('./reservationSupplier');
const { ensureReservationSchema } = require('./reservationSchema');
const { queueReservationEmail, createReservationEmailWorker } = require('./reservationEmails');

function registerReservationRoutes(app, pool, authenticate, { getActiveSubscription, supplier = createSupplier(), sendEmail } = {}) {
  const worker = createReservationEmailWorker(pool, sendEmail);
  let syncTimer;
  let syncing = false;
  const respondError = (res, failure) => {
    if (!failure.publicError) console.error('Reservation operation failed');
    res.status(failure.publicError ? failure.statusCode : 503).json({ success: false,
      error: failure.publicError ? failure.message : 'Unable to complete this reservation request. Please refresh or contact Ventus.' });
  };
  const route = (handler) => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { await handler(req, res); } catch (failure) { respondError(res, failure); }
  };
  const owned = async (userId, bookingId, client = pool, lock = false) => {
    if (!id(bookingId)) throw error('Reservation not found.', 404);
    const result = await client.query(`SELECT * FROM reservations WHERE supplier_id = $1 AND user_id = $2${lock ? ' FOR UPDATE' : ''}`, [bookingId, userId]);
    if (!result.rows.length) throw error('Reservation not found.', 404);
    return result.rows[0];
  };
  const readSupplier = async (bookingId) => {
    const booking = sanitizeBooking(await supplier('GET', `/${bookingId}`));
    if (booking.id !== String(bookingId)) throw error('The supplier returned a different reservation.', 502);
    return booking;
  };
  const display = (row, stale = false) => ({ ...row.snapshot, cancellation_state: row.cancellation_state,
    synced_at: row.synced_at, stale, can_cancel: !stale && !row.cancellation_state && canCancel(row.snapshot) });
  const saveSnapshot = async (booking) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM reservations WHERE supplier_id = $1 FOR UPDATE', [booking.id]);
      const previous = result.rows[0];
      if (!previous) { await client.query('COMMIT'); return null; }
      // Do not undo a confirmed DELETE with a stale read from the supplier.
      if (cancelled(previous.snapshot) && !cancelled(booking)) booking = previous.snapshot;
      const updated = await client.query(`UPDATE reservations SET snapshot = $2::jsonb, synced_at = NOW(),
        cancellation_state = CASE WHEN $3 THEN NULL ELSE cancellation_state END WHERE supplier_id = $1 RETURNING *`,
      [booking.id, JSON.stringify(booking), cancelled(booking)]);
      if (cancelled(booking) && !cancelled(previous.snapshot)) await queueReservationEmail(client, booking, previous.guest_email, 'cancelled');
      if (confirmed(booking) && !confirmed(previous.snapshot)) await queueReservationEmail(client, booking, previous.guest_email, 'confirmed');
      await client.query('COMMIT');
      void worker.drain();
      return updated.rows[0];
    } catch (failure) {
      await client.query('ROLLBACK').catch(() => {}); throw failure;
    } finally { client.release(); }
  };
  const refresh = async (row) => saveSnapshot(await readSupplier(row.supplier_id));

  app.post('/v2/hotels/bookings', authenticate, route(async (req, res) => {
    if (!await getActiveSubscription(req.user.id)) throw error('An active Ventus membership is required to make a new booking.', 403);
    const payload = bookingPayload(req.body || {});
    const sessionHash = crypto.createHash('sha256').update(payload.session_id).digest('hex');
    const attempt = await pool.query(`INSERT INTO reservation_attempts (session_hash, user_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING RETURNING session_hash`, [sessionHash, req.user.id]);
    if (!attempt.rows.length) {
      const existing = (await pool.query('SELECT * FROM reservation_attempts WHERE session_hash = $1 AND user_id = $2', [sessionHash, req.user.id])).rows[0];
      if (existing?.supplier_id) return res.json((await owned(req.user.id, existing.supplier_id)).snapshot);
      throw error(existing?.state === 'failed' ? 'This booking attempt was declined. Refresh availability and select the rate again.' :
        'This booking is already being processed. Check My Bookings or contact Ventus before trying again.', 409);
    }
    let booking;
    try {
      booking = sanitizeBooking(await supplier('POST', '', payload));
    } catch (failure) {
      await pool.query('UPDATE reservation_attempts SET state = $2 WHERE session_hash = $1', [sessionHash, failure.definitive ? 'failed' : 'uncertain']);
      if (failure.definitive) throw failure;
      throw error('We could not confirm the booking outcome. It may have been received. Contact Ventus before booking again.', 503);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(`INSERT INTO reservations (supplier_id, user_id, guest_email, snapshot)
        VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT DO NOTHING RETURNING supplier_id`,
      [booking.id, req.user.id, payload.guest_email, JSON.stringify(booking)]);
      if (!inserted.rows.length) throw error('This reservation needs review by Ventus before it can be linked.', 409);
      await client.query("UPDATE reservation_attempts SET state = 'saved', supplier_id = $2 WHERE session_hash = $1", [sessionHash, booking.id]);
      if (confirmed(booking)) await queueReservationEmail(client, booking, payload.guest_email, 'confirmed');
      await client.query('COMMIT');
    } catch (failure) {
      await client.query('ROLLBACK').catch(() => {});
      // The supplier may already have booked. Never instruct the client to resubmit.
      throw error('The supplier received your booking, but the account record needs checking. Contact Ventus before making another booking.', 503);
    } finally { client.release(); }
    void worker.drain();
    res.json(booking);
  }));

  app.get('/api/reservations', authenticate, route(async (req, res) => {
    const records = (await pool.query('SELECT * FROM reservations WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])).rows;
    const bookings = [];
    // Bounded concurrency avoids flooding LE for accounts with a long booking history.
    for (let index = 0; index < records.length; index += 4) {
      bookings.push(...await Promise.all(records.slice(index, index + 4).map(async (row) => {
        if (new Date(row.synced_at).getTime() > Date.now() - 60000 && !row.cancellation_state) return display(row);
        try { return display(await refresh(row)); } catch { return display(row, true); }
      })));
    }
    res.json({ success: true, bookings });
  }));

  const requireManager = async (req, res, next) => {
    try {
      const allowed = (process.env.RESERVATION_MANAGER_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
      const account = (await pool.query(`SELECT u.email FROM users u JOIN homepage_editor_verifications v
        ON v.user_id = u.id AND v.email = u.email AND v.verified_at IS NOT NULL WHERE u.id = $1`, [req.user.id])).rows[0];
      if (!account || !allowed.includes(account.email.toLowerCase())) throw error('Verified reservation manager access required.', 403);
      next();
    } catch (failure) { respondError(res, failure); }
  };
  app.get('/api/reservations/admin/unlinked', authenticate, requireManager, route(async (req, res) => {
    const data = await supplier('GET', '');
    if (!Array.isArray(data)) throw error('The supplier returned an unexpected booking list.', 502);
    const linked = new Set((await pool.query('SELECT supplier_id FROM reservations')).rows.map((row) => String(row.supplier_id)));
    res.json({ success: true, bookings: data.map(sanitizeBooking).filter((booking) => !linked.has(booking.id)) });
  }));
  app.post('/api/reservations/admin/link', authenticate, requireManager, route(async (req, res) => {
    if (!id(req.body.bookingId) || req.body.ownershipVerified !== true) throw error('Review the booking and confirm the account owner before linking.');
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = (await pool.query('SELECT id, email FROM users WHERE LOWER(email) = $1 AND email_verified_at IS NOT NULL', [email])).rows[0];
    if (!user) throw error('A verified Ventus account with that email could not be found.');
    const booking = await readSupplier(req.body.bookingId);
    const linked = await pool.query(`INSERT INTO reservations (supplier_id, user_id, guest_email, snapshot, source, linked_by)
      VALUES ($1, $2, $3, $4::jsonb, 'staff', $5) ON CONFLICT DO NOTHING RETURNING supplier_id`,
    [booking.id, user.id, user.email, JSON.stringify(booking), req.user.id]);
    if (!linked.rows.length) throw error('This booking is already linked. Contact the site administrator to review ownership.', 409);
    // Linking historical bookings deliberately does not resend old confirmations.
    res.json({ success: true, booking });
  }));

  app.get('/api/reservations/:id', authenticate, route(async (req, res) => {
    const row = await owned(req.user.id, req.params.id);
    res.json({ success: true, booking: display(await refresh(row)) });
  }));
  app.post('/api/reservations/:id/cancellation-preview', authenticate, route(async (req, res) => {
    const row = await refresh(await owned(req.user.id, req.params.id));
    if (row.cancellation_state) throw error('The previous cancellation is still being checked. Contact Ventus before trying again.', 409);
    if (!canCancel(row.snapshot)) throw error('Online cancellation is not available for this reservation. Please contact Ventus; the hotel cancellation policy applies.', 409);
    const reviewId = crypto.randomUUID();
    await pool.query('DELETE FROM reservation_cancellation_reviews WHERE expires_at < NOW()');
    await pool.query('INSERT INTO reservation_cancellation_reviews (id, supplier_id, user_id, fingerprint) VALUES ($1, $2, $3, $4)',
      [reviewId, req.params.id, req.user.id, fingerprint(row.snapshot)]);
    res.json({ success: true, reviewId, booking: display(row) });
  }));
  app.post('/api/reservations/:id/cancel', authenticate, route(async (req, res) => {
    if (req.body.acknowledged !== true || typeof req.body.reviewId !== 'string' || !/^[a-f0-9-]{36}$/.test(req.body.reviewId)) {
      throw error('Please review and accept the cancellation terms first.');
    }
    const client = await pool.connect();
    let booking;
    try {
      await client.query('BEGIN');
      const row = await owned(req.user.id, req.params.id, client, true);
      if (cancelled(row.snapshot)) { await client.query('COMMIT'); return res.json({ success: true, booking: display(row) }); }
      if (row.cancellation_state) throw error('Cancellation is already being checked. Contact Ventus before trying again.', 409);
      const review = (await client.query(`SELECT * FROM reservation_cancellation_reviews WHERE id = $1 AND supplier_id = $2
        AND user_id = $3 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`, [req.body.reviewId, req.params.id, req.user.id])).rows[0];
      if (!review) throw error('The cancellation review has expired. Review the current terms again.', 409);
      booking = await readSupplier(req.params.id);
      if (!canCancel(booking) || fingerprint(booking) !== review.fingerprint) throw error('The reservation or cancellation terms have changed. Review the current terms again.', 409);
      await client.query('UPDATE reservation_cancellation_reviews SET used_at = NOW() WHERE id = $1', [review.id]);
      await client.query("UPDATE reservations SET cancellation_state = 'submitting' WHERE supplier_id = $1", [booking.id]);
      await client.query('COMMIT');
    } catch (failure) {
      await client.query('ROLLBACK').catch(() => {}); throw failure;
    } finally { client.release(); }
    try {
      await supplier('DELETE', `/${booking.id}`);
    } catch (failure) {
      await pool.query('UPDATE reservations SET cancellation_state = $2 WHERE supplier_id = $1', [booking.id, failure.definitive ? null : 'uncertain']);
      throw error(failure.definitive ? 'The supplier did not accept cancellation. Refresh the booking or contact Ventus.' :
        'Cancellation could not be confirmed. It may still be processing. Please contact Ventus before trying again.', 503);
    }
    // LE documents HTTP 200 as successful cancellation, with no required response body.
    const row = await saveSnapshot({ ...booking, state: 'cancelled', is_cancellable: false });
    res.json({ success: true, booking: display(row) });
  }));

  app.post('/api/le/webhook', route(async (req, res) => {
    const secret = process.env.LE_WEBHOOK_ACCESS_KEY || '';
    const supplied = req.get('x-ventus-webhook-key') || '';
    if (secret.length < 32) throw error('Booking webhook is not configured.', 503);
    const hash = (value) => crypto.createHash('sha256').update(value).digest();
    if (!crypto.timingSafeEqual(hash(secret), hash(supplied))) throw error('Invalid webhook access key.', 401);
    if (!['hotel_booking_create', 'hotel_booking_update', 'hotel_booking_cancel'].includes(req.body.event)) return res.json({ success: true });
    const bookingId = id(req.body.data?.id);
    if (!bookingId) throw error('Invalid booking event.');
    const row = (await pool.query('SELECT * FROM reservations WHERE supplier_id = $1', [bookingId])).rows[0];
    // Webhook bodies never grant ownership or establish a booking's state.
    if (row) await refresh(row);
    res.json({ success: true });
  }));

  const sync = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const rows = (await pool.query(`SELECT * FROM reservations WHERE snapshot->>'state' NOT IN ('cancelled', 'canceled')
        AND (snapshot->>'check_out' >= CURRENT_DATE::text OR cancellation_state IS NOT NULL)
        AND synced_at < NOW() - INTERVAL '5 minutes' ORDER BY synced_at LIMIT 20`)).rows;
      for (const row of rows) { try { await refresh(row); } catch { /* Retry on the next pass. */ } }
    } catch { console.error('Reservation status sync will retry'); }
    finally { syncing = false; }
  };
  return { ensureSchema: () => ensureReservationSchema(pool), worker, sync,
    start: () => { worker.start(); syncTimer = setInterval(() => { void sync(); }, 60000); syncTimer.unref(); },
    stop: () => { worker.stop(); clearInterval(syncTimer); },
  };
}

module.exports = { registerReservationRoutes };
