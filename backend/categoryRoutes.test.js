const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerHomepageRoutes } = require('./homepageRoutes');
const { registerCategoryRoutes, normalizeCategory } = require('./categoryRoutes');

const draft = { title: 'Coastal escapes', slug: 'coastal-escapes', description: 'Our seaside favourites.', image: '/assets/img/interests/1.webp',
  published: false, showOnHomepage: true, hotels: [{ id: 20, name: 'Second Hotel', location: 'Italy' }, { id: 10, name: 'First Hotel', location: 'Greece' }] };

test('category validation protects hotel selections, publishing and URLs', () => {
  assert.deepEqual(normalizeCategory(draft), draft);
  assert.doesNotThrow(() => normalizeCategory({ ...draft, hotels: [], image: '' }));
  for (const changes of [
    { slug: 'admin' }, { slug: '../bad' }, { image: 'javascript:alert(1)' }, { image: '//example.test/image' },
    { hotels: [draft.hotels[0], draft.hotels[0]] }, { hotels: [{ id: '20', name: 'Fake', location: '' }] },
    { published: true, hotels: [] }, { published: true, image: '' }, { showOnHomepage: 'true' },
    { hotels: Array.from({ length: 51 }, (_, i) => ({ id: i + 1, name: 'Hotel', location: '' })) },
  ]) assert.throws(() => normalizeCategory({ ...draft, ...changes }));
});

test('category API enforces editor verification, hides drafts, preserves order and rejects conflicting saves', async () => {
  const previousEditors = process.env.HOMEPAGE_EDITOR_EMAILS;
  process.env.HOMEPAGE_EDITOR_EMAILS = 'editor@example.test';
  let verified = false;
  const records = new Map();
  const pool = { query: async (sql, params = []) => {
    if (sql.startsWith('SELECT email FROM users')) return { rows: [{ email: params[0] === 1 ? 'editor@example.test' : 'member@example.test' }] };
    if (sql.startsWith('SELECT verified_at')) return { rows: verified ? [{ verified_at: new Date() }] : [] };
    if (sql.startsWith('SELECT * FROM category_pages')) {
      let rows = [...records.values()];
      if (sql.includes("content->>'published'")) rows = rows.filter((row) => row.content.published);
      if (sql.includes('slug = $1')) rows = rows.filter((row) => row.slug === params[0]);
      return { rows };
    }
    if (sql.startsWith('INSERT INTO category_pages')) {
      if ([...records.values()].some((row) => row.slug === params[1])) throw Object.assign(new Error(), { code: '23505' });
      const row = { id: params[0], slug: params[1], content: JSON.parse(params[2]), version: 1 };
      records.set(row.id, row); return { rows: [row] };
    }
    if (sql.startsWith('UPDATE category_pages')) {
      const row = records.get(params[3]);
      if (!row || row.version !== params[4]) return { rows: [] };
      Object.assign(row, { slug: params[0], content: JSON.parse(params[1]), version: row.version + 1 });
      return { rows: [row] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  } };
  const app = express(); app.use(express.json());
  const authenticate = (req, res, next) => {
    const id = Number(req.get('authorization')?.replace('Bearer ', ''));
    if (!id) return res.sendStatus(401);
    req.user = { id }; next();
  };
  const homepage = registerHomepageRoutes(app, pool, authenticate);
  registerCategoryRoutes(app, pool, authenticate, homepage);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, user = null, method = 'GET', body) => fetch(`${base}${path}`, {
    method, headers: { ...(user ? { Authorization: `Bearer ${user}` } : {}), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.equal((await request('/categories/admin')).status, 401);
    assert.equal((await request('/categories/admin', 2)).status, 403);
    assert.equal((await (await request('/categories/admin', 1)).json()).code, 'EDITOR_VERIFICATION_REQUIRED');
    assert.equal((await (await request('/admin/access', 1)).json()).contentEditor, true);
    assert.equal((await (await request('/admin/access', 2)).json()).contentEditor, false);
    assert.equal((await request('/categories/admin', 2, 'POST', { category: draft })).status, 403);
    assert.equal((await request('/categories/admin', 1, 'POST', { category: draft })).status, 403);
    verified = true;
    const created = await request('/categories/admin', 1, 'POST', { category: draft });
    assert.equal(created.status, 201);
    const { category } = await created.json();
    assert.equal(category.version, 1);
    assert.deepEqual(category.hotels.map((hotel) => hotel.id), [20, 10]);
    assert.deepEqual((await (await request('/categories')).json()).categories, []);
    assert.equal((await request('/categories/coastal-escapes')).status, 404);
    assert.equal((await (await request('/categories/admin', 1)).json()).categories.length, 1);
    assert.equal((await request('/categories/admin', 1, 'POST', { category: draft })).status, 409);
    const published = await request(`/categories/admin/${category.id}`, 1, 'PUT', { category: { ...draft, published: true }, version: 1 });
    assert.equal(published.status, 200);
    const publicPage = await (await request('/categories/coastal-escapes')).json();
    assert.equal(publicPage.category.published, true);
    assert.equal((await (await request('/categories')).json()).categories.length, 1);
    assert.equal((await request(`/categories/admin/${category.id}`, 1, 'PUT', { category: draft, version: 1 })).status, 409);
    assert.equal((await request(`/categories/admin/${category.id}`, 2, 'PUT', { category: draft, version: 2 })).status, 403);
    const unpublish = await request(`/categories/admin/${category.id}`, 1, 'PUT', { category: draft, version: 2 });
    assert.equal(unpublish.status, 200);
    assert.equal((await request('/categories/coastal-escapes')).status, 404);
    assert.deepEqual((await (await request('/categories')).json()).categories, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousEditors === undefined) delete process.env.HOMEPAGE_EDITOR_EMAILS;
    else process.env.HOMEPAGE_EDITOR_EMAILS = previousEditors;
  }
});
