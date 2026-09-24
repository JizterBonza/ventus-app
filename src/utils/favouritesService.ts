import { getAuthToken } from './authService';
import { Hotel } from '../types/search';

export type FavouriteHotel = Pick<Hotel, 'id' | 'name' | 'location'> & Partial<Pick<Hotel, 'image' | 'description' | 'images'>>;

const base = process.env.REACT_APP_AUTH_API_URL
  ? process.env.REACT_APP_AUTH_API_URL.replace(/\/auth\/?$/, '/favourites')
  : process.env.NODE_ENV === 'production' ? 'https://ventus-backend.onrender.com/api/favourites' : '/api/favourites';

async function request(path = '', method = 'GET', hotel?: FavouriteHotel, signal?: AbortSignal) {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in to save your favourite hotels.');
  const response = await fetch(`${base}${path}`, { method, signal, cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(hotel ? { body: JSON.stringify({ hotel: { id: hotel.id, name: hotel.name, location: hotel.location,
      description: hotel.description, image: hotel.images?.[0]?.url || hotel.image || '' } }) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403
    ? 'Please sign in again to manage your favourites.' : data.error || 'Unable to update your favourites. Please try again.');
  return data;
}

export const getFavourites = async (signal?: AbortSignal): Promise<FavouriteHotel[]> => (await request('', 'GET', undefined, signal)).hotels;
export const addFavourite = async (hotel: FavouriteHotel): Promise<FavouriteHotel> => (await request(`/${hotel.id}`, 'PUT', hotel)).hotel;
export const removeFavourite = async (hotelId: number): Promise<void> => { await request(`/${hotelId}`, 'DELETE'); };
