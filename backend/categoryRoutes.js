const crypto = require('crypto');
const { allowedUrl } = require('./homepageContent');

const normalizeCategory = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid category page');
  const text = (key, max, required = false) => {
    if (typeof input[key] !== 'string' || input[key].length > max || (required && !input[key].trim())) {
      throw new Error(`Invalid category ${key}`);
    }
    return input[key].trim();
  };
  const title = text('title', 120, true);
  const slug = text('slug', 120, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use lowercase letters, numbers and hyphens for the page URL');
  if (slug === 'admin') throw new Error('That page URL is reserved. Choose another.');
  const description = text('description', 240);
  const image = text('image', 2048);
  if (image && !allowedUrl(image)) throw new Error('Use an https:// or / image URL');
  if (typeof input.published !== 'boolean' || typeof input.showOnHomepage !== 'boolean') throw new Error('Invalid publishing options');
  if (!Array.isArray(input.hotels) || input.hotels.length > 50) throw new Error('A category can contain up to 50 hotels');
  const hotels = input.hotels.map((hotel) => {
    if (!hotel || !Number.isSafeInteger(hotel.id) || hotel.id < 1 ||
        typeof hotel.name !== 'string' || !hotel.name.trim() || hotel.name.length > 240 ||
        typeof hotel.location !== 'string' || hotel.location.length > 240) throw new Error('Select a valid hotel for every row');
    return { id: hotel.id, name: hotel.name.trim(), location: hotel.location.trim() };
  });
  if (new Set(hotels.map((hotel) => hotel.id)).size !== hotels.length) throw new Error('Each hotel can only appear once in a category');
  if (input.published && (!image || hotels.length === 0)) throw new Error('Add an image and at least one hotel before publishing');
  return { title, slug, description, image, published: input.published, showOnHomepage: input.showOnHomepage, hotels };
};

const registerCategoryRoutes = (app, pool, authenticate, { requireAllowlistedEditor, requireEditor }) => {
  const ensureCategorySchema = () => pool.query(`CREATE TABLE IF NOT EXISTS category_pages (
    id UUID PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    content JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const display = (row) => ({ ...row.content, id: row.id, version: row.version });
  const route = (handler) => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { await handler(req, res); } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'That page URL is already in use. Choose another.' });
      console.error('Category page request failed:', error);
      res.status(503).json({ error: 'Unable to load or save category pages. Please try again.' });
    }
  };
  const editors = [authenticate, requireAllowlistedEditor, requireEditor];

  app.get('/api/admin/access', authenticate, route(async (req, res) => {
    const account = (await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id])).rows[0];
    const email = account?.email?.trim().toLowerCase();
    const includes = (value) => Boolean(email && (value || '').split(',').map((item) => item.trim().toLowerCase()).includes(email));
    res.json({ contentEditor: includes(process.env.HOMEPAGE_EDITOR_EMAILS), reservationManager: includes(process.env.RESERVATION_MANAGER_EMAILS) });
  }));
  app.get('/api/categories', route(async (req, res) => {
    const result = await pool.query("SELECT * FROM category_pages WHERE content->>'published' = 'true' ORDER BY updated_at DESC, id");
    res.json({ categories: result.rows.map(display) });
  }));
  app.get('/api/categories/admin', ...editors, route(async (req, res) => {
    const result = await pool.query('SELECT * FROM category_pages ORDER BY updated_at DESC, id');
    res.json({ categories: result.rows.map(display) });
  }));
  app.get('/api/categories/:slug', route(async (req, res) => {
    const result = await pool.query("SELECT * FROM category_pages WHERE slug = $1 AND content->>'published' = 'true'", [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'This category page is not available.' });
    res.json({ category: display(result.rows[0]) });
  }));
  const save = (creating) => route(async (req, res) => {
    let category;
    try { category = normalizeCategory(req.body?.category); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const version = req.body?.version;
    if (!creating && (!Number.isSafeInteger(version) || version < 1 || !/^[a-f0-9-]{36}$/i.test(req.params.id))) {
      return res.status(400).json({ error: 'Invalid page ID or version' });
    }
    const result = creating
      ? await pool.query(`INSERT INTO category_pages (id, slug, content, updated_by) VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
        [crypto.randomUUID(), category.slug, JSON.stringify(category), req.user.id])
      : await pool.query(`UPDATE category_pages SET slug = $1, content = $2::jsonb, version = version + 1,
        updated_by = $3, updated_at = NOW() WHERE id = $4 AND version = $5 RETURNING *`,
        [category.slug, JSON.stringify(category), req.user.id, req.params.id, version]);
    if (!result.rows.length) return res.status(409).json({ error: 'This page changed since you opened it. Reload before saving.' });
    res.status(creating ? 201 : 200).json({ category: display(result.rows[0]) });
  });
  app.post('/api/categories/admin', ...editors, save(true));
  app.put('/api/categories/admin/:id', ...editors, save(false));
  return { ensureCategorySchema };
};

module.exports = { registerCategoryRoutes, normalizeCategory };
