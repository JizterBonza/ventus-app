const { sendMembershipReminder } = require('./email');
const DAY = 86400000;
function monthBefore(value) {
  const date = new Date(value), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth()-1);
  const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last)); return date;
}
function reminderSchedule(sub) {
  if (sub.cancel_at_period_end || sub.status !== 'active' || !['trialing','active'].includes(sub.stripe_status)) return [];
  const target = new Date(sub.stripe_status === 'trialing' ? sub.trial_ends_at : sub.expires_at);
  if (!Number.isFinite(+target)) return [];
  const steps = sub.stripe_status === 'trialing'
    ? [['trial-3-days',new Date(+target-3*DAY),new Date(+target-DAY)],['trial-1-day',new Date(+target-DAY),target]]
    : [['renewal-1-month',monthBefore(target),new Date(+target-7*DAY)],['renewal-1-week',new Date(+target-7*DAY),new Date(+target-DAY)],['renewal-1-day',new Date(+target-DAY),target]];
  return steps.map(([kind,due,expires])=>({kind,due,expires,target}));
}
async function ensureReminderSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS membership_reminder_emails (
    id BIGSERIAL PRIMARY KEY, subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, billing_at TIMESTAMPTZ NOT NULL, available_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, superseded_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0, UNIQUE(subscription_id,kind,billing_at)
  )`);
}
function createMembershipReminderWorker(pool,sync,send=sendMembershipReminder) {
  let running=false,timer;
  const drain = async() => {
    if(running) return; running=true;
    try {
      const subscriptions=(await pool.query("SELECT * FROM subscriptions WHERE payment_provider='stripe_subscription' AND status='active' AND NOT cancel_at_period_end AND expires_at>NOW()")).rows;
      for(const sub of subscriptions) for(const job of reminderSchedule(sub)) {
        await pool.query(`INSERT INTO membership_reminder_emails(subscription_id,kind,billing_at,available_at,expires_at)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[sub.id,job.kind,job.target,job.due,job.expires]);
      }
      for(let i=0;i<50;i++) {
        // Refresh outside the email-row transaction to keep account lock order consistent.
        const due=(await pool.query(`SELECT DISTINCT s.stripe_subscription_id FROM membership_reminder_emails e JOIN subscriptions s ON s.id=e.subscription_id
          WHERE e.sent_at IS NULL AND e.superseded_at IS NULL AND e.available_at<=NOW() LIMIT 1`)).rows[0];
        if(!due) break;
        try {
          await sync(due.stripe_subscription_id);
        } catch {
          // One unavailable subscription must not hold up other members' notices.
          await pool.query(`UPDATE membership_reminder_emails e
            SET attempts=attempts+1,available_at=NOW()+(LEAST(3600,60*POWER(2,LEAST(attempts,6))) * INTERVAL '1 second')
            FROM subscriptions s WHERE s.id=e.subscription_id AND s.stripe_subscription_id=$1
            AND e.sent_at IS NULL AND e.superseded_at IS NULL AND e.available_at<=NOW()`,[due.stripe_subscription_id]);
          continue;
        }
        const client=await pool.connect();
        try {
          await client.query('BEGIN');
          const job=(await client.query(`SELECT e.*,s.stripe_status,s.cancel_at_period_end,s.status,s.trial_ends_at,s.expires_at AS membership_expires,
            s.renewal_amount_minor,u.email,u.first_name
            FROM membership_reminder_emails e JOIN subscriptions s ON s.id=e.subscription_id JOIN users u ON u.id=s.user_id
            WHERE s.stripe_subscription_id=$1 AND e.sent_at IS NULL AND e.superseded_at IS NULL AND e.available_at<=NOW()
            ORDER BY e.available_at FOR UPDATE OF e SKIP LOCKED LIMIT 1`,[due.stripe_subscription_id])).rows[0];
          if(!job){await client.query('COMMIT');continue;}
          const target=job.stripe_status==='trialing'?job.trial_ends_at:job.membership_expires;
          const expected=job.kind.startsWith('trial-')?'trialing':'active';
          if(job.expires_at<=new Date() || job.status!=='active' || job.cancel_at_period_end || job.stripe_status!==expected || +target!==+job.billing_at) {
            await client.query('UPDATE membership_reminder_emails SET superseded_at=NOW() WHERE id=$1',[job.id]);
          } else {
            try {
              await send({to:job.email,firstName:job.first_name,kind:job.kind,billingAt:job.billing_at,amount:job.renewal_amount_minor/100});
              await client.query('UPDATE membership_reminder_emails SET sent_at=NOW(),attempts=attempts+1 WHERE id=$1',[job.id]);
            } catch {
              await client.query("UPDATE membership_reminder_emails SET attempts=attempts+1,available_at=NOW()+($2 * INTERVAL '1 second') WHERE id=$1",[job.id,Math.min(3600,60*2**Math.min(job.attempts,6))]);
            }
          }
          await client.query('COMMIT');
        } catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;} finally {client.release();}
      }
    } catch {console.error('Membership reminder worker will retry after a provider or database error');} finally {running=false;}
  };
  return {drain,start:()=>{void drain();timer=setInterval(()=>void drain(),60000);timer.unref();},stop:()=>clearInterval(timer)};
}
module.exports={ensureReminderSchema,createMembershipReminderWorker,reminderSchedule,monthBefore};
