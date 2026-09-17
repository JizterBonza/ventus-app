const test = require('node:test');
const assert = require('node:assert/strict');
const { defaults, normalizeHomepageContent, allowedImageType } = require('./homepageContent');

test('homepage defaults contain valid slider and cards', () => {
  assert.equal(defaults.slider.length, 6);
  assert.equal(defaults.cards.length, 12);
  assert.equal(defaults.cards.find((card) => card.id === '7').href, '/search-results?location=London');
  assert.equal(defaults.cards.find((card) => card.id === '8').href, '/search-results?location=Paris');
});

test('homepage editor rejects unsafe links and duplicate IDs', () => {
  const unsafe = structuredClone(defaults);
  unsafe.cards[0].href = 'javascript:alert(1)';
  assert.throws(() => normalizeHomepageContent(unsafe), /link URL/);
  const duplicated = structuredClone(defaults);
  duplicated.slider[1].id = duplicated.slider[0].id;
  assert.throws(() => normalizeHomepageContent(duplicated), /Duplicate slider IDs/);
});

test('homepage editor rejects missing images and oversized lists', () => {
  const invalid = structuredClone(defaults);
  invalid.cards[0].image = '//evil.example/image.jpg';
  assert.throws(() => normalizeHomepageContent(invalid), /image URL/);
  invalid.cards = Array(51).fill(defaults.cards[0]);
  assert.throws(() => normalizeHomepageContent(invalid), /1–50/);
});

test('uploads accept only JPEG, PNG, and WebP signatures', () => {
  assert.equal(allowedImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(allowedImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(allowedImageType(Buffer.from('RIFF0000WEBP')), 'image/webp');
  assert.equal(allowedImageType(Buffer.from('<svg></svg>')), null);
});
