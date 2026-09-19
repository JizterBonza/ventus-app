const ROOM_IMAGE_COLLECTION_KEYS = ['images', 'photos', 'gallery'] as const;
const ROOM_IMAGE_DIRECT_KEYS = ['image', 'image_url', 'photo', 'photo_url', 'thumbnail_url'] as const;

const imageUrlFromValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (!value || typeof value !== 'object') return null;
  const image = value as Record<string, unknown>;
  for (const key of ['url', 'image_url', 'photo_url', 'thumbnail_url']) {
    const candidate = image[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
};

/** Return every usable room image in supplier order, without duplicate URLs. */
export const getRoomTypeImages = (roomType: Record<string, unknown>): string[] => {
  const urls: string[] = [];
  const add = (value: unknown) => {
    const url = imageUrlFromValue(value);
    if (url && !urls.includes(url)) urls.push(url);
  };

  ROOM_IMAGE_COLLECTION_KEYS.forEach((key) => {
    const collection = roomType[key];
    if (Array.isArray(collection)) collection.forEach(add);
  });
  ROOM_IMAGE_DIRECT_KEYS.forEach((key) => add(roomType[key]));
  return urls;
};
