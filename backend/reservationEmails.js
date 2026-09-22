const crypto = require('crypto');
const { sendReservationEmail } = require('./email');

async function queueReservationEmail(client, booking, recipient, kind) {
  await client.query(`INSERT INTO reservation_emails (id, supplier_id, kind, recipient, payload)
    VALUES ($1, $2, $3, $4, $5::jsonb) ON CONFLICT (supplier_id, kind, recipient) DO NOTHING`,
  [crypto.randomUUID(), booking.id, kind, recipient, JSON.stringify(booking)]);
}

function createReservationEmailWorker(pool, sendEmail = sendReservationEmail) {
  let running = false;
  let timer;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      for (let i = 0; i < 10; i += 1) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows } = await client.query(`SELECT * FROM reservation_emails WHERE sent_at IS NULL AND superseded_at IS NULL AND available_at <= NOW()
            ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1`);
          if (!rows.length) { await client.query('COMMIT'); break; }
          const job = rows[0];
          const current = (await client.query('SELECT snapshot FROM reservations WHERE supplier_id = $1', [job.supplier_id])).rows[0];
          if (job.kind === 'confirmed' && ['cancelled', 'canceled'].includes(current?.snapshot?.state)) {
            // Do not deliver an old confirmation after a long provider outage and a cancellation.
            await client.query('UPDATE reservation_emails SET superseded_at = NOW() WHERE id = $1', [job.id]);
            await client.query('COMMIT');
            continue;
          }
          try {
            await sendEmail({ recipient: job.recipient, kind: job.kind, booking: job.payload });
            await client.query('UPDATE reservation_emails SET sent_at = NOW(), attempts = attempts + 1 WHERE id = $1', [job.id]);
          } catch {
            // Retain the job across restarts and provider outages. Never log guest details.
            await client.query("UPDATE reservation_emails SET attempts = attempts + 1, available_at = NOW() + ($2 * INTERVAL '1 second') WHERE id = $1",
              [job.id, Math.min(3600, 60 * (2 ** Math.min(job.attempts, 6)))]);
            console.warn('Reservation email queued for retry:', job.id);
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK').catch(() => {});
          throw error;
        } finally { client.release(); }
      }
    } catch {
      console.error('Reservation email worker will retry after a database error');
    } finally { running = false; }
  };
  return { drain, start: () => { void drain(); timer = setInterval(() => { void drain(); }, 15000); timer.unref(); }, stop: () => clearInterval(timer) };
}

module.exports = { queueReservationEmail, createReservationEmailWorker };
