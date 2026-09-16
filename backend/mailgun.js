const isMailgunConfigured = () => Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);

// Use the sending key scoped to the dedicated Ventus domain in Vinadamo.
// Credentials must never be included in the React application's environment.
const sendMailgunEmail = async ({ from, to, reply_to: replyTo, subject, text, html }) => {
  if (!isMailgunConfigured() || !from) {
    throw new Error('Mailgun email delivery is not configured');
  }

  const region = (process.env.MAILGUN_REGION || 'US').toUpperCase();
  const domain = process.env.MAILGUN_DOMAIN.trim();
  if (!['US', 'EU'].includes(region)) {
    throw new Error('MAILGUN_REGION must be US or EU');
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) {
    throw new Error('MAILGUN_DOMAIN must be a domain name');
  }

  const body = new FormData();
  body.set('from', from);
  for (const recipient of Array.isArray(to) ? to : [to]) body.append('to', recipient);
  body.set('subject', subject);
  body.set('text', text);
  if (html) body.set('html', html);
  if (replyTo) body.set('h:Reply-To', replyTo);
  // Do not rewrite password-reset links or add tracking to transactional emails.
  body.set('o:tracking', 'no');
  body.set('o:tracking-clicks', 'no');
  body.set('o:tracking-opens', 'no');

  const host = region === 'EU' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
  const response = await fetch(`https://${host}/v3/${domain}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
    headers: { Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}` },
    body
  });

  if (!response.ok) {
    // Provider response bodies may contain email addresses or message content.
    throw new Error(`Mailgun email delivery failed (HTTP ${response.status})`);
  }
};

module.exports = { isMailgunConfigured, sendMailgunEmail };
