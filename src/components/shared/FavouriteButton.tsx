import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFavourites } from '../../contexts/FavouritesContext';
import { FavouriteHotel } from '../../utils/favouritesService';
import './FavouriteButton.css';

const FavouriteButton: React.FC<{ hotel: FavouriteHotel }> = ({ hotel }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hotels, loading, pending, toggle } = useFavourites();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const saved = hotels.some((entry) => entry.id === hotel.id);
  const busy = pending.includes(hotel.id);
  const label = saved ? `Remove ${hotel.name} from favourites` : `Save ${hotel.name} to favourites`;
  return <div className="favourite-control">
    <button type="button" className={`hotel-favourite-button${saved ? ' is-saved' : ''}`}
      aria-label={label} title={isAuthenticated ? label : 'Sign in to save this hotel'} aria-pressed={saved}
      disabled={isLoading || loading || busy} aria-busy={busy}
      onClick={async (event) => {
        event.preventDefault(); event.stopPropagation(); setError('');
        if (!isAuthenticated) { navigate('/login', { state: { from: location } }); return; }
        try { await toggle(hotel); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save this hotel. Please try again.'); }
      }}>
      <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
    {error && <span className="favourite-error" role="alert" onClick={(event) => event.stopPropagation()}>{error}</span>}
  </div>;
};
export default FavouriteButton;
