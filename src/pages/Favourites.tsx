import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProgressiveImage from '../components/shared/ProgressiveImage';
import FavouriteButton from '../components/shared/FavouriteButton';
import { useFavourites } from '../contexts/FavouritesContext';
import './Favourites.css';

const Favourites: React.FC = () => {
  const { hotels, loading, error, pending, refresh } = useFavourites();
  return <Layout><section className="favourites-page section-padding"><div className="container">
    <div className="favourites-heading">
      <div><p className="favourites-eyebrow">Your next escape</p><h1>My Favourites</h1>
        <p>A collection of places you would love to stay. Tap a heart to save or remove a hotel.</p></div>
      <Link to="/" className="btn btn-outline-dark">Explore hotels</Link>
    </div>
    {error && <div className="alert alert-danger" role="alert">{error} <button type="button" disabled={loading || pending.length > 0} onClick={() => void refresh()}>Try again</button></div>}
    {loading && hotels.length === 0 ? <p role="status">Loading your favourites…</p>
      : !error && hotels.length === 0 ? <div className="favourites-empty"><h2>Your next journey starts here</h2>
        <p>Save hotels using the heart on each photo. Find them here whenever you sign in.</p>
        <Link to="/#destinations" className="btn btn-primary">Discover hotels</Link></div>
      : <><p className="favourites-count" role="status">{hotels.length} saved {hotels.length === 1 ? 'hotel' : 'hotels'}</p>
        <div className="favourites-grid">{hotels.map((hotel, index) => <article className="favourite-hotel-card" key={hotel.id}>
          <div className="favourite-image"><Link to={`/hotel/${hotel.id}`} tabIndex={-1} aria-hidden="true">
            <ProgressiveImage src={hotel.image} alt={hotel.name} priority={index < 3} />
          </Link><FavouriteButton hotel={hotel} /></div>
          <div className="favourite-hotel-details"><p className="favourites-eyebrow">{hotel.location}</p>
            <h2><Link to={`/hotel/${hotel.id}`}>{hotel.name}</Link></h2>
            <Link to={`/hotel/${hotel.id}`} className="favourite-view-link">Explore hotel <span aria-hidden="true">↗</span></Link>
          </div>
        </article>)}</div></>}
  </div></section></Layout>;
};
export default Favourites;
