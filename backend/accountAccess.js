const jwt = require('jsonwebtoken');
const emails = value => (value || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
const userManagerEmails = () => emails(process.env.USER_ADMIN_EMAILS ?? process.env.RESERVATION_MANAGER_EMAILS);
const staffEmails = () => [...new Set([...userManagerEmails(), ...emails(process.env.HOMEPAGE_EDITOR_EMAILS), ...emails(process.env.RESERVATION_MANAGER_EMAILS)])];

async function validateAccountSession(pool, claims) {
  const account = (await pool.query('SELECT id, email, email_verified_at, account_suspended_at, auth_version FROM users WHERE id = $1', [claims.id])).rows[0];
  if (!account || account.account_suspended_at || Number(claims.authVersion || 0) !== Number(account.auth_version || 0)) {
    throw Object.assign(new Error('This session is no longer available. Please sign in again or contact Ventus.'), { statusCode: 401 });
  }
  if (!account.email_verified_at) throw Object.assign(new Error('Please confirm your email before signing in.'), { statusCode: 403 });
  return { ...claims, id: account.id, email: account.email };
}

function createAccountAuthenticator(pool, secret) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ success: false, error: 'Access token required' });
    let claims;
    try { claims = jwt.verify(token, secret); }
    catch { return res.status(401).json({ success: false, error: 'Invalid or expired token' }); }
    try { req.user = await validateAccountSession(pool, claims); next(); }
    catch (error) { res.status(error.statusCode || 503).json({ success: false, error: error.statusCode ? error.message : 'Unable to verify account access. Please try again.' }); }
  };
}
module.exports = { userManagerEmails, staffEmails, validateAccountSession, createAccountAuthenticator };
