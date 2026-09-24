import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { addFavourite, FavouriteHotel, getFavourites, removeFavourite } from '../utils/favouritesService';

interface FavouritesState {
  hotels: FavouriteHotel[];
  loading: boolean;
  error: string;
  pending: number[];
  refresh: () => Promise<void>;
  toggle: (hotel: FavouriteHotel) => Promise<void>;
}
const FavouritesContext = createContext<FavouritesState | undefined>(undefined);
export const useFavourites = () => {
  const value = useContext(FavouritesContext);
  if (!value) throw new Error('FavouritesProvider is required');
  return value;
};

// A separate instance for each account prevents late requests from exposing another user's list.
export const FavouritesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  return <AccountFavourites key={user?.id ?? 'guest'} signedIn={Boolean(user)}>{children}</AccountFavourites>;
};

const AccountFavourites: React.FC<React.PropsWithChildren<{ signedIn: boolean }>> = ({ children, signedIn }) => {
  const [hotels, setHotels] = useState<FavouriteHotel[]>([]);
  const [loading, setLoading] = useState(signedIn);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<number[]>([]);
  const hotelsRef = useRef<FavouriteHotel[]>([]);
  const pendingRef = useRef(new Set<number>());
  const active = useRef(true);
  const loadId = useRef(0);
  const ready = useRef(false);
  const update = (next: FavouriteHotel[]) => { hotelsRef.current = next; setHotels(next); };
  const refresh = useCallback(async () => {
    if (!signedIn || pendingRef.current.size) return;
    const requestId = ++loadId.current;
    setLoading(true); setError('');
    try {
      const result = await getFavourites();
      if (active.current && requestId === loadId.current) { update(result); ready.current = true; }
    } catch (failure) {
      if (active.current && requestId === loadId.current) setError(failure instanceof Error ? failure.message : 'Unable to load your favourites.');
    } finally {
      if (active.current && requestId === loadId.current) setLoading(false);
    }
  }, [signedIn]);
  useEffect(() => {
    active.current = true;
    void refresh();
    const onFocus = () => { void refresh(); };
    const invalidateLoad = () => { ++loadId.current; };
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; invalidateLoad(); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const toggle = async (hotel: FavouriteHotel) => {
    if (!signedIn) throw new Error('Please sign in to save your favourite hotels.');
    if (!ready.current) { await refresh(); if (!ready.current) throw new Error('Unable to load your favourites. Please try again.'); }
    if (!active.current || pendingRef.current.has(hotel.id)) return;
    ++loadId.current; // An earlier refresh must not overwrite a save or removal.
    setLoading(false);
    pendingRef.current.add(hotel.id); setPending(Array.from(pendingRef.current));
    try {
      if (hotelsRef.current.some((saved) => saved.id === hotel.id)) {
        await removeFavourite(hotel.id);
        if (active.current) update(hotelsRef.current.filter((saved) => saved.id !== hotel.id));
      } else {
        const saved = await addFavourite(hotel);
        if (active.current) update([saved, ...hotelsRef.current.filter((entry) => entry.id !== hotel.id)]);
      }
    } finally {
      pendingRef.current.delete(hotel.id);
      if (active.current) setPending(Array.from(pendingRef.current));
    }
  };
  return <FavouritesContext.Provider value={{ hotels, loading, error, pending, refresh, toggle }}>{children}</FavouritesContext.Provider>;
};
