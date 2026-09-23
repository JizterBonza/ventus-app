const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const { Pool } = require('pg');
const { registerHomepageRoutes } = require('./homepageRoutes');
const { registerCategoryRoutes } = require('./categoryRoutes');

test('category schema, durable publication and concurrent edits with PostgreSQL', { skip: !process.env.CATEGORY_TEST_DATABASE_URL }, async () => {
  const connectionString = process.env.CATEGORY_TEST_DATABASE_URL;
  const schema = `category_test_${crypto.randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  const previousEditors = process.env.HOMEPAGE_EDITOR_EMAILS;
  process.env.HOMEPAGE_EDITOR_EMAILS = 'editor@example.test';
  let server;
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)');
    await pool.query("INSERT INTO users VALUES (1, 'editor@example.test')");
    const app = express(); app.use(express.json());
    const authenticate = (req, res, next) => {
      if (req.get('authorization') !== 'Bearer test-editor') return res.sendStatus(401);
      req.user = { id: 1 }; next();
    };
    const homepage = registerHomepageRoutes(app, pool, authenticate);
    const categories = registerCategoryRoutes(app, pool, authenticate, homepage);
    await homepage.ensureHomepageSchema();
    await categories.ensureCategorySchema();
    await categories.ensureCategorySchema();
    await pool.query("INSERT INTO homepage_editor_verifications (user_id, email, verified_at) VALUES (1, 'editor@example.test', NOW())");
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = (path, method = 'GET', body) => fetch(`${origin}/api/categories${path}`, {
      method, headers: { Authorization: 'Bearer test-editor', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const content = { title: 'Coastal escapes', slug: 'coastal-escapes', description: '', image: '/coast.webp',
      published: false, showOnHomepage: true, hotels: [{ id: 20, name: 'Second Hotel', location: 'Italy' }, { id: 10, name: 'First Hotel', location: 'Greece' }] };
    const created = await request('/admin', 'POST', { category: content });
    assert.equal(created.status, 201);
    const { category } = await created.json();
    assert.equal((await request('/admin', 'POST', { category: content })).status, 409);
    assert.equal((await request('/coastal-escapes')).status, 404);
    const edits = await Promise.all([1, 2].map(() => request(`/admin/${category.id}`, 'PUT', {
      category: { ...content, published: true }, version: category.version,
    })));
    assert.deepEqual(edits.map((response) => response.status).sort(), [200, 409]);
    const saved = (await pool.query('SELECT * FROM category_pages WHERE id = $1', [category.id])).rows[0];
    assert.equal(saved.version, 2);
    assert.equal(saved.updated_by, 1);
    const published = (await (await request('/coastal-escapes')).json()).category;
    assert.deepEqual(published.hotels.map((hotel) => hotel.id), [20, 10]);
    assert.equal((await (await request('')).json()).categories.length, 1);
    assert.equal((await request(`/admin/${category.id}`, 'PUT', { category: content, version: 2 })).status, 200);
    assert.equal((await request('/coastal-escapes')).status, 404);
    assert.deepEqual((await (await request('')).json()).categories, []);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    if (previousEditors === undefined) delete process.env.HOMEPAGE_EDITOR_EMAILS;
    else process.env.HOMEPAGE_EDITOR_EMAILS = previousEditors;
  }
});
