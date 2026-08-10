const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

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
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_REQUEST_LIMIT = 5;
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://destinations.ventustravel.co.uk').replace(/\/$/, '');
const passwordResetAttempts = new Map();
let passwordResetSchemaReady = false;

const ensurePasswordResetSchema = async () => {
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

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendPasswordResetEmail = async ({ to, firstName, resetUrl }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('Password reset email delivery is not configured');
  }

  const safeName = escapeHtml(firstName || 'there');
  const safeResetUrl = escapeHtml(resetUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(process.env.PASSWORD_RESET_REPLY_TO && {
        reply_to: process.env.PASSWORD_RESET_REPLY_TO
      }),
      subject: 'Reset your Ventus Travel password',
      text: [
        `Hi ${firstName || 'there'},`,
        '',
        'We received a request to reset your Ventus Travel password.',
        `Reset your password: ${resetUrl}`,
        '',
        'This link expires in one hour and can only be used once.',
        'If you did not request this, you can safely ignore this email.'
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1f1f1f;line-height:1.6;max-width:600px;margin:0 auto">
          <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400">Reset your password</h1>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your Ventus Travel password.</p>
          <p style="margin:28px 0">
            <a href="${safeResetUrl}" style="display:inline-block;background:#1f1f1f;color:#fff;text-decoration:none;padding:13px 22px">Reset password</a>
          </p>
          <p>This link expires in one hour and can only be used once.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    throw new Error(`Password reset email provider returned ${response.status}: ${providerMessage.slice(0, 300)}`);
  }
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
    const { email, password, firstName, lastName, phone } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
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
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, first_name, last_name, phone, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName, phone || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        createdAt: user.created_at.toISOString()
      },
      token
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

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
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

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password)
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.created_at.toISOString()
      },
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

// Request a one-time password reset link. The response does not reveal whether
// an account exists for the supplied email address.
app.post('/api/auth/forgot-password', async (req, res) => {
  const genericMessage = 'If an account exists for that email, a reset link has been sent.';

  try {
    res.set('Cache-Control', 'no-store');
    if (!passwordResetSchemaReady) {
      return res.status(503).json({ success: false, error: 'Password reset is temporarily unavailable.' });
    }

    if (!process.env.RESEND_API_KEY || !process.env.PASSWORD_RESET_FROM_EMAIL) {
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
    if (newPassword.length < 6 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be between 6 and 128 characters.' });
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
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [resetToken.user_id]
    );
    await client.query('COMMIT');

    res.json({ success: true, message: 'Your password has been reset. You can now log in.' });
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
      'SELECT id, email, first_name, last_name, phone, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.created_at.toISOString()
      }
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
      'SELECT id, email, first_name, last_name, phone, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.created_at.toISOString()
      }
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

// Valid coupon codes (matching frontend)
const VALID_COUPONS = {
  'VENTUS': { discountPercent: 100, description: 'Full access - 100% discount!' },
  'VENTUSVIP': { discountPercent: 100, description: 'Full access - 100% discount!' },
  'WELCOME50': { discountPercent: 50, description: '50% off your first subscription' },
  'SAVE20': { discountPercent: 20, description: '20% discount applied' }
};

// Subscribe user to a plan
app.post('/api/subscriptions/subscribe', authenticateToken, async (req, res) => {
  try {
    const { planId, couponCode, paymentDetails } = req.body;
    const userId = req.user.id;

    // Validate plan ID
    if (!planId || planId !== 'travel-yearly') {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }

    // Validate coupon if provided
    let discountPercent = 0;
    if (couponCode) {
      const upperCode = couponCode.toUpperCase().trim();
      const coupon = VALID_COUPONS[upperCode];
      if (coupon) {
        discountPercent = coupon.discountPercent;
      }
    }

    // Calculate final price (base price is 299 GBP)
    const basePrice = 299;
    const finalPrice = Math.max(0, basePrice - (basePrice * discountPercent / 100));

    // If price > 0, PayPal payment is required
    if (finalPrice > 0) {
      if (!paymentDetails || paymentDetails.type !== 'paypal') {
        return res.status(400).json({
          success: false,
          error: 'PayPal payment is required for paid subscriptions'
        });
      }
      
      if (!paymentDetails.orderId) {
        return res.status(400).json({
          success: false,
          error: 'PayPal order ID is required'
        });
      }
      
      // In a real app, you'd verify the PayPal order with PayPal's API
      // You can use the PayPal Secret Key (PAYPAL_SECRET_KEY env var) for server-side verification
      // Example: Use @paypal/checkout-server-sdk to verify the order
      // For now, we'll log the payment details
      console.log(`PayPal payment received - user ${userId}, order ID: ${paymentDetails.orderId}, price: £${finalPrice}`);
      
      // TODO: Verify PayPal order with PayPal API using PAYPAL_SECRET_KEY
      // This ensures the payment was actually completed and prevents fraud
    }

    // Generate a subscription ID
    const subscriptionId = `sub_${Date.now()}_${userId}`;

    // In a real app, you'd store the subscription in the database
    // For now, we'll just return success
    console.log(`New subscription: ${subscriptionId}, user: ${userId}, plan: ${planId}, discount: ${discountPercent}%`);

    res.status(201).json({
      success: true,
      subscriptionId,
      message: finalPrice === 0 
        ? 'Welcome to the club! Your free membership has been activated.'
        : `Welcome to the club! Your membership has been activated. Amount charged: £${finalPrice}`
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process subscription'
    });
  }
});

// Get user's subscription status
app.get('/api/subscriptions/status', authenticateToken, async (req, res) => {
  try {
    // In a real app, you'd query the database for the user's subscription
    // For now, return a placeholder response
    res.json({
      success: true,
      hasActiveSubscription: false,
      subscription: null
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// ============= HOTEL API PROXY (/v2) =============
// Proxies hotel search/availability/booking to api-staging.littleemperors.com so the
// staging frontend can call this backend (same CORS origin) instead of public CORS proxies.
const HOTEL_API_BASE = process.env.HOTEL_API_BASE || 'https://api-staging.littleemperors.com';
const HOTEL_API_TOKEN = process.env.HOTEL_API_TOKEN || process.env.REACT_APP_API_TOKEN || '';
const HOTEL_API_CACHE_MAX_ENTRIES = 300;
const hotelApiCache = new Map();
const hotelApiInflight = new Map();

const getHotelApiCachePolicy = (req) => {
  if (req.method !== 'GET') return null;

  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  const path = requestUrl.pathname.replace(/\/$/, '');

  if (/^\/v2\/hotels\/\d+$/.test(path)) {
    return {
      serverTtlMs: 15 * 60 * 1000,
      cacheControl: 'public, max-age=300, stale-while-revalidate=600, stale-if-error=86400'
    };
  }

  if (path === '/v2/hotels' && requestUrl.searchParams.has('inspiration_id')) {
    return {
      serverTtlMs: 30 * 60 * 1000,
      cacheControl: 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400'
    };
  }

  if (path === '/v2/search') {
    return {
      serverTtlMs: 5 * 60 * 1000,
      cacheControl: 'public, max-age=60, stale-while-revalidate=300, stale-if-error=3600'
    };
  }

  return null;
};

const getHotelApiCacheKey = (req) => {
  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  requestUrl.searchParams.sort();
  return `${requestUrl.pathname}${requestUrl.search}`;
};

const storeHotelApiCacheEntry = (key, entry) => {
  if (hotelApiCache.has(key)) hotelApiCache.delete(key);
  while (hotelApiCache.size >= HOTEL_API_CACHE_MAX_ENTRIES) {
    hotelApiCache.delete(hotelApiCache.keys().next().value);
  }
  hotelApiCache.set(key, entry);
};

// Inspiration collections include full hotel records even though the results
// page only needs summary-card fields. Compacting them at the proxy cuts the
// cached response substantially without changing the hotel detail endpoint.
const compactInspirationCollection = (data) => {
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
        location: hotel.location,
        description: hotel.description,
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

app.use('/v2', express.json(), async (req, res) => {
  const targetUrl = `${HOTEL_API_BASE}${req.originalUrl}`;
  const cachePolicy = getHotelApiCachePolicy(req);
  const cacheKey = cachePolicy ? getHotelApiCacheKey(req) : null;
  const requestUrl = new URL(req.originalUrl, 'http://cache.local');
  const isInspirationCollection = req.method === 'GET' &&
    requestUrl.pathname.replace(/\/$/, '') === '/v2/hotels' &&
    requestUrl.searchParams.has('inspiration_id');

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
    if (cached) hotelApiCache.delete(cacheKey);
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
          ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body && { body: JSON.stringify(req.body) }),
        };
        const proxyRes = await fetch(targetUrl, fetchOptions);
        const contentType = proxyRes.headers.get('content-type') || '';
        let data = contentType.includes('application/json')
          ? await proxyRes.json()
          : await proxyRes.text();
        if (isInspirationCollection && proxyRes.ok) {
          data = compactInspirationCollection(data);
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
        expiresAt: cachedAt + cachePolicy.serverTtlMs
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
  try {
    await ensurePasswordResetSchema();
    console.log('✓ Password reset schema ready');
  } catch (error) {
    console.error('Password reset schema initialization failed:', error);
  }

  app.listen(PORT, HOST, () => {
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
  console.log('SIGTERM received, closing server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
