import { Hotel } from '../types/search';

const FAVOURITES_KEY = 'ventus_favourites';

/**
 * Get all favourite hotels
 */
export const getFavourites = (): Hotel[] => {
  try {
    const favouritesStr = localStorage.getItem(FAVOURITES_KEY);
    if (!favouritesStr) return [];
    return JSON.parse(favouritesStr);
  } catch (error) {
    console.error('Error getting favourites:', error);
    return [];
  }
};

/**
 * Check if a hotel is in favourites
 */
export const isFavourite = (hotelId: number): boolean => {
  const favourites = getFavourites();
  return favourites.some(hotel => hotel.id === hotelId);
};

/**
 * Add a hotel to favourites
 */
export const addFavourite = (hotel: Hotel): void => {
  try {
    const favourites = getFavourites();
    // Check if already exists
    if (!favourites.some(h => h.id === hotel.id)) {
      favourites.push(hotel);
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    }
  } catch (error) {
    console.error('Error adding favourite:', error);
  }
};

/**
 * Remove a hotel from favourites
 */
export const removeFavourite = (hotelId: number): void => {
  try {
    const favourites = getFavourites();
    const filtered = favourites.filter(hotel => hotel.id !== hotelId);
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing favourite:', error);
  }
};

/**
 * Toggle favourite status of a hotel
 */
export const toggleFavourite = (hotel: Hotel): boolean => {
  const isFav = isFavourite(hotel.id);
  if (isFav) {
    removeFavourite(hotel.id);
    return false;
  } else {
    addFavourite(hotel);
    return true;
  }
};

/**
 * Clear all favourites
 */
export const clearFavourites = (): void => {
  localStorage.removeItem(FAVOURITES_KEY);
};

