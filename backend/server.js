const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();
const { getPasswordResetEmailProvider, getAccountEmailProvider, sendPasswordResetEmail, sendVerificationEmail, sendBookingRequestNotification } = require('./email');
const { registerHomepageRoutes } = require('./homepageRoutes');
const { stripeIsConfigured, ensureStripeMembershipSchema, createStripeMembershipHandlers } = require('./stripeMembership');
const { registerReservationRoutes } = require('./reservationRoutes');
const { isPublicHotelProxyRequest } = require('./reservationSupplier');

const app = express();

// CORS configuration - Allow frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',  // Local development
      'https://ventus-app.onrender.com',  // Production frontend
      'https://ventus-app-staging.onrender.com',  // Staging frontend
      'https://ventus-travel-staging.onrender.com',  // Alternative staging frontend
      'https://destinations.ventustravel.co.uk',  // Public destinations frontend
    ];
    
    // Check if origin matches allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    }
    // Check if origin is a Render subdomain
    else if (/\.onrender\.com$/.test(origin)) {
      callback(null, true);
    }
    // In development, allow all origins
    else if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
    }
    else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Cache', 'Age']
};

// Middleware
app.use(cors(corsOptions));
// Stripe verifies the exact request bytes, before JSON parsing changes the body.
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// PostgreSQL connection pool
// Determine SSL configuration based on database host and environment
const getSSLConfig = () => {
  // If DATABASE_SSL is explicitly set, use it
  if (process.env.DATABASE_SSL !== undefined) {
    if (process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0') {
      return false;
    }
    if (process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1') {
      return { rejectUnauthorized: false };
    }
  }
  
  // Check if connecting to localhost (local database doesn't support SSL)
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    return false;
  }
  
  // Only enable SSL for known cloud providers that require it
  // For other databases, default to no SSL unless explicitly enabled
  const requiresSSL = dbUrl.includes('render.com') || 
                      dbUrl.includes('heroku.com') || 
                      dbUrl.includes('amazonaws.com') ||
                      dbUrl.includes('azure.com') ||
                      dbUrl.includes('digitalocean.com');
  
  if (requiresSSL && process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  
  // Default: no SSL (most databases don't require it)
  return false;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSSLConfig()
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('✓ Connected to PostgreSQL database');
    release();
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const MEMBERSHIP_PLAN_ID = 'travel-yearly';
const MEMBERSHIP_PRICE_GBP = 299;
const MEMBERSHIP_CURRENCY = 'GBP';
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live';
const PAYPAL_API_BASE = PAYPAL_ENVIRONMENT === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_REQUEST_LIMIT = 5;
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://destinations.ventustravel.co.uk').replace(/\/$/, '');
const passwordResetAttempts = new Map();
let passwordResetSchemaReady = false;
let emailVerificationSchemaReady = false;
let subscriptionSchemaReady = false;

const assertProductionConfiguration = () => {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
  if (!process.env.HOTEL_API_TOKEN) {
    throw new Error('HOTEL_API_TOKEN must be configured in production');
  }
};

const ensureSubscriptionSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS paypal_orders (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      paypal_order_id VARCHAR(64) UNIQUE NOT NULL,
      plan_id VARCHAR(64) NOT NULL,
      expected_amount NUMERIC(12, 2) NOT NULL,
      currency CHAR(3) NOT NULL,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      coupon_hash CHAR(64),
      status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
      paypal_capture_id VARCHAR(64) UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL,
      amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
      currency CHAR(3) NOT NULL DEFAULT 'GBP',
      payment_provider VARCHAR(32) NOT NULL,
      paypal_order_id VARCHAR(64) UNIQUE,
      paypal_capture_id VARCHAR(64) UNIQUE,
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry ON subscriptions(expires_at)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_requests (
      id BIGSERIAL PRIMARY KEY,
      request_reference VARCHAR(40) UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hotel_id INTEGER NOT NULL,
      hotel_name VARCHAR(255) NOT NULL,
      session_id VARCHAR(255) NOT NULL,
      rate_index VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      guest_name VARCHAR(200) NOT NULL,
      guest_email VARCHAR(255) NOT NULL,
      guest_phone VARCHAR(80) NOT NULL,
      room_type VARCHAR(255),
      rooms JSONB NOT NULL,
      quoted_amount NUMERIC(12, 2),
      quoted_currency CHAR(3),
      special_requests TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT booking_request_dates_valid CHECK (end_date > start_date)
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_booking_requests_user_created ON booking_requests(user_id, created_at DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_booking_requests_status_created ON booking_requests(status, created_at DESC)');

  // The previous live portal treated every existing account as a member. Apply this
  // migration once so the security upgrade does not lock those members out. Accounts
  // created after this migration must complete checkout before receiving member access.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const migration = await client.query(
      `INSERT INTO app_migrations (name) VALUES ('grandfather-existing-members-v1')
       ON CONFLICT (name) DO NOTHING RETURNING name`
    );
    if (migration.rows.length > 0) {
      await client.query(`
        INSERT INTO subscriptions (
          user_id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at
        )
        SELECT id, $1, 'active', 0, $2, 'legacy', NOW(), NULL
        FROM users
        WHERE NOT EXISTS (
          SELECT 1 FROM subscriptions WHERE subscriptions.user_id = users.id
        )
      `, [MEMBERSHIP_PLAN_ID, MEMBERSHIP_CURRENCY]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  subscriptionSchemaReady = true;
};

const getActiveSubscription = async (userId, client = pool) => {
  if (!subscriptionSchemaReady) return null;
  const result = await client.query(
    `SELECT id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at
     FROM subscriptions
     WHERE user_id = $1
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY starts_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

const serializeSubscription = (subscription) => subscription ? {
  id: subscription.id.toString(),
  planId: subscription.plan_id,
  status: subscription.status,
  amountPaid: Number(subscription.amount_paid),
  currency: subscription.currency,
  paymentProvider: subscription.payment_provider,
  startsAt: subscription.starts_at?.toISOString?.() || subscription.starts_at,
  expiresAt: subscription.expires_at?.toISOString?.() || subscription.expires_at || null
} : null;

const serializeUser = async (user) => {
  const subscription = await getActiveSubscription(user.id);
  return {
    id: user.id.toString(),
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    cityOfResidence: user.city_of_residence,
    avatar: user.avatar,
    createdAt: user.created_at.toISOString(),
    membershipActive: Boolean(subscription),
    membership: serializeSubscription(subscription)
  };
};

const ensurePasswordResetSchema = async () => {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city_of_residence VARCHAR(160)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMPTZ');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)'
  );
  passwordResetSchemaReady = true;
};

const ensureEmailVerificationSchema = async () => {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)');
  // Existing account holders retain access. Only accounts created after this
  // one-time migration require an email verification link.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const migration = await client.query(`
      INSERT INTO app_migrations (name) VALUES ('grandfather-existing-email-verification-v1')
      ON CONFLICT (name) DO NOTHING RETURNING name
    `);
    if (migration.rows.length) {
      await client.query('UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  emailVerificationSchemaReady = true;
};

const sendNewVerificationLink = async (user) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const verifyUrl = new URL('/verify-email', PUBLIC_APP_URL);
  verifyUrl.hash = new URLSearchParams({ token }).toString();
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS)]
  );
  try {
    await sendVerificationEmail({ to: user.email, firstName: user.first_name, verifyUrl: verifyUrl.toString() });
  } catch (error) {
    await pool.query('DELETE FROM email_verification_tokens WHERE token_hash = $1', [tokenHash]);
    throw error;
  }
  try {
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND token_hash <> $2 AND used_at IS NULL',
      [user.id, tokenHash]
    );
  } catch (error) {
    console.error('Could not retire previous verification links:', error.message);
  }
};

const passwordResetRequestIsLimited = (req, email) => {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || 'unknown';
  const emailKey = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
  const key = `${address}:${emailKey}`;
  const recentAttempts = (passwordResetAttempts.get(key) || []).filter(
    (timestamp) => now - timestamp < PASSWORD_RESET_REQUEST_WINDOW_MS
  );

  if (recentAttempts.length >= PASSWORD_RESET_REQUEST_LIMIT) {
    passwordResetAttempts.set(key, recentAttempts);
    return true;
  }

  recentAttempts.push(now);
  passwordResetAttempts.set(key, recentAttempts);

  if (passwordResetAttempts.size > 2000) {
    for (const [attemptKey, timestamps] of passwordResetAttempts) {
      if (!timestamps.some((timestamp) => now - timestamp < PASSWORD_RESET_REQUEST_WINDOW_MS)) {
        passwordResetAttempts.delete(attemptKey);
      }
    }
  }

  return false;
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const { ensureHomepageSchema } = registerHomepageRoutes(app, pool, authenticateToken);
const reservationService = registerReservationRoutes(app, pool, authenticateToken, { getActiveSubscription });

// ============= AUTH ROUTES =============

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW()');
    const dbConnected = !!dbTest.rows[0];
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

// Signup - Create new user
app.post('/api/auth/signup', async (req, res) => {
  try {
    if (!emailVerificationSchemaReady || !getAccountEmailProvider()) {
      return res.status(503).json({ success: false, error: 'Account email verification is temporarily unavailable. Please try again shortly.' });
    }
    const { email, password, firstName, lastName, phone, cityOfResidence, agreeToTerms } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validation
    if (!normalizedEmail || !password || !firstName || !lastName || !cityOfResidence || agreeToTerms !== true) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, name, city of residence and acceptance of the terms are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (
         email, password_hash, first_name, last_name, phone, city_of_residence,
         terms_agreed_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
       RETURNING id, email, first_name, last_name, phone, city_of_residence, created_at`,
      [normalizedEmail, passwordHash, firstName.trim(), lastName.trim(), phone || null, cityOfResidence.trim().slice(0, 160)]
    );

    const user = result.rows[0];

    let verificationEmailSent = true;
    try {
      await sendNewVerificationLink(user);
    } catch (emailError) {
      verificationEmailSent = false;
      console.error('Signup verification email error:', emailError.message);
    }

    res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      verificationEmailSent,
      message: verificationEmailSent
        ? 'Account created. Check your inbox to confirm your email before logging in.'
        : 'Account created, but we could not send the verification email. Please request a new link.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

// Login - Authenticate user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validation
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (emailVerificationSchemaReady && !user.email_verified_at) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        error: 'Please confirm your email address before logging in.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const serializedUser = await serializeUser(user);

    // Return user data (without password)
    res.json({
      success: true,
      message: 'Login successful',
      user: serializedUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const genericMessage = 'If this address has an unverified account, we will send a new confirmation link.';
  try {
    res.set('Cache-Control', 'no-store');
    if (!emailVerificationSchemaReady || !getAccountEmailProvider()) {
      return res.status(503).json({ success: false, error: 'Email verification is temporarily unavailable.' });
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }
    if (passwordResetRequestIsLimited(req, email)) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait 15 minutes and try again.' });
    }
    const result = await pool.query('SELECT id, email, first_name FROM users WHERE email = $1 AND email_verified_at IS NULL', [email]);
    if (result.rows.length) {
      const recent = await pool.query(
        "SELECT id FROM email_verification_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1",
        [result.rows[0].id]
      );
      if (!recent.rows.length) {
        try {
          await sendNewVerificationLink(result.rows[0]);
        } catch (emailError) {
          console.error('Resend verification email error:', emailError.message);
          return res.status(502).json({ success: false, error: 'We could not send the email. Please try again shortly.' });
        }
      }
    }
    res.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, error: 'Unable to process the request.' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  let client;
  try {
    res.set('Cache-Control', 'no-store');
    if (!emailVerificationSchemaReady) {
      return res.status(503).json({ success: false, error: 'Email verification is temporarily unavailable.' });
    }
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    if (!token || token.length > 200) {
      return res.status(400).json({ success: false, error: 'Confirmation link is missing or invalid.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT id, user_id FROM email_verification_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE',
      [tokenHash]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This confirmation link is invalid or has expired.' });
    }
    await client.query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1', [result.rows[0].user_id]);
    await client.query('UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [result.rows[0].user_id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Email confirmed. You can now log in and continue your membership.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, error: 'Unable to confirm your email.' });
  } finally {
    if (client) client.release();
  }
});

// Request a one-time password reset link. The response does not reveal whether
// an account exists for the supplied email address.
app.post('/api/auth/forgot-password', async (req, res) => {
  const genericMessage = 'If this address is linked to a Ventus account, a secure reset link is on its way.';

  try {
    res.set('Cache-Control', 'no-store');
    if (!passwordResetSchemaReady) {
      return res.status(503).json({ success: false, error: 'Password reset is temporarily unavailable.' });
    }

    if (!getPasswordResetEmailProvider()) {
      return res.status(503).json({
        success: false,
        error: 'Password reset email delivery is not configured yet.'
      });
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }

    if (passwordResetRequestIsLimited(req, email)) {
      return res.status(429).json({
        success: false,
        error: 'Too many reset requests. Please wait 15 minutes and try again.'
      });
    }

    const result = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, message: genericMessage });
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW()', [user.id]);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = new URL('/reset-password', PUBLIC_APP_URL);
    const requestedNext = typeof req.body.next === 'string' ? req.body.next.trim() : '';
    if (requestedNext.startsWith('/') && !requestedNext.startsWith('//') && requestedNext.length <= 512) {
      resetUrl.searchParams.set('next', requestedNext);
    }
    resetUrl.hash = new URLSearchParams({ token: rawToken }).toString();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetUrl: resetUrl.toString()
      });
    } catch (emailError) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Password reset email error:', emailError.message);
      return res.status(502).json({
        success: false,
        error: 'We could not send the reset email. Please try again shortly.'
      });
    }

    res.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Unable to process the reset request.' });
  }
});

app.post('/api/auth/reset-password/validate', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    if (!passwordResetSchemaReady) {
      return res.status(503).json({ success: false, error: 'Password reset is temporarily unavailable.' });
    }

    const token = typeof req.body.token === 'string' ? req.body.token : '';
    if (!token || token.length > 200) {
      return res.status(400).json({ success: false, error: 'Reset link is missing or invalid.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ success: false, error: 'Unable to validate the reset link.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  let client;

  try {
    res.set('Cache-Control', 'no-store');
    if (!passwordResetSchemaReady) {
      return res.status(503).json({ success: false, error: 'Password reset is temporarily unavailable.' });
    }

    const token = typeof req.body.token === 'string' ? req.body.token : '';
    const newPassword = typeof req.body.password === 'string' ? req.body.password : '';
    if (!token || token.length > 200) {
      return res.status(400).json({ success: false, error: 'Reset link is missing or invalid.' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be between 8 and 128 characters.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    client = await pool.connect();
    await client.query('BEGIN');

    const tokenResult = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired.' });
    }

    const resetToken = tokenResult.rows[0];
    await client.query(
      'UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [resetToken.user_id]
    );
    await client.query('COMMIT');

    res.json({ success: true, message: 'Your new password is ready. You can now log in to Ventus.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Unable to reset the password.' });
  } finally {
    if (client) client.release();
  }
});

// Verify token - Check if user is authenticated
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, city_of_residence, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const serializedUser = await serializeUser(user);

    res.json({
      success: true,
      user: serializedUser
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

// Get current user
app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, city_of_residence, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const serializedUser = await serializeUser(user);

    res.json({
      success: true,
      user: serializedUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// Logout (client-side only, token invalidation would require a blacklist)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // In a production app, you might want to blacklist the token
  // For now, logout is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ============= SUBSCRIPTION ROUTES =============

const getConfiguredCoupons = () => {
  if (!process.env.MEMBERSHIP_COUPONS_JSON) return {};
  try {
    const parsed = JSON.parse(process.env.MEMBERSHIP_COUPONS_JSON);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    console.error('MEMBERSHIP_COUPONS_JSON is invalid JSON');
    return {};
  }
};

const getMembershipQuote = (planId, couponCode) => {
  if (planId !== MEMBERSHIP_PLAN_ID) {
    const error = new Error('Invalid membership plan');
    error.statusCode = 400;
    throw error;
  }

  const normalizedCoupon = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
  const configuredCoupon = normalizedCoupon ? getConfiguredCoupons()[normalizedCoupon] : null;
  const rawDiscount = typeof configuredCoupon === 'number'
    ? configuredCoupon
    : configuredCoupon?.discountPercent;
  const discountPercent = Number.isFinite(Number(rawDiscount))
    ? Math.min(100, Math.max(0, Number(rawDiscount)))
    : 0;
  const couponValid = !normalizedCoupon || Boolean(configuredCoupon);
  const finalPrice = Number((MEMBERSHIP_PRICE_GBP * (1 - discountPercent / 100)).toFixed(2));

  return {
    planId: MEMBERSHIP_PLAN_ID,
    basePrice: MEMBERSHIP_PRICE_GBP,
    finalPrice,
    currency: MEMBERSHIP_CURRENCY,
    couponValid,
    discountPercent,
    couponDescription: couponValid && normalizedCoupon
      ? (configuredCoupon?.description || `${discountPercent}% membership discount`)
      : '',
    couponHash: couponValid && normalizedCoupon
      ? crypto.createHash('sha256').update(normalizedCoupon).digest('hex')
      : null
  };
};

const paypalIsConfigured = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
let paypalAccessTokenCache = null;

const getPayPalAccessToken = async () => {
  if (!paypalIsConfigured()) {
    const error = new Error('Secure membership checkout is temporarily unavailable');
    error.statusCode = 503;
    throw error;
  }

  if (paypalAccessTokenCache && paypalAccessTokenCache.expiresAt > Date.now() + 30000) {
    return paypalAccessTokenCache.token;
  }

  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error('PayPal access token request failed:', response.status, data.error || data.name || 'unknown error');
    const error = new Error('Secure membership checkout is temporarily unavailable');
    error.statusCode = 502;
    throw error;
  }

  paypalAccessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 300) * 1000
  };
  return data.access_token;
};

const paypalRequest = async (path, options = {}) => {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}${path}`, {
    method: options.method || 'GET',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'PayPal-Request-Id': options.requestId || crypto.randomUUID()
    },
    ...(options.body && { body: JSON.stringify(options.body) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('PayPal API request failed:', path, response.status, data.name || data.error || 'unknown error');
    const error = new Error('PayPal could not complete the membership payment');
    error.statusCode = 502;
    error.paypalStatus = response.status;
    throw error;
  }
  return data;
};

const persistCompletedMembershipPayment = async ({ orderId, captureId, amount, currency }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM paypal_orders WHERE paypal_order_id = $1 FOR UPDATE`,
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      throw Object.assign(new Error('Unknown PayPal order'), { statusCode: 400 });
    }

    const order = orderResult.rows[0];
    if (Number(order.expected_amount).toFixed(2) !== Number(amount).toFixed(2) || order.currency.trim() !== currency) {
      throw Object.assign(new Error('PayPal payment amount did not match the membership order'), { statusCode: 400 });
    }

    const existing = await client.query(
      'SELECT * FROM subscriptions WHERE paypal_order_id = $1 LIMIT 1',
      [orderId]
    );
    let subscription = existing.rows[0];
    if (!subscription) {
      const inserted = await client.query(
        `INSERT INTO subscriptions (
          user_id, plan_id, status, amount_paid, currency, payment_provider,
          paypal_order_id, paypal_capture_id, starts_at, expires_at
        ) VALUES ($1, $2, 'active', $3, $4, 'paypal', $5, $6, NOW(), NOW() + INTERVAL '1 year')
        RETURNING *`,
        [order.user_id, order.plan_id, amount, currency, orderId, captureId]
      );
      subscription = inserted.rows[0];
    }

    await client.query(
      `UPDATE paypal_orders
       SET status = 'COMPLETED', paypal_capture_id = $2, updated_at = NOW()
       WHERE paypal_order_id = $1`,
      [orderId, captureId]
    );
    await client.query('COMMIT');
    return { subscription, userId: order.user_id };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const activateComplimentaryMembership = async (userId, quote) => {
  if (!quote.couponValid || !quote.couponHash || quote.finalPrice !== 0) {
    throw Object.assign(new Error('A valid complimentary membership code is required'), { statusCode: 400 });
  }
  const result = await pool.query(
    `INSERT INTO subscriptions (
      user_id, plan_id, status, amount_paid, currency, payment_provider, starts_at, expires_at
    ) VALUES ($1, $2, 'active', 0, $3, 'coupon', NOW(), NOW() + INTERVAL '1 year')
    RETURNING *`,
    [userId, quote.planId, quote.currency]
  );
  return result.rows[0];
};

app.get('/api/subscriptions/config', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    plan: {
      id: MEMBERSHIP_PLAN_ID,
      name: 'Travel',
      price: MEMBERSHIP_PRICE_GBP,
      currency: MEMBERSHIP_CURRENCY,
      interval: 'yearly'
    },
    stripe: { configured: stripeIsConfigured() },
    paypal: {
      configured: paypalIsConfigured(),
      clientId: process.env.PAYPAL_CLIENT_ID || null,
      environment: PAYPAL_ENVIRONMENT
    }
  });
});

const stripeMembership = createStripeMembershipHandlers({ pool, getMembershipQuote, getActiveSubscription, publicAppUrl: PUBLIC_APP_URL });
app.post('/api/subscriptions/stripe/checkout', authenticateToken, stripeMembership.checkout);
app.post('/api/subscriptions/stripe/confirm', authenticateToken, stripeMembership.confirm);
app.post('/api/stripe/webhook', stripeMembership.webhook);

app.post('/api/subscriptions/quote', (req, res) => {
  try {
    const quote = getMembershipQuote(req.body.planId || MEMBERSHIP_PLAN_ID, req.body.couponCode);
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      quote: {
        planId: quote.planId,
        basePrice: quote.basePrice,
        finalPrice: quote.finalPrice,
        currency: quote.currency,
        couponValid: quote.couponValid,
        discountPercent: quote.discountPercent,
        couponDescription: quote.couponDescription
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

app.post('/api/subscriptions/paypal/order', authenticateToken, async (req, res) => {
  try {
    const existingSubscription = await getActiveSubscription(req.user.id);
    if (existingSubscription) {
      return res.status(409).json({ success: false, error: 'This account already has an active membership' });
    }

    const quote = getMembershipQuote(req.body.planId || MEMBERSHIP_PLAN_ID, req.body.couponCode);
    if (!quote.couponValid) {
      return res.status(400).json({ success: false, error: 'Invalid membership code' });
    }
    if (quote.finalPrice <= 0) {
      return res.status(400).json({ success: false, error: 'No PayPal payment is required for this membership' });
    }

    const requestId = crypto.randomUUID();
    const order = await paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      requestId,
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: 'VENTUS_TRAVEL_MEMBERSHIP',
          custom_id: String(req.user.id),
          description: 'Ventus Travel annual membership',
          amount: {
            currency_code: quote.currency,
            value: quote.finalPrice.toFixed(2)
          }
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Ventus Travel',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: `${PUBLIC_APP_URL}/subscription`,
              cancel_url: `${PUBLIC_APP_URL}/subscription`
            }
          }
        }
      }
    });

    if (!order.id) throw Object.assign(new Error('PayPal did not create an order'), { statusCode: 502 });
    await pool.query(
      `INSERT INTO paypal_orders (
        user_id, paypal_order_id, plan_id, expected_amount, currency,
        discount_percent, coupon_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CREATED')
      ON CONFLICT (paypal_order_id) DO NOTHING`,
      [req.user.id, order.id, quote.planId, quote.finalPrice, quote.currency, quote.discountPercent, quote.couponHash]
    );

    res.status(201).json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Create PayPal membership order error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Unable to create membership order' });
  }
});

app.post('/api/subscriptions/paypal/capture', authenticateToken, async (req, res) => {
  try {
    const orderId = typeof req.body.orderId === 'string' ? req.body.orderId.trim() : '';
    if (!orderId) return res.status(400).json({ success: false, error: 'PayPal order ID is required' });

    const storedOrderResult = await pool.query(
      'SELECT * FROM paypal_orders WHERE paypal_order_id = $1 AND user_id = $2',
      [orderId, req.user.id]
    );
    if (storedOrderResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'This PayPal order does not belong to the current account' });
    }

    const existingSubscription = await pool.query(
      'SELECT * FROM subscriptions WHERE paypal_order_id = $1 LIMIT 1',
      [orderId]
    );
    if (existingSubscription.rows.length > 0) {
      return res.json({
        success: true,
        subscription: serializeSubscription(existingSubscription.rows[0]),
        message: 'Your membership is active.'
      });
    }

    const capturedOrder = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      requestId: `capture-${orderId}`
    });
    const purchaseUnit = capturedOrder.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.find((item) => item.status === 'COMPLETED');
    if (capturedOrder.status !== 'COMPLETED' || !capture?.id || !capture.amount) {
      throw Object.assign(new Error('PayPal payment was not completed'), { statusCode: 400 });
    }
    if (String(purchaseUnit.custom_id) !== String(req.user.id)) {
      throw Object.assign(new Error('PayPal payment account did not match'), { statusCode: 400 });
    }

    const persisted = await persistCompletedMembershipPayment({
      orderId,
      captureId: capture.id,
      amount: capture.amount.value,
      currency: capture.amount.currency_code
    });
    res.json({
      success: true,
      subscription: serializeSubscription(persisted.subscription),
      message: 'Welcome to Ventus Travel. Your membership is now active.'
    });
  } catch (error) {
    console.error('Capture PayPal membership order error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Unable to activate membership' });
  }
});

app.post('/api/subscriptions/complimentary', authenticateToken, async (req, res) => {
  try {
    const existingSubscription = await getActiveSubscription(req.user.id);
    if (existingSubscription) {
      return res.json({ success: true, subscription: serializeSubscription(existingSubscription), message: 'Your membership is active.' });
    }
    const quote = getMembershipQuote(req.body.planId || MEMBERSHIP_PLAN_ID, req.body.couponCode);
    const subscription = await activateComplimentaryMembership(req.user.id, quote);
    res.status(201).json({
      success: true,
      subscription: serializeSubscription(subscription),
      message: 'Welcome to Ventus Travel. Your membership is now active.'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Unable to activate membership' });
  }
});

// Keep the original endpoint as a safe compatibility layer for old clients.
app.post('/api/subscriptions/subscribe', authenticateToken, async (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Please refresh the page and complete the secure membership checkout.'
  });
});

app.get('/api/subscriptions/status', authenticateToken, async (req, res) => {
  try {
    const subscription = await getActiveSubscription(req.user.id);
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      hasActiveSubscription: Boolean(subscription),
      subscription: serializeSubscription(subscription)
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get subscription status' });
  }
});

app.post('/api/booking-requests', authenticateToken, async (req, res) => {
  try {
    const subscription = await getActiveSubscription(req.user.id);
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'An active Ventus Travel membership is required to request a booking.'
      });
    }

    const hotelId = Number(req.body.hotelId);
    const hotelName = typeof req.body.hotelName === 'string' ? req.body.hotelName.trim().slice(0, 255) : '';
    const sessionId = typeof req.body.sessionId === 'string' ? req.body.sessionId.trim().slice(0, 255) : '';
    const rateIndex = typeof req.body.rateIndex === 'string' ? req.body.rateIndex.trim().slice(0, 255) : '';
    const startDate = typeof req.body.startDate === 'string' ? req.body.startDate.trim() : '';
    const endDate = typeof req.body.endDate === 'string' ? req.body.endDate.trim() : '';
    const guestName = typeof req.body.guestName === 'string' ? req.body.guestName.trim().slice(0, 200) : '';
    const guestEmail = typeof req.body.guestEmail === 'string' ? req.body.guestEmail.trim().toLowerCase().slice(0, 255) : '';
    const guestPhone = typeof req.body.guestPhone === 'string' ? req.body.guestPhone.trim().slice(0, 80) : '';
    const roomType = typeof req.body.roomType === 'string' ? req.body.roomType.trim().slice(0, 255) : '';
    const specialRequests = typeof req.body.specialRequests === 'string' ? req.body.specialRequests.trim().slice(0, 4000) : '';
    const rooms = Array.isArray(req.body.rooms) ? req.body.rooms.slice(0, 10) : [];
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!Number.isInteger(hotelId) || hotelId <= 0 || !hotelName || !sessionId || !rateIndex) {
      return res.status(400).json({ success: false, error: 'A valid hotel and selected rate are required.' });
    }
    if (!datePattern.test(startDate) || !datePattern.test(endDate) || endDate <= startDate) {
      return res.status(400).json({ success: false, error: 'Check-out must be at least one day after check-in.' });
    }
    if (!guestName || !emailPattern.test(guestEmail) || !guestPhone) {
      return res.status(400).json({ success: false, error: 'A valid guest name, email and phone number are required.' });
    }
    if (rooms.length === 0 || rooms.some((room) => {
      const adults = Number(room?.adults);
      const children = Array.isArray(room?.children) ? room.children : [];
      return !Number.isInteger(adults) || adults < 1 || adults > 20 || children.length > 10 ||
        children.some((child) => !Number.isInteger(Number(child?.age)) || Number(child.age) < 0 || Number(child.age) > 17);
    })) {
      return res.status(400).json({ success: false, error: 'The room and guest configuration is invalid.' });
    }

    const normalizedRooms = rooms.map((room) => ({
      adults: Number(room.adults),
      children: (Array.isArray(room.children) ? room.children : []).map((child) => ({ age: Number(child.age) }))
    }));
    const quotedAmountValue = Number(req.body.quotedAmount);
    const quotedAmount = Number.isFinite(quotedAmountValue) && quotedAmountValue >= 0
      ? Number(quotedAmountValue.toFixed(2))
      : null;
    const quotedCurrency = typeof req.body.quotedCurrency === 'string' && /^[A-Za-z]{3}$/.test(req.body.quotedCurrency.trim())
      ? req.body.quotedCurrency.trim().toUpperCase()
      : null;
    const reference = `VT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await pool.query(
      `INSERT INTO booking_requests (
        request_reference, user_id, hotel_id, hotel_name, session_id, rate_index,
        start_date, end_date, guest_name, guest_email, guest_phone, room_type,
        rooms, quoted_amount, quoted_currency, special_requests
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16)`,
      [
        reference, req.user.id, hotelId, hotelName, sessionId, rateIndex,
        startDate, endDate, guestName, guestEmail, guestPhone, roomType || null,
        JSON.stringify(normalizedRooms), quotedAmount, quotedCurrency, specialRequests || null
      ]
    );

    const notification = {
      reference, hotelId, hotelName, startDate, endDate, guestName, guestEmail,
      guestPhone, roomType, rooms: normalizedRooms, quotedAmount, quotedCurrency,
      specialRequests
    };
    void sendBookingRequestNotification(notification).then((sent) => {
      if (!sent) console.warn(`Booking request ${reference} saved without email notification: provider not configured`);
    }).catch((error) => {
      console.error(`Booking request ${reference} email notification failed:`, error.message);
    });

    res.status(201).json({
      success: true,
      bookingId: reference,
      message: `Your booking request has been received. Ventus will confirm availability and the final total before any payment. Reference: ${reference}`
    });
  } catch (error) {
    console.error('Create booking request error:', error);
    res.status(500).json({ success: false, error: 'Unable to save your booking request. Please try again.' });
  }
});

app.post('/api/paypal/webhook', async (req, res) => {
  try {
    if (!process.env.PAYPAL_WEBHOOK_ID) {
      return res.status(503).json({ success: false, error: 'PayPal webhook is not configured' });
    }
    const transmissionId = req.header('paypal-transmission-id');
    const transmissionTime = req.header('paypal-transmission-time');
    const transmissionSig = req.header('paypal-transmission-sig');
    const certUrl = req.header('paypal-cert-url');
    const authAlgo = req.header('paypal-auth-algo');
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      return res.status(400).json({ success: false, error: 'Missing PayPal webhook verification headers' });
    }

    const verification = await paypalRequest('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: req.body
      }
    });
    if (verification.verification_status !== 'SUCCESS') {
      return res.status(400).json({ success: false, error: 'Invalid PayPal webhook signature' });
    }

    const resource = req.body?.resource || {};
    const captureId = resource.id;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    if (req.body?.event_type === 'PAYMENT.CAPTURE.COMPLETED' && orderId && captureId && resource.amount) {
      await persistCompletedMembershipPayment({
        orderId,
        captureId,
        amount: resource.amount.value,
        currency: resource.amount.currency_code
      });
    }
    if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.DENIED'].includes(req.body?.event_type)) {
      const revokedStatus = req.body.event_type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refunded' : 'revoked';
      await pool.query(
        `UPDATE subscriptions SET status = $2, updated_at = NOW() WHERE paypal_capture_id = $1`,
        [captureId, revokedStatus]
      );
      await pool.query(
        `UPDATE paypal_orders SET status = $2, updated_at = NOW() WHERE paypal_capture_id = $1`,
        [captureId, revokedStatus.toUpperCase()]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('PayPal webhook error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: 'Unable to process PayPal webhook' });
  }
});

// ============= HOTEL API PROXY (/v2) =============
// Proxies hotel search/availability/booking to api-staging.littleemperors.com so the
// staging frontend can call this backend (same CORS origin) instead of public CORS proxies.
const HOTEL_API_BASE = process.env.HOTEL_API_BASE || 'https://api-staging.littleemperors.com';
const HOTEL_API_TOKEN = process.env.HOTEL_API_TOKEN || '';
const HOTEL_API_CACHE_MAX_ENTRIES = 300;
const hotelApiCache = new Map();
const hotelApiInflight = new Map();

const getHotelApiCachePolicy = (req) => {
  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  const path = requestUrl.pathname.replace(/\/$/, '');

  if (
    req.method === 'POST' &&
    path === '/v2/hotels/availability' &&
    !req.body?.hotel_id &&
    (req.body?.location_id || req.body?.inspiration_id)
  ) {
    return {
      serverTtlMs: 2 * 60 * 1000,
      staleTtlMs: 5 * 60 * 1000,
      cacheControl: 'private, no-store'
    };
  }

  if (req.method !== 'GET') return null;

  if (/^\/v2\/hotels\/\d+$/.test(path)) {
    return {
      serverTtlMs: 15 * 60 * 1000,
      cacheControl: 'public, max-age=300, stale-while-revalidate=600, stale-if-error=86400'
    };
  }

  if (/^\/v2\/hotels\/\d+\/calendar$/.test(path)) {
    return {
      serverTtlMs: 10 * 60 * 1000,
      cacheControl: 'private, max-age=300, stale-while-revalidate=600, stale-if-error=3600'
    };
  }

  if (
    path === '/v2/hotels' &&
    (requestUrl.searchParams.has('inspiration_id') || requestUrl.searchParams.has('location_id'))
  ) {
    return {
      serverTtlMs: 30 * 60 * 1000,
      cacheControl: 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400'
    };
  }

  if (path === '/v2/search') {
    return {
      serverTtlMs: 30 * 60 * 1000,
      cacheControl: 'public, max-age=600, stale-while-revalidate=3600, stale-if-error=86400'
    };
  }

  return null;
};

const getHotelApiCacheKey = (req) => {
  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  requestUrl.searchParams.sort();
  if (req.method !== 'POST') return `${requestUrl.pathname}${requestUrl.search}`;
  const bodyHash = crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
  return `POST:${requestUrl.pathname}${requestUrl.search}:${bodyHash}`;
};

const storeHotelApiCacheEntry = (key, entry) => {
  if (hotelApiCache.has(key)) hotelApiCache.delete(key);
  while (hotelApiCache.size >= HOTEL_API_CACHE_MAX_ENTRIES) {
    hotelApiCache.delete(hotelApiCache.keys().next().value);
  }
  hotelApiCache.set(key, entry);
};

const getAuthenticatedUserFromRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) throw Object.assign(new Error('Member login required'), { statusCode: 401 });
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid or expired member login'), { statusCode: 403 });
  }
};

const hotelRequestRequiresMembership = (req) => {
  const requestUrl = new URL(req.originalUrl, 'http://membership.local');
  const path = requestUrl.pathname.replace(/\/$/, '');
  return (
    /^\/v2\/hotels\/\d+\/calendar$/.test(path) ||
    path === '/v2/hotels/availability' ||
    path === '/v2/hotels/bookings'
  );
};

// Destination/inspiration collections contain dozens of full-size gallery images
// per hotel. Result cards need one image plus metadata; compacting here avoids
// multi-megabyte browser downloads while hotel detail pages remain unchanged.
const compactHotelCollection = (data) => {
  if (!data || !Array.isArray(data.content)) return data;
  return {
    ...data,
    content: data.content.map((hotel) => {
      const firstImage = Array.isArray(hotel.images)
        ? hotel.images.find((image) => image && image.url)
        : null;
      return {
        id: hotel.id,
        name: hotel.name,
        hotel_groups: hotel.hotel_groups,
        location: hotel.location,
        address: hotel.address,
        description: hotel.description,
        website: hotel.website,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        display_order: hotel.display_order,
        sustainability_initiative: hotel.sustainability_initiative,
        sustainability_rating: hotel.sustainability_rating,
        short_info: hotel.short_info,
        hotel_information: hotel.hotel_information,
        amenities: hotel.amenities,
        benefits: hotel.benefits,
        benefits_footnotes: hotel.benefits_footnotes,
        images: firstImage ? [firstImage] : [],
        links: hotel.links,
        rating: hotel.rating,
        price: hotel.price,
        min_price: hotel.min_price,
        lowest_rate: hotel.lowest_rate,
      };
    })
  };
};

// One browser request can enrich an entire result page. Individual detail records
// still use the same 15-minute server cache, so repeated searches avoid upstream work.
app.post('/api/hotels/details-batch', async (req, res) => {
  const rawIds = Array.isArray(req.body?.hotelIds) ? req.body.hotelIds : [];
  const hotelIds = Array.from(new Set(rawIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 30);
  if (hotelIds.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one valid hotel ID is required' });
  }

  const results = new Array(hotelIds.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < hotelIds.length) {
      const index = cursor++;
      const hotelId = hotelIds[index];
      const cacheKey = `/v2/hotels/${hotelId}`;
      const cached = hotelApiCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        results[index] = cached.data;
        continue;
      }

      try {
        const response = await fetch(`${HOTEL_API_BASE}${cacheKey}`, {
          signal: AbortSignal.timeout(15000),
          headers: {
            Accept: 'application/json',
            ...(HOTEL_API_TOKEN && { Authorization: `Bearer ${HOTEL_API_TOKEN}` })
          }
        });
        if (!response.ok) continue;
        const data = await response.json();
        const cachedAt = Date.now();
        storeHotelApiCacheEntry(cacheKey, {
          status: response.status,
          contentType: response.headers.get('content-type') || 'application/json',
          data,
          cachedAt,
          expiresAt: cachedAt + 15 * 60 * 1000,
          staleUntil: cachedAt + 24 * 60 * 60 * 1000
        });
        results[index] = data;
      } catch (error) {
        console.warn(`Hotel detail batch request failed for ${hotelId}:`, error.message);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(6, hotelIds.length) }, worker));
  res.set('Cache-Control', 'private, max-age=60');
  res.json({ success: true, content: results.filter(Boolean) });
});

app.use('/v2', express.json(), async (req, res) => {
  if (!isPublicHotelProxyRequest(req.method, new URL(req.originalUrl, 'http://proxy.local').pathname)) {
    return res.status(404).json({ success: false, error: 'Use the authenticated Ventus reservation service to manage bookings.' });
  }
  if (hotelRequestRequiresMembership(req)) {
    try {
      const user = getAuthenticatedUserFromRequest(req);
      const subscription = await getActiveSubscription(user.id);
      if (!subscription) {
        return res.status(403).json({
          success: false,
          error: 'An active Ventus Travel membership is required to view live rates or book.'
        });
      }
    } catch (error) {
      return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  const targetUrl = `${HOTEL_API_BASE}${req.originalUrl}`;
  const cachePolicy = getHotelApiCachePolicy(req);
  const cacheKey = cachePolicy ? getHotelApiCacheKey(req) : null;
  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  const isHotelCollection = req.method === 'GET' &&
    requestUrl.pathname.replace(/\/$/, '') === '/v2/hotels' &&
    (requestUrl.searchParams.has('inspiration_id') || requestUrl.searchParams.has('location_id'));

  if (cacheKey) {
    const cached = hotelApiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      hotelApiCache.delete(cacheKey);
      hotelApiCache.set(cacheKey, cached);
      return res
        .status(cached.status)
        .set('Content-Type', cached.contentType)
        .set('Cache-Control', cachePolicy.cacheControl)
        .set('X-Cache', 'HIT')
        .set('Age', String(Math.floor((Date.now() - cached.cachedAt) / 1000)))
        .send(cached.data);
    }
    if (cached && cached.staleUntil <= Date.now()) hotelApiCache.delete(cacheKey);
  }

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(HOTEL_API_TOKEN && { 'Authorization': `Bearer ${HOTEL_API_TOKEN}` }),
  };
  try {
    let upstreamRequest = cacheKey ? hotelApiInflight.get(cacheKey) : null;
    if (!upstreamRequest) {
      upstreamRequest = (async () => {
        const fetchOptions = {
          method: req.method,
          headers,
          signal: AbortSignal.timeout(req.method === 'GET' ? 15000 : 30000),
          ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body && { body: JSON.stringify(req.body) }),
        };
        const proxyRes = await fetch(targetUrl, fetchOptions);
        const contentType = proxyRes.headers.get('content-type') || '';
        let data = contentType.includes('application/json')
          ? await proxyRes.json()
          : await proxyRes.text();
        if (isHotelCollection && proxyRes.ok) {
          data = compactHotelCollection(data);
        }
        return {
          status: proxyRes.status,
          contentType: proxyRes.headers.get('content-type') || 'application/json',
          data
        };
      })();
      if (cacheKey) hotelApiInflight.set(cacheKey, upstreamRequest);
    }

    const upstream = await upstreamRequest;
    if (cacheKey) hotelApiInflight.delete(cacheKey);

    if (cacheKey && upstream.status >= 200 && upstream.status < 300) {
      const cachedAt = Date.now();
      storeHotelApiCacheEntry(cacheKey, {
        ...upstream,
        cachedAt,
        expiresAt: cachedAt + cachePolicy.serverTtlMs,
        staleUntil: cachedAt + (cachePolicy.staleTtlMs || 24 * 60 * 60 * 1000)
      });
    }

    res
      .status(upstream.status)
      .set('Content-Type', upstream.contentType)
      .set('Cache-Control', cachePolicy ? cachePolicy.cacheControl : 'no-store')
      .set('X-Cache', cachePolicy ? 'MISS' : 'BYPASS')
      .send(upstream.data);
  } catch (err) {
    if (cacheKey) hotelApiInflight.delete(cacheKey);
    console.error('Hotel API proxy error:', err);
    const stale = cacheKey ? hotelApiCache.get(cacheKey) : null;
    if (stale && stale.staleUntil > Date.now()) {
      return res
        .status(stale.status)
        .set('Content-Type', stale.contentType)
        .set('Cache-Control', cachePolicy.cacheControl)
        .set('X-Cache', 'STALE')
        .set('Warning', '110 - Response is stale')
        .set('Age', String(Math.floor((Date.now() - stale.cachedAt) / 1000)))
        .send(stale.data);
    }
    res.status(502).json({
      success: false,
      error: 'Unable to connect to the hotel API. Please try again later.',
    });
  }
});

// ============= ERROR HANDLING =============

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============= START SERVER =============

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const startServer = async () => {
  assertProductionConfiguration();

  try {
    await ensurePasswordResetSchema();
    console.log('✓ Password reset schema ready');
  } catch (error) {
    console.error('Password reset schema initialization failed:', error);
  }

  try {
    await ensureSubscriptionSchema();
    await ensureStripeMembershipSchema(pool);
    await reservationService.ensureSchema();
    console.log('✓ Membership schema ready');
  } catch (error) {
    console.error('Membership schema initialization failed:', error);
    throw error;
  }

  try {
    await ensureEmailVerificationSchema();
    console.log('✓ Email verification schema ready');
  } catch (error) {
    console.error('Email verification schema initialization failed:', error);
  }

  try {
    await ensureHomepageSchema();
    console.log('✓ Homepage CMS schema ready');
  } catch (error) {
    console.error('Homepage CMS schema initialization failed:', error);
  }

  app.listen(PORT, HOST, () => {
    reservationService.start();
    console.log(`=== Backend Server Started ===`);
    console.log(`✓ Server running on http://${HOST}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`================================`);

    // Warm the homepage inspiration collections after startup so the first user
    // is not forced to wait for several slow upstream round trips. Run them in
    // sequence to keep upstream load controlled; in-flight request deduplication
    // also shares work with a real user request arriving at the same time.
    const inspirationIds = (process.env.HOTEL_API_PREWARM_INSPIRATIONS || '13,19,50,22,67,32')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);
    setTimeout(() => {
      void (async () => {
        for (const inspirationId of inspirationIds) {
          try {
            const response = await fetch(
              `http://127.0.0.1:${PORT}/v2/hotels?inspiration_id=${inspirationId}&per_page=20`
            );
            await response.arrayBuffer();
            if (!response.ok) {
              console.warn(`Inspiration cache warm failed for ${inspirationId}: ${response.status}`);
            }
          } catch (error) {
            console.warn(`Inspiration cache warm failed for ${inspirationId}:`, error.message);
          }
        }
      })();
    }, 1000);
  });
};

void startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  reservationService.stop();
  console.log('SIGTERM received, closing server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
