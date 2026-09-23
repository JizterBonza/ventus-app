const defaults = require('../src/data/homepageContent.json');

// Only migrate the four known placeholder links. Never replace a link or other
// field that an editor has already changed in the CMS.
const legacyThemeLinks = {
  '1': { title: 'Summer Sun', href: '/search-results?location=Amalfi+Coast' },
  '2': { title: 'European City Breaks', href: '/search-results?location=Paris' },
  '9': { title: 'Hotels with Villas', href: '/search-results?location=Maldives' },
  '11': { title: 'City Spa Breaks', href: '/search-results?location=London' },
};

const migrateLegacyThemeLinks = (content) => {
  if (!content || !Array.isArray(content.cards)) return null;
  let changed = false;
  const cards = content.cards.map((card) => {
    const legacy = legacyThemeLinks[card.id];
    const replacement = defaults.cards.find((item) => item.id === card.id);
    if (!legacy || !replacement || card.title !== legacy.title || card.href !== legacy.href) return card;
    changed = true;
    const { query, ...withoutOldPlaceQuery } = card;
    return { ...withoutOldPlaceQuery, href: replacement.href, location: replacement.location };
  });
  return changed ? { ...content, cards } : null;
};

const allowedUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || value.trim() !== value) return false;
  if (/[\\\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
};

const textField = (value, max, required = true) =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);

const normalizeItem = (item, kind) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Invalid ${kind} item`);
  if (!textField(item.id, 64) || !/^[a-zA-Z0-9_-]+$/.test(item.id)) throw new Error(`Invalid ${kind} ID`);
  if (!textField(item.title, 120)) throw new Error(`Invalid ${kind} title`);
  if (!allowedUrl(item.image)) throw new Error(`Invalid ${kind} image URL`);
  if (!allowedUrl(item.href)) throw new Error(`Invalid ${kind} link URL`);

  if (kind === 'slider') {
    if (!textField(item.subtitle, 160, false)) throw new Error('Invalid slider subtitle');
    return { id: item.id, title: item.title.trim(), subtitle: item.subtitle.trim(), image: item.image, href: item.href };
  }

  if (!textField(item.description, 240, false)) throw new Error('Invalid card description');
  if (!Array.isArray(item.categories) || item.categories.length > 10 ||
      !item.categories.every((value) => textField(value, 40))) throw new Error('Invalid card categories');
  if (!textField(item.location, 120, false)) throw new Error('Invalid card location');
  const normalized = {
    id: item.id,
    title: item.title.trim(),
    description: item.description.trim(),
    image: item.image,
    href: item.href,
    categories: item.categories.map((value) => value.trim()),
    location: item.location.trim()
  };
  if (item.ctaLabel !== undefined) {
    if (!textField(item.ctaLabel, 60)) throw new Error('Invalid card button label');
    normalized.ctaLabel = item.ctaLabel.trim();
  }
  if (item.query !== undefined) {
    if (!textField(item.query, 120)) throw new Error('Invalid card query');
    normalized.query = item.query.trim();
  }
  if (item.inspirationId !== undefined) {
    if (!Number.isSafeInteger(item.inspirationId) || item.inspirationId < 1) throw new Error('Invalid inspiration ID');
    normalized.inspirationId = item.inspirationId;
  }
  return normalized;
};

const normalizeHomepageContent = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('Invalid homepage content');
  if (!Array.isArray(content.slider) || content.slider.length < 1 || content.slider.length > 24) {
    throw new Error('Homepage slider must have 1–24 items');
  }
  if (!Array.isArray(content.cards) || content.cards.length < 1 || content.cards.length > 50) {
    throw new Error('Homepage must have 1–50 cards');
  }
  const slider = content.slider.map((item) => normalizeItem(item, 'slider'));
  const cards = content.cards.map((item) => normalizeItem(item, 'card'));
  for (const [name, items] of [['slider', slider], ['card', cards]]) {
    if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error(`Duplicate ${name} IDs`);
  }
  return { slider, cards };
};

const allowedImageType = (bytes) => {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
};

module.exports = { defaults: normalizeHomepageContent(defaults), normalizeHomepageContent, allowedImageType, migrateLegacyThemeLinks, allowedUrl };
