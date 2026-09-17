const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerHomepageRoutes } = require('./homepageRoutes');
const { defaults } = require('./homepageContent');

test('homepage edits require an authorized existing account and a current version', async () => {
  const previousEditors = process.env.HOMEPAGE_EDITOR_EMAILS;
  process.env.HOMEPAGE_EDITOR_EMAILS = 'daniella@example.test';
  const app = express();
  app.use(express.json());
  let version = 1;
  let content = defaults;
  let codeHash = null;
  let sentCode = null;
  let verified = false;
  const images = new Map();
  const pool = {
    query: async (sql, params = []) => {
      if (sql.startsWith('SELECT email FROM users')) {
        return { rows: [{ email: params[0] === 1 ? 'daniella@example.test' : 'member@example.test' }] };
      }
      if (sql.startsWith('SELECT verified_at FROM homepage_editor_verifications')) {
        return { rows: verified && params[0] === 1 && params[1] === 'daniella@example.test' ? [{ verified_at: new Date() }] : [] };
      }
      if (sql.includes('INSERT INTO homepage_editor_verifications')) {
        codeHash = params[2];
        return { rows: [{ user_id: params[0] }] };
      }
      if (sql.includes('SET verified_at = NOW()')) {
        if (params[2] !== codeHash) return { rows: [] };
        verified = true;
        codeHash = null;
        return { rows: [{ user_id: params[0] }] };
      }
      if (sql.includes('SET attempts = attempts + 1')) return { rows: [] };
      if (sql.startsWith('SELECT content, version')) return { rows: [{ content, version, updated_at: new Date() }] };
      if (sql.startsWith('UPDATE homepage_content')) {
        if (params[2] !== version) return { rows: [] };
        content = JSON.parse(params[0]);
        version += 1;
        return { rows: [{ version, updated_at: new Date() }] };
      }
      if (sql.startsWith('INSERT INTO homepage_images')) {
        images.set(params[0], { mime_type: params[1], data: params[2] });
        return { rows: [] };
      }
      if (sql.startsWith('SELECT mime_type, data FROM homepage_images')) {
        return { rows: images.has(params[0]) ? [images.get(params[0])] : [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  const authenticate = (req, res, next) => {
    const id = Number(req.get('authorization')?.replace('Bearer ', ''));
    if (!id) return res.sendStatus(401);
    req.user = { id };
    next();
  };
  registerHomepageRoutes(app, pool, authenticate, { sendEditorCode: async ({ code }) => { sentCode = code; } });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const url = `http://127.0.0.1:${server.address().port}/api/homepage/admin`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer 2' } })).status, 403);
    const unverified = await fetch(url, { headers: { Authorization: 'Bearer 1' } });
    assert.equal(unverified.status, 403);
    assert.equal((await unverified.json()).code, 'EDITOR_VERIFICATION_REQUIRED');
    const requested = await fetch(`${url}/verification-code`, { method: 'POST', headers: { Authorization: 'Bearer 1' } });
    assert.equal(requested.status, 200);
    assert.match(sentCode, /^[A-F0-9]{12}$/);
    const wrong = await fetch(`${url}/verify-email`, { method: 'POST', headers: { Authorization: 'Bearer 1', 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '000000000000' }) });
    assert.equal(wrong.status, 400);
    const verifiedResponse = await fetch(`${url}/verify-email`, { method: 'POST', headers: { Authorization: 'Bearer 1', 'Content-Type': 'application/json' }, body: JSON.stringify({ code: sentCode }) });
    assert.equal(verifiedResponse.status, 200);
    const loaded = await (await fetch(url, { headers: { Authorization: 'Bearer 1' } })).json();
    assert.equal(loaded.version, 1);
    const edit = { content: { ...loaded.content, cards: loaded.content.cards.map((card) => card.id === '7' ? { ...card, title: 'Rediscover London' } : card) }, version: 1 };
    const saved = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer 1', 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).version, 2);
    const stale = await fetch(url, { method: 'PUT', headers: { Authorization: 'Bearer 1', 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    assert.equal(stale.status, 409);
    const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const upload = await fetch(`${url}/images`, { method: 'POST', headers: { Authorization: 'Bearer 1', 'Content-Type': 'image/jpeg' }, body: imageBytes });
    assert.equal(upload.status, 201);
    const uploadedImage = await upload.json();
    const image = await fetch(`http://127.0.0.1:${server.address().port}${uploadedImage.path}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousEditors === undefined) delete process.env.HOMEPAGE_EDITOR_EMAILS;
    else process.env.HOMEPAGE_EDITOR_EMAILS = previousEditors;
  }
});
