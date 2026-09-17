import { Hotel } from '../types/search';
import { getHotelDetailsBatch } from './api';
import { getEditorialCollection } from '../data/editorialCollections';

const collectionCache = new Map<string, { promise: Promise<Hotel[]>; expiresAt: number }>();
const CACHE_MS = 15 * 60 * 1000;

export const loadEditorialCollectionHotels = (slug: string): Promise<Hotel[]> => {
  const collection = getEditorialCollection(slug);
  if (!collection) return Promise.reject(new Error('This collection is no longer available.'));

  const cached = collectionCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = getHotelDetailsBatch([...collection.hotelIds]).then((hotels) => {
    if (hotels.length === 0) {
      collectionCache.delete(slug);
      throw new Error('This collection could not be loaded. Please try again.');
    }
    // Keep the editorial order even when supplier requests finish out of order.
    const byId = new Map(hotels.map((hotel) => [hotel.id, hotel]));
    return collection.hotelIds.flatMap((id) => {
      const hotel = byId.get(id);
      return hotel ? [hotel] : [];
    });
  }).catch((error) => {
    collectionCache.delete(slug);
    throw error;
  });

  collectionCache.set(slug, { promise, expiresAt: Date.now() + CACHE_MS });
  return promise;
};

export const prefetchEditorialCollectionHotels = (slug: string): void => {
  void loadEditorialCollectionHotels(slug).catch(() => undefined);
};
