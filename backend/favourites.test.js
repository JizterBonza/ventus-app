const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { Pool } = require('pg');
const { registerFavouritesRoutes } = require('./favouritesRoutes');

// Use a disposable local database; never exercise these tests on customer data.
test('favourites persist, deduplicate, validate input and remain private to each account', { skip: !process.env.FAVOURITES_TEST_DATABASE_URL }, async () => {
  const schema = `favourites_test_${require('crypto').randomBytes(8).toString('hex')}`;
  const admin = new Pool({ connectionString: process.env.FAVOURITES_TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: process.env.FAVOURITES_TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  let server;
  try {
    await pool.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    await pool.query('INSERT INTO users VALUES (1), (2)');
    const app = express(); app.use(express.json());
    const authenticate = (req, res, next) => {
      const user = Number(req.get('authorization'));
      if (![1, 2].includes(user)) return res.sendStatus(401);
      req.user = { id: user }; next();
    };
    const service = registerFavouritesRoutes(app, pool, authenticate);
    await service.ensureSchema(); await service.ensureSchema();
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const request = (method = 'GET', path = '', user = 1, body) => fetch(`http://127.0.0.1:${server.address().port}/api/favourites${path}`, {
      method, headers: { Authorization: String(user), 'Content-Type': 'application/json' }, ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {})
    });
    const hotel = { id: 88, name: 'A Hotel', location: 'London', image: 'https://example.test/hotel.jpg', description: 'A place to stay.' };
    for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request(method, method === 'GET' ? '' : '/88', 0, { hotel })).status, 401);
    assert.equal((await request('PUT', '/88', 1, { hotel, user_id: 2 })).status, 200);
    assert.equal((await request('PUT', '/88', 1, { hotel })).status, 200);
    const firstList = await request();
    assert.equal(firstList.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual((await firstList.json()).hotels, [hotel]);
    assert.deepEqual((await (await request('GET', '', 2)).json()).hotels, []);
    assert.equal((await request('DELETE', '/88', 2)).status, 200);
    assert.equal((await (await request()).json()).hotels.length, 1);
    assert.equal((await request('PUT', '/88', 2, { hotel: { ...hotel, name: 'Other account version', image: 'javascript:bad' } })).status, 200);
    assert.equal((await (await request('GET', '', 2)).json()).hotels[0].image, '');
    for (const path of ['/0', '/-1', '/NaN', '/2e3', '/9999999999999999999']) assert.equal((await request('PUT', path, 1, { hotel })).status, 400);
    assert.equal((await request('PUT', '/89', 1, { hotel: { name: '' } })).status, 400);
    assert.equal((await request('DELETE', '/88', 1)).status, 200);
    assert.equal((await request('DELETE', '/88', 1)).status, 200);
    assert.deepEqual((await (await request()).json()).hotels, []);
    assert.equal((await (await request('GET', '', 2)).json()).hotels.length, 1);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  }
});
