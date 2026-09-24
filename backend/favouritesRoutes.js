const hotelId = (value) => /^[1-9]\d{0,9}$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function hotelSnapshot(value, id) {
  if (!value || typeof value !== 'object' || !text(value.name, 255)) return null;
  const image = text(value.image, 2048);
  return { id, name: text(value.name, 255), location: text(value.location, 255),
    description: text(value.description, 2000),
    image: /^(https:\/\/|\/assets\/)/.test(image) ? image : '' };
}

function registerFavouritesRoutes(app, pool, authenticate) {
  const route = (handler) => async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { await handler(req, res); }
    catch { res.status(503).json({ success: false, error: 'Unable to update your favourites. Please try again.' }); }
  };
  app.get('/api/favourites', authenticate, route(async (req, res) => {
    const result = await pool.query('SELECT hotel FROM hotel_favourites WHERE user_id = $1 ORDER BY created_at DESC, hotel_id', [req.user.id]);
    res.json({ success: true, hotels: result.rows.map((row) => row.hotel) });
  }));
  app.put('/api/favourites/:hotelId', authenticate, route(async (req, res) => {
    const id = hotelId(req.params.hotelId);
    const hotel = id && hotelSnapshot(req.body?.hotel, id);
    if (!hotel) return res.status(400).json({ success: false, error: 'Choose a valid hotel to save.' });
    await pool.query(`INSERT INTO hotel_favourites (user_id, hotel_id, hotel) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (user_id, hotel_id) DO UPDATE SET hotel = EXCLUDED.hotel`, [req.user.id, id, JSON.stringify(hotel)]);
    res.json({ success: true, hotel });
  }));
  app.delete('/api/favourites/:hotelId', authenticate, route(async (req, res) => {
    const id = hotelId(req.params.hotelId);
    if (!id) return res.status(400).json({ success: false, error: 'Choose a valid hotel to remove.' });
    await pool.query('DELETE FROM hotel_favourites WHERE user_id = $1 AND hotel_id = $2', [req.user.id, id]);
    res.json({ success: true });
  }));
  return {
    ensureSchema: () => pool.query(`CREATE TABLE IF NOT EXISTS hotel_favourites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hotel_id BIGINT NOT NULL,
      hotel JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, hotel_id)
    )`),
  };
}

module.exports = { registerFavouritesRoutes, hotelSnapshot };
