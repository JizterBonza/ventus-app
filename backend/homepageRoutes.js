const express = require('express');
const crypto = require('crypto');
const { defaults, normalizeHomepageContent, allowedImageType, migrateLegacyThemeLinks } = require('./homepageContent');
const { sendHomepageEditorCode } = require('./email');

const registerHomepageRoutes = (app, pool, authenticateToken, { sendEditorCode = sendHomepageEditorCode } = {}) => {
  const editorEmails = new Set((process.env.HOMEPAGE_EDITOR_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));

  const ensureHomepageSchema = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_content (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        content JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_images (
        id UUID PRIMARY KEY,
        mime_type VARCHAR(20) NOT NULL,
        data BYTEA NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_editor_verifications (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        code_hash CHAR(64),
        code_expires_at TIMESTAMPTZ,
        code_sent_at TIMESTAMPTZ,
        attempts SMALLINT NOT NULL DEFAULT 0,
        verified_at TIMESTAMPTZ
      )
    `);
    await pool.query(
      'INSERT INTO homepage_content (id, content) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
      [JSON.stringify(defaults)]
    );
    const stored = await pool.query('SELECT content, version FROM homepage_content WHERE id = 1');
    const current = stored.rows[0];
    const migrated = migrateLegacyThemeLinks(current?.content);
    if (migrated) {
      await pool.query(
        `UPDATE homepage_content SET content = $1::jsonb, version = version + 1, updated_at = NOW()
         WHERE id = 1 AND version = $2`,
        [JSON.stringify(migrated), current.version]
      );
    }
  };

  const requireAllowlistedEditor = async (req, res, next) => {
    try {
      if (editorEmails.size === 0) return res.status(403).json({ success: false, error: 'Homepage editing is not configured' });
      const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      const email = result.rows[0]?.email?.trim().toLowerCase();
      if (!email || !editorEmails.has(email)) return res.status(403).json({ success: false, error: 'Homepage editor access required' });
      req.editorEmail = email;
      next();
    } catch (error) {
      console.error('Homepage editor authorization error:', error);
      res.status(503).json({ success: false, error: 'Unable to verify editor access' });
    }
  };

  const requireEditor = async (req, res, next) => {
    try {
      const result = await pool.query(
        'SELECT verified_at FROM homepage_editor_verifications WHERE user_id = $1 AND email = $2 AND verified_at IS NOT NULL',
        [req.user.id, req.editorEmail]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ success: false, code: 'EDITOR_VERIFICATION_REQUIRED', error: 'Verify your account email to edit the homepage' });
      }
      next();
    } catch (error) {
      console.error('Homepage editor verification check error:', error);
      res.status(503).json({ success: false, error: 'Unable to verify editor access' });
    }
  };

  const editorCodeHash = (userId, email, code) => crypto.createHmac('sha256', process.env.JWT_SECRET || '')
    .update(`${userId}:${email}:${code}`)
    .digest('hex');

  const readContent = async () => {
    const result = await pool.query('SELECT content, version, updated_at FROM homepage_content WHERE id = 1');
    return result.rows[0] || { content: defaults, version: 0, updated_at: null };
  };

  app.get('/api/homepage', async (req, res) => {
    try {
      const row = await readContent();
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.json({ success: true, content: row.content, version: row.version });
    } catch (error) {
      console.error('Homepage content read error:', error);
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, content: defaults, version: 0, fallback: true });
    }
  });

  app.post('/api/homepage/admin/verification-code', authenticateToken, requireAllowlistedEditor, async (req, res) => {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    try {
      const result = await pool.query(
        `INSERT INTO homepage_editor_verifications
           (user_id, email, code_hash, code_expires_at, code_sent_at, attempts)
         VALUES ($1, $2, $3, NOW() + INTERVAL '20 minutes', NOW(), 0)
         ON CONFLICT (user_id) DO UPDATE SET
           email = EXCLUDED.email,
           code_hash = EXCLUDED.code_hash,
           code_expires_at = EXCLUDED.code_expires_at,
           code_sent_at = EXCLUDED.code_sent_at,
           attempts = 0,
           verified_at = CASE WHEN homepage_editor_verifications.email = EXCLUDED.email
             THEN homepage_editor_verifications.verified_at ELSE NULL END
         WHERE homepage_editor_verifications.code_sent_at IS NULL
           OR homepage_editor_verifications.code_sent_at < NOW() - INTERVAL '2 minutes'
           OR homepage_editor_verifications.email <> EXCLUDED.email
         RETURNING user_id`,
        [req.user.id, req.editorEmail, editorCodeHash(req.user.id, req.editorEmail, code)]
      );
      if (result.rows.length === 0) return res.status(429).json({ success: false, error: 'Please wait two minutes before requesting another code' });
      await sendEditorCode({ to: req.editorEmail, code });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, message: 'Verification code sent to your account email' });
    } catch (error) {
      console.error('Homepage editor verification email error:', error);
      res.status(503).json({ success: false, error: 'Unable to send verification email. Please try again shortly.' });
    }
  });

  app.post('/api/homepage/admin/verify-email', authenticateToken, requireAllowlistedEditor, async (req, res) => {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!/^[A-F0-9]{12}$/.test(code)) return res.status(400).json({ success: false, error: 'Enter the 12-character code from your email' });
    try {
      const result = await pool.query(
        `UPDATE homepage_editor_verifications
         SET verified_at = NOW(), code_hash = NULL, code_expires_at = NULL, attempts = 0
         WHERE user_id = $1 AND email = $2 AND code_hash = $3
           AND code_expires_at > NOW() AND attempts < 5
         RETURNING user_id`,
        [req.user.id, req.editorEmail, editorCodeHash(req.user.id, req.editorEmail, code)]
      );
      if (result.rows.length === 0) {
        await pool.query(
          `UPDATE homepage_editor_verifications SET attempts = attempts + 1
           WHERE user_id = $1 AND email = $2 AND code_expires_at > NOW() AND attempts < 5`,
          [req.user.id, req.editorEmail]
        );
        return res.status(400).json({ success: false, error: 'The code is invalid, expired, or has been tried too many times. Request a new code if needed.' });
      }
      res.set('Cache-Control', 'no-store');
      res.json({ success: true });
    } catch (error) {
      console.error('Homepage editor email verification error:', error);
      res.status(503).json({ success: false, error: 'Unable to verify the code right now' });
    }
  });

  app.get('/api/homepage/admin', authenticateToken, requireAllowlistedEditor, requireEditor, async (req, res) => {
    try {
      const row = await readContent();
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, content: row.content, version: row.version, updatedAt: row.updated_at });
    } catch (error) {
      console.error('Homepage editor read error:', error);
      res.status(503).json({ success: false, error: 'Unable to load homepage content' });
    }
  });

  app.put('/api/homepage/admin', authenticateToken, requireAllowlistedEditor, requireEditor, async (req, res) => {
    let content;
    try {
      content = normalizeHomepageContent(req.body?.content);
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    const version = req.body?.version;
    if (!Number.isSafeInteger(version) || version < 1) {
      return res.status(400).json({ success: false, error: 'Invalid content version' });
    }
    try {
      const result = await pool.query(
        `UPDATE homepage_content
         SET content = $1::jsonb, version = version + 1, updated_by = $2, updated_at = NOW()
         WHERE id = 1 AND version = $3
         RETURNING version, updated_at`,
        [JSON.stringify(content), req.user.id, version]
      );
      if (result.rows.length === 0) return res.status(409).json({ success: false, error: 'Homepage changed since you opened it. Reload before saving.' });
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, content, version: result.rows[0].version, updatedAt: result.rows[0].updated_at });
    } catch (error) {
      console.error('Homepage editor save error:', error);
      res.status(503).json({ success: false, error: 'Unable to save homepage content' });
    }
  });

  app.post(
    '/api/homepage/admin/images',
    authenticateToken,
    requireAllowlistedEditor,
    requireEditor,
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '4mb' }),
    async (req, res) => {
      const mimeType = allowedImageType(req.body);
      const declaredType = req.get('content-type')?.split(';')[0]?.toLowerCase();
      if (!mimeType || declaredType !== mimeType || req.body.length === 0) {
        return res.status(415).json({ success: false, error: 'Upload a JPEG, PNG, or WebP image (maximum 4 MB)' });
      }
      try {
        const id = crypto.randomUUID();
        await pool.query(
          'INSERT INTO homepage_images (id, mime_type, data, created_by) VALUES ($1, $2, $3, $4)',
          [id, mimeType, req.body, req.user.id]
        );
        res.status(201).json({ success: true, path: `/api/homepage/images/${id}` });
      } catch (error) {
        console.error('Homepage image upload error:', error);
        res.status(503).json({ success: false, error: 'Unable to upload image' });
      }
    }
  );

  app.get('/api/homepage/images/:id', async (req, res) => {
    if (!/^[a-f0-9-]{36}$/i.test(req.params.id)) return res.sendStatus(404);
    try {
      const result = await pool.query('SELECT mime_type, data FROM homepage_images WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      res.set('Content-Type', result.rows[0].mime_type);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.set('X-Content-Type-Options', 'nosniff');
      res.send(result.rows[0].data);
    } catch (error) {
      console.error('Homepage image read error:', error);
      res.sendStatus(503);
    }
  });

  return { ensureHomepageSchema, requireAllowlistedEditor, requireEditor };
};

module.exports = { registerHomepageRoutes };
